"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Camera, Download, RotateCw, RefreshCw, Sun, Contrast, FileText } from "lucide-react";
import { imagesToPDF, downloadBlob } from "@/lib/pdf/engine";
import { toast } from "@/components/ui/Toaster";

type Filter = "original" | "grayscale" | "blackwhite" | "whiteboard" | "vivid";

const FILTERS: Record<Filter, string> = {
  original: "none",
  grayscale: "grayscale(1)",
  blackwhite: "grayscale(1) contrast(1.8) brightness(1.1)",
  whiteboard: "grayscale(1) contrast(2) brightness(1.3)",
  vivid: "saturate(1.4) contrast(1.1)",
};

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [filter, setFilter] = useState<Filter>("original");
  const [captures, setCaptures] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setCameraError(null);
    } catch (e: any) {
      setCameraError(e.message || "Camera access denied");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  useEffect(() => () => { stopCamera(); }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.filter = FILTERS[filter];
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCaptures(prev => [...prev, dataUrl]);
    toast("Page captured!", "success");
  };

  const removeCapture = (i: number) => setCaptures(prev => prev.filter((_, j) => j !== i));

  const exportPDF = async () => {
    if (!captures.length) { toast("Capture at least one page", "warning"); return; }
    setProcessing(true);
    try {
      const files: File[] = captures.map((dataUrl, i) => {
        const arr = dataUrl.split(",")[1];
        const bin = atob(arr);
        const bytes = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
        return new File([bytes], `scan_${i + 1}.jpg`, { type: "image/jpeg" });
      });
      const pdf = await imagesToPDF(files, "a4", 20);
      downloadBlob(new Blob([(pdf as Uint8Array).buffer as ArrayBuffer], { type: "application/pdf" }), "scanned_document.pdf");
      toast(`Exported ${captures.length}-page scanned PDF`, "success");
    } catch { toast("Export failed", "error"); }
    finally { setProcessing(false); }
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "original", label: "Color" },
    { id: "vivid", label: "Vivid" },
    { id: "grayscale", label: "Gray" },
    { id: "whiteboard", label: "Board" },
    { id: "blackwhite", label: "B&W" },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-indigo" style={{ marginBottom: "10px" }}>
          <Camera size={11} /> DOCUMENT SCANNER
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>Document Scanner</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "6px", fontSize: "14px" }}>
          Use your camera to scan documents. Apply filters and export as PDF.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        {/* Camera view */}
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", background: "rgba(0,0,0,0.4)", minHeight: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {stream ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted
                  style={{ width: "100%", borderRadius: "16px", display: "block", filter: FILTERS[filter] }} />
                {/* Scan guide overlay */}
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  <div style={{ position: "absolute", top: "10%", left: "10%", right: "10%", bottom: "10%", border: "2px solid rgba(99,102,241,0.6)", borderRadius: "8px" }} />
                  <div className="scan-line" />
                  {/* Corner markers */}
                  {["top-left", "top-right", "bottom-left", "bottom-right"].map(pos => (
                    <div key={pos} style={{
                      position: "absolute",
                      width: "20px", height: "20px",
                      borderColor: "#6366f1",
                      borderStyle: "solid",
                      borderWidth: pos.includes("top") ? "2px 0 0 2px" : "0 2px 2px 0",
                      ...(pos.includes("top") ? { top: "10%", [pos.includes("left") ? "left" : "right"]: "10%" } : { bottom: "10%", [pos.includes("left") ? "left" : "right"]: "10%" }),
                    }} />
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={28} color="#6366f1" />
                </div>
                <div>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600, marginBottom: "6px" }}>Camera not active</p>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
                    {cameraError || "Click 'Start Camera' to begin scanning"}
                  </p>
                </div>
                <button className="btn-primary" onClick={startCamera} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Camera size={16} /> Start Camera
                </button>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Filter selector */}
          {stream && (
            <>
              <div style={{ display: "flex", gap: "6px" }}>
                {filters.map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id)} style={{
                    flex: 1, padding: "8px 4px", borderRadius: "10px", fontSize: "11px", cursor: "pointer", fontWeight: 500,
                    background: filter === f.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${filter === f.id ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`,
                    color: filter === f.id ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                  }}>{f.label}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn-primary" onClick={capture}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "15px" }}>
                  <Camera size={18} /> Capture Page
                </button>
                <button className="btn-secondary" onClick={stopCamera}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "12px 16px" }}>
                  <RefreshCw size={14} /> Stop
                </button>
              </div>
            </>
          )}
        </div>

        {/* Captures panel */}
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Scanned Pages ({captures.length})
            </span>
            {captures.length > 0 && (
              <button onClick={() => setCaptures([])} style={{ fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {captures.map((src, i) => (
              <div key={i} style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                <img src={src} alt={`Scan ${i + 1}`} style={{ width: "100%", display: "block" }} />
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "6px 8px", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>Page {i + 1}</span>
                  <button onClick={() => removeCapture(i)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
                </div>
              </div>
            ))}
            {!captures.length && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>
                Captured pages will appear here
              </div>
            )}
          </div>

          <button className="btn-primary" onClick={exportPDF} disabled={!captures.length || processing}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: !captures.length ? 0.4 : 1 }}>
            {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Exporting...</>
              : <><FileText size={16} /> Export as PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}
