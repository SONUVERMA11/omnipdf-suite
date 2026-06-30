"use client";

import { useState, useCallback } from "react";
import { Wrench, Upload, Download } from "lucide-react";
import { repairPDF, downloadBlob, formatBytes, getFileBaseName } from "@/lib/pdf/engine";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";

export default function RepairPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFiles = useCallback((incoming: File[]) => {
    const pdfs = incoming.filter(f => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) {
      toast("Please upload PDF files", "error");
      return;
    }
    setFiles(prev => [...prev, ...pdfs]);
    toast(`Added ${pdfs.length} file(s)`, "success");
  }, []);

  const handleRepair = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const repairedParts: { name: string; data: Uint8Array }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const repaired = await repairPDF(file);
          repairedParts.push({ name: `${getFileBaseName(file.name)}_repaired.pdf`, data: repaired });
        } catch (err) {
          toast(`Failed to repair ${file.name}`, "error");
        }
        setProgress(10 + Math.round(((i + 1) / files.length) * 80));
      }

      if (repairedParts.length === 0) {
        toast("No files could be repaired", "error");
      } else if (repairedParts.length === 1) {
        downloadBlob(new Blob([(repairedParts[0].data as Uint8Array).buffer as ArrayBuffer], { type: "application/pdf" }), repairedParts[0].name);
        toast("Repaired and downloaded", "success");
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        repairedParts.forEach(p => zip.file(p.name, p.data));
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, "repaired_pdfs.zip");
        toast(`Repaired ${repairedParts.length} files (ZIP)`, "success");
      }
    } catch (e) {
      toast("Repair process failed", "error");
    } finally {
      setProgress(100);
      setProcessing(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ marginBottom: "28px", textAlign: "center", maxWidth: "600px" }}>
        <div className="badge badge-amber" style={{ marginBottom: "10px", display: "inline-flex" }}>
          <Wrench size={11} /> REPAIR PDF
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Repair PDF</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
          Fix corrupted PDF files, repair broken cross-reference tables, and recover data. You can select multiple files together.
        </p>
      </div>

      <div className="glass-card" style={{ padding: "24px", width: "100%", maxWidth: "600px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <DropZone onFiles={handleFiles} accept=".pdf" multiple={true} label="Drop PDF files here" icon={<Upload size={22} color="#f59e0b" />} />
        
        {files.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
              <span>{files.length} file(s) selected</span>
              <button onClick={() => setFiles([])} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "12px", cursor: "pointer" }}>Clear All</button>
            </div>
            {files.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "10px", background: "rgba(var(--color-invert-rgb), 0.03)", border: "1px solid rgba(var(--color-invert-rgb), 0.06)" }}>
                <div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{f.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatBytes(f.size)}</div>
                </div>
                <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px" }}>×</button>
              </div>
            ))}
          </div>
        )}

        {processing && (
          <div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%`, background: "#f59e0b" }} /></div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", textAlign: "center" }}>Repairing... {progress}%</p>
          </div>
        )}

        <button className="btn-primary" onClick={handleRepair} disabled={files.length === 0 || processing}
          style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#f59e0b", color: "black", opacity: files.length === 0 ? 0.4 : 1 }}>
          {processing ? <><div className="spinner" style={{ width: "16px", height: "16px", borderTopColor: "black" }} /> Processing...</>
            : <><Wrench size={16} /> Repair {files.length > 1 ? "Files" : "File"}</>}
        </button>
      </div>
    </div>
  );
}
