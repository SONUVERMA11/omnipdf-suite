"use client";

/**
 * PDFViewer — Real-time PDF canvas renderer using pdfjs-dist v6
 * Used across all tools for live preview.
 *
 * IMPORTANT pdfjs v6 notes:
 *  - Worker is served from /public/pdf.worker.min.mjs (local file)
 *  - render() requires { canvas, viewport } — NOT canvasContext
 *  - DPR scaling must be done via CSS transform, not ctx.scale()
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

// Lazy-loaded pdfjsLib reference
let pdfjsLibPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function getPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return lib;
    });
  }
  return pdfjsLibPromise;
}

interface PDFViewerProps {
  data: Uint8Array | ArrayBuffer | null;
  pageNumber?: number;
  onPageCount?: (count: number) => void;
  className?: string;
  showControls?: boolean;
  scale?: number;
  children?: React.ReactNode;
  onRenderCanvas?: (canvas: HTMLCanvasElement, viewport: any) => void;
}

export function PDFViewer({
  data,
  pageNumber = 1,
  onPageCount,
  className = "",
  showControls = true,
  scale: externalScale,
  children,
  onRenderCanvas,
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
          try { renderTaskRef.current.cancel(); } catch {}
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: pageScale });
        const canvas = canvasRef.current;

        // pdfjs v6: set canvas dimensions to viewport size.
        // pdfjs handles DPR internally when we pass the canvas element.
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        // pdfjs v6 API: pass canvas element, NOT canvasContext
        const renderTask = page.render({
          canvas: canvas,
          viewport: viewport,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
        
        onRenderCanvas?.(canvas, viewport);
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException") {
          console.error("PDF render error:", e);
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
    if (!data) {
      pdfDocRef.current = null;
      setNumPages(0);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const pdfjsLib = await getPdfjs();
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;

        if (cancelled) return;
        pdfDocRef.current = pdf;
        const count = pdf.numPages;
        setNumPages(count);
        onPageCount?.(count);

        const validPage = Math.min(Math.max(1, currentPage), count);
        if (validPage !== currentPage) setCurrentPage(validPage);
        await renderPage(pdf, validPage, scale);
      } catch (e) {
        console.error("PDF load error:", e);
        if (!cancelled) setError("Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Re-render when page or scale changes
  useEffect(() => {
    if (pdfDocRef.current && numPages > 0) {
      const validPage = Math.min(Math.max(1, currentPage), numPages);
      renderPage(pdfDocRef.current, validPage, scale);
    }
  }, [currentPage, scale, renderPage, numPages]);

  // Sync external pageNumber prop
  useEffect(() => {
    if (pageNumber !== currentPage) setCurrentPage(pageNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber]);

  const goTo = (p: number) => setCurrentPage(Math.max(1, Math.min(numPages, p)));

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Canvas area */}
      <div
        className="flex-1 overflow-auto flex items-start justify-center"
        style={{
          background: "rgba(var(--color-obverse-rgb), 0.2)",
          borderRadius: "16px",
          padding: "20px",
          minHeight: "300px",
        }}
      >
        {!data && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40 py-16">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              No PDF loaded
            </span>
          </div>
        )}

        {loading && !error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="spinner" style={{ width: "28px", height: "28px" }} />
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Rendering...
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-16">
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        <div style={{ position: "relative", display: data && !error ? "inline-block" : "none" }}>
          <canvas
            ref={canvasRef}
            style={{
              borderRadius: "8px",
              boxShadow: "0 8px 40px rgba(var(--color-obverse-rgb), 0.6)",
              display: "block",
              maxWidth: "100%",
            }}
          />
          {children}
        </div>
      </div>

      {/* Controls */}
      {showControls && numPages > 0 && (
        <div
          className="flex items-center justify-between gap-3 mt-3 px-3 py-2 rounded-xl"
          style={{
            background: "rgba(var(--color-invert-rgb), 0.04)",
            border: "1px solid rgba(var(--color-invert-rgb), 0.06)",
          }}
        >
          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage <= 1}
              style={{
                background: "rgba(var(--color-invert-rgb), 0.05)",
                border: "1px solid rgba(var(--color-invert-rgb), 0.08)",
                borderRadius: "8px",
                padding: "6px",
                cursor: "pointer",
                color: "var(--text-secondary)",
                opacity: currentPage <= 1 ? 0.3 : 1,
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                minWidth: "80px",
                textAlign: "center",
              }}
            >
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage >= numPages}
              style={{
                background: "rgba(var(--color-invert-rgb), 0.05)",
                border: "1px solid rgba(var(--color-invert-rgb), 0.08)",
                borderRadius: "8px",
                padding: "6px",
                cursor: "pointer",
                color: "var(--text-secondary)",
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
                background: "rgba(var(--color-invert-rgb), 0.05)",
                border: "1px solid rgba(var(--color-invert-rgb), 0.08)",
                borderRadius: "8px",
                padding: "6px",
                cursor: "pointer",
                color: "var(--text-secondary)",
              }}
            >
              <ZoomOut size={14} />
            </button>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                minWidth: "40px",
                textAlign: "center",
              }}
            >
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(3, s + 0.2))}
              style={{
                background: "rgba(var(--color-invert-rgb), 0.05)",
                border: "1px solid rgba(var(--color-invert-rgb), 0.08)",
                borderRadius: "8px",
                padding: "6px",
                cursor: "pointer",
                color: "var(--text-secondary)",
              }}
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setScale(1.2)}
              style={{
                background: "rgba(var(--color-invert-rgb), 0.05)",
                border: "1px solid rgba(var(--color-invert-rgb), 0.08)",
                borderRadius: "8px",
                padding: "6px 10px",
                cursor: "pointer",
                color: "var(--text-secondary)",
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

// ─── Page Thumbnail Strip ──────────────────────────────────────────────

interface PageThumbnailsProps {
  data: Uint8Array | null;
  selectedPages: number[];
  onSelect: (page: number) => void;
}

export function PageThumbnails({
  data,
  selectedPages,
  onSelect,
}: PageThumbnailsProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!data) {
      setThumbnails([]);
      return;
    }
    let cancelled = false;
    const generate = async () => {
      setLoading(true);
      try {
        const pdfjsLib = await getPdfjs();
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const thumbs: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          // pdfjs v6: pass canvas element
          await page.render({ canvas, viewport }).promise;
          thumbs.push(canvas.toDataURL());
        }
        if (!cancelled) setThumbnails(thumbs);
      } catch (e) {
        console.error("Thumbnail generation error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    generate();
    return () => {
      cancelled = true;
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 overflow-y-auto"
      style={{ maxHeight: "600px", scrollbarWidth: "thin" }}
    >
      {thumbnails.map((src, idx) => {
        const pageNum = idx + 1;
        const selected = selectedPages.includes(pageNum);
        return (
          <div
            key={pageNum}
            className="page-thumb"
            style={{
              border: selected
                ? "2px solid #6366f1"
                : "1px solid rgba(var(--color-invert-rgb), 0.08)",
              boxShadow: selected
                ? "0 0 0 2px rgba(99,102,241,0.3)"
                : undefined,
              cursor: "pointer",
              position: "relative",
            }}
            onClick={() => onSelect(pageNum)}
          >
            <img
              src={src}
              alt={`Page ${pageNum}`}
              style={{ width: "100%", display: "block", borderRadius: "6px" }}
            />
            <div
              className="text-center py-1"
              style={{
                fontSize: "11px",
                color: selected ? "var(--accent-active-text)" : "rgba(var(--color-invert-rgb), 0.3)",
              }}
            >
              {pageNum}
            </div>
            {selected && (
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "#6366f1",
                  fontSize: "9px",
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
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
