"use client";

import { useState, useCallback } from "react";
import { Image, Upload, Download, ZoomIn } from "lucide-react";
import { readFileAsArrayBuffer, downloadBlob, formatBytes, getFileBaseName } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";
import JSZip from "jszip";

type Format = "png" | "jpeg" | "webp";
type DPI = 72 | 96 | 150 | 300;

const DPI_TO_SCALE: Record<DPI, number> = { 72: 1, 96: 1.33, 150: 2.08, 300: 4.17 };

export default function PDFToImagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [format, setFormat] = useState<Format>("png");
  const [dpi, setDpi] = useState<DPI>(150);
  const [quality, setQuality] = useState(92);
  const [rangeMode, setRangeMode] = useState<"all" | "range">("all");
  const [rangeInput, setRangeInput] = useState("1-5");
  const [pageCount, setPageCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f); setPreviews([]);
    const buf = await readFileAsArrayBuffer(f);
    const data = new Uint8Array(buf);
    setPreviewData(data);
    // get page count
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    setPageCount(pdf.numPages);
    toast(`Loaded: ${pdf.numPages} pages`, "success");
  }, []);

  const parseRange = (input: string, total: number): number[] => {
    const pages: number[] = [];
    input.split(",").forEach(part => {
      const m = part.trim().match(/^(\d+)-(\d+)$/);
      if (m) { for (let i = parseInt(m[1]); i <= Math.min(parseInt(m[2]), total); i++) pages.push(i); }
      else { const n = parseInt(part.trim()); if (!isNaN(n) && n >= 1 && n <= total) pages.push(n); }
    });
    return [...new Set(pages)].sort((a, b) => a - b);
  };

  const handleConvert = async () => {
    if (!file || !previewData) return;
    setProcessing(true); setProgress(0); setPreviews([]);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      const pdf = await pdfjsLib.getDocument({ data: previewData }).promise;

      const pages = rangeMode === "all"
        ? Array.from({ length: pdf.numPages }, (_, i) => i + 1)
        : parseRange(rangeInput, pdf.numPages);

      if (!pages.length) { toast("No valid pages in range", "error"); setProcessing(false); return; }

      const scale = DPI_TO_SCALE[dpi];
      const blobs: { name: string; blob: Blob }[] = [];
      const thumbs: string[] = [];

      for (let idx = 0; idx < pages.length; idx++) {
        setProgress(Math.round((idx / pages.length) * 90));
        const page = await pdf.getPage(pages[idx]);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        await (page.render({ canvas: canvas.getContext("2d")!, viewport: vp } as any)).promise;
        const mimeType = format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, quality / 100);
        thumbs.push(dataUrl);
        const blob: Blob = await new Promise(r => canvas.toBlob(b => r(b!), mimeType, quality / 100));
        blobs.push({ name: `page_${pages[idx]}.${format}`, blob });
      }

      setPreviews(thumbs);
      setProgress(95);

      if (blobs.length === 1) {
        downloadBlob(blobs[0].blob, blobs[0].name);
      } else {
        const zip = new JSZip();
        blobs.forEach(({ name, blob }) => zip.file(name, blob));
        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, `${getFileBaseName(file.name)}_images.zip`);
      }

      setProgress(100);
      toast(`Exported ${blobs.length} image(s)`, "success");
    } catch (e) {
      toast("Conversion failed", "error");
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const formats: { id: Format; label: string }[] = [{ id: "png", label: "PNG" }, { id: "jpeg", label: "JPEG" }, { id: "webp", label: "WebP" }];
  const dpis: DPI[] = [72, 96, 150, 300];

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-orange" style={{ marginBottom: "10px", background: "rgba(249,115,22,0.15)", color: "#fdba74", border: "1px solid rgba(249,115,22,0.25)", display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "999px", fontSize: "12px" }}>
          <Image size={11} /> PDF TO IMAGES
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>PDF to Images</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "6px", fontSize: "14px" }}>
          Export each PDF page as a high-quality image. Choose DPI up to 300.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {!file ? (
            <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF here" icon={<Upload size={22} color="#f97316" />} />
          ) : (
            <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", fontSize: "12px" }}>
              <div style={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{file.name}</div>
              <div style={{ color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{formatBytes(file.size)} · {pageCount} pages</div>
              <button onClick={() => { setFile(null); setPreviewData(null); setPreviews([]); }} style={{ marginTop: "6px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}>Remove</button>
            </div>
          )}

          <div>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>Output Format</label>
            <div style={{ display: "flex", gap: "6px" }}>
              {formats.map(f => (
                <button key={f.id} onClick={() => setFormat(f.id)} style={{
                  flex: 1, padding: "9px", borderRadius: "10px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  background: format === f.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${format === f.id ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`,
                  color: format === f.id ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                }}>{f.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>Resolution (DPI)</label>
            <div style={{ display: "flex", gap: "6px" }}>
              {dpis.map(d => (
                <button key={d} onClick={() => setDpi(d)} style={{
                  flex: 1, padding: "9px", borderRadius: "10px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  background: dpi === d ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${dpi === d ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`,
                  color: dpi === d ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                }}>{d}</button>
              ))}
            </div>
          </div>

          {format !== "png" && (
            <div>
              <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px" }}>Quality: {quality}%</label>
              <input type="range" min={60} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} />
            </div>
          )}

          <div>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>Page Range</label>
            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
              {(["all", "range"] as const).map(m => (
                <button key={m} onClick={() => setRangeMode(m)} style={{
                  flex: 1, padding: "8px", borderRadius: "10px", fontSize: "12px", cursor: "pointer", textTransform: "capitalize",
                  background: rangeMode === m ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${rangeMode === m ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`,
                  color: rangeMode === m ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                }}>{m === "all" ? "All Pages" : "Custom Range"}</button>
              ))}
            </div>
            {rangeMode === "range" && <input className="input-field" value={rangeInput} onChange={e => setRangeInput(e.target.value)} placeholder="e.g. 1-5, 8, 10" />}
          </div>

          {processing && (
            <div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "6px", textAlign: "center" }}>Converting... {progress}%</p>
            </div>
          )}

          <button className="btn-primary" onClick={handleConvert} disabled={!file || processing}
            style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: !file ? 0.4 : 1 }}>
            {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Converting...</>
              : <><Download size={16} /> Convert & Download</>}
          </button>
        </div>

        <div className="glass-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {previews.length > 0 ? `Output Preview (${previews.length} images)` : "PDF Preview"}
          </div>
          {previews.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px", overflowY: "auto" }}>
              {previews.map((src, i) => (
                <div key={i} className="page-thumb">
                  <img src={src} alt={`Page ${i + 1}`} style={{ width: "100%", display: "block", borderRadius: "6px" }} />
                  <div style={{ padding: "4px", textAlign: "center", fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>
                    page {i + 1} · {format.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <PDFViewer data={previewData} showControls={true} />
          )}
        </div>
      </div>
    </div>
  );
}
