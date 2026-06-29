import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/Toaster";

export const metadata: Metadata = {
  title: "OmniPDF Suite — Complete Document Management",
  description:
    "The ultimate PDF & document management suite. Merge, split, convert, compress, OCR, scan, sign and print — all 100% free, private, and client-side.",
  keywords: "PDF tools, merge PDF, split PDF, convert PDF, OCR, document scanner, PDF editor, free PDF tools",
  authors: [{ name: "OmniPDF Suite" }],
  openGraph: {
    title: "OmniPDF Suite",
    description: "Complete document management suite — free, private, and powerful.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#0a0a0f" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-h-screen overflow-auto relative" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
