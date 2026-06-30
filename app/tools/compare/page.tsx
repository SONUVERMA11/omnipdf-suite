"use client";
import { useState, useCallback } from "react";
import { SlidersHorizontal, Upload } from "lucide-react";
import { readFileAsArrayBuffer, formatBytes } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

export default function ComparePage() {
  const [dataA, setDataA] = useState<Uint8Array | null>(null);
  const [dataB, setDataB] = useState<Uint8Array | null>(null);
  const [nameA, setNameA] = useState(""); const [nameB, setNameB] = useState("");
  const [page, setPage] = useState(1);
  const [maxPages, setMaxPages] = useState(0);

  const loadA = useCallback(async (files: File[]) => {
    const buf = await readFileAsArrayBuffer(files[0]);
    setDataA(new Uint8Array(buf)); setNameA(files[0].name);
    toast("PDF A loaded", "success");
  }, []);
  const loadB = useCallback(async (files: File[]) => {
    const buf = await readFileAsArrayBuffer(files[0]);
    setDataB(new Uint8Array(buf)); setNameB(files[0].name);
    toast("PDF B loaded", "success");
  }, []);

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge badge-indigo" style={{ marginBottom: "10px" }}><SlidersHorizontal size={11} /> COMPARE PDFs</div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)" }}>Compare PDFs</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>View two PDFs side by side with synchronized navigation.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "10px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>PDF A {nameA && `— ${nameA}`}</div>
          {!dataA ? <DropZone onFiles={loadA} accept=".pdf" multiple={false} label="Drop PDF A" icon={<Upload size={20} color="#6366f1" />} /> 
            : <PDFViewer data={dataA} pageNumber={page} onPageCount={c => setMaxPages(m => Math.max(m, c))} showControls={false} />}
        </div>
        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "10px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>PDF B {nameB && `— ${nameB}`}</div>
          {!dataB ? <DropZone onFiles={loadB} accept=".pdf" multiple={false} label="Drop PDF B" icon={<Upload size={20} color="#8b5cf6" />} /> 
            : <PDFViewer data={dataB} pageNumber={page} onPageCount={c => setMaxPages(m => Math.max(m, c))} showControls={false} />}
        </div>
      </div>
      {dataA && dataB && (
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "16px", alignItems: "center" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} className="btn-secondary" style={{ padding: "10px 20px" }} disabled={page <= 1}>← Previous</button>
          <span style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 600 }}>Page {page} {maxPages > 0 && `of ${maxPages}`}</span>
          <button onClick={() => setPage(p => p + 1)} className="btn-secondary" style={{ padding: "10px 20px" }} disabled={page >= maxPages && maxPages > 0}>Next →</button>
        </div>
      )}
    </div>
  );
}
