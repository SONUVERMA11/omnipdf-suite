"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Crop, Upload, Download, Maximize, Scan } from "lucide-react";
import { cropPDF, downloadBlob, formatBytes, readFileAsArrayBuffer, getFileBaseName } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

export default function CropPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  
  // Crop Box state in PDF points (origin = bottom-left)
  const [x, setX] = useState(0); 
  const [y, setY] = useState(0);
  const [w, setW] = useState(595); 
  const [h, setH] = useState(842);
  const [pageW, setPageW] = useState(595);
  const [pageH, setPageH] = useState(842);
  const [previewPage, setPreviewPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [targetPagesInput, setTargetPagesInput] = useState("all");
  const [processing, setProcessing] = useState(false);
  const [cropToBorder, setCropToBorder] = useState(false);
  const [targetPagesMode, setTargetPagesMode] = useState<"all" | "custom">("all");

  // Viewport mapping state
  const [viewport, setViewport] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]; setFile(f);
    const buf = await readFileAsArrayBuffer(f);
    setPreviewData(new Uint8Array(buf));
    toast("PDF loaded", "success");
    setViewport(null);
  }, []);

  const parsePageRange = (input: string, total: number): number[] | "all" => {
    if (input.trim().toLowerCase() === "all" || input.trim() === "") return "all";
    const pages = new Set<number>();
    const parts = input.split(",");
    for (const p of parts) {
      if (p.includes("-")) {
        const [start, end] = p.split("-").map(s => parseInt(s.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) pages.add(i);
        }
      } else {
        const num = parseInt(p.trim(), 10);
        if (!isNaN(num)) pages.add(num);
      }
    }
    return Array.from(pages).filter(p => p > 0 && p <= total);
  };

  const handleCrop = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const targets = parsePageRange(targetPagesInput, totalPages);
      if (targets !== "all" && targets.length === 0) {
        toast("Invalid page range", "error");
        setProcessing(false);
        return;
      }
      const result = await cropPDF(file, { x, y, width: w, height: h }, targets);
      downloadBlob(new Blob([result.buffer as ArrayBuffer], { type: "application/pdf" }), `${getFileBaseName(file.name)}_cropped.pdf`);
      // Update preview to show cropped version
      setPreviewData(result);
      toast("Cropped and downloaded!", "success");
    } catch { toast("Crop failed", "error"); }
    finally { setProcessing(false); }
  };

  const handleRenderCanvas = (canvas: HTMLCanvasElement, vp: any) => {
    canvasRef.current = canvas;
    setViewport(vp);
    const originalW = vp.width / vp.scale;
    const originalH = vp.height / vp.scale;
    setPageW(originalW);
    setPageH(originalH);
    // Initialize crop box to full page if it's the first time
    if (w === 595 && h === 842 && x === 0 && y === 0) {
      setW(Math.round(originalW));
      setH(Math.round(originalH));
      setX(0);
      setY(0);
    }
  };

  const autoCrop = () => {
    if (!canvasRef.current || !viewport) {
      toast("Preview not loaded yet", "error");
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    
    const rowCounts = new Int32Array(canvas.height);
    const colCounts = new Int32Array(canvas.width);
    
    for (let py = 0; py < canvas.height; py++) {
      for (let px = 0; px < canvas.width; px++) {
        const i = (py * canvas.width + px) * 4;
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        // non-white and non-transparent pixel
        const isBg = (a === 0) || (r > 245 && g > 245 && b > 245);
        if (!isBg) {
          rowCounts[py]++;
          colCounts[px]++;
          
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }
    }

    if (minX > maxX || minY > maxY) {
      toast("Page is blank", "error");
      return;
    }
    
    if (cropToBorder) {
      // Find the first row/col from outside-in that has a significant number of non-white pixels.
      // This ignores stray dots and noise, snapping to borders or dense content edges.
      const xThreshold = Math.max(10, canvas.height * 0.02);
      const yThreshold = Math.max(10, canvas.width * 0.02);
      
      let newMinX = minX, newMaxX = maxX, newMinY = minY, newMaxY = maxY;
      
      for(let px = 0; px < canvas.width; px++) { if (colCounts[px] > xThreshold) { newMinX = px; break; } }
      for(let px = canvas.width - 1; px >= 0; px--) { if (colCounts[px] > xThreshold) { newMaxX = px; break; } }
      for(let py = 0; py < canvas.height; py++) { if (rowCounts[py] > yThreshold) { newMinY = py; break; } }
      for(let py = canvas.height - 1; py >= 0; py--) { if (rowCounts[py] > yThreshold) { newMaxY = py; break; } }
      
      minX = newMinX;
      maxX = newMaxX;
      minY = newMinY;
      maxY = newMaxY;
    }

    // Add a small 10px margin around detected content
    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width, maxX + padding);
    maxY = Math.min(canvas.height, maxY + padding);

    // Convert to PDF points
    const scale = viewport.scale;
    const pdfX = Math.round(minX / scale);
    const pdfW = Math.round((maxX - minX) / scale);
    const pdfH = Math.round((maxY - minY) / scale);
    // PDF Y is from bottom
    const pdfY = Math.round(pageH - (maxY / scale));

    setX(pdfX);
    setY(pdfY);
    setW(pdfW);
    setH(pdfH);
    toast("Auto-cropped to content bounds", "success");
  };

  const extendArea = (margin: number) => {
    setX(x => x - margin);
    setY(y => y - margin);
    setW(w => w + margin * 2);
    setH(h => h + margin * 2);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-indigo" style={{ marginBottom: "10px" }}><Crop size={11} /> CROP PDF</div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)" }}>Crop PDF</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Set crop box interactively, auto-crop margins, or extend boundaries.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {!file ? <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF here" icon={<Upload size={22} color="#a78bfa" />} />
            : <div style={{ padding: "10px", borderRadius: "10px", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", fontSize: "12px", color: "var(--text-secondary)" }}>{file.name} · {formatBytes(file.size)}<button onClick={() => { setFile(null); setPreviewData(null); setViewport(null); }} style={{ marginLeft: "8px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}>Remove</button></div>}
          
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "10px" }}>Crop Box (PDF units)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div><label style={{ fontSize: "10px", color: "var(--text-muted)" }}>X (left)</label><input className="input-field" type="number" value={x} onChange={e => setX(Number(e.target.value))} /></div>
              <div><label style={{ fontSize: "10px", color: "var(--text-muted)" }}>Y (bottom)</label><input className="input-field" type="number" value={y} onChange={e => setY(Number(e.target.value))} /></div>
              <div><label style={{ fontSize: "10px", color: "var(--text-muted)" }}>Width</label><input className="input-field" type="number" min={1} value={w} onChange={e => setW(Number(e.target.value))} /></div>
              <div><label style={{ fontSize: "10px", color: "var(--text-muted)" }}>Height</label><input className="input-field" type="number" min={1} value={h} onChange={e => setH(Number(e.target.value))} /></div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button className="btn-secondary" onClick={autoCrop} disabled={!file} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px", padding: "8px" }}>
              <Scan size={14} /> Auto Crop
            </button>
            <button className="btn-secondary" onClick={() => extendArea(20)} disabled={!file} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px", padding: "8px" }}>
              <Maximize size={14} /> Extend (+20)
            </button>
          </div>
          
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)", marginTop: "-4px" }}>
            <input type="checkbox" checked={cropToBorder} onChange={e => setCropToBorder(e.target.checked)} />
            Crop to borders (ignore noise)
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Pages to Crop</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <select 
                className="select-field"
                value={targetPagesMode}
                onChange={e => {
                  setTargetPagesMode(e.target.value as "all" | "custom");
                  if (e.target.value === "all") setTargetPagesInput("all");
                  else setTargetPagesInput("");
                }}
                style={{ padding: "8px", width: "100px", fontSize: "12px", background: "rgba(var(--color-obverse-rgb), 0.2)", color: "var(--text-primary)", border: "1px solid rgba(var(--color-invert-rgb), 0.1)", borderRadius: "8px" }}
              >
                <option value="all">All</option>
                <option value="custom">Custom</option>
              </select>
              {targetPagesMode === "custom" && (
                <input 
                  className="input-field" 
                  value={targetPagesInput} 
                  onChange={e => setTargetPagesInput(e.target.value)} 
                  placeholder="e.g. 1-3, 5"
                  style={{ flex: 1 }}
                />
              )}
            </div>
          </div>

          <button className="btn-primary" onClick={handleCrop} disabled={!file || processing} style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: !file ? 0.4 : 1 }}>
            {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Cropping...</> : <><Crop size={16} /> Crop & Download</>}
          </button>
        </div>

        <div className="glass-card" style={{ padding: "16px", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Live Preview & Interactive Crop
            </span>
            {file && totalPages > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Preview Page:</span>
                <input 
                  type="number" 
                  min={1} 
                  max={totalPages} 
                  value={previewPage} 
                  onChange={e => setPreviewPage(Number(e.target.value))} 
                  style={{ width: "50px", padding: "2px 6px", borderRadius: "4px", background: "rgba(var(--color-invert-rgb), 0.1)", border: "none", color: "var(--text-primary)", fontSize: "11px", textAlign: "center" }}
                />
              </div>
            )}
          </div>
          <PDFViewer 
            data={previewData} 
            showControls={true} 
            pageNumber={previewPage}
            onPageCount={setTotalPages}
            onRenderCanvas={handleRenderCanvas}
          >
            {viewport && (
              <CropOverlay 
                x={x} y={y} w={w} h={h} 
                pageW={pageW} pageH={pageH} 
                scale={viewport.scale}
                onChange={(nx: number, ny: number, nw: number, nh: number) => {
                  setX(Math.round(nx));
                  setY(Math.round(ny));
                  setW(Math.round(nw));
                  setH(Math.round(nh));
                }}
              />
            )}
          </PDFViewer>
        </div>
      </div>
    </div>
  );
}

