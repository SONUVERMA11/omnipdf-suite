"use client";

/**
 * PDFViewer — Real-time PDF canvas renderer using pdfjs-dist
 * Used across all tools for live preview.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Maximize2 } from "lucide-react";

interface PDFViewerProps {
  data: Uint8Array | ArrayBuffer | null;
  pageNumber?: number;
  onPageCount?: (count: number) => void;
  className?: string;
  showControls?: boolean;
  scale?: number;
}

export function PDFViewer({
  data,
  pageNumber = 1,
  onPageCount,
  className = "",
  showControls = true,
  scale: externalScale,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(pageNumber);
  const [scale, setScale] = useState(externalScale ?? 1.2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocRef = useRef<any>(null);

  const renderPage = useCallback(
    async (pdfDoc: any, pageNum: number, pageScale: number) => {
      if (!canvasRef.current) return;
      setLoading(true);
      setError(null);

      try {
        // Cancel any pending render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: pageScale });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Use device pixel ratio for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        ctx.scale(dpr, dpr);

        const renderContext = { canvas: canvas, viewport } as any;
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException") {
          setError("Failed to render page");
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load PDF when data changes
  useEffect(() => {
    if (!data) { pdfDocRef.current = null; setNumPages(0); return; }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Dynamic import to avoid SSR issues
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;

        if (cancelled) return;
        pdfDocRef.current = pdf;
        const count = pdf.numPages;
        setNumPages(count);
        onPageCount?.(count);
        await renderPage(pdf, currentPage, scale);
      } catch (e) {
        if (!cancelled) setError("Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [data]);

  // Re-render when page or scale changes
  useEffect(() => {
    if (pdfDocRef.current) renderPage(pdfDocRef.current, currentPage, scale);
  }, [currentPage, scale, renderPage]);

  // Sync external pageNumber prop
  useEffect(() => {
    if (pageNumber !== currentPage) setCurrentPage(pageNumber);
  }, [pageNumber]);

  const goTo = (p: number) => setCurrentPage(Math.max(1, Math.min(numPages, p)));

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Canvas area */}
      <div
        className="flex-1 overflow-auto flex items-start justify-center"
        style={{ background: "rgba(0,0,0,0.2)", borderRadius: "16px", padding: "20px", minHeight: "300px" }}
      >
        {!data && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40 py-16">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>No PDF loaded</span>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="spinner" style={{ width: "28px", height: "28px" }} />
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Rendering...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-16">
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          style={{
            borderRadius: "8px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            display: data && !loading && !error ? "block" : "none",
            maxWidth: "100%",
          }}
        />
      </div>

      {/* Controls */}
      {showControls && numPages > 0 && (
        <div
          className="flex items-center justify-between gap-3 mt-3 px-3 py-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage <= 1}
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px", padding: "6px", cursor: "pointer", color: "rgba(255,255,255,0.6)",
                opacity: currentPage <= 1 ? 0.3 : 1,
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", minWidth: "80px", textAlign: "center" }}>
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage >= numPages}
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px", padding: "6px", cursor: "pointer", color: "rgba(255,255,255,0.6)",
                opacity: currentPage >= numPages ? 0.3 : 1,
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale((s) => Math.max(0.4, s - 0.2))}
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px", padding: "6px", cursor: "pointer", color: "rgba(255,255,255,0.6)",
              }}
            >
              <ZoomOut size={14} />
            </button>
            <span
              style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", minWidth: "40px", textAlign: "center" }}
            >
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(3, s + 0.2))}
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px", padding: "6px", cursor: "pointer", color: "rgba(255,255,255,0.6)",
              }}
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setScale(1.2)}
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px", padding: "6px 10px", cursor: "pointer", color: "rgba(255,255,255,0.4)",
                fontSize: "11px",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page Thumbnail Strip ────────────────────────────────────────────────────

interface PageThumbnailsProps {
  data: Uint8Array | null;
  selectedPages: number[];
  onSelect: (page: number) => void;
  onMultiSelect?: (pages: number[]) => void;
}

export function PageThumbnails({ data, selectedPages, onSelect, onMultiSelect }: PageThumbnailsProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!data) { setThumbnails([]); return; }
    let cancelled = false;
    const generate = async () => {
      setLoading(true);
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const thumbs: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await (page.render({ canvas: ctx, viewport } as any)).promise;
          thumbs.push(canvas.toDataURL());
        }
        if (!cancelled) setThumbnails(thumbs);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    generate();
    return () => { cancelled = true; };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "600px", scrollbarWidth: "thin" }}>
      {thumbnails.map((src, idx) => {
        const pageNum = idx + 1;
        const selected = selectedPages.includes(pageNum);
        return (
          <div
            key={pageNum}
            className="page-thumb"
            style={{
              border: selected ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.08)",
              boxShadow: selected ? "0 0 0 2px rgba(99,102,241,0.3)" : undefined,
              cursor: "pointer",
            }}
            onClick={() => onSelect(pageNum)}
          >
            <img src={src} alt={`Page ${pageNum}`} style={{ width: "100%", display: "block", borderRadius: "6px" }} />
            <div
              className="text-center py-1"
              style={{ fontSize: "11px", color: selected ? "#a5b4fc" : "rgba(255,255,255,0.3)" }}
            >
              {pageNum}
            </div>
            {selected && (
              <div
                className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "#6366f1", fontSize: "9px", color: "white" }}
              >
                ✓
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
