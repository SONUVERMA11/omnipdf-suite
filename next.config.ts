import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "canvas"],
  output: "export",
  images: {
    unoptimized: true,
  },
  // Ensure paths are relative for Tauri
  // assets should be loaded via relative paths in static export for Tauri's custom protocol (tauri:// or asset://)
  // note: next.js static export default path structure works fine
};

export default nextConfig;
