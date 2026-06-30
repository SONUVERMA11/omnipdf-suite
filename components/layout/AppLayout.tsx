"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { ThemeToggle } from "./ThemeToggle";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  if (isLandingPage) {
    return (
      <div className="flex flex-col min-h-screen relative">
        <Navbar />
        <main className="flex-1" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          {children}
        </main>
        {/* Floating Theme Toggle on Landing Page */}
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 100 }}>
          <ThemeToggle />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-auto relative" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* Floating Theme Toggle inside Dashboard too */}
        <div style={{ position: "absolute", top: "16px", right: "24px", zIndex: 100 }}>
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
