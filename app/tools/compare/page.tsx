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
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "white" }}>Compare PDFs</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "6px", fontSize: "14px" }}>View two PDFs side by side with synchronized navigation.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "10px", fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>PDF A {nameA && `— ${nameA}`}</div>
          {!dataA ? <DropZone onFiles={loadA} accept=".pdf" multiple={false} label="Drop PDF A" icon={<Upload size={20} color="#6366f1" />} /> : <PDFViewer data={dataA} pageNumber={page} onPageCount={() => {}} showControls={true} />}
        </div>
        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "10px", fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>PDF B {nameB && `— ${nameB}`}</div>
          {!dataB ? <DropZone onFiles={loadB} accept=".pdf" multiple={false} label="Drop PDF B" icon={<Upload size={20} color="#8b5cf6" />} /> : <PDFViewer data={dataB} pageNumber={page} onPageCount={() => {}} showControls={true} />}
        </div>
      </div>
      {dataA && dataB && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px", alignItems: "center" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} className="btn-secondary" style={{ padding: "8px 16px" }}>← Prev</button>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} className="btn-secondary" style={{ padding: "8px 16px" }}>Next →</button>
        </div>
      )}
    </div>
  );
}
