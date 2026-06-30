"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, FileEdit, FileCode2, Scissors, Settings, Search, Lock, PenTool } from "lucide-react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const categories = [
    {
      id: "edit",
      label: "Edit & Enhance",
      items: [
        { label: "Edit PDF", href: "/tools/edit", icon: FileEdit, desc: "Add text, images, and draw" },
        { label: "Repair PDF", href: "/tools/repair", icon: Settings, desc: "Fix corrupted documents" },
      ]
    },
    {
      id: "organize",
      label: "Organize",
      items: [
        { label: "Merge PDF", href: "/tools/merge", icon: FileCode2, desc: "Combine multiple files" },
        { label: "Split PDF", href: "/tools/split", icon: Scissors, desc: "Extract pages" },
        { label: "Crop PDF", href: "/tools/crop", icon: Scissors, desc: "Crop margins" },
        { label: "Rotate & Reorder", href: "/tools/rotate?mode=reorder", icon: Settings, desc: "Organize pages" },
      ]
    },
    {
      id: "convert",
      label: "Convert",
      items: [
        { label: "Document Converter", href: "/tools/convert", icon: FileCode2, desc: "Convert to/from Word, Excel, JPG" },
        { label: "OCR Scanner", href: "/tools/ocr", icon: Search, desc: "Extract text from images" },
      ]
    },
    {
      id: "security",
      label: "Security & Scan",
      items: [
        { label: "Document Scanner", href: "/scanner", icon: Search, desc: "Scan via Camera" },
        { label: "Compare PDF", href: "/tools/compare", icon: Search, desc: "Compare two documents" },
      ]
    }
  ];

  return (
    <header style={{ 
      position: "fixed", top: 0, width: "100%", zIndex: 100,
      background: "var(--glass-bg)", backdropFilter: "blur(40px)",
      borderBottom: "1px solid var(--glass-border)"
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px", padding: "0 24px" }}>
        
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "18px", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>OmniPDF</span>
        </Link>

        {/* Desktop Nav */}
        <nav style={{ display: "flex", gap: "8px" }}>
          {categories.map(cat => (
            <div 
              key={cat.id} 
              onMouseEnter={() => setActiveDropdown(cat.id)}
              onMouseLeave={() => setActiveDropdown(null)}
              style={{ position: "relative" }}
            >
              <button style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: activeDropdown === cat.id ? "rgba(var(--color-invert-rgb), 0.05)" : "transparent",
                border: "none", padding: "8px 16px", borderRadius: "10px",
                color: activeDropdown === cat.id ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
              }}>
                {cat.label}
                <ChevronDown size={14} style={{ transform: activeDropdown === cat.id ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
              </button>

              {/* Dropdown Menu */}
              {activeDropdown === cat.id && (
                <div style={{
                  position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                  paddingTop: "12px", width: "280px"
                }}>
                  <div className="glass-card" style={{ 
                    padding: "12px", display: "flex", flexDirection: "column", gap: "4px",
                    background: "var(--bg-secondary)",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                    border: "1px solid var(--glass-border)"
                  }}>
                    {cat.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.href} href={item.href} onClick={() => setActiveDropdown(null)} style={{ textDecoration: "none" }}>
                          <div style={{
                            display: "flex", gap: "12px", padding: "10px", borderRadius: "10px",
                            transition: "background 0.2s", cursor: "pointer"
                          }} className="hover:bg-white/10 dark:hover:bg-white/5">
                            <div style={{
                              width: "36px", height: "36px", borderRadius: "8px", background: "rgba(0, 122, 255, 0.1)",
                              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                            }}>
                              <Icon size={18} color="var(--accent-primary)" />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)", marginBottom: "2px" }}>{item.label}</div>
                              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.desc}</div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="https://github.com/sonuverma11" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <button className="btn-secondary" style={{ padding: "8px 16px", fontSize: "13px", height: "36px" }}>GitHub</button>
          </a>
        </div>
      </div>
    </header>
  );
}
