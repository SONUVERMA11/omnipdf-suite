"use client";

import { useState, useCallback, useRef } from "react";
import { Edit3, Upload, Download, Type, Image as ImageIcon, Trash2, CheckCircle2 } from "lucide-react";
import { Rnd } from "react-rnd";
import { addTextAnnotations, addSignature, downloadBlob, formatBytes, readFileAsArrayBuffer, getFileBaseName } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

type ElementType = "text" | "image";

interface CanvasElement {
  id: string;
  type: ElementType;
  content: string; // text content or base64 data url for images
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  fontSize?: number;
}

export default function EditPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Uint8Array | null>(null);
  
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(1.2);
  const [viewportDims, setViewportDims] = useState<{width: number, height: number} | null>(null);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]; setFile(f); setResult(null); setElements([]);
    const buf = await readFileAsArrayBuffer(f);
    setPreviewData(new Uint8Array(buf));
    toast("PDF loaded", "success");
  }, []);

  const addText = () => {
    setElements(prev => [...prev, {
      id: Date.now().toString(),
      type: "text",
      content: "Type here...",
      x: 50, y: 50,
      width: 200, height: 40,
      page: currentPage,
      fontSize: 16
    }]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setElements(prev => [...prev, {
          id: Date.now().toString(),
          type: "image",
          content: ev.target!.result as string,
          x: 50, y: 50,
          width: 200, height: 200,
          page: currentPage
        }]);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const removeElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedId(null);
  };

  const handleApply = async () => {
    if (!file || !viewportDims) return;
    setProcessing(true);
    try {
      let currentFile = file;
      
      // We must scale coordinates from screen (css pixels) to PDF (points)
      // PDF points are typically 72 DPI. pdf-lib uses coordinate system from bottom-left!
      // However, engine.ts addTextAnnotations expects y from top-left. Let's rely on that.
      const scaleX = 1 / canvasScale;
      const scaleY = 1 / canvasScale;
      
      // Process Text
      const texts = elements.filter(e => e.type === "text");
      if (texts.length > 0) {
        const out = await addTextAnnotations(currentFile, texts.map(t => ({
          pageIndex: t.page - 1,
          text: t.content,
          x: t.x * scaleX,
          y: t.y * scaleY + (t.fontSize || 16), // Adjust for baseline
          fontSize: (t.fontSize || 16) * scaleX,
          color: { r: 0, g: 0, b: 0 }
        })));
        currentFile = new File([out.buffer as ArrayBuffer], "temp.pdf", { type: "application/pdf" });
      }

      // Process Images (Signatures)
      const images = elements.filter(e => e.type === "image");
      for (const img of images) {
        const out = await addSignature(currentFile, img.content, {
          pageIndex: img.page - 1,
          x: img.x * scaleX,
          y: viewportDims.height * scaleY - (img.y * scaleY) - (img.height * scaleY), // pdf-lib draws from bottom-left for images!
          width: img.width * scaleX,
          height: img.height * scaleY
        });
        currentFile = new File([out.buffer as ArrayBuffer], "temp.pdf", { type: "application/pdf" });
      }

      const finalBuf = await readFileAsArrayBuffer(currentFile);
      setResult(new Uint8Array(finalBuf));
      setPreviewData(new Uint8Array(finalBuf));
      setElements([]); // Clear canvas
      toast("All edits applied!", "success");
    } catch (err) {
      console.error(err);
      toast("Failed to apply edits", "error");
    } finally {
      setProcessing(false);
    }
  };

  // Only show elements for the current page
  const pageElements = elements.filter(el => el.page === currentPage);

  return (
    <div style={{ minHeight: "100vh", padding: "32px", background: "var(--bg-primary)" }}>
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="badge badge-indigo" style={{ marginBottom: "10px" }}><Edit3 size={11} /> PREMIUM EDITOR</div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>Advanced Edit PDF</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "15px" }}>Drag, drop, and resize text and images onto your document.</p>
        </div>
        
        {file && (
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn-secondary" onClick={() => { setFile(null); setPreviewData(null); setResult(null); setElements([]); }} style={{ color: "#ef4444" }}>
              <Trash2 size={16} /> Discard
            </button>
            <button className="btn-primary" onClick={handleApply} disabled={processing || elements.length === 0}
              style={{ display: "flex", alignItems: "center", gap: "8px", opacity: elements.length === 0 ? 0.5 : 1 }}>
              {processing ? <div className="spinner" /> : <CheckCircle2 size={18} />} Apply {elements.length} Edits
            </button>
            {result && elements.length === 0 && (
              <button className="btn-primary" onClick={() => downloadBlob(new Blob([(result as Uint8Array).buffer as ArrayBuffer], { type: "application/pdf" }), `${getFileBaseName(file.name)}_edited.pdf`)}
                style={{ background: "var(--accent-green)" }}>
                <Download size={18} /> Download
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px", minHeight: "calc(100vh - 200px)" }}>
        {/* Left Tools Panel */}
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", height: "fit-content" }}>
          {!file ? (
            <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF here" icon={<Upload size={24} color="var(--accent-primary)" />} />
          ) : (
            <>
              <div style={{ padding: "16px", borderRadius: "14px", background: "rgba(0,122,255,0.05)", border: "1px solid rgba(0,122,255,0.15)" }}>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{formatBytes(file.size)} · {pageCount} Pages</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <h3 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: "4px" }}>Add Elements</h3>
                
                <button onClick={addText} className="btn-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px", width: "100%", padding: "14px" }}>
                  <Type size={18} color="var(--accent-primary)" /> Add Text Block
                </button>
                
                <label className="btn-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px", width: "100%", padding: "14px", cursor: "pointer", margin: 0 }}>
                  <ImageIcon size={18} color="var(--accent-pink)" /> Add Image / Signature
                  <input type="file" accept="image/png, image/jpeg" style={{ display: "none" }} onChange={handleImageUpload} />
                </label>
              </div>

              {selectedId && (
                <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h3 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>Properties</h3>
                  {elements.find(e => e.id === selectedId)?.type === "text" && (
                    <div>
                      <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>Font Size</label>
                      <input type="range" min="10" max="72" 
                        value={elements.find(e => e.id === selectedId)?.fontSize || 16} 
                        onChange={e => updateElement(selectedId, { fontSize: Number(e.target.value) })} 
                      />
                    </div>
                  )}
                  <button onClick={() => removeElement(selectedId)} className="btn-secondary" style={{ color: "var(--accent-red)", marginTop: "8px" }}>
                    <Trash2 size={16} /> Delete Element
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Canvas Panel */}
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Interactive Canvas</span>
            {file && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="btn-secondary" style={{ padding: "6px 12px", height: "auto" }}>Prev</button>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>Page {currentPage} of {pageCount}</span>
                <button onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))} className="btn-secondary" style={{ padding: "6px 12px", height: "auto" }}>Next</button>
              </div>
            )}
          </div>
          
          <div style={{ flex: 1, background: "rgba(0,0,0,0.02)", borderRadius: "12px", border: "1px solid rgba(var(--color-invert-rgb), 0.05)", overflow: "auto", display: "flex", justifyContent: "center", padding: "20px" }}>
            {previewData ? (
              <PDFViewer 
                data={previewData} 
                pageNumber={currentPage} 
                scale={canvasScale}
                onPageCount={setPageCount}
                showControls={false}
                onRenderCanvas={(canvas, viewport) => setViewportDims({ width: viewport.width, height: viewport.height })}
              >
                {/* Drag and Drop Layer */}
                {pageElements.map(el => (
                  <Rnd
                    key={el.id}
                    size={{ width: el.width, height: el.height }}
                    position={{ x: el.x, y: el.y }}
                    onDragStop={(e, d) => { updateElement(el.id, { x: d.x, y: d.y }); setSelectedId(el.id); }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      updateElement(el.id, {
                        width: parseInt(ref.style.width),
                        height: parseInt(ref.style.height),
                        ...position
                      });
                      setSelectedId(el.id);
                    }}
                    bounds="parent"
                    onClick={() => setSelectedId(el.id)}
                    style={{
                      border: selectedId === el.id ? "2px dashed var(--accent-primary)" : "1px solid transparent",
                      background: el.type === "text" && selectedId === el.id ? "rgba(255,255,255,0.8)" : "transparent",
                      cursor: "move",
                      zIndex: selectedId === el.id ? 10 : 1
                    }}
                  >
                    {el.type === "text" ? (
                      <textarea
                        value={el.content}
                        onChange={(e) => updateElement(el.id, { content: e.target.value })}
                        style={{
                          width: "100%", height: "100%", background: "transparent", border: "none", resize: "none",
                          fontSize: `${el.fontSize || 16}px`, color: "black", outline: "none", padding: "4px",
                          fontFamily: "Helvetica, Arial, sans-serif"
                        }}
                      />
                    ) : (
                      <img src={el.content} style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
                    )}
                  </Rnd>
                ))}
              </PDFViewer>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
                Load a PDF to start editing
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
