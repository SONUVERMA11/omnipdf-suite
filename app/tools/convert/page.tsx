"use client";

import { useState, useCallback, useEffect } from "react";
import { FileOutput, Upload, Download, ArrowRight, FileText, Image, Table, Server, Wifi, WifiOff, Presentation } from "lucide-react";
import { readFileAsArrayBuffer, downloadBlob, formatBytes, getFileBaseName, imagesToPDF } from "@/lib/pdf/engine";
import { checkBackendHealth, convertWithBackend } from "@/lib/convert/backend-client";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

type ConversionType = "pdf-to-text" | "pdf-to-images" | "docx-to-pdf" | "images-to-pdf" | "pptx-to-pdf" | "xlsx-to-pdf" | "html-to-pdf";

const conversions: { id: ConversionType; label: string; from: string; to: string; icon: any; color: string; accept: string; desc: string; serverSide?: boolean }[] = [
  { id: "pdf-to-text", label: "PDF → Text", from: "PDF", to: "TXT", icon: FileText, color: "#6366f1", accept: ".pdf", desc: "Extract all text from PDF pages" },
  { id: "pdf-to-images", label: "PDF → Images", from: "PDF", to: "PNG", icon: Image, color: "#ec4899", accept: ".pdf", desc: "Export each page as an image" },
  { id: "docx-to-pdf", label: "DOCX → PDF", from: "DOCX", to: "PDF", icon: FileOutput, color: "#8b5cf6", accept: ".docx,.doc,.odt,.rtf", desc: "Word / ODT / RTF to PDF" },
  { id: "images-to-pdf", label: "Images → PDF", from: "IMG", to: "PDF", icon: Image, color: "#10b981", accept: "image/*,.png,.jpg,.jpeg,.webp,.bmp", desc: "Bundle images into a single PDF" },
  { id: "pptx-to-pdf", label: "PPTX → PDF", from: "PPTX", to: "PDF", icon: Presentation, color: "#f97316", accept: ".pptx,.ppt,.odp", desc: "Presentations to PDF", serverSide: true },
  { id: "xlsx-to-pdf", label: "XLSX → PDF", from: "XLSX", to: "PDF", icon: Table, color: "#84cc16", accept: ".xlsx,.xls,.ods,.csv", desc: "Spreadsheets to PDF", serverSide: true },
  { id: "html-to-pdf", label: "HTML → PDF", from: "HTML", to: "PDF", icon: FileText, color: "#06b6d4", accept: ".html,.htm", desc: "Web pages to PDF", serverSide: true },
];

