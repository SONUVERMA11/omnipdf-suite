"use client";

import { useState, useRef, useCallback } from "react";
import { FileSignature, Upload, Download, PenTool, Type } from "lucide-react";
import { addSignature, downloadBlob, formatBytes, readFileAsArrayBuffer, getFileBaseName } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

type SignMode = "draw" | "type" | "upload";

const CURSIVE_FONTS = ["Dancing Script", "Pacifico", "Great Vibes", "Satisfy"];

export default function SignPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [mode, setMode] = useState<SignMode>("draw");
  const [signDataUrl, setSignDataUrl] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [typedFont, setTypedFont] = useState(CURSIVE_FONTS[0]);
  const [placement, setPlacement] = useState({ pageIndex: 0, x: 100, y: 100, width: 200, height: 80 });
  const [processing, setProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    const buf = await readFileAsArrayBuffer(f);
    setPreviewData(new Uint8Array(buf));
    toast("PDF loaded", "success");
  }, []);

  // Canvas drawing
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };
  const endDraw = () => {
    drawingRef.current = false;
    setSignDataUrl(canvasRef.current?.toDataURL("image/png") ?? null);
  };
  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, 400, 160);
    setSignDataUrl(null);
  };

  const makeTypedSignature = (): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 400; canvas.height = 120;
    const ctx = canvas.getContext("2d")!;
    ctx.font = `60px '${typedFont}', cursive`;
    ctx.fillStyle = "#1e1b4b";
    ctx.fillText(typedName, 20, 90);
    return canvas.toDataURL("image/png");
  };

  const handleApply = async () => {
    if (!file) { toast("Upload a PDF first", "warning"); return; }
    let dataUrl = signDataUrl;
    if (mode === "type") {
      if (!typedName.trim()) { toast("Enter your name", "warning"); return; }
      dataUrl = makeTypedSignature();
    }
    if (!dataUrl) { toast("Create your signature first", "warning"); return; }
    setProcessing(true);
    try {
      const result = await addSignature(file, dataUrl, placement);
      downloadBlob(new Blob([result.buffer as ArrayBuffer], { type: "application/pdf" }), `${getFileBaseName(file.name)}_signed.pdf`);
      setPreviewData(result);
      toast("Signature applied and downloaded!", "success");
    } catch { toast("Failed to add signature", "error"); }
    finally { setProcessing(false); }
  };

  const modes: { id: SignMode; label: string }[] = [
    { id: "draw", label: "Draw" },
    { id: "type", label: "Type" },
    { id: "upload", label: "Upload" },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-pink" style={{ marginBottom: "10px", background: "rgba(236,72,153,0.15)", color: "#f9a8d4", border: "1px solid rgba(236,72,153,0.25)", display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "999px", fontSize: "12px" }}>
          <FileSignature size={11} /> SIGN PDF
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>Sign PDF</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "6px", fontSize: "14px" }}>Draw, type, or upload your signature and place it on the PDF.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {!file ? (
            <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF here" icon={<Upload size={22} color="#ec4899" />} />
          ) : (
            <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", fontSize: "12px" }}>
              <div style={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{file.name}</div>
              <div style={{ color: "rgba(255,255,255,0.3)" }}>{formatBytes(file.size)}</div>
              <button onClick={() => { setFile(null); setPreviewData(null); }} style={{ marginTop: "4px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}>Remove</button>
            </div>
          )}

          <div style={{ display: "flex", gap: "6px" }}>
            {modes.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                flex: 1, padding: "9px", borderRadius: "10px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
                background: mode === m.id ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${mode === m.id ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.06)"}`,
                color: mode === m.id ? "#f9a8d4" : "rgba(255,255,255,0.4)",
              }}>{m.label}</button>
            ))}
          </div>

          {mode === "draw" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Draw your signature</label>
                <button onClick={clearCanvas} style={{ fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
              </div>
              <canvas ref={canvasRef} width={360} height={140}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                style={{ width: "100%", height: "140px", borderRadius: "12px", background: "rgba(255,255,255,0.97)", cursor: "crosshair", display: "block", border: "2px dashed rgba(99,102,241,0.3)" }}
              />
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "6px" }}>Sign in the white area above</p>
            </div>
          )}

          {mode === "type" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px" }}>Your Name</label>
                <input className="input-field" value={typedName} onChange={e => setTypedName(e.target.value)} placeholder="Type your full name" />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>Signature Style</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {CURSIVE_FONTS.map(f => (
                    <button key={f} onClick={() => setTypedFont(f)} style={{
                      padding: "10px 14px", borderRadius: "10px", cursor: "pointer", textAlign: "left",
                      background: typedFont === f ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${typedFont === f ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}`,
                      fontSize: "20px", color: typedFont === f ? "#a5b4fc" : "rgba(255,255,255,0.6)",
                      fontFamily: `'${f}', cursive`,
                    }}>{typedName || "Your Signature"}</button>
                  ))}
                </div>
              </div>
              <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script&family=Pacifico&family=Great+Vibes&family=Satisfy&display=swap" />
            </div>
          )}

          {mode === "upload" && (
            <DropZone onFiles={async (files) => {
              const f = files[0];
              const dataUrl = await new Promise<string>(r => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(f); });
              setSignDataUrl(dataUrl);
              toast("Signature image loaded", "success");
            }} accept=".png,.jpg,.jpeg" multiple={false} label="Upload signature image" sublabel="PNG with transparent background works best" />
          )}

          {/* Placement controls */}
          <div>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>Placement</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div><label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>Page</label><input className="input-field" type="number" min={1} value={placement.pageIndex + 1} onChange={e => setPlacement(p => ({ ...p, pageIndex: Number(e.target.value) - 1 }))} /></div>
              <div><label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>Width (px)</label><input className="input-field" type="number" value={placement.width} onChange={e => setPlacement(p => ({ ...p, width: Number(e.target.value) }))} /></div>
              <div><label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>X</label><input className="input-field" type="number" value={placement.x} onChange={e => setPlacement(p => ({ ...p, x: Number(e.target.value) }))} /></div>
              <div><label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>Y</label><input className="input-field" type="number" value={placement.y} onChange={e => setPlacement(p => ({ ...p, y: Number(e.target.value) }))} /></div>
            </div>
          </div>

          <button className="btn-primary" onClick={handleApply} disabled={!file || processing}
            style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: !file ? 0.4 : 1, background: "linear-gradient(135deg, #ec4899, #be185d)" }}>
            {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Signing...</>
              : <><FileSignature size={16} /> Apply Signature & Download</>}
          </button>
        </div>

        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>PDF Preview</div>
          <PDFViewer data={previewData} pageNumber={placement.pageIndex + 1} showControls={true} />
        </div>
      </div>
    </div>
  );
}
