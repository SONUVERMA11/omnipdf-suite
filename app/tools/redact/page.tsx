"use client";

import { useState, useCallback, useRef } from "react";
import { X, Upload, Download, AlertTriangle } from "lucide-react";
import { redactPDF, downloadBlob, formatBytes, readFileAsArrayBuffer, getFileBaseName, type RedactBox } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

export default function RedactPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [boxes, setBoxes] = useState<RedactBox[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [processing, setProcessing] = useState(false);

  // Manual box inputs
  const [mx, setMx] = useState(50);
  const [my, setMy] = useState(50);
  const [mw, setMw] = useState(200);
  const [mh, setMh] = useState(40);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f); setBoxes([]);
    const buf = await readFileAsArrayBuffer(f);
    setPreviewData(new Uint8Array(buf));
    toast("PDF loaded", "success");
  }, []);

  const addBox = () => {
    setBoxes(prev => [...prev, { pageIndex: currentPage - 1, x: mx, y: my, width: mw, height: mh }]);
    toast(`Redaction box added on page ${currentPage}`, "info");
  };

  const handleRedact = async () => {
    if (!file) return;
    if (!boxes.length) { toast("Add redaction areas first", "warning"); return; }
    setProcessing(true);
    try {
      const result = await redactPDF(file, boxes);
      downloadBlob(new Blob([result.buffer as ArrayBuffer], { type: "application/pdf" }), `${getFileBaseName(file.name)}_redacted.pdf`);
      toast("Redacted and downloaded!", "success");
    } catch { toast("Redaction failed", "error"); }
    finally { setProcessing(false); }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge" style={{ marginBottom: "10px", background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)", display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "999px", fontSize: "12px" }}>
          <X size={11} /> REDACT PDF
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>Redact PDF</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "6px", fontSize: "14px" }}>Permanently black-out sensitive information. This cannot be undone.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {!file ? (
            <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF here" icon={<Upload size={22} color="#ef4444" />} />
          ) : (
            <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "12px" }}>
              <div style={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{file.name}</div>
              <div style={{ color: "rgba(255,255,255,0.3)" }}>{formatBytes(file.size)}</div>
              <button onClick={() => { setFile(null); setPreviewData(null); setBoxes([]); }} style={{ marginTop: "4px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}>Remove</button>
            </div>
          )}

          <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
            <p style={{ fontSize: "11px", color: "#fcd34d", lineHeight: 1.5 }}>Redaction is <strong>permanent</strong>. The blacked-out content cannot be recovered.</p>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>Add Redaction Box — Page {currentPage}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div><label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>X</label><input className="input-field" type="number" value={mx} onChange={e => setMx(Number(e.target.value))} /></div>
              <div><label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>Y</label><input className="input-field" type="number" value={my} onChange={e => setMy(Number(e.target.value))} /></div>
              <div><label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>Width</label><input className="input-field" type="number" value={mw} onChange={e => setMw(Number(e.target.value))} /></div>
              <div><label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>Height</label><input className="input-field" type="number" value={mh} onChange={e => setMh(Number(e.target.value))} /></div>
            </div>
            <button onClick={addBox} style={{ marginTop: "10px", width: "100%", padding: "10px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
              + Add Box on Page {currentPage}
            </button>
          </div>

          {boxes.length > 0 && (
            <div>
              <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>
                Redaction Areas ({boxes.length})
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                {boxes.map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <div style={{ flex: 1, fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                      Page {b.pageIndex + 1} · x:{b.x} y:{b.y} {b.width}×{b.height}
                    </div>
                    <button onClick={() => setBoxes(p => p.filter((_, j) => j !== i))}
                      style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="btn-primary" onClick={handleRedact} disabled={!file || processing || !boxes.length}
            style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "linear-gradient(135deg, #ef4444, #dc2626)", opacity: (!file || !boxes.length) ? 0.4 : 1 }}>
            {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Redacting...</>
              : <><X size={16} /> Apply Redaction & Download</>}
          </button>
        </div>

        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>PDF Preview</div>
          <PDFViewer data={previewData} pageNumber={currentPage} onPageCount={() => {}} showControls={true} />
        </div>
      </div>
    </div>
  );
}
