"use client";

import { useState, useCallback } from "react";
import { FileText, Upload, Download, GripVertical, Trash2, X } from "lucide-react";
import { imagesToPDF, downloadBlob, formatBytes, type PageSize } from "@/lib/pdf/engine";
import { DropZone } from "@/components/ui/DropZone";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { toast } from "@/components/ui/Toaster";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ImgEntry { id: string; file: File; preview: string; }

function SortableImg({ entry, onRemove }: { entry: ImgEntry; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, display: "flex", alignItems: "center", gap: "10px", padding: "8px", borderRadius: "10px", background: "rgba(var(--color-invert-rgb), 0.03)", border: "1px solid rgba(var(--color-invert-rgb), 0.06)" }}>
      <div {...attributes} {...listeners} style={{ cursor: "grab", color: "var(--text-muted)", flexShrink: 0 }}>
        <GripVertical size={14} />
      </div>
      <img src={entry.preview} alt="" style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "12px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.file.name}</div>
        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "1px" }}>{formatBytes(entry.file.size)}</div>
      </div>
      <button onClick={onRemove} style={{ padding: "4px", borderRadius: "6px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", cursor: "pointer", flexShrink: 0 }}>
        <X size={12} />
      </button>
    </div>
  );
}

export default function ImagesToPDFPage() {
  const [images, setImages] = useState<ImgEntry[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState(20);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleFiles = useCallback(async (files: File[]) => {
    const valid = files.filter(f => f.type.startsWith("image/"));
    if (valid.length !== files.length) toast("Some files skipped — only images allowed", "warning");
    const entries: ImgEntry[] = await Promise.all(valid.map(async (f) => {
      const preview = await new Promise<string>(r => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(f); });
      return { id: Math.random().toString(36).slice(2), file: f, preview };
    }));
    setImages(prev => [...prev, ...entries]);
    setResultData(null);
    toast(`Added ${entries.length} image(s)`, "success");
  }, []);

  const handleDragEnd = (e: DragEndEvent) => {
    if (e.active.id !== e.over?.id) {
      setImages(prev => {
        const oi = prev.findIndex(x => x.id === e.active.id);
        const ni = prev.findIndex(x => x.id === e.over?.id);
        return arrayMove(prev, oi, ni);
      });
    }
  };

  const handleConvert = async () => {
    if (!images.length) { toast("Add images first", "warning"); return; }
    setProcessing(true); setProgress(0); setResultData(null);
    try {
      for (let i = 0; i <= 60; i += 15) { await new Promise(r => setTimeout(r, 80)); setProgress(i); }
      const result = await imagesToPDF(images.map(e => e.file), pageSize, margin);
      setProgress(100);
      setResultData(result);
      toast(`Created PDF with ${images.length} pages`, "success");
    } catch { toast("Conversion failed", "error"); }
    finally { setProcessing(false); setTimeout(() => setProgress(0), 2000); }
  };

  const pageSizes: { id: PageSize; label: string }[] = [
    { id: "a4", label: "A4" }, { id: "letter", label: "Letter" }, { id: "a3", label: "A3" }, { id: "fit", label: "Fit Image" },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-pink" style={{ marginBottom: "10px", background: "rgba(244,63,94,0.15)", color: "#fda4af", border: "1px solid rgba(244,63,94,0.25)", display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "999px", fontSize: "12px" }}>
          <FileText size={11} /> IMAGES TO PDF
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Images to PDF</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>Combine multiple images into a single PDF. Drag to reorder.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <DropZone onFiles={handleFiles} accept="image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif" multiple={true}
            label="Drop images here" sublabel="PNG, JPG, WebP, BMP, GIF"
            icon={<Upload size={22} color="#f43f5e" />} />

          {images.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>{images.length} images</span>
                <button onClick={() => { setImages([]); setResultData(null); }} style={{ fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Clear all</button>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={images.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "280px", overflowY: "auto" }}>
                    {images.map(entry => (
                      <SortableImg key={entry.id} entry={entry} onRemove={() => { setImages(p => p.filter(x => x.id !== entry.id)); setResultData(null); }} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>Page Size</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {pageSizes.map(p => (
                <button key={p.id} onClick={() => setPageSize(p.id)} style={{
                  padding: "9px", borderRadius: "10px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  background: pageSize === p.id ? "rgba(99,102,241,0.2)" : "rgba(var(--color-invert-rgb), 0.03)",
                  border: `1px solid ${pageSize === p.id ? "rgba(99,102,241,0.4)" : "rgba(var(--color-invert-rgb), 0.06)"}`,
                  color: pageSize === p.id ? "var(--accent-active-text)" : "rgba(var(--color-invert-rgb), 0.4)",
                }}>{p.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Margin: {margin}px</label>
            <input type="range" min={0} max={80} value={margin} onChange={e => setMargin(Number(e.target.value))} />
          </div>

          {processing && (
            <div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", textAlign: "center" }}>Converting... {progress}%</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto" }}>
            <button className="btn-primary" onClick={handleConvert} disabled={!images.length || processing}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: !images.length ? 0.4 : 1 }}>
              {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Converting...</>
                : <><FileText size={16} /> Convert to PDF</>}
            </button>
            {resultData && (
              <button className="btn-secondary" onClick={() => downloadBlob(new Blob([resultData.buffer as ArrayBuffer], { type: "application/pdf" }), "images.pdf")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Download size={16} /> Download PDF
              </button>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {resultData ? "Output Preview" : "Image Grid"}
          </div>
          {resultData ? (
            <PDFViewer data={resultData} showControls={true} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px" }}>
              {images.map((entry, i) => (
                <div key={entry.id} className="page-thumb">
                  <img src={entry.preview} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block", borderRadius: "6px" }} />
                  <div style={{ padding: "4px", textAlign: "center", fontSize: "10px", color: "var(--text-muted)" }}>{i + 1}</div>
                </div>
              ))}
              {!images.length && (
                <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--text-muted)", fontSize: "13px" }}>
                  Add images to preview
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
