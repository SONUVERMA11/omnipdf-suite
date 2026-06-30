/**
 * OmniPDF — Backend API client
 * 
 * Handles communication with the OmniPDF backend server for
 * server-side document conversions (Office → PDF via LibreOffice).
 */

// Backend URL — defaults to localhost for development
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export interface ConversionResult {
  blob: Blob;
  filename: string;
  conversionTimeMs: number;
  originalFormat: string;
}

/**
 * Check if the backend server is reachable
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Convert a file using the backend LibreOffice engine
 * @param file - File to convert
 * @param to - Target format (default: "pdf")
 * @returns ConversionResult with the converted file blob
 */
export async function convertWithBackend(
  file: File,
  to: string = "pdf"
): Promise<ConversionResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("to", to);

  const res = await fetch(`${BACKEND_URL}/api/convert`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(120_000), // 2 min timeout
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Conversion failed" }));
    throw new Error(error.message || `Server error: ${res.status}`);
  }

  const blob = await res.blob();
  const ext = path.extname(file.name);
  const baseName = file.name.replace(ext, "");
  
  return {
    blob,
    filename: `${baseName}.${to}`,
    conversionTimeMs: parseInt(res.headers.get("X-Conversion-Time-Ms") || "0"),
    originalFormat: res.headers.get("X-Original-Format") || ext.replace(".", ""),
  };
}

/**
 * Get list of supported formats from the backend
 */
export async function getSupportedFormats(): Promise<any> {
  const res = await fetch(`${BACKEND_URL}/api/formats`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error("Failed to fetch formats");
  return res.json();
}

// Helpers (avoid importing path on client)
const path = {
  extname: (filename: string) => {
    const idx = filename.lastIndexOf(".");
    return idx >= 0 ? filename.slice(idx) : "";
  },
};
