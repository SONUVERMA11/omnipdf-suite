"use client";

import Link from "next/link";
import {
  GitMerge, Scissors, Minimize2, RotateCw, Crop, Droplets, Lock, Shield,
  Image, FileOutput, FileInput, Type, SlidersHorizontal, Edit3, PenTool,
  X, FileSignature, Camera, Printer, BarChart2, FileSearch, Layers,
  Zap, ArrowRight, CheckCircle, Globe, Monitor, Smartphone, Wrench
} from "lucide-react";

const tools = [
  { label: "Merge PDF", href: "/tools/merge", icon: GitMerge, color: "#6366f1", desc: "Combine multiple PDFs into one" },
  { label: "Split PDF", href: "/tools/split", icon: Scissors, color: "#8b5cf6", desc: "Extract pages or split by range" },
  { label: "Compress PDF", href: "/tools/compress", icon: Minimize2, color: "#10b981", desc: "Reduce file size up to 90%" },
  { label: "Repair PDF", href: "/tools/repair", icon: Wrench, color: "#f59e0b", desc: "Fix corrupted PDF files" },
  { label: "Crop PDF", href: "/tools/crop", icon: Crop, color: "#a78bfa", desc: "Auto & manual crop with handles" },
  { label: "Rotate Pages", href: "/tools/rotate", icon: RotateCw, color: "#06b6d4", desc: "Rotate individual or all pages" },
  { label: "Reorder Pages", href: "/tools/rotate?mode=reorder", icon: Layers, color: "#0ea5e9", desc: "Drag-and-drop page reordering" },
  { label: "Watermark", href: "/tools/watermark", icon: Droplets, color: "#f59e0b", desc: "Text or image watermarks" },
  { label: "Encrypt PDF", href: "/tools/encrypt?mode=encrypt", icon: Lock, color: "#f97316", desc: "Password protect your PDF" },
  { label: "Unlock PDF", href: "/tools/encrypt?mode=decrypt", icon: Shield, color: "#84cc16", desc: "Remove PDF password" },
  { label: "PDF → Word", href: "/tools/convert?from=pdf&to=docx", icon: FileOutput, color: "#ec4899", desc: "Convert PDF to editable DOCX" },
  { label: "PDF → Images", href: "/tools/pdf-to-images", icon: Image, color: "#f43f5e", desc: "Export pages as PNG/JPG" },
  { label: "PDF → Excel", href: "/tools/convert?from=pdf&to=xlsx", icon: BarChart2, color: "#84cc16", desc: "Extract tables to spreadsheet" },
  { label: "Word → PDF", href: "/tools/convert?from=docx&to=pdf", icon: FileInput, color: "#6366f1", desc: "Convert DOCX/DOC to PDF" },
  { label: "Images → PDF", href: "/tools/images-to-pdf", icon: Image, color: "#8b5cf6", desc: "Bundle images into a PDF" },
  { label: "HTML → PDF", href: "/tools/convert?from=html&to=pdf", icon: FileSearch, color: "#06b6d4", desc: "Convert web pages to PDF" },
  { label: "OCR — Extract Text", href: "/tools/ocr", icon: Type, color: "#a78bfa", desc: "AI text recognition from scans" },
  { label: "Edit PDF", href: "/tools/edit", icon: Edit3, color: "#6366f1", desc: "Add text, highlights & drawings" },
  { label: "Sign PDF", href: "/tools/sign", icon: FileSignature, color: "#ec4899", desc: "Draw, type or upload signature" },
  { label: "Redact PDF", href: "/tools/redact", icon: X, color: "#ef4444", desc: "Permanently remove sensitive data" },
  { label: "Compare PDFs", href: "/tools/compare", icon: SlidersHorizontal, color: "#06b6d4", desc: "Visual diff between two PDFs" },
  { label: "Document Scanner", href: "/scanner", icon: Camera, color: "#6366f1", desc: "Scan with camera + auto-crop" },
  { label: "Print Studio", href: "/print", icon: Printer, color: "#8b5cf6", desc: "Booklet, N-up, duplex preview" },
];

const stats = [
  { value: "22+", label: "Powerful Tools" },
  { value: "100%", label: "Free Forever" },
  { value: "0%", label: "Data Uploaded" },
  { value: "15+", label: "File Formats" },
];

