"use client";

import { useState, useCallback, useRef } from "react";
import { Printer, Upload, Download, BookOpen, Layout } from "lucide-react";
import { readFileAsArrayBuffer, formatBytes } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

type Layout = "normal" | "2up" | "4up" | "booklet";
type ColorMode = "color" | "bw";
type Orientation = "portrait" | "landscape";
type PaperSize = "a4" | "letter" | "a3" | "legal";

export default function PrintPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [layout, setLayout] = useState<Layout>("normal");
  const [colorMode, setColorMode] = useState<ColorMode>("color");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [paper, setPaper] = useState<PaperSize>("a4");
  const [copies, setCopies] = useState(1);
  const [duplex, setDuplex] = useState(false);
  const [pageRange, setPageRange] = useState("all");
  const [marginTop, setMarginTop] = useState(10);
  const [marginBottom, setMarginBottom] = useState(10);
  const [marginLeft, setMarginLeft] = useState(10);
  const [marginRight, setMarginRight] = useState(10);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    const buf = await readFileAsArrayBuffer(f);
    setPreviewData(new Uint8Array(buf));
    toast("PDF loaded for printing", "success");
  }, []);

  const handlePrint = () => {
    if (!file) return;
    const url = URL.createObjectURL(new Blob([previewData!.buffer as ArrayBuffer], { type: "application/pdf" }));
    const iframe = printFrameRef.current!;
    iframe.src = url;
    iframe.onload = () => {
      try { iframe.contentWindow?.print(); } catch { window.open(url, "_blank"); }
      URL.revokeObjectURL(url);
    };
    toast("Opening print dialog...", "info");
  };

  const layouts: { id: Layout; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "normal", label: "Normal", icon: "▪", desc: "1 page per sheet" },
    { id: "2up", label: "2-up", icon: "▪▪", desc: "2 pages per sheet" },
    { id: "4up", label: "4-up", icon: "▫▫▫▫", desc: "4 pages per sheet" },
    { id: "booklet", label: "Booklet", icon: "📖", desc: "Fold & staple" },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-indigo" style={{ marginBottom: "10px" }}>
          <Printer size={11} /> PRINT STUDIO
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>Print Studio</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "6px", fontSize: "14px" }}>
          Advanced print settings with live WYSIWYG preview. N-up, booklet, duplex support.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        {/* Controls */}
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto" }}>
          {!file ? (
            <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF to print" icon={<Upload size={22} color="#8b5cf6" />} />
          ) : (
            <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", fontSize: "12px" }}>
              <div style={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{file.name}</div>
              <div style={{ color: "rgba(255,255,255,0.3)" }}>{formatBytes(file.size)}</div>
              <button onClick={() => { setFile(null); setPreviewData(null); }} style={{ marginTop: "4px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}>Remove</button>
            </div>
          )}

          {/* Layout */}
          <div>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Layout</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {layouts.map(l => (
                <button key={l.id} onClick={() => setLayout(l.id)} style={{
                  padding: "10px", borderRadius: "10px", cursor: "pointer", textAlign: "left",
                  background: layout === l.id ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${layout === l.id ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.06)"}`,
                }}>
                  <div style={{ fontSize: "14px", marginBottom: "2px" }}>{l.icon}</div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: layout === l.id ? "#a5b4fc" : "rgba(255,255,255,0.6)" }}>{l.label}</div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{l.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Paper & Orientation */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px" }}>Paper Size</label>
              <select className="select-field" value={paper} onChange={e => setPaper(e.target.value as PaperSize)} style={{ width: "100%" }}>
                {["a4", "letter", "a3", "legal"].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px" }}>Copies</label>
              <input className="input-field" type="number" min={1} max={999} value={copies} onChange={e => setCopies(Number(e.target.value))} />
            </div>
          </div>

          {/* Orientation */}
          <div>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>Orientation</label>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["portrait", "landscape"] as const).map(o => (
                <button key={o} onClick={() => setOrientation(o)} style={{
                  flex: 1, padding: "9px", borderRadius: "10px", fontSize: "12px", cursor: "pointer", textTransform: "capitalize",
                  background: orientation === o ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${orientation === o ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`,
                  color: orientation === o ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                }}>{o === "portrait" ? "⬜ Portrait" : "⬛ Landscape"}</button>
              ))}
            </div>
          </div>

          {/* Color mode */}
          <div>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>Color Mode</label>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["color", "bw"] as const).map(c => (
                <button key={c} onClick={() => setColorMode(c)} style={{
                  flex: 1, padding: "9px", borderRadius: "10px", fontSize: "12px", cursor: "pointer",
                  background: colorMode === c ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${colorMode === c ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`,
                  color: colorMode === c ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                }}>{c === "color" ? "🎨 Color" : "⬛ B&W"}</button>
              ))}
            </div>
          </div>

          {/* Duplex */}
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <input type="checkbox" checked={duplex} onChange={e => setDuplex(e.target.checked)} />
            <div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Duplex (Double-sided)</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>Print on both sides</div>
            </div>
          </label>

          {/* Page Range */}
          <div>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px" }}>Page Range</label>
            <input className="input-field" value={pageRange} onChange={e => setPageRange(e.target.value)} placeholder="all or 1-5, 8" />
          </div>

          {/* Margins */}
          <div>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>Margins (mm)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
              {[["Top", marginTop, setMarginTop], ["Bottom", marginBottom, setMarginBottom], ["Left", marginLeft, setMarginLeft], ["Right", marginRight, setMarginRight]].map(([label, val, setter]: any) => (
                <div key={label as string}>
                  <label style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", display: "block", marginBottom: "3px" }}>{label}</label>
                  <input className="input-field" type="number" min={0} max={50} value={val} onChange={e => setter(Number(e.target.value))} style={{ padding: "8px", textAlign: "center" }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto" }}>
            <button className="btn-primary" onClick={handlePrint} disabled={!file}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: !file ? 0.4 : 1 }}>
              <Printer size={16} /> Print Now
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="glass-card" style={{ padding: "16px", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Print Preview</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: "6px", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
              <span className="badge badge-indigo">{paper.toUpperCase()}</span>
              <span className="badge badge-indigo">{orientation}</span>
              <span className="badge badge-indigo">{layout}</span>
              <span className="badge badge-indigo">{copies}×</span>
              {duplex && <span className="badge badge-green">Duplex</span>}
            </div>
          </div>

          {/* Print layout preview */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "20px" }}>
            {previewData ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: layout === "4up" ? "1fr 1fr" : layout === "2up" ? "1fr 1fr" : "1fr",
                gap: "8px",
                width: orientation === "landscape" ? "560px" : "400px",
                filter: colorMode === "bw" ? "grayscale(1)" : "none",
              }}>
                {Array.from({ length: layout === "4up" ? 4 : layout === "2up" ? 2 : 1 }).map((_, i) => (
                  <div key={i} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden", background: "white", minHeight: "120px" }}>
                    <PDFViewer data={previewData} pageNumber={i + 1} showControls={false} scale={0.4} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>
                Upload a PDF to see print preview
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden print iframe */}
      <iframe ref={printFrameRef} style={{ display: "none" }} title="print-frame" />
    </div>
  );
}
