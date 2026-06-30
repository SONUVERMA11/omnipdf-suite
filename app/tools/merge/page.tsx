"use client";

import { useState, useCallback, useRef } from "react";
import { GitMerge, Upload, Trash2, GripVertical, FileText, Download, ArrowDown } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { mergePDFs, downloadBlob, formatBytes, readFileAsArrayBuffer, getPDFInfo, type PDFInfo } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

interface FileEntry {
  id: string;
  file: File;
  info?: PDFInfo;
  previewData?: Uint8Array;
}

function SortableItem({ entry, onRemove, onPreview, isActive }: {
  entry: FileEntry;
  onRemove: (id: string) => void;
  onPreview: (entry: FileEntry) => void;
  isActive: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "12px",
        background: isActive ? "rgba(99,102,241,0.12)" : "rgba(var(--color-invert-rgb), 0.03)",
        border: `1px solid ${isActive ? "rgba(99,102,241,0.4)" : "rgba(var(--color-invert-rgb), 0.06)"}`,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onClick={() => onPreview(entry)}
    >
      <div {...attributes} {...listeners} style={{ cursor: "grab", color: "var(--text-muted)" }} onClick={e => e.stopPropagation()}>
        <GripVertical size={16} />
      </div>

      <div style={{
        width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
        background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <FileText size={15} color="#6366f1" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {entry.file.name}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
          {formatBytes(entry.file.size)}{entry.info ? ` · ${entry.info.pageCount} pages` : ""}
        </div>
      </div>

      <button
        className="btn-danger"
        onClick={(e) => { e.stopPropagation(); onRemove(entry.id); }}
        style={{ padding: "5px 10px", fontSize: "11px" }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export default function MergePage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activePreview, setActivePreview] = useState<FileEntry | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFiles = useCallback(async (newFiles: File[]) => {
    const entries: FileEntry[] = [];
    for (const file of newFiles) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast(`${file.name} is not a PDF`, "error");
        continue;
      }
      const id = Math.random().toString(36).slice(2);
      const entry: FileEntry = { id, file };
      try {
        entry.info = await getPDFInfo(file);
        const buf = await readFileAsArrayBuffer(file);
        entry.previewData = new Uint8Array(buf);
      } catch {}
      entries.push(entry);
    }
    setFiles((prev) => {
      const updated = [...prev, ...entries];
      if (!activePreview && entries[0]) {
        setActivePreview(entries[0]);
        setPreviewData(entries[0].previewData ?? null);
      }
      return updated;
    });
    toast(`Added ${entries.length} file(s)`, "success");
  }, [activePreview]);

  const handleRemove = (id: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      if (activePreview?.id === id) {
        const next = updated[0] ?? null;
        setActivePreview(next);
        setPreviewData(next?.previewData ?? null);
      }
      return updated;
    });
  };

  const handlePreview = (entry: FileEntry) => {
    setActivePreview(entry);
    setPreviewData(entry.previewData ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setFiles((prev) => {
        const oldIdx = prev.findIndex((f) => f.id === active.id);
        const newIdx = prev.findIndex((f) => f.id === over?.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const handleMerge = async () => {
    if (files.length < 2) { toast("Add at least 2 PDFs to merge", "warning"); return; }
    setProcessing(true);
    setProgress(0);
    setResultSize(null);
    try {
      for (let i = 0; i <= 90; i += 10) {
        await new Promise(r => setTimeout(r, 50));
        setProgress(i);
      }
      const result = await mergePDFs(files.map((f) => f.file));
      setProgress(100);
      setResultSize(result.length);
      const totalInput = files.reduce((s, f) => s + f.file.size, 0);
      const savedPct = Math.round((1 - result.length / totalInput) * 100);
      downloadBlob(new Blob([result.buffer as ArrayBuffer], { type: "application/pdf" }), "merged.pdf");
      toast(`Merged ${files.length} PDFs successfully${savedPct > 0 ? ` · Saved ${savedPct}%` : ""}`, "success");
    } catch (e) {
      toast("Merge failed — check if files are valid PDFs", "error");
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const totalPages = files.reduce((s, f) => s + (f.info?.pageCount ?? 0), 0);
  const totalSize = files.reduce((s, f) => s + f.file.size, 0);

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-indigo" style={{ marginBottom: "10px" }}>
          <GitMerge size={11} /> MERGE PDF
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Merge PDF Files
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
          Combine multiple PDFs into one. Drag to reorder pages before merging.
        </p>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>

        {/* LEFT — Controls */}
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>

          <DropZone
            onFiles={handleFiles}
            accept=".pdf,application/pdf"
            multiple={true}
            label="Drop PDFs here"
            sublabel="or click to browse files"
            icon={<Upload size={22} color="#6366f1" />}
          />

          {/* File list */}
          {files.length > 0 && (
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Files ({files.length})
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {totalPages} pages · {formatBytes(totalSize)}
                </span>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {files.map((entry, idx) => (
                      <div key={entry.id}>
                        <SortableItem
                          entry={entry}
                          onRemove={handleRemove}
                          onPreview={handlePreview}
                          isActive={activePreview?.id === entry.id}
                        />
                        {idx < files.length - 1 && (
                          <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
                            <ArrowDown size={12} color="rgba(99,102,241,0.4)" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <button
                onClick={() => { setFiles([]); setActivePreview(null); setPreviewData(null); }}
                style={{
                  marginTop: "10px",
                  width: "100%",
                  padding: "8px",
                  borderRadius: "10px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#ef4444",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Clear All
              </button>
            </div>
          )}

          {/* Result info */}
          {resultSize && (
            <div style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}>
              <Download size={14} color="#10b981" />
              <span style={{ fontSize: "13px", color: "var(--accent-green)" }}>
                Merged: {formatBytes(resultSize)}
              </span>
            </div>
          )}

          {/* Progress */}
          {processing && (
            <div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", textAlign: "center" }}>
                Merging... {progress}%
              </p>
            </div>
          )}

          {/* Merge button */}
          <button
            className="btn-primary"
            onClick={handleMerge}
            disabled={files.length < 2 || processing}
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: files.length < 2 ? 0.4 : 1,
              cursor: files.length < 2 ? "not-allowed" : "pointer",
            }}
          >
            {processing ? (
              <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Merging...</>
            ) : (
              <><GitMerge size={16} /> Merge {files.length > 0 ? `${files.length} PDFs` : "PDFs"}</>
            )}
          </button>

          {files.length < 2 && (
            <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>
              Add at least 2 PDF files to merge
            </p>
          )}
        </div>

        {/* RIGHT — Live Preview */}
        <div className="glass-card" style={{ padding: "16px", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Live Preview
            </span>
            {activePreview && (
              <span className="badge badge-indigo" style={{ fontSize: "10px" }}>
                {activePreview.file.name}
              </span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <PDFViewer data={previewData} showControls={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
