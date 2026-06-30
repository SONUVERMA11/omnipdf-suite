"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FileText, GitMerge, Scissors, Minimize2, RotateCw,
  Droplets, Lock, Image, FileOutput, FileInput, Eye,
  Scan, Printer, Search, Edit3, PenTool, Crop, AlignLeft,
  BarChart2, ChevronLeft, ChevronRight, Zap, Home,
  BookOpen, Layers, RefreshCw, Shield, Type, FileSearch,
  Maximize2, SlidersHorizontal, Camera, Settings, X, FileSignature, Contrast
} from "lucide-react";

const toolGroups = [
  {
    label: "Dashboard",
    items: [
      { label: "Home", href: "/", icon: Home },
    ],
  },
  {
    label: "Organize",
    items: [
      { label: "Merge PDF", href: "/tools/merge", icon: GitMerge, color: "#6366f1" },
      { label: "Split PDF", href: "/tools/split", icon: Scissors, color: "#8b5cf6" },
      { label: "Crop PDF", href: "/tools/crop", icon: Crop, color: "#a78bfa" },
      { label: "Rotate Pages", href: "/tools/rotate", icon: RotateCw, color: "#06b6d4" },
      { label: "Reorder Pages", href: "/tools/rotate?mode=reorder", icon: Layers, color: "#0ea5e9" },
    ],
  },
  {
    label: "Optimize",
    items: [
      { label: "Compress PDF", href: "/tools/compress", icon: Minimize2, color: "#10b981" },
      { label: "Repair PDF", href: "/tools/repair", icon: RefreshCw, color: "#34d399" },
    ],
  },
  {
    label: "Convert",
    items: [
      { label: "PDF → Word", href: "/tools/convert?from=pdf&to=docx", icon: FileOutput, color: "#f59e0b" },
      { label: "PDF → Images", href: "/tools/pdf-to-images", icon: Image, color: "#f97316" },
      { label: "PDF → Excel", href: "/tools/convert?from=pdf&to=xlsx", icon: BarChart2, color: "#84cc16" },
      { label: "Word → PDF", href: "/tools/convert?from=docx&to=pdf", icon: FileInput, color: "#ec4899" },
      { label: "Images → PDF", href: "/tools/images-to-pdf", icon: FileText, color: "#f43f5e" },
      { label: "HTML → PDF", href: "/tools/convert?from=html&to=pdf", icon: FileSearch, color: "#8b5cf6" },
    ],
  },
  {
    label: "Edit & Enhance",
    items: [
      { label: "Edit PDF", href: "/tools/edit", icon: Edit3, color: "#6366f1" },
      { label: "Annotate", href: "/tools/edit?mode=annotate", icon: PenTool, color: "#a78bfa" },
      { label: "Invert Colors", href: "/tools/invert", icon: Contrast, color: "#f8fafc" },
      { label: "Redact", href: "/tools/redact", icon: X, color: "#ef4444" },
      { label: "Watermark", href: "/tools/watermark", icon: Droplets, color: "#06b6d4" },
      { label: "Add Page Numbers", href: "/tools/edit?mode=pagenumbers", icon: BookOpen, color: "#0ea5e9" },
    ],
  },
  {
    label: "Security",
    items: [
      { label: "Encrypt / Lock", href: "/tools/encrypt?mode=encrypt", icon: Lock, color: "#f59e0b" },
      { label: "Decrypt / Unlock", href: "/tools/encrypt?mode=decrypt", icon: Shield, color: "#10b981" },
      { label: "Sign PDF", href: "/tools/sign", icon: FileSignature, color: "#ec4899" },
    ],
  },
  {
    label: "AI & Vision",
    items: [
      { label: "OCR — Extract Text", href: "/tools/ocr", icon: Type, color: "#8b5cf6" },
      { label: "Compare PDFs", href: "/tools/compare", icon: SlidersHorizontal, color: "#06b6d4" },
      { label: "PDF Preview", href: "/tools/preview", icon: Eye, color: "#a78bfa" },
    ],
  },
  {
    label: "Scan & Print",
    items: [
      { label: "Document Scanner", href: "/scanner", icon: Camera, color: "#6366f1" },
      { label: "Print Studio", href: "/print", icon: Printer, color: "#8b5cf6" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="relative flex-shrink-0 h-screen flex flex-col overflow-hidden transition-all duration-500 ease-in-out border-r"
      style={{
        width: collapsed ? "72px" : "260px",
        background: "var(--bg-secondary)",
        borderColor: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(40px)",
        boxShadow: collapsed ? "none" : "4px 0 24px rgba(0,0,0,0.2)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 0 20px rgba(99,102,241,0.4)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-sm leading-tight" style={{ color: "var(--text-primary)" }}>OmniPDF</div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
              Suite v1.0
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2" style={{ scrollbarWidth: "none" }}>
        {toolGroups.map((group) => (
          <div key={group.label} className="mb-2">
            {!collapsed && (
              <div
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href.split("?")[0]));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-item"
                  style={{
                    ...(isActive
                      ? {
                          background: "rgba(99,102,241,0.12)",
                          color: (item as any).color || "var(--accent-active-text)",
                          borderLeft: `2px solid ${(item as any).color || "#6366f1"}`,
                          paddingLeft: "12px",
                        }
                      : {}),
                    justifyContent: collapsed ? "center" : undefined,
                    padding: collapsed ? "10px" : undefined,
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    size={16}
                    style={{ color: isActive ? (item as any).color || "#6366f1" : undefined, flexShrink: 0 }}
                  />
                  {!collapsed && (
                    <span className="truncate" style={{ fontSize: "13px" }}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center m-3 rounded-xl transition-all duration-300 hover:bg-white/10"
        style={{
          height: "40px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
        }}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
