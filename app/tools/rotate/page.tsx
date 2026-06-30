"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { RotateCw, Upload, Download, RotateCcw, FlipHorizontal, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { rotatePDF, reorderPages, downloadBlob, formatBytes, readFileAsArrayBuffer, getPDFInfo, getFileBaseName, type PDFInfo } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";
import { useSearchParams } from "next/navigation";

interface ThumbEntry { pageNum: number; src: string; rotation: number; }

function SortableThumb({ entry, selected, onSelect, onRotate, isReorder }: {
  entry: ThumbEntry; selected: boolean; onSelect: () => void;
  onRotate: (dir: "cw" | "ccw") => void; isReorder: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.pageNum });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      <div
        className="page-thumb"
        onClick={onSelect}
        style={{
          border: selected ? "2px solid #6366f1" : "1px solid rgba(var(--color-invert-rgb), 0.08)",
          boxShadow: selected ? "0 0 0 2px rgba(99,102,241,0.3)" : undefined,
          userSelect: "none",
        }}
      >
        {isReorder && (
          <div {...attributes} {...listeners} style={{ position: "absolute", top: 4, left: 4, cursor: "grab", background: "rgba(var(--color-obverse-rgb), 0.5)", borderRadius: "4px", padding: "2px" }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="rgba(var(--color-invert-rgb), 0.5)">
              <rect y="2" width="10" height="1.5" rx="1" /><rect y="4.5" width="10" height="1.5" rx="1" /><rect y="7" width="10" height="1.5" rx="1" />
            </svg>
          </div>
        )}
        <img src={entry.src} alt={`Page ${entry.pageNum}`} style={{ width: "100%", display: "block", borderRadius: "6px", transform: `rotate(${entry.rotation}deg)`, transition: "transform 0.3s" }} />
        <div style={{ padding: "6px 4px", textAlign: "center", fontSize: "10px", color: selected ? "var(--accent-active-text)" : "rgba(var(--color-invert-rgb), 0.3)" }}>
          p.{entry.pageNum} {entry.rotation !== 0 ? `(${entry.rotation}°)` : ""}
        </div>
        {!isReorder && (
          <div style={{ display: "flex", justifyContent: "center", gap: "4px", paddingBottom: "6px" }}>
            <button onClick={e => { e.stopPropagation(); onRotate("ccw"); }}
              style={{ padding: "3px", borderRadius: "5px", background: "rgba(var(--color-invert-rgb), 0.08)", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
              <RotateCcw size={10} />
            </button>
            <button onClick={e => { e.stopPropagation(); onRotate("cw"); }}
              style={{ padding: "3px", borderRadius: "5px", background: "rgba(var(--color-invert-rgb), 0.08)", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
              <RotateCw size={10} />
            </button>
          </div>
        )}
        {selected && (
          <div style={{ position: "absolute", top: 4, right: 4, width: "16px", height: "16px", borderRadius: "50%", background: "#6366f1", fontSize: "9px", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>
        )}
      </div>
    </div>
  );
}

function RotateContent() {
  const searchParams = useSearchParams();
  const isReorder = searchParams.get("mode") === "reorder";

  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<PDFInfo | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [thumbs, setThumbs] = useState<ThumbEntry[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [zoom, setZoom] = useState(120);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f); setSelected([]); setThumbs([]);
    try {
      const inf = await getPDFInfo(f);
      setInfo(inf);
      const buf = await readFileAsArrayBuffer(f);
      const data = new Uint8Array(buf);
      setPreviewData(data);
      generateThumbs(data, inf.pageCount);
      toast(`Loaded: ${inf.pageCount} pages`, "success");
    } catch { toast("Failed to load PDF", "error"); }
  }, []);

  const generateThumbs = async (data: Uint8Array, count: number) => {
    setLoadingThumbs(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      const entries: ThumbEntry[] = [];
      for (let i = 1; i <= count; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvas, viewport: vp }).promise;
        entries.push({ pageNum: i, src: canvas.toDataURL(), rotation: 0 });
      }
      setThumbs(entries);
    } catch {} finally { setLoadingThumbs(false); }
  };

  const rotate = (pageNums: number[], dir: "cw" | "ccw") => {
    setThumbs(prev => prev.map(t => pageNums.includes(t.pageNum)
      ? { ...t, rotation: ((t.rotation + (dir === "cw" ? 90 : -90)) + 360) % 360 }
      : t));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (e.active.id !== e.over?.id) {
      setThumbs(prev => {
        const oi = prev.findIndex(t => t.pageNum === e.active.id);
        const ni = prev.findIndex(t => t.pageNum === e.over?.id);
        return arrayMove(prev, oi, ni);
      });
    }
  };

  const toggleSelect = (n: number) => setSelected(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);

  const deleteSelected = () => {
    setThumbs(prev => prev.filter(t => !selected.includes(t.pageNum)));
    setSelected([]);
  };

  const handleApply = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      let result: Uint8Array;
      if (isReorder) {
        result = await reorderPages(file, thumbs.map(t => t.pageNum));
      } else {
        const rotMap: Record<number, number> = {};
        thumbs.forEach((t, i) => { if (t.rotation !== 0) rotMap[i] = t.rotation; });
        result = await rotatePDF(file, rotMap);
      }
      downloadBlob(new Blob([result.buffer as ArrayBuffer], { type: "application/pdf" }), `${getFileBaseName(file.name)}_${isReorder ? "reordered" : "rotated"}.pdf`);
      toast(`${isReorder ? "Reordered" : "Rotated"} and downloaded`, "success");
    } catch { toast("Failed", "error"); }
    finally { setProcessing(false); }
  };

  const allSelected = thumbs.length > 0 && selected.length === thumbs.length;

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-indigo" style={{ marginBottom: "10px" }}>
          {isReorder ? <FlipHorizontal size={11} /> : <RotateCw size={11} />}
          {isReorder ? "REORDER PAGES" : "ROTATE PAGES"}
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          {isReorder ? "Reorder Pages" : "Rotate Pages"}
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
          {isReorder ? "Drag and drop thumbnails to reorder pages." : "Rotate individual or all pages by 90°, 180°, or 270°."}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px", minHeight: "calc(100vh - 200px)", maxWidth: "900px", margin: "0 auto" }}>
        {/* Thumbnail grid */}
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {!file ? (
            <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF here" icon={<Upload size={22} color="#06b6d4" />} />
          ) : (
            <>
              {/* Toolbar */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={() => setSelected(allSelected ? [] : thumbs.map(t => t.pageNum))}
                  style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "8px", background: "rgba(var(--color-invert-rgb), 0.05)", border: "1px solid rgba(var(--color-invert-rgb), 0.1)", color: "var(--text-secondary)", cursor: "pointer" }}>
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
                {!isReorder && selected.length > 0 && (
                  <>
                    <button onClick={() => rotate(selected, "ccw")}
                      style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: "6px 12px", borderRadius: "8px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "var(--accent-active-text)", cursor: "pointer" }}>
                      <RotateCcw size={13} /> 90° Left
                    </button>
                    <button onClick={() => rotate(selected, "cw")}
                      style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: "6px 12px", borderRadius: "8px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "var(--accent-active-text)", cursor: "pointer" }}>
                      <RotateCw size={13} /> 90° Right
                    </button>
                    <button onClick={() => rotate(selected, "cw")}
                      style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "8px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "var(--accent-active-text)", cursor: "pointer" }}>
                      180°
                    </button>
                  </>
                )}
                <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}>
                  {thumbs.length} pages · {selected.length} selected
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "10px", padding: "0 10px", borderLeft: "1px solid rgba(var(--color-invert-rgb), 0.1)" }}>
                  <ZoomOut size={14} color="rgba(var(--color-invert-rgb), 0.5)" />
                  <input type="range" min="80" max="240" value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ width: "80px" }} />
                  <ZoomIn size={14} color="rgba(var(--color-invert-rgb), 0.5)" />
                </div>
                {isReorder && selected.length > 0 && (
                  <button onClick={deleteSelected}
                    style={{ marginLeft: "10px", fontSize: "11px", color: "#ff453a", display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,59,48,0.1)", padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(255,59,48,0.2)" }}>
                    <Trash2 size={12} /> Delete Pages
                  </button>
                )}
                <button onClick={() => { setFile(null); setThumbs([]); setSelected([]); setPreviewData(null); }}
                  style={{ marginLeft: "10px", fontSize: "11px", color: "#ef4444", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                  Remove file
                </button>
              </div>

              {loadingThumbs ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", gap: "12px" }}>
                  <div className="spinner" /><span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Generating thumbnails...</span>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={thumbs.map(t => t.pageNum)} strategy={rectSortingStrategy}>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${zoom}px, 1fr))`, gap: "16px", maxHeight: "60vh", overflowY: "auto", padding: "10px" }}>
                      {thumbs.map(entry => (
                        <SortableThumb key={entry.pageNum} entry={entry}
                          selected={selected.includes(entry.pageNum)}
                          onSelect={() => { toggleSelect(entry.pageNum); setPreviewPage(entry.pageNum); }}
                          onRotate={(dir) => rotate([entry.pageNum], dir)}
                          isReorder={isReorder}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              <button className="btn-primary" onClick={handleApply} disabled={!file || processing}
                style={{ marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px" }}>
                {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Processing...</>
                  : <><Download size={16} /> {isReorder ? "Save Reordered PDF" : "Save Rotated PDF"}</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RotatePage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", color: "var(--text-secondary)" }}>Loading Rotate & Reorder Settings...</div>}>
      <RotateContent />
    </Suspense>
  );
}
