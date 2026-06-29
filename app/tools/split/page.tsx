"use client";

import { useState, useCallback } from "react";
import { Scissors, Upload, Download } from "lucide-react";
import JSZip from "jszip";
import { splitPDF, downloadBlob, formatBytes, getPDFInfo, readFileAsArrayBuffer, type PDFInfo } from "@/lib/pdf/engine";
import { PDFViewer, PageThumbnails } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

type SplitMode = "range" | "everyN" | "extract";

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<PDFInfo | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [mode, setMode] = useState<SplitMode>("range");
  const [rangeInput, setRangeInput] = useState("1-3, 4-6");
  const [everyN, setEveryN] = useState(1);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f.name.toLowerCase().endsWith(".pdf")) { toast("Please upload a PDF file", "error"); return; }
    setFile(f);
    setSelectedPages([]);
    try {
      const inf = await getPDFInfo(f);
      setInfo(inf);
      const buf = await readFileAsArrayBuffer(f);
      setPreviewData(new Uint8Array(buf));
      toast(`Loaded: ${inf.pageCount} pages`, "success");
    } catch { toast("Failed to load PDF", "error"); }
  }, []);

  const parseRanges = (input: string): [number, number][] => {
    return input.split(",").map(s => s.trim()).filter(Boolean).map(part => {
      const m = part.match(/^(\d+)-(\d+)$/);
      if (m) return [parseInt(m[1]), parseInt(m[2])] as [number, number];
      const n = parseInt(part);
      return [n, n] as [number, number];
    }).filter(([a, b]) => !isNaN(a) && !isNaN(b) && a >= 1 && b >= a && b <= (info?.pageCount ?? 9999));
  };

  const handleSplit = async () => {
    if (!file) { toast("Upload a PDF first", "warning"); return; }
    setProcessing(true);
    setProgress(20);
    try {
      let parts: Uint8Array[] = [];
      if (mode === "range") {
        const ranges = parseRanges(rangeInput);
        if (!ranges.length) { toast("No valid ranges", "error"); setProcessing(false); return; }
        parts = await splitPDF(file, { type: "range", ranges });
      } else if (mode === "everyN") {
        parts = await splitPDF(file, { type: "everyN", n: everyN });
      } else {
        if (!selectedPages.length) { toast("Select pages to extract", "warning"); setProcessing(false); return; }
        parts = await splitPDF(file, { type: "fixed", pages: selectedPages.sort((a, b) => a - b) });
      }
      setProgress(80);

      if (parts.length === 1) {
        downloadBlob(new Blob([(parts[0] as Uint8Array).buffer as ArrayBuffer], { type: "application/pdf" }), `split_1.pdf`);
      } else {
        const zip = new JSZip();
        parts.forEach((part, i) => zip.file(`part_${i + 1}.pdf`, part));
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, "split_parts.zip");
      }
      setProgress(100);
      toast(`Split into ${parts.length} file(s) — downloading as ${parts.length > 1 ? "ZIP" : "PDF"}`, "success");
    } catch (e) {
      toast("Split failed", "error");
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const togglePage = (p: number) =>
    setSelectedPages(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const tabs: { id: SplitMode; label: string }[] = [
    { id: "range", label: "By Range" },
    { id: "everyN", label: "Every N Pages" },
    { id: "extract", label: "Extract Pages" },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-indigo" style={{ marginBottom: "10px" }}>
          <Scissors size={11} /> SPLIT PDF
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>Split PDF</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "6px", fontSize: "14px" }}>
          Split by page range, every N pages, or extract specific pages.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        {/* Controls */}
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {!file ? (
            <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF here" icon={<Upload size={22} color="#8b5cf6" />} />
          ) : (
            <div style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.8)", marginBottom: "4px" }}>{file.name}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{formatBytes(file.size)} · {info?.pageCount ?? "?"} pages</div>
              <button onClick={() => { setFile(null); setInfo(null); setPreviewData(null); }}
                style={{ marginTop: "8px", fontSize: "11px", color: "#ef4444", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                Remove file
              </button>
            </div>
          )}

          {/* Mode tabs */}
          <div style={{ display: "flex", gap: "6px" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setMode(t.id)}
                style={{
                  flex: 1, padding: "8px", borderRadius: "10px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
                  background: mode === t.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${mode === t.id ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`,
                  color: mode === t.id ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Mode content */}
          {mode === "range" && (
            <div>
              <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>
                Page Ranges (comma-separated)
              </label>
              <input className="input-field" value={rangeInput} onChange={e => setRangeInput(e.target.value)}
                placeholder="e.g. 1-3, 5-7, 10" />
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "6px" }}>
                Each range becomes a separate PDF. Example: 1-3 → pages 1, 2, 3.
              </p>
            </div>
          )}

          {mode === "everyN" && (
            <div>
              <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>
                Split every N pages
              </label>
              <input className="input-field" type="number" min={1} max={info?.pageCount ?? 999}
                value={everyN} onChange={e => setEveryN(parseInt(e.target.value) || 1)} />
              {info && (
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "6px" }}>
                  Will produce {Math.ceil(info.pageCount / everyN)} files
                </p>
              )}
            </div>
          )}

          {mode === "extract" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                  Select pages ({selectedPages.length} selected)
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => setSelectedPages(Array.from({ length: info?.pageCount ?? 0 }, (_, i) => i + 1))}
                    style={{ fontSize: "10px", color: "#a5b4fc", background: "none", border: "none", cursor: "pointer" }}>All</button>
                  <button onClick={() => setSelectedPages([])}
                    style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}>None</button>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                {Array.from({ length: info?.pageCount ?? 0 }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => togglePage(p)}
                    style={{
                      width: "36px", height: "36px", borderRadius: "8px", fontSize: "12px", cursor: "pointer",
                      background: selectedPages.includes(p) ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${selectedPages.includes(p) ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
                      color: selectedPages.includes(p) ? "#a5b4fc" : "rgba(255,255,255,0.5)",
                    }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {processing && (
            <div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "6px", textAlign: "center" }}>Processing... {progress}%</p>
            </div>
          )}

          <button className="btn-primary" onClick={handleSplit} disabled={!file || processing}
            style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: !file ? 0.4 : 1, cursor: !file ? "not-allowed" : "pointer" }}>
            {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Splitting...</>
              : <><Download size={16} /> Split & Download</>}
          </button>
        </div>

        {/* RIGHT — Preview */}
        <div className="glass-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Live Preview</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "12px", flex: 1 }}>
            {previewData && (
              <div style={{ overflowY: "auto" }}>
                <PageThumbnails data={previewData} selectedPages={[previewPage]} onSelect={setPreviewPage} />
              </div>
            )}
            <PDFViewer data={previewData} pageNumber={previewPage} showControls={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
