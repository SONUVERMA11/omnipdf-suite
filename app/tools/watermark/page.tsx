"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Droplets, Upload, Download } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { addWatermark, downloadBlob, formatBytes, readFileAsArrayBuffer, getFileBaseName, type WatermarkOptions } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [tab, setTab] = useState<"text" | "image">("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [color, setColor] = useState("#6366f1");
  const [showPicker, setShowPicker] = useState(false);
  const [opacity, setOpacity] = useState(0.3);
  const [fontSize, setFontSize] = useState(60);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState<"center" | "tile" | "diagonal">("diagonal");
  const [pages, setPages] = useState<"all" | "first" | "last">("all");
  const [processing, setProcessing] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f); setResultData(null);
    const buf = await readFileAsArrayBuffer(f);
    const data = new Uint8Array(buf);
    setPreviewData(data);
    toast("PDF loaded", "success");
  }, []);

  // Auto-apply watermark with debounce for live preview
  useEffect(() => {
    if (!file || !text.trim()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(async () => {
      try {
        const { r, g, b } = hexToRgb(color);
        const pagesOpt: "all" | number[] = pages === "all" ? "all" : [pages === "first" ? 1 : -1];
        const result = await addWatermark(file, { text, opacity, rotation, fontSize, color: { r, g, b }, position, pages: pagesOpt });
        setResultData(result);
      } catch {}
    }, 600);
    setDebounceTimer(timer);
    return () => clearTimeout(timer);
  }, [file, text, color, opacity, rotation, fontSize, position, pages]);

  const handleDownload = async () => {
    if (!resultData || !file) return;
    setProcessing(true);
    try {
      downloadBlob(new Blob([(resultData as Uint8Array).buffer as ArrayBuffer], { type: "application/pdf" }), `${getFileBaseName(file.name)}_watermarked.pdf`);
      toast("Downloaded!", "success");
    } finally { setProcessing(false); }
  };

  const positions: { id: "center" | "tile" | "diagonal"; label: string }[] = [
    { id: "center", label: "Center" },
    { id: "diagonal", label: "Diagonal" },
    { id: "tile", label: "Tile" },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge" style={{ marginBottom: "10px", background: "rgba(6,182,212,0.15)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.25)", display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "999px", fontSize: "12px" }}>
          <Droplets size={11} /> WATERMARK
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Add Watermark</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Live preview updates as you change settings.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
          {!file ? (
            <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF here" icon={<Upload size={22} color="#06b6d4" />} />
          ) : (
            <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", fontSize: "12px", color: "var(--text-secondary)" }}>
              {file.name} · {formatBytes(file.size)}
              <button onClick={() => { setFile(null); setPreviewData(null); setResultData(null); }} style={{ marginLeft: "8px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}>Remove</button>
            </div>
          )}

          {/* Tab */}
          <div style={{ display: "flex", gap: "6px" }}>
            {(["text", "image"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "8px", borderRadius: "10px", fontSize: "12px", fontWeight: 500, cursor: "pointer", textTransform: "capitalize",
                background: tab === t ? "rgba(99,102,241,0.2)" : "rgba(var(--color-invert-rgb), 0.03)",
                border: `1px solid ${tab === t ? "rgba(99,102,241,0.4)" : "rgba(var(--color-invert-rgb), 0.06)"}`,
                color: tab === t ? "var(--accent-active-text)" : "rgba(var(--color-invert-rgb), 0.4)",
              }}>{t === "text" ? "Text Watermark" : "Image Watermark"}</button>
            ))}
          </div>

          {tab === "text" && (
            <>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Watermark Text</label>
                <input className="input-field" value={text} onChange={e => setText(e.target.value)} placeholder="CONFIDENTIAL" />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Font Size: {fontSize}pt</label>
                <input type="range" min={12} max={120} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Opacity: {Math.round(opacity * 100)}%</label>
                <input type="range" min={5} max={100} value={opacity * 100} onChange={e => setOpacity(Number(e.target.value) / 100)} />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Rotation: {rotation}°</label>
                <input type="range" min={-180} max={180} value={rotation} onChange={e => setRotation(Number(e.target.value))} />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Color</label>
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowPicker(p => !p)} style={{
                    display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "12px", width: "100%",
                    background: "rgba(var(--color-invert-rgb), 0.04)", border: "1px solid rgba(var(--color-invert-rgb), 0.08)", cursor: "pointer",
                  }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "6px", background: color, border: "2px solid rgba(var(--color-invert-rgb), 0.2)" }} />
                    <span style={{ color: "var(--text-primary)", fontSize: "13px" }}>{color.toUpperCase()}</span>
                  </button>
                  {showPicker && (
                    <div style={{ position: "absolute", zIndex: 10, top: "48px", left: 0 }}>
                      <HexColorPicker color={color} onChange={setColor} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>Position</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {positions.map(p => (
                    <button key={p.id} onClick={() => setPosition(p.id)} style={{
                      flex: 1, padding: "8px", borderRadius: "10px", fontSize: "11px", cursor: "pointer",
                      background: position === p.id ? "rgba(99,102,241,0.2)" : "rgba(var(--color-invert-rgb), 0.03)",
                      border: `1px solid ${position === p.id ? "rgba(99,102,241,0.4)" : "rgba(var(--color-invert-rgb), 0.06)"}`,
                      color: position === p.id ? "var(--accent-active-text)" : "rgba(var(--color-invert-rgb), 0.4)",
                    }}>{p.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>Apply to Pages</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {(["all", "first", "last"] as const).map(p => (
                    <button key={p} onClick={() => setPages(p)} style={{
                      flex: 1, padding: "8px", borderRadius: "10px", fontSize: "11px", cursor: "pointer", textTransform: "capitalize",
                      background: pages === p ? "rgba(99,102,241,0.2)" : "rgba(var(--color-invert-rgb), 0.03)",
                      border: `1px solid ${pages === p ? "rgba(99,102,241,0.4)" : "rgba(var(--color-invert-rgb), 0.06)"}`,
                      color: pages === p ? "var(--accent-active-text)" : "rgba(var(--color-invert-rgb), 0.4)",
                    }}>{p}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === "image" && (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              Upload a PNG image to use as watermark
              <DropZone onFiles={() => {}} accept=".png,.jpg,.jpeg" multiple={false} label="Drop image here" className="mt-3" />
            </div>
          )}

          <button className="btn-primary" onClick={handleDownload} disabled={!resultData || processing}
            style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: !resultData ? 0.4 : 1 }}>
            <Download size={16} /> Download Watermarked PDF
          </button>
        </div>

        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Live Preview</span>
            {resultData && <span className="badge badge-green" style={{ fontSize: "10px" }}>● Auto-updating</span>}
          </div>
          <PDFViewer data={resultData ?? previewData} showControls={true} />
        </div>
      </div>
    </div>
  );
}