const platforms = [
  { icon: Globe, label: "Web App", desc: "Works in any browser" },
  { icon: Monitor, label: "Desktop", desc: "Windows, macOS, Linux" },
  { icon: Smartphone, label: "Android", desc: "Expo mobile app" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen hero-gradient grid-pattern">
      {/* Glow orbs */}
      <div className="glow-orb" style={{ width: 600, height: 600, background: "rgba(99,102,241,0.12)", top: -200, right: -200 }} />
      <div className="glow-orb" style={{ width: 400, height: 400, background: "rgba(139,92,246,0.08)", bottom: 100, left: -100 }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px" }}>

        {/* Hero */}
        <div className="text-center" style={{ paddingTop: "80px", paddingBottom: "64px", position: "relative" }}>
          
          {/* Logo */}
          <div className="animate-fade-in-up" style={{ display: "flex", justifyContent: "center", marginBottom: "28px", animation: "fadeInUp 0.8s ease-out, float 6s ease-in-out infinite" }}>
            <div style={{
              width: "84px", height: "84px", borderRadius: "22px",
              background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              boxShadow: "0 10px 30px var(--glow-primary)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <div className="badge badge-indigo animate-fade-in-up" style={{ marginBottom: "24px", display: "inline-flex" }}>
            <Zap size={11} />
            <span>100% Free · Client-Side · Privacy First</span>
          </div>

          <h1
            className="animate-fade-in-up"
            style={{
              fontSize: "clamp(40px, 6vw, 76px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              animationDelay: "0.1s",
              animationFillMode: "both",
            }}
          >
            <span style={{ color: "var(--text-primary)" }}>The Complete</span>
            <br />
            <span className="gradient-text">PDF & Document Suite</span>
          </h1>

          <p
            className="animate-fade-in-up"
            style={{
              fontSize: "19px",
              color: "var(--text-secondary)",
              maxWidth: "600px",
              margin: "24px auto 0",
              lineHeight: 1.6,
              animationDelay: "0.2s",
              animationFillMode: "both",
              fontWeight: 400
            }}
          >
            Merge, split, compress, edit, convert, and secure.
            All processing happens natively <strong style={{ color: "var(--text-primary)" }}>in your browser</strong>. Your files never leave your device.
          </p>

          <div
            className="animate-fade-in-up flex items-center justify-center gap-4"
            style={{ marginTop: "36px", animationDelay: "0.3s", animationFillMode: "both", flexWrap: "wrap" }}
          >
            <Link href="/tools/merge" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
              Start for Free <ArrowRight size={16} />
            </Link>
            <Link href="/tools/ocr" className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
              Try OCR Tool
            </Link>
          </div>

          {/* Platform badges */}
          <div className="flex items-center justify-center gap-3" style={{ marginTop: "32px", flexWrap: "wrap" }}>
            {platforms.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.label}
                  className="flex items-center gap-2"
                  style={{
                    background: "rgba(var(--color-invert-rgb), 0.04)",
                    border: "1px solid rgba(var(--color-invert-rgb), 0.08)",
                    borderRadius: "10px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <Icon size={13} color="#6366f1" />
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.label}</span>
                  <span>{p.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div
          className="glass-card"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            marginBottom: "48px",
            padding: "0",
            overflow: "hidden",
          }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: "28px",
                textAlign: "center",
                borderRight: i < stats.length - 1 ? "1px solid rgba(var(--color-invert-rgb), 0.06)" : undefined,
              }}
            >
              <div className="gradient-text" style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.03em" }}>
                {s.value}
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tools Grid */}
        <div style={{ marginBottom: "80px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "24px" }}>
            All Tools
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.href} href={tool.href} style={{ textDecoration: "none" }}>
                  <div className="tool-card" style={{ height: "100%" }}>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${tool.color}18`,
                        border: `1px solid ${tool.color}30`,
                        marginBottom: "14px",
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={18} color={tool.color} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)", marginBottom: "6px" }}>
                      {tool.label}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                      {tool.desc}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Features strip */}
        <div
          className="glass-card"
          style={{ padding: "40px", marginBottom: "60px" }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "28px", textAlign: "center" }}>
            Why OmniPDF?
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
            {[
              { icon: Shield, color: "#10b981", title: "100% Private", desc: "All processing happens in your browser. Files never touch any server." },
              { icon: Zap, color: "#6366f1", title: "Blazing Fast", desc: "WebAssembly engine processes PDFs in milliseconds, not seconds." },
              { icon: Globe, color: "#06b6d4", title: "Cross-Platform", desc: "Web, Windows, macOS, Linux, and Android — one codebase." },
              { icon: CheckCircle, color: "#f59e0b", title: "Completely Free", desc: "No subscriptions, no hidden fees, no watermarks on output." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px", height: "36px", borderRadius: "10px",
                      background: `${f.color}18`, border: `1px solid ${f.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Icon size={16} color={f.color} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{f.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="text-center divider"
          style={{ paddingBottom: "40px", paddingTop: "40px", marginTop: "20px" }}
        >
          <p style={{ fontSize: "15px", color: "var(--text-secondary)", fontWeight: 500 }}>
            Designed & Developed by <a href="https://github.com/sonuverma11" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-primary)", textDecoration: "none", fontWeight: 700 }}>SONU VERMA</a>
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>
            OmniPDF Suite — 100% Free & Open Source
          </p>
        </div>
      </div>
    </div>
  );
}
