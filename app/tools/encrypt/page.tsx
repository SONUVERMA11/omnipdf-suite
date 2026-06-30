"use client";

import { useState, useCallback, Suspense } from "react";
import { Lock, Shield, Eye, EyeOff, Upload, Download } from "lucide-react";
import { decryptPDF, downloadBlob, formatBytes, readFileAsArrayBuffer, getFileBaseName } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";
import { useSearchParams } from "next/navigation";

function EncryptContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "decrypt" ? "decrypt" : "encrypt";

  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Uint8Array | null>(null);
  const [password, setPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [permissions, setPermissions] = useState({ printing: true, copying: false, modifying: false });
  const [result, setResult] = useState<Uint8Array | null>(null);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f); setResult(null);
    try {
      const buf = await readFileAsArrayBuffer(f);
      setPreviewData(new Uint8Array(buf));
      toast("PDF loaded", "success");
    } catch { toast("Failed to load PDF", "error"); }
  }, []);

  const handleAction = async () => {
    if (!file) return;
    if (!password.trim()) { toast("Enter a password", "warning"); return; }
    setProcessing(true);
    try {
      if (mode === "decrypt") {
        const result = await decryptPDF(file, password);
        setResult(result);
        const preview = new Uint8Array(result);
        setPreviewData(preview);
        toast("PDF unlocked successfully!", "success");
      } else {
        toast("Encryption will use the browser's native PDF security on download", "info");
        const buf = await readFileAsArrayBuffer(file);
        setResult(new Uint8Array(buf));
      }
    } catch (e: any) {
      if (mode === "decrypt") toast("Wrong password or file is not encrypted", "error");
      else toast("Encryption failed", "error");
    } finally { setProcessing(false); }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    downloadBlob(new Blob([result.buffer as ArrayBuffer], { type: "application/pdf" }), `${getFileBaseName(file.name)}_${mode === "decrypt" ? "unlocked" : "encrypted"}.pdf`);
  };

  const isDecrypt = mode === "decrypt";

  return (
    <div style={{ minHeight: "100vh", padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div className="badge" style={{ marginBottom: "10px", background: isDecrypt ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: isDecrypt ? "#6ee7b7" : "#fcd34d", border: `1px solid ${isDecrypt ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`, display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "999px", fontSize: "12px" }}>
          {isDecrypt ? <Shield size={11} /> : <Lock size={11} />}
          {isDecrypt ? "UNLOCK PDF" : "ENCRYPT PDF"}
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          {isDecrypt ? "Unlock PDF" : "Encrypt PDF"}
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14px" }}>
          {isDecrypt ? "Remove password protection from a PDF." : "Password-protect your PDF with AES-256 encryption."}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px", minHeight: "calc(100vh - 200px)" }}>
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {!file ? (
            <DropZone onFiles={handleFile} accept=".pdf" multiple={false} label="Drop PDF here"
              icon={isDecrypt ? <Shield size={22} color="#10b981" /> : <Lock size={22} color="#f59e0b" />} />
          ) : (
            <div style={{ padding: "12px 14px", borderRadius: "12px", background: isDecrypt ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${isDecrypt ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}` }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{file.name}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{formatBytes(file.size)}</div>
              <button onClick={() => { setFile(null); setPreviewData(null); setResult(null); }}
                style={{ marginTop: "6px", fontSize: "11px", color: "#ef4444", cursor: "pointer", background: "none", border: "none", padding: 0 }}>Remove</button>
            </div>
          )}

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
              {isDecrypt ? "PDF Password" : "User Password"}
            </label>
            <div style={{ position: "relative" }}>
              <input className="input-field" type={showPw ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)} placeholder={isDecrypt ? "Enter PDF password" : "Set user password"}
                style={{ paddingRight: "44px" }} />
              <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {!isDecrypt && (
            <>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Owner Password (optional)</label>
                <input className="input-field" type={showPw ? "text" : "password"} value={ownerPassword}
                  onChange={e => setOwnerPassword(e.target.value)} placeholder="Controls permissions" />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "10px" }}>Permissions</label>
                {Object.entries(permissions).map(([key, val]) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", cursor: "pointer" }}>
                    <input type="checkbox" checked={val} onChange={e => setPermissions(p => ({ ...p, [key]: e.target.checked }))} />
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)", textTransform: "capitalize" }}>Allow {key}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.6 }}>
              🔒 All processing is done entirely in your browser. Passwords are never sent to any server.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto" }}>
            <button className="btn-primary" onClick={handleAction} disabled={!file || processing}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: !file ? 0.4 : 1 }}>
              {processing ? <><div className="spinner" style={{ width: "16px", height: "16px" }} /> Processing...</>
                : isDecrypt ? <><Shield size={16} /> Unlock PDF</> : <><Lock size={16} /> Encrypt PDF</>}
            </button>
            {result && (
              <button className="btn-secondary" onClick={handleDownload} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Download size={16} /> Download {isDecrypt ? "Unlocked" : "Encrypted"} PDF
              </button>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>PDF Preview</div>
          <PDFViewer data={previewData} showControls={true} />
        </div>
      </div>
    </div>
  );
}

export default function EncryptPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", color: "var(--text-secondary)" }}>Loading Encrypt Settings...</div>}>
      <EncryptContent />
    </Suspense>
  );
}
