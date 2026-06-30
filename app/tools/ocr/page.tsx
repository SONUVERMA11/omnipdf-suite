"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Type, Upload, Download, Copy, FileText } from "lucide-react";
import { readFileAsArrayBuffer, downloadBlob, formatBytes } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

const LANGS = [
  { code: "eng", label: "English" }, { code: "hin", label: "Hindi" }, { code: "fra", label: "French" },
  { code: "deu", label: "German" }, { code: "spa", label: "Spanish" }, { code: "ara", label: "Arabic" },
  { code: "chi_sim", label: "Chinese (Simplified)" }, { code: "jpn", label: "Japanese" },
  { code: "kor", label: "Korean" }, { code: "por", label: "Portuguese" }, { code: "rus", label: "Russian" },
  { code: "ita", label: "Italian" },
];

export default function OCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [lang, setLang] = useState("eng");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<string>("");
  const [pageRange, setPageRange] = useState("all");
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f); setResult("");
    if (f.name.toLowerCase().endsWith(".pdf")) {
      const buf = await readFileAsArrayBuffer(f);
      setPreviewData(new Uint8Array(buf));
    } else {
      setPreviewData(null);
    }
    toast("File loaded", "success");
  }, []);

  const handleOCR = async () => {
    if (!file) return;
    setProcessing(true); setProgress(0); setResult(""); setProgressLabel("Initializing Tesseract...");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(lang, 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
            setProgressLabel(`Recognizing... ${Math.round(m.progress * 100)}%`);
          } else {
            setProgressLabel(m.status);
          }
        },
      });

      if (file.type.startsWith("image/") || !file.name.toLowerCase().endsWith(".pdf")) {
        const { data } = await worker.recognize(file);
        setResult(data.text);
      } else {
        // For PDF: render pages to canvas then OCR each
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const buf = await readFileAsArrayBuffer(file);
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        const texts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          setProgressLabel(`Processing page ${i} of ${pdf.numPages}...`);
          setProgress(Math.round((i / pdf.numPages) * 80));
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width; canvas.height = vp.height;
          await page.render({ canvas, viewport: vp }).promise;
          const blob: Blob = await new Promise(r => canvas.toBlob(b => r(b!)));
          const { data } = await worker.recognize(blob);
          texts.push(`--- Page ${i} ---\n${data.text}`);
        }
        setResult(texts.join("\n\n"));
      }

      await worker.terminate();
      setProgress(100);
      setProgressLabel("Complete!");
      toast("OCR complete!", "success");
    } catch (e) {
      toast("OCR failed — try a different file or language", "error");
      setProgressLabel("");
    } finally {
      setProcessing(false);
      setTimeout(() => { setProgress(0); setProgressLabel(""); }, 3000);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast("Text copied to clipboard", "success");
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([result], { type: "text/plain" });
    downloadBlob(blob, `${file?.name.replace(/\.[^.]+$/, "") ?? "ocr"}_text.txt`);
  };

  const wordCount = result.trim() ? result.trim().split(/\s+/).length : 0;
  const charCount = result.length;

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge" style={{ marginBottom: "10px", background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)", display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "999px", fontSize: "12px" }}>
          <Type size={11} /> OCR — TEXT EXTRACTION
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>OCR — Extract Text</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
          AI-powered text recognition. Works on scanned PDFs and images. Supports 12 languages.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        {/* Controls */}
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {!file ? (
            <DropZone onFiles={handleFile} accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.webp" multiple={false}
              label="Drop PDF or Image" sublabel="PNG, JPG, TIFF, PDF supported"
              icon={<Upload size={22} color="#8b5cf6" />} />
          ) : (
            <div style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{file.name}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{formatBytes(file.size)}</div>
              <button onClick={() => { setFile(null); setPreviewData(null); setResult(""); }}
                style={{ marginTop: "6px", fontSize: "11px", color: "#ef4444", cursor: "pointer", background: "none", border: "none", padding: 0 }}>Remove</button>
            </div>
          )}

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Language</label>
            <select className="select-field" value={lang} onChange={e => setLang(e.target.value)} style={{ width: "100%" }}>
              {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>

          {processing && (
            <div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px", textAlign: "center" }}>{progressLabel}</p>
            </div>
          )}

          <button className="btn-primary" onClick={handleOCR} disabled={!file || processing}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: !file ? 0.4 : 1, cursor: !file ? "not-allowed" : "pointer" }}>
            {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Recognizing...</>
              : <><Type size={16} /> Run OCR</>}
          </button>

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <span className="badge badge-indigo" style={{ fontSize: "10px" }}>{wordCount} words</span>
                <span className="badge badge-indigo" style={{ fontSize: "10px" }}>{charCount} chars</span>
              </div>
              <button className="btn-secondary" onClick={handleCopy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px" }}>
                <Copy size={13} /> Copy Text
              </button>
              <button className="btn-secondary" onClick={handleDownloadTxt} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px" }}>
                <Download size={13} /> Download .TXT
              </button>
            </div>
          )}
        </div>

        {/* Right — preview + text output */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="glass-card" style={{ padding: "16px", flex: "0 0 50%" }}>
            <div style={{ marginBottom: "12px", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Input Preview</div>
            <PDFViewer data={previewData} showControls={true} />
          </div>

          <div className="glass-card" style={{ padding: "16px", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Extracted Text</span>
              {result && <span className="badge badge-green" style={{ fontSize: "10px" }}>● Ready</span>}
            </div>
            <textarea
              ref={textRef}
              readOnly
              value={result || (processing ? "Processing..." : "Run OCR to extract text from the document...")}
              style={{
                width: "100%", height: "240px", resize: "vertical",
                background: "rgba(var(--color-obverse-rgb), 0.2)", border: "1px solid rgba(var(--color-invert-rgb), 0.06)",
                borderRadius: "12px", padding: "14px", color: result ? "rgba(var(--color-invert-rgb), 0.8)" : "rgba(var(--color-invert-rgb), 0.25)",
                fontSize: "13px", lineHeight: "1.6", fontFamily: "ui-monospace, monospace", outline: "none",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
