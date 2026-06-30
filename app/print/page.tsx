"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Printer, Upload, Settings2, FileText, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { readFileAsArrayBuffer, generatePrintLayout } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { toast } from "@/components/ui/Toaster";

type PrintHandling = "scale" | "tile" | "multiple" | "booklet";
type Orientation = "portrait" | "landscape";
type PaperSize = "a4" | "letter" | "a3" | "legal";

export default function PrintPage() {
  const [file, setFile] = useState<File | null>(null);
  const [layoutData, setLayoutData] = useState<Uint8Array | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Print Range
  const [printRange, setPrintRange] = useState<"all" | "current" | "pages">("all");
  const [pagesInput, setPagesInput] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  
  // Print Handling
  const [handling, setHandling] = useState<PrintHandling>("multiple");
  const [pagesPerSheet, setPagesPerSheet] = useState<"2" | "4" | "6" | "9" | "16" | "custom">("4");
  const [customRows, setCustomRows] = useState(2);
  const [customCols, setCustomCols] = useState(2);
  const [pageOrder, setPageOrder] = useState("Horizontal");
  const [printPageBorder, setPrintPageBorder] = useState(false);
  const [marginEnabled, setMarginEnabled] = useState(true);
  const [marginVal, setMarginVal] = useState(5); // mm
  
  // Center column
  const [twoSided, setTwoSided] = useState(true);
  const [flipEdge, setFlipEdge] = useState<"long" | "short">("long");
  const [autoRotate, setAutoRotate] = useState(true);
  const [autoCenter, setAutoCenter] = useState(true);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  
  const [paper, setPaper] = useState<PaperSize>("letter");
  const [copies, setCopies] = useState(1);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const buf = await readFileAsArrayBuffer(f);
    setLayoutData(new Uint8Array(buf));
    toast("PDF loaded for printing", "success");
  }, []);

  // Map to engine options
  useEffect(() => {
    if (!file) return;
    const generate = async () => {
      setIsGenerating(true);
      try {
        let layout: any = "normal";
        let customGrid = undefined;
        
        if (handling === "multiple") {
          if (pagesPerSheet === "custom") {
             layout = "custom";
             customGrid = { rows: customRows, cols: customCols };
          } else {
             const val = Number(pagesPerSheet);
             layout = val === 2 ? "2up" : val === 4 ? "4up" : "custom";
             if (layout === "custom") {
               customGrid = val === 6 ? {rows: 3, cols: 2} : val === 9 ? {rows: 3, cols: 3} : {rows: 4, cols: 4};
             }
          }
        } else if (handling === "booklet") {
          layout = "booklet";
        }
        
        // Parse pages
        let pageIndices: number[] | undefined = undefined;
        if (printRange === "pages" && pagesInput.trim()) {
           pageIndices = [];
           const parts = pagesInput.split(",");
           for (const p of parts) {
             if (p.includes("-")) {
               const [s, e] = p.split("-").map(x => parseInt(x.trim()));
               if (!isNaN(s) && !isNaN(e)) {
                 for (let i = s; i <= e; i++) pageIndices.push(i - 1);
               }
             } else {
               const num = parseInt(p.trim());
               if (!isNaN(num)) pageIndices.push(num - 1);
             }
           }
        }
        
        const m = marginEnabled ? marginVal : 0;
        
        const out = await generatePrintLayout(file, {
          layout, customGrid, paperSize: paper, orientation,
          margins: { top: m, bottom: m, left: m, right: m },
          pageIndices
        });
        setLayoutData(out);
      } catch (e) {
        console.error(e);
      } finally {
        setIsGenerating(false);
      }
    };
    const t = setTimeout(generate, 500);
    return () => clearTimeout(t);
  }, [file, handling, pagesPerSheet, customRows, customCols, marginEnabled, marginVal, paper, orientation, printRange, pagesInput]);

  const handlePrint = () => {
    if (!layoutData || !printFrameRef.current) return;
    const url = URL.createObjectURL(new Blob([layoutData.buffer as ArrayBuffer], { type: "application/pdf" }));
    printFrameRef.current.src = url;
    printFrameRef.current.onload = () => {
      try {
        printFrameRef.current?.contentWindow?.focus();
        printFrameRef.current?.contentWindow?.print();
      } catch (e) {
        // Fallback if iframe print is blocked
        const w = window.open(url);
        if (w) w.onload = () => { w.print(); };
      }
    };
    toast("Opening print dialog...", "info");
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", marginTop: "-8px", padding: "0 4px", background: "var(--bg-primary)", width: "fit-content", position: "relative", zIndex: 1 }}>
      {children}
    </div>
  );

  const Fieldset = ({ title, children, style }: any) => (
    <div style={{ border: "1px solid rgba(var(--color-invert-rgb), 0.15)", borderRadius: "4px", padding: "12px", position: "relative", marginBottom: "16px", ...style }}>
      <div style={{ position: "absolute", top: 0, left: "8px", transform: "translateY(-50%)" }}>
        <SectionTitle>{title}</SectionTitle>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", padding: "20px", display: "flex", flexDirection: "column", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px 20px", background: "rgba(var(--color-invert-rgb), 0.03)", border: "1px solid rgba(var(--color-invert-rgb), 0.1)", borderRadius: "8px", marginBottom: "20px" }}>
        <Printer size={20} color="#8b5cf6" />
        <span style={{ fontSize: "16px", fontWeight: 600 }}>Print</span>
        <div style={{ flex: 1 }} />
        {!file ? (
          <label className="btn-primary" style={{ cursor: "pointer", padding: "6px 12px", fontSize: "12px" }}>
            <Upload size={14} style={{ display: "inline", marginRight: "6px" }}/> Open PDF
            <input type="file" hidden accept=".pdf" onChange={handleFile} />
          </label>
        ) : (
          <div style={{ padding: "4px 12px", background: "rgba(99,102,241,0.2)", borderRadius: "6px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
             <FileText size={14} color="var(--accent-active-text)" />
             <span>{file.name}</span>
             <button onClick={() => { setFile(null); setLayoutData(null); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "11px", marginLeft: "10px" }}>Remove</button>
          </div>
        )}
        <button className="btn-primary" onClick={handlePrint} disabled={!file} style={{ padding: "6px 20px" }}>OK</button>
        <button className="btn-secondary" style={{ padding: "6px 20px" }}>Cancel</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(200px, 280px) minmax(350px, 450px)", gap: "20px", flex: 1, alignItems: "start" }}>
        
        {/* Left Column */}
        <div>
          {/* Top Row: Printer Name & Copies */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", width: "50px" }}>Name:</span>
            <select className="select-field" style={{ flex: 1, padding: "4px 8px", fontSize: "13px" }}>
              <option>Browser Default Printer</option>
              <option>Save as PDF</option>
            </select>
            <button className="btn-secondary" style={{ padding: "4px 12px", fontSize: "12px" }}>Properties</button>
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", width: "50px" }}>Copies:</span>
            <input type="number" min={1} value={copies} onChange={e => setCopies(Number(e.target.value))} className="input-field" style={{ width: "60px", padding: "4px", fontSize: "13px" }} />
            <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginLeft: "12px" }}>
              <input type="checkbox" defaultChecked /> Collate
            </label>
            <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
              <input type="checkbox" /> Print as grayscale
            </label>
          </div>

          <Fieldset title="Print Range">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="radio" checked={printRange === "all"} onChange={() => setPrintRange("all")} /> All pages
              </label>
              <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="radio" checked={printRange === "current"} onChange={() => setPrintRange("current")} /> Current view
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="radio" checked={printRange === "pages"} onChange={() => setPrintRange("pages")} /> Pages:
                </label>
                <input type="text" className="input-field" value={pagesInput} onChange={e => {setPagesInput(e.target.value); setPrintRange("pages");}} placeholder="e.g. 1-5, 8" style={{ flex: 1, padding: "4px 8px", fontSize: "13px" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                <span style={{ fontSize: "13px" }}>Subset:</span>
                <select className="select-field" style={{ flex: 1, padding: "4px", fontSize: "12px" }}><option>All pages in range</option><option>Odd pages only</option><option>Even pages only</option></select>
              </div>
            </div>
          </Fieldset>

          <Fieldset title="Print Handling">
            <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
              {(["scale", "tile", "multiple", "booklet"] as const).map(mode => (
                <button key={mode} onClick={() => setHandling(mode)} style={{
                  flex: 1, padding: "6px 0", fontSize: "11px", textAlign: "center", borderRadius: "4px",
                  background: handling === mode ? "rgba(99,102,241,0.2)" : "transparent",
                  border: `1px solid ${handling === mode ? "#8b5cf6" : "rgba(var(--color-invert-rgb), 0.2)"}`,
                  color: handling === mode ? "white" : "rgba(var(--color-invert-rgb), 0.7)",
                }}>
                  {mode === "scale" ? "Scale" : mode === "tile" ? "Tile Pages" : mode === "multiple" ? "Multiple Pages" : "Booklet"}
                </button>
              ))}
            </div>

            {handling === "multiple" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "13px", width: "110px" }}>Pages per sheet:</span>
                  <select className="select-field" value={pagesPerSheet} onChange={e => setPagesPerSheet(e.target.value as any)} style={{ flex: 1, padding: "4px", fontSize: "12px" }}>
                    <option value="2">2</option>
                    <option value="4">4</option>
                    <option value="6">6</option>
                    <option value="9">9</option>
                    <option value="16">16</option>
                    <option value="custom">Custom...</option>
                  </select>
                </div>
                {pagesPerSheet === "custom" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "122px" }}>
                    <input type="number" min={1} max={10} value={customCols} onChange={e => setCustomCols(Number(e.target.value))} className="input-field" style={{ width: "40px", padding: "4px", fontSize: "12px", textAlign: "center" }} />
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>by</span>
                    <input type="number" min={1} max={10} value={customRows} onChange={e => setCustomRows(Number(e.target.value))} className="input-field" style={{ width: "40px", padding: "4px", fontSize: "12px", textAlign: "center" }} />
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "13px", width: "110px" }}>Page Order:</span>
                  <select className="select-field" value={pageOrder} onChange={e => setPageOrder(e.target.value)} style={{ flex: 1, padding: "4px", fontSize: "12px" }}>
                    <option>Horizontal</option>
                    <option>Horizontal Reversed</option>
                    <option>Vertical</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", width: "110px" }}>
                    <input type="checkbox" checked={marginEnabled} onChange={e => setMarginEnabled(e.target.checked)} /> Margins:
                  </label>
                  <input type="number" min={0} value={marginVal} onChange={e => setMarginVal(Number(e.target.value))} disabled={!marginEnabled} className="input-field" style={{ width: "60px", padding: "4px", fontSize: "12px" }} />
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>mm</span>
                </div>
                <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="checkbox" checked={printPageBorder} onChange={e => setPrintPageBorder(e.target.checked)} /> Print Page Border
                </label>
              </div>
            )}
            
            {handling !== "multiple" && (
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "center", padding: "20px 0" }}>
                {handling.toUpperCase()} settings active
              </div>
            )}
          </Fieldset>
        </div>

        {/* Middle Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
          <Fieldset title="" style={{ marginTop: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                <input type="checkbox" checked={twoSided} onChange={e => setTwoSided(e.target.checked)} /> Print on both sides of paper
              </label>
              <div style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "6px", opacity: twoSided ? 1 : 0.4, pointerEvents: twoSided ? "auto" : "none" }}>
                <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="radio" checked={flipEdge === "long"} onChange={() => setFlipEdge("long")} /> Flip on long edge
                </label>
                <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="radio" checked={flipEdge === "short"} onChange={() => setFlipEdge("short")} /> Flip on short edge
                </label>
              </div>
              <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                <input type="checkbox" checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)} /> Auto-Rotate
              </label>
              <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" checked={autoCenter} onChange={e => setAutoCenter(e.target.checked)} /> Auto-Center
              </label>
            </div>
          </Fieldset>

          <Fieldset title="Orientation">
            <select className="select-field" value={orientation} onChange={e => setOrientation(e.target.value as any)} style={{ width: "100%", padding: "6px", fontSize: "13px" }}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </Fieldset>

          <Fieldset title="Paper Size">
            <select className="select-field" value={paper} onChange={e => setPaper(e.target.value as any)} style={{ width: "100%", padding: "6px", fontSize: "13px" }}>
              <option value="letter">Letter</option>
              <option value="a4">A4</option>
              <option value="legal">Legal</option>
              <option value="a3">A3</option>
            </select>
          </Fieldset>
        </div>

        {/* Right Column: Preview */}
        <Fieldset title="Preview" style={{ height: "100%", display: "flex", flexDirection: "column", padding: "4px" }}>
          <div style={{ padding: "4px 8px", fontSize: "11px", color: "var(--text-primary)", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(var(--color-invert-rgb), 0.1)", marginBottom: "8px" }}>
            <span>Zoom: 100%</span>
            <span>Paper: {paper.toUpperCase()}</span>
          </div>
          <div style={{ flex: 1, position: "relative", background: "rgba(var(--color-obverse-rgb), 0.3)", borderRadius: "4px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
            {isGenerating && (
              <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(10,10,18,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="spinner" />
              </div>
            )}
            {layoutData ? (
              <div style={{ width: "100%", height: "100%" }}>
                <PDFViewer data={layoutData} showControls={true} scale={0.7} onPageCount={setTotalPages} />
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Open a PDF to preview</div>
            )}
          </div>
        </Fieldset>

      </div>
      <iframe ref={printFrameRef} style={{ display: "none" }} title="Print Frame" />
    </div>
  );
}