// ─── Interactive Overlay ──────────────────────────────────────────────────

function CropOverlay({ x, y, w, h, pageW, pageH, scale, onChange }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<"move" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startBox, setStartBox] = useState({ x, y, w, h });

  // Convert PDF coordinates to DOM pixels for rendering
  const domLeft = x * scale;
  const domW = w * scale;
  const domH = h * scale;
  // PDF Y is from bottom-left, DOM top is from top-left
  const domTop = (pageH - y - h) * scale;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const dx = (e.clientX - startPos.x) / scale;
      const dy = (e.clientY - startPos.y) / scale; // +dy means mouse moved down

      let nx = startBox.x;
      let ny = startBox.y;
      let nw = startBox.w;
      let nh = startBox.h;

      if (isDragging === "move") {
        nx += dx;
        ny -= dy; // mouse down (dy>0) means PDF y decreases
      } else {
        if (isDragging.includes("left")) { nx += dx; nw -= dx; }
        if (isDragging.includes("right")) { nw += dx; }
        if (isDragging.includes("top")) { nh -= dy; } // mouse down -> height shrinks, y doesn't change since it's bottom
        if (isDragging.includes("bottom")) { ny -= dy; nh += dy; }
      }

      // Prevent negative dimensions
      if (nw < 10) nw = 10;
      if (nh < 10) nh = 10;

      onChange(nx, ny, nw, nh);
    };

    const handleMouseUp = () => setIsDragging(null);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, startPos, startBox, scale, onChange]);

  const handlePointerDown = (type: any) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(type);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartBox({ x, y, w, h });
  };

  const handleStyle: React.CSSProperties = {
    position: "absolute", width: "12px", height: "12px", background: "#6366f1", border: "2px solid white", borderRadius: "50%",
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: "none", // Let clicks pass through except on the crop box
        overflow: "visible"
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `${domLeft}px`,
          top: `${domTop}px`,
          width: `${domW}px`,
          height: `${domH}px`,
          border: "2px dashed #6366f1",
          background: "rgba(99,102,241,0.1)",
          boxShadow: "0 0 0 9999px rgba(var(--color-obverse-rgb), 0.5)",
          pointerEvents: "auto",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onPointerDown={handlePointerDown("move")}
      >
        {/* Resize Handles */}
        <div style={{ ...handleStyle, top: "-6px", left: "-6px", cursor: "nwse-resize" }} onPointerDown={handlePointerDown("top-left")} />
        <div style={{ ...handleStyle, top: "-6px", right: "-6px", cursor: "nesw-resize" }} onPointerDown={handlePointerDown("top-right")} />
        <div style={{ ...handleStyle, bottom: "-6px", left: "-6px", cursor: "nesw-resize" }} onPointerDown={handlePointerDown("bottom-left")} />
        <div style={{ ...handleStyle, bottom: "-6px", right: "-6px", cursor: "nwse-resize" }} onPointerDown={handlePointerDown("bottom-right")} />
        
        <div style={{ ...handleStyle, top: "-6px", left: "calc(50% - 6px)", cursor: "ns-resize" }} onPointerDown={handlePointerDown("top")} />
        <div style={{ ...handleStyle, bottom: "-6px", left: "calc(50% - 6px)", cursor: "ns-resize" }} onPointerDown={handlePointerDown("bottom")} />
        <div style={{ ...handleStyle, left: "-6px", top: "calc(50% - 6px)", cursor: "ew-resize" }} onPointerDown={handlePointerDown("left")} />
        <div style={{ ...handleStyle, right: "-6px", top: "calc(50% - 6px)", cursor: "ew-resize" }} onPointerDown={handlePointerDown("right")} />
      </div>
    </div>
  );
}