export default function ConvertPage() {
  const [mode, setMode] = useState<ConversionType>("pdf-to-text");
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [resultReady, setResultReady] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [conversionTime, setConversionTime] = useState<number | null>(null);

  const current = conversions.find(c => c.id === mode)!;
  const isMulti = mode === "images-to-pdf";

  // Check backend status on mount
  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
  }, []);

  const handleFile = useCallback(async (incoming: File[]) => {
    if (isMulti) {
      setFiles(incoming);
      toast(`${incoming.length} image(s) loaded`, "success");
      return;
    }
    const f = incoming[0];
    setFile(f);
    setExtractedText(null);
    setResultReady(false);
    setConversionTime(null);
    if (f.name.endsWith(".pdf")) {
      const buf = await readFileAsArrayBuffer(f);
      setPreviewData(new Uint8Array(buf));
    } else {
      setPreviewData(null);
    }
    toast("File loaded", "success");
  }, [isMulti]);

  const resetAll = () => {
    setFile(null); setFiles([]); setPreviewData(null);
    setExtractedText(null); setResultReady(false); setProgress(0);
    setConversionTime(null);
  };

  const handleConvert = async () => {
    setProcessing(true); setProgress(10); setConversionTime(null);
    const startTime = Date.now();
    try {
      if (mode === "pdf-to-text" && file) {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const buf = await readFileAsArrayBuffer(file);
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress(Math.round((i / pdf.numPages) * 90));
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(" ");
          text += `--- Page ${i} ---\n${pageText}\n\n`;
        }
        setExtractedText(text);
        setResultReady(true);
        toast("Text extracted successfully!", "success");

      } else if (mode === "pdf-to-images" && file) {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const JSZip = (await import("jszip")).default;
        const buf = await readFileAsArrayBuffer(file);
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        const zip = new JSZip();
        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress(Math.round((i / pdf.numPages) * 90));
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, viewport } as any).promise;
          const blob = await new Promise<Blob>((res) => canvas.toBlob(b => res(b!), "image/png"));
          zip.file(`page_${String(i).padStart(3, "0")}.png`, blob);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, `${getFileBaseName(file.name)}_images.zip`);
        setResultReady(true);
        toast(`Exported ${pdf.numPages} pages as images`, "success");

      } else if (mode === "docx-to-pdf" && file) {
        // Try server-side first if available, fall back to client-side mammoth
        if (backendOnline) {
          setProgress(30);
          toast("Converting via server (LibreOffice)...", "info");
          const result = await convertWithBackend(file, "pdf");
          setProgress(90);
          const arrayBuf = await result.blob.arrayBuffer();
          setPreviewData(new Uint8Array(arrayBuf));
          downloadBlob(result.blob, result.filename);
          setConversionTime(result.conversionTimeMs);
          setResultReady(true);
          toast("DOCX converted to PDF (server)!", "success");
        } else {
          setProgress(30);
          const mammoth = await import("mammoth");
          const buf = await readFileAsArrayBuffer(file);
          const result = await mammoth.convertToHtml({ arrayBuffer: buf });
          setProgress(60);
          const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
          const doc = await PDFDocument.create();
          const font = await doc.embedFont(StandardFonts.Helvetica);
          const container = document.createElement("div");
          container.innerHTML = result.value;
          const textContent = container.innerText;
          const lines = textContent.split("\n");
          const fontSize = 11; const lineHeight = fontSize * 1.5;
          const pageW = 595; const pageH = 842; const margin = 50;
          const linesPerPage = Math.floor((pageH - margin * 2) / lineHeight);
          for (let i = 0; i < lines.length; i += linesPerPage) {
            const page = doc.addPage([pageW, pageH]);
            const chunk = lines.slice(i, i + linesPerPage);
            chunk.forEach((line, j) => {
              page.drawText(line.substring(0, 90), { x: margin, y: pageH - margin - (j * lineHeight), size: fontSize, font, color: rgb(0, 0, 0) });
            });
            setProgress(60 + Math.round((i / lines.length) * 30));
          }
          const pdfBytes = await doc.save();
          setPreviewData(new Uint8Array(pdfBytes));
          downloadBlob(new Blob([(pdfBytes as Uint8Array).buffer as ArrayBuffer], { type: "application/pdf" }), `${getFileBaseName(file.name)}.pdf`);
          setResultReady(true);
          toast("DOCX converted to PDF (client)!", "success");
        }

      } else if (mode === "images-to-pdf" && files.length) {
        setProgress(50);
        const pdfBytes = await imagesToPDF(files, "a4", 20);
        setPreviewData(new Uint8Array(pdfBytes));
        downloadBlob(new Blob([(pdfBytes as Uint8Array).buffer as ArrayBuffer], { type: "application/pdf" }), "images_combined.pdf");
        setResultReady(true);
        toast(`${files.length} images converted to PDF!`, "success");

      } else if ((mode === "pptx-to-pdf" || mode === "xlsx-to-pdf" || mode === "html-to-pdf") && file) {
        // These require server-side conversion
        if (!backendOnline) {
          toast("Backend server is offline. Start it with: cd backend && npm start", "error");
          return;
        }
        setProgress(20);
        toast("Processing on server (LibreOffice)...", "info");
        const result = await convertWithBackend(file, "pdf");
        setProgress(90);
        const arrayBuf = await result.blob.arrayBuffer();
        setPreviewData(new Uint8Array(arrayBuf));
        downloadBlob(result.blob, result.filename);
        setConversionTime(result.conversionTimeMs);
        setResultReady(true);
        toast(`${current.from} converted to PDF!`, "success");
      }
      setProgress(100);
      setConversionTime(prev => prev ?? (Date.now() - startTime));
    } catch (e: any) {
      console.error(e);
      toast(`Conversion failed: ${e.message || "Unknown error"}`, "error");
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const downloadText = () => {
    if (!extractedText || !file) return;
    downloadBlob(new Blob([extractedText], { type: "text/plain" }), `${getFileBaseName(file.name)}.txt`);
  };

  const hasInput = isMulti ? files.length > 0 : !!file;

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
          <div className="badge badge-indigo"><FileOutput size={11} /> CONVERT</div>
          {/* Backend status indicator */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 500,
            background: backendOnline ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
            border: "1px solid var(--glass-border)",
            color: backendOnline ? "#6ee7b7" : "#fcd34d",
          }}>
            {backendOnline === null ? (
              <><div className="spinner" style={{ width: "10px", height: "10px" }} /> Checking server...</>
            ) : backendOnline ? (
              <><Wifi size={10} /> Server Online</>
            ) : (
              <><WifiOff size={10} /> Server Offline</>
            )}
          </div>
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Convert Documents</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
          Convert between PDF, images, text and Office formats. Client-side when possible, server-side via LibreOffice for Office formats.
        </p>
      </div>

      {/* Conversion type selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px", marginBottom: "24px" }}>
        {conversions.map(c => {
          const Icon = c.icon;
          const needsServer = c.serverSide;
          return (
            <button key={c.id} onClick={() => { setMode(c.id); resetAll(); }} style={{
              padding: "12px", borderRadius: "14px", cursor: "pointer", textAlign: "left",
              background: mode === c.id ? `${c.color}18` : "rgba(var(--color-invert-rgb), 0.03)",
              border: `1px solid ${mode === c.id ? c.color + "40" : "rgba(var(--color-invert-rgb), 0.06)"}`,
              transition: "all 0.2s",
              opacity: needsServer && !backendOnline ? 0.5 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <Icon size={13} color={mode === c.id ? c.color : "rgba(var(--color-invert-rgb), 0.4)"} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: mode === c.id ? "white" : "rgba(var(--color-invert-rgb), 0.5)" }}>{c.label}</span>
                {needsServer && <Server size={9} color="rgba(var(--color-invert-rgb), 0.2)" />}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.4 }}>{c.desc}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px", minHeight: "calc(100vh - 380px)" }}>
        {/* Left panel */}
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {!hasInput ? (
            <DropZone
              onFiles={handleFile}
              accept={current.accept}
              multiple={isMulti}
              label={isMulti ? "Drop images here" : `Drop ${current.from} file here`}
              icon={<Upload size={22} color={current.color} />}
            />
          ) : (
            <div style={{ padding: "12px 14px", borderRadius: "12px", background: `${current.color}10`, border: `1px solid ${current.color}30` }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                {isMulti ? `${files.length} image(s) selected` : file!.name}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                {isMulti ? files.map(f => f.name).join(", ") : formatBytes(file!.size)}
              </div>
              <button onClick={resetAll}
                style={{ marginTop: "6px", fontSize: "11px", color: "#ef4444", cursor: "pointer", background: "none", border: "none", padding: 0 }}>Remove</button>
            </div>
          )}

          {/* Conversion info */}
          <div style={{ padding: "16px", borderRadius: "14px", background: "rgba(var(--color-invert-rgb), 0.03)", border: "1px solid rgba(var(--color-invert-rgb), 0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center" }}>
              <div style={{ padding: "8px 16px", borderRadius: "10px", background: `${current.color}15`, border: `1px solid ${current.color}30`, fontSize: "13px", fontWeight: 600, color: current.color }}>
                {current.from}
              </div>
              <ArrowRight size={18} color="rgba(var(--color-invert-rgb), 0.3)" />
              <div style={{ padding: "8px 16px", borderRadius: "10px", background: `${current.color}15`, border: `1px solid ${current.color}30`, fontSize: "13px", fontWeight: 600, color: current.color }}>
                {current.to}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "10px" }}>
              {current.serverSide ? (
                <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Server size={9} /> Server-side (LibreOffice)
                </span>
              ) : (
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  🔒 Processed in your browser — no data uploaded
                </span>
              )}
            </div>
          </div>

          {/* Server-side warning if offline */}
          {current.serverSide && !backendOnline && (
            <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "11px", color: "var(--accent-orange)", lineHeight: 1.5 }}>
              ⚠ This conversion requires the backend server. Start it with:<br />
              <code style={{ background: "rgba(var(--color-obverse-rgb), 0.3)", padding: "2px 6px", borderRadius: "4px", fontSize: "10px" }}>cd backend && npm start</code>
            </div>
          )}

          {processing && (
            <div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", textAlign: "center" }}>Converting... {progress}%</p>
            </div>
          )}

          {resultReady && (
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", textAlign: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--accent-green)", fontWeight: 600 }}>✓ Conversion complete!</span>
              {conversionTime !== null && (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Processed in {conversionTime < 1000 ? `${conversionTime}ms` : `${(conversionTime / 1000).toFixed(1)}s`}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto" }}>
            <button className="btn-primary" onClick={handleConvert}
              disabled={!hasInput || processing || (current.serverSide && !backendOnline)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: (!hasInput || (current.serverSide && !backendOnline)) ? 0.4 : 1 }}>
              {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Converting...</>
                : <><FileOutput size={16} /> Convert {current.from} → {current.to}</>}
            </button>
            {extractedText && (
              <button className="btn-secondary" onClick={downloadText}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Download size={16} /> Download as .txt
              </button>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="glass-card" style={{ padding: "16px", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {extractedText ? "Extracted Text" : "Preview"}
            </span>
            {resultReady && <span className="badge badge-green" style={{ fontSize: "10px" }}>● Done</span>}
          </div>
          {extractedText ? (
            <div style={{
              flex: 1, background: "rgba(var(--color-obverse-rgb), 0.2)", borderRadius: "12px", padding: "20px",
              overflowY: "auto", maxHeight: "calc(100vh - 420px)",
            }}>
              <pre style={{
                fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.7,
                whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'Inter', monospace",
              }}>
                {extractedText}
              </pre>
            </div>
          ) : (
            <PDFViewer data={previewData} showControls={true} />
          )}
        </div>
      </div>
    </div>
  );
}
