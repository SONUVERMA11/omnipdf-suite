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
  const [flash, setFlash] = useState(false);

  const startCamera = async () => {
    try {
      let s;
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      } catch (err) {
        // Fallback for desktop cameras which don't support environment facingMode
        s = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      }
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setCameraError(null);
    } catch (e: any) {
      setCameraError(e.message || "Camera access denied or no camera found");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  useEffect(() => () => { stopCamera(); }, []);

  const capture = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

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
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Document Scanner</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
          Use your camera to scan documents. Apply filters and export as PDF.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        {/* Camera view */}
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", background: "rgba(var(--color-obverse-rgb), 0.4)", minHeight: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {stream ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted
                  style={{ width: "100%", borderRadius: "16px", display: "block", filter: FILTERS[filter] }} />
                {/* Scan guide overlay */}
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ position: "absolute", top: "15%", left: "10%", right: "10%", bottom: "15%", border: "2px solid rgba(10, 132, 255, 0.8)", borderRadius: "12px", boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)" }} />
                  <div className="scan-line" style={{ background: "linear-gradient(90deg, transparent, #0a84ff, #64d2ff, #0a84ff, transparent)", boxShadow: "0 0 15px rgba(10, 132, 255, 0.8)" }} />
                  {/* Corner markers */}
                  {["top-left", "top-right", "bottom-left", "bottom-right"].map(pos => (
                    <div key={pos} style={{
                      position: "absolute",
                      width: "30px", height: "30px",
                      borderColor: "#0a84ff",
                      borderStyle: "solid",
                      borderWidth: pos.includes("top") ? "4px 0 0 4px" : "0 4px 4px 0",
                      ...(pos.includes("top") ? { top: "15%", [pos.includes("left") ? "left" : "right"]: "10%" } : { bottom: "15%", [pos.includes("left") ? "left" : "right"]: "10%" }),
                      transform: pos === "top-right" ? "rotate(90deg)" : pos === "bottom-left" ? "rotate(90deg)" : "none"
                    }} />
                  ))}
                  {/* Viewfinder crosshairs */}
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ position: "absolute", width: "2px", height: "100%", background: "rgba(255,255,255,0.3)" }} />
                    <div style={{ position: "absolute", width: "100%", height: "2px", background: "rgba(255,255,255,0.3)" }} />
                  </div>
                  {/* Flash effect */}
                  {flash && <div style={{ position: "absolute", inset: 0, background: "white", zIndex: 10 }} />}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={28} color="#6366f1" />
                </div>
                <div>
                  <p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: "6px" }}>Camera not active</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
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
                    background: filter === f.id ? "rgba(99,102,241,0.2)" : "rgba(var(--color-invert-rgb), 0.04)",
                    border: `1px solid ${filter === f.id ? "rgba(99,102,241,0.4)" : "rgba(var(--color-invert-rgb), 0.06)"}`,
                    color: filter === f.id ? "var(--accent-active-text)" : "rgba(var(--color-invert-rgb), 0.4)",
                  }}>{f.label}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "16px", alignItems: "center", justifyContent: "center", marginTop: "10px" }}>
                <button className="btn-secondary" onClick={stopCamera}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "12px 16px", borderRadius: "50%", width: "50px", height: "50px", justifyContent: "center" }}>
                  <RefreshCw size={18} />
                </button>
                <button onClick={capture}
                  style={{ 
                    width: "72px", height: "72px", borderRadius: "50%", background: "var(--accent-primary)", 
                    border: "4px solid rgba(255,255,255,0.2)", cursor: "pointer", 
                    boxShadow: "0 0 0 2px var(--accent-primary), 0 8px 24px var(--glow-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.1s"
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                  onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "white" }} />
                </button>
                <div style={{ width: "50px" }} /> {/* Spacer for alignment */}
              </div>
            </>
          )}
        </div>

        {/* Captures panel */}
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Scanned Pages ({captures.length})
            </span>
            {captures.length > 0 && (
              <button onClick={() => setCaptures([])} style={{ fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {captures.map((src, i) => (
              <div key={i} style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(var(--color-invert-rgb), 0.08)" }}>
                <img src={src} alt={`Scan ${i + 1}`} style={{ width: "100%", display: "block" }} />
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "6px 8px", background: "rgba(var(--color-obverse-rgb), 0.5)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-primary)" }}>Page {i + 1}</span>
                  <button onClick={() => removeCapture(i)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>✕</button>
                </div>
              </div>
            ))}
            {!captures.length && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
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
