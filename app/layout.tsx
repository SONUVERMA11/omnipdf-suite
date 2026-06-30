import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";

export const metadata: Metadata = {
  metadataBase: new URL("https://omnipdf.com"),
  title: {
    default: "OmniPDF Suite — Advanced Document Management",
    template: "%s | OmniPDF Suite"
  },
  description:
    "The ultimate PDF & document management suite. Merge, split, convert, compress, OCR, scan, sign and print — all 100% free, private, and client-side.",
  keywords: ["PDF tools", "merge PDF", "split PDF", "convert PDF", "OCR", "document scanner", "PDF editor", "free PDF tools", "SONU VERMA", "OmniPDF"],
  authors: [{ name: "SONU VERMA", url: "https://github.com/sonuverma11" }],
  creator: "SONU VERMA",
  publisher: "OmniPDF",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://omnipdf.com",
    title: "OmniPDF Suite — Advanced Document Management",
    description: "Complete document management suite — free, private, and powerful.",
    siteName: "OmniPDF",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "OmniPDF Suite" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "OmniPDF Suite",
    description: "The ultimate PDF suite by SONU VERMA. 100% Free & Private.",
    creator: "@sonuverma11",
  },
  appleWebApp: {
    title: "OmniPDF",
    statusBarStyle: "black-translucent",
    capable: true,
  },
};

import { ThemeProvider } from "@/components/ThemeProvider";
import { AppLayout } from "@/components/layout/AppLayout";

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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f5f5f7" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AppLayout>
            {children}
          </AppLayout>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
