"use client";

import { useState, useCallback } from "react";
import { Contrast, Upload, Download } from "lucide-react";
import { invertPDF, downloadBlob, formatBytes, readFileAsArrayBuffer, getFileBaseName } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

export default function InvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]; setFile(f); setResult(null);
    const buf = await readFileAsArrayBuffer(f);
    setPreviewData(new Uint8Array(buf));
    toast("PDF loaded", "success");
  }, []);

  const handleInvert = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const out = await invertPDF(file);
      setResult(out);
      setPreviewData(out);
      toast("Colors inverted!", "success");
    } catch { toast("Inversion failed", "error"); }
    finally { setProcessing(false); }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-indigo" style={{ marginBottom: "10px" }}><Contrast size={11} /> INVERT PDF</div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)" }}>Invert PDF Colors</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Invert the colors of your document (dark mode PDF).</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {!file ? (
            <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF here" icon={<Upload size={22} color="#6366f1" />} />
          ) : (
            <div style={{ padding: "10px", borderRadius: "10px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", fontSize: "12px" }}>
              <span style={{ color: "var(--text-primary)" }}>{file.name}</span> · <span style={{ color: "var(--text-muted)" }}>{formatBytes(file.size)}</span>
              <button onClick={() => { setFile(null); setPreviewData(null); setResult(null); }} style={{ marginLeft: "8px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}>Remove</button>
            </div>
          )}

          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(var(--color-invert-rgb), 0.03)", border: "1px solid rgba(var(--color-invert-rgb), 0.06)", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Applying color inversion will make backgrounds dark and text light, ideal for night reading or creating a dark mode version of a PDF.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto" }}>
            <button className="btn-primary" onClick={handleInvert} disabled={!file || processing || !!result}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: (!file || result) ? 0.4 : 1 }}>
              {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Inverting...</>
                : <><Contrast size={16} /> Invert Colors</>}
            </button>
            {result && (
              <button className="btn-secondary" onClick={() => downloadBlob(new Blob([(result as Uint8Array).buffer as ArrayBuffer], { type: "application/pdf" }), `${getFileBaseName(file!.name)}_inverted.pdf`)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Download size={16} /> Download Inverted PDF
              </button>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "16px", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Live Preview</span>
            {result && <span className="badge badge-indigo" style={{ fontSize: "10px" }}>● Inverted</span>}
          </div>
          <PDFViewer data={previewData} showControls={true} />
        </div>
      </div>
    </div>
  );
}
