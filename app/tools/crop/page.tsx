"use client";
import { useState, useCallback } from "react";
import { Crop, Upload, Download } from "lucide-react";
import { cropPDF, downloadBlob, formatBytes, readFileAsArrayBuffer, getFileBaseName } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

export default function CropPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [x, setX] = useState(0); const [y, setY] = useState(0);
  const [w, setW] = useState(500); const [h, setH] = useState(700);
  const [applyAll, setApplyAll] = useState(true);
  const [processing, setProcessing] = useState(false);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]; setFile(f);
    const buf = await readFileAsArrayBuffer(f);
    setPreviewData(new Uint8Array(buf));
    toast("PDF loaded", "success");
  }, []);

  const handleCrop = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const result = await cropPDF(file, { x, y, width: w, height: h }, applyAll);
      downloadBlob(new Blob([result.buffer as ArrayBuffer], { type: "application/pdf" }), `${getFileBaseName(file.name)}_cropped.pdf`);
      setPreviewData(result);
      toast("Cropped and downloaded!", "success");
    } catch { toast("Crop failed", "error"); }
    finally { setProcessing(false); }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-indigo" style={{ marginBottom: "10px" }}><Crop size={11} /> CROP PDF</div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "white" }}>Crop PDF</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "6px", fontSize: "14px" }}>Set the crop box for your PDF pages using precise coordinates.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {!file ? <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF here" icon={<Upload size={22} color="#a78bfa" />} />
            : <div style={{ padding: "10px", borderRadius: "10px", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{file.name} · {formatBytes(file.size)}<button onClick={() => { setFile(null); setPreviewData(null); }} style={{ marginLeft: "8px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}>Remove</button></div>}
          <div>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "10px" }}>Crop Box (PDF units, origin = bottom-left)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div><label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>X (left)</label><input className="input-field" type="number" value={x} onChange={e => setX(Number(e.target.value))} /></div>
              <div><label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>Y (bottom)</label><input className="input-field" type="number" value={y} onChange={e => setY(Number(e.target.value))} /></div>
              <div><label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>Width</label><input className="input-field" type="number" value={w} onChange={e => setW(Number(e.target.value))} /></div>
              <div><label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>Height</label><input className="input-field" type="number" value={h} onChange={e => setH(Number(e.target.value))} /></div>
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
            <input type="checkbox" checked={applyAll} onChange={e => setApplyAll(e.target.checked)} />
            Apply to all pages
          </label>
          <div style={{ padding: "10px", borderRadius: "10px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", fontSize: "11px", color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
            💡 A4 PDF is approx 595×842 units. Letter is 612×792. Start with these as Width×Height.
          </div>
          <button className="btn-primary" onClick={handleCrop} disabled={!file || processing} style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: !file ? 0.4 : 1 }}>
            {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Cropping...</> : <><Crop size={16} /> Crop & Download</>}
          </button>
        </div>
        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Live Preview</div>
          <PDFViewer data={previewData} showControls={true} />
        </div>
      </div>
    </div>
  );
}
