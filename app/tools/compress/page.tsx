"use client";

import { useState, useCallback } from "react";
import { Minimize2, Upload, Download } from "lucide-react";
import { compressPDF, downloadBlob, formatBytes, getPDFInfo, readFileAsArrayBuffer, getFileBaseName, type CompressionLevel } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

const levels: { id: CompressionLevel; label: string; desc: string; color: string; reduction: string }[] = [
  { id: "low", label: "Low", desc: "Minimal compression, best quality", color: "#10b981", reduction: "~10-20%" },
  { id: "medium", label: "Medium", desc: "Balanced quality & size", color: "#6366f1", reduction: "~30-50%" },
  { id: "high", label: "High", desc: "Smaller file, good quality", color: "#f59e0b", reduction: "~50-70%" },
  { id: "extreme", label: "Extreme", desc: "Maximum compression", color: "#ef4444", reduction: "~70-90%" },
];

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [level, setLevel] = useState<CompressionLevel>("medium");
  const [percent, setPercent] = useState<number>(50); // Slider 10-100
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ data: Uint8Array; originalSize: number; newSize: number } | null>(null);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f); setResult(null);
    try {
      const buf = await readFileAsArrayBuffer(f);
      setPreviewData(new Uint8Array(buf));
      toast("PDF loaded", "success");
    } catch { toast("Failed to load PDF", "error"); }
  }, []);

  const handleCompress = async () => {
    if (!file) return;
    setProcessing(true); setProgress(0); setResult(null);
    try {
      for (let i = 0; i <= 70; i += 10) { await new Promise(r => setTimeout(r, 60)); setProgress(i); }
      const compressed = await compressPDF(file, level);
      setProgress(100);
      setResult({ data: compressed, originalSize: file.size, newSize: compressed.length });
      toast(`Compressed from ${formatBytes(file.size)} → ${formatBytes(compressed.length)}`, "success");
    } catch { toast("Compression failed", "error"); }
    finally { setProcessing(false); setTimeout(() => setProgress(0), 2000); }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    downloadBlob(new Blob([(result.data as Uint8Array).buffer as ArrayBuffer], { type: "application/pdf" }), `${getFileBaseName(file.name)}_compressed.pdf`);
  };

  const savedPct = result ? Math.round((1 - result.newSize / result.originalSize) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-green" style={{ marginBottom: "10px" }}><Minimize2 size={11} /> COMPRESS PDF</div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Compress PDF</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Reduce PDF file size while maintaining readability.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {!file ? (
            <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF here" icon={<Upload size={22} color="#10b981" />} />
          ) : (
            <div style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{file.name}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Original: {formatBytes(file.size)}</div>
              <button onClick={() => { setFile(null); setPreviewData(null); setResult(null); }}
                style={{ marginTop: "6px", fontSize: "11px", color: "#ef4444", cursor: "pointer", background: "none", border: "none", padding: 0 }}>Remove</button>
            </div>
          )}

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Compression Intensity</label>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#10b981" }}>{percent}%</span>
            </div>
            
            <input 
              type="range" 
              min="10" 
              max="100" 
              step="10" 
              value={percent}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setPercent(val);
                if (val <= 30) setLevel("low");
                else if (val <= 60) setLevel("medium");
                else if (val <= 80) setLevel("high");
                else setLevel("extreme");
              }}
              style={{ width: "100%", accentColor: "#10b981", marginBottom: "16px" }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {levels.map(l => (
                <button key={l.id} onClick={() => {
                  setLevel(l.id);
                  setPercent(l.id === "low" ? 20 : l.id === "medium" ? 50 : l.id === "high" ? 80 : 100);
                }} style={{
                  display: "flex", flexDirection: "column", gap: "4px", padding: "12px", borderRadius: "12px", cursor: "pointer", textAlign: "left",
                  background: level === l.id ? `${l.color}12` : "rgba(var(--color-invert-rgb), 0.03)",
                  border: `1px solid ${level === l.id ? l.color + "40" : "rgba(var(--color-invert-rgb), 0.06)"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: l.color, boxShadow: level === l.id ? `0 0 6px ${l.color}` : "none" }} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: level === l.id ? "white" : "rgba(var(--color-invert-rgb), 0.6)" }}>{l.label}</span>
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{l.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {processing && (
            <div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", textAlign: "center" }}>Compressing... {progress}%</p>
            </div>
          )}

          {result && (
            <div style={{ padding: "16px", borderRadius: "14px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>Compression Result</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <div><div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Original</div><div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>{formatBytes(result.originalSize)}</div></div>
                <div style={{ color: "#10b981", fontSize: "20px", fontWeight: 800 }}>→</div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Compressed</div><div style={{ fontSize: "16px", fontWeight: 700, color: "#10b981" }}>{formatBytes(result.newSize)}</div></div>
              </div>
              <div className="progress-bar"><div style={{ height: "100%", background: "#10b981", borderRadius: "2px", width: `${Math.max(5, savedPct)}%`, transition: "width 0.5s" }} /></div>
              <div style={{ fontSize: "13px", color: "var(--accent-green)", fontWeight: 600, textAlign: "center", marginTop: "6px" }}>
                {savedPct > 0 ? `Saved ${savedPct}%` : "File is already optimized"}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto" }}>
            <button className="btn-primary" onClick={handleCompress} disabled={!file || processing}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: !file ? 0.4 : 1, cursor: !file ? "not-allowed" : "pointer" }}>
              {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Compressing...</>
                : <><Minimize2 size={16} /> Compress PDF</>}
            </button>
            {result && (
              <button className="btn-secondary" onClick={handleDownload} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Download size={16} /> Download Compressed PDF
              </button>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Live Preview</div>
          <PDFViewer data={previewData} showControls={true} />
        </div>
      </div>
    </div>
  );
}
