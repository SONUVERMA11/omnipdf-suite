/**
 * OmniPDF Core Engine — 100% client-side PDF processing
 * Built on pdf-lib (WASM/JS). Zero server round-trips for full privacy.
 */

import { PDFDocument, degrees, rgb, StandardFonts, BlendMode } from "pdf-lib";

// ─── Helpers ────────────────────────────────────────────────────────────────

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function getFileBaseName(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

// ─── PDF Info ────────────────────────────────────────────────────────────────

export interface PDFInfo {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  fileSize: number;
  filename: string;
}

export async function getPDFInfo(file: File): Promise<PDFInfo> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle() ?? undefined,
    author: doc.getAuthor() ?? undefined,
    subject: doc.getSubject() ?? undefined,
    keywords: doc.getKeywords() ?? undefined,
    creator: doc.getCreator() ?? undefined,
    producer: doc.getProducer() ?? undefined,
    fileSize: file.size,
    filename: file.name,
  };
}

// ─── Merge ────────────────────────────────────────────────────────────────

export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const bytes = await readFileAsArrayBuffer(file);
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return merged.save();
}

// ─── Split ────────────────────────────────────────────────────────────────

export type SplitMode =
  | { type: "range"; ranges: [number, number][] }
  | { type: "everyN"; n: number }
  | { type: "fixed"; pages: number[] };

export async function splitPDF(file: File, mode: SplitMode): Promise<Uint8Array[]> {
  const bytes = await readFileAsArrayBuffer(file);
  const src = await PDFDocument.load(bytes);
  const total = src.getPageCount();
  const results: Uint8Array[] = [];

  if (mode.type === "range") {
    for (const [start, end] of mode.ranges) {
      const doc = await PDFDocument.create();
      const idx = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
      const pages = await doc.copyPages(src, idx);
      pages.forEach((p) => doc.addPage(p));
      results.push(await doc.save());
    }
  } else if (mode.type === "everyN") {
    for (let i = 0; i < total; i += mode.n) {
      const doc = await PDFDocument.create();
      const idx = Array.from({ length: Math.min(mode.n, total - i) }, (_, j) => i + j);
      const pages = await doc.copyPages(src, idx);
      pages.forEach((p) => doc.addPage(p));
      results.push(await doc.save());
    }
  } else {
    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(src, mode.pages.map((p) => p - 1));
    pages.forEach((p) => doc.addPage(p));
    results.push(await doc.save());
  }

  return results;
}

// ─── Rotate ──────────────────────────────────────────────────────────────

export async function rotatePDF(file: File, rotations: Record<number, number>): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  doc.getPages().forEach((page, i) => {
    if (rotations[i] !== undefined) page.setRotation(degrees(rotations[i]));
  });
  return doc.save();
}

// ─── Crop ────────────────────────────────────────────────────────────────

export interface CropBox { x: number; y: number; width: number; height: number; }

export async function cropPDF(
  file: File,
  cropBox: CropBox,
  targetPages: "all" | number[] = "all"
): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  
  const targetSet = targetPages === "all" ? null : new Set(targetPages.map(p => p - 1));

  doc.getPages().forEach((page, i) => {
    if (targetSet && !targetSet.has(i)) return;
    page.setCropBox(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
    page.setMediaBox(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
  });
  return doc.save();
}

// ─── Compress ────────────────────────────────────────────────────────────

export type CompressionLevel = "low" | "medium" | "high" | "extreme";

export async function compressPDF(file: File, level: CompressionLevel = "medium"): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  if (level === "high" || level === "extreme") {
    doc.setTitle(""); doc.setAuthor(""); doc.setSubject("");
    doc.setKeywords([]); doc.setCreator("OmniPDF"); doc.setProducer("OmniPDF");
  }
  return doc.save({ useObjectStreams: level !== "low", addDefaultPage: false });
}

// ─── Repair ────────────────────────────────────────────────────────────

export async function repairPDF(file: File): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  // pdf-lib's load implicitly repairs malformed cross-reference tables
  // ignoreEncryption allows reading files with empty passwords that trip some parsers
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.save();
}

// ─── Watermark ───────────────────────────────────────────────────────────

export interface WatermarkOptions {
  text?: string;
  opacity: number;
  rotation: number;
  fontSize: number;
  color: { r: number; g: number; b: number };
  position: "center" | "tile" | "diagonal";
  pages: "all" | number[];
}

export async function addWatermark(file: File, options: WatermarkOptions): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  const targets = options.pages === "all" ? pages : options.pages.map((i) => pages[i - 1]).filter(Boolean);

  for (const page of targets) {
    const { width, height } = page.getSize();
    const { r, g, b } = options.color;
    if (!options.text) continue;
    const tw = font.widthOfTextAtSize(options.text, options.fontSize);
    if (options.position === "tile") {
      for (let y = 0; y < height; y += 120) {
        for (let x = 0; x < width; x += tw + 60) {
          page.drawText(options.text, { x, y, size: options.fontSize, font, color: rgb(r, g, b), opacity: options.opacity, rotate: degrees(options.rotation) });
        }
      }
    } else {
      page.drawText(options.text, {
        x: width / 2 - tw / 2, y: height / 2,
        size: options.fontSize, font, color: rgb(r, g, b),
        opacity: options.opacity,
        rotate: degrees(options.position === "diagonal" ? -45 : options.rotation),
      });
    }
  }
  return doc.save();
}

// ─── Decrypt ─────────────────────────────────────────────────────────────

export async function decryptPDF(file: File, password: string): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes, { password } as any);
  return doc.save();
}

// ─── Page Numbers ────────────────────────────────────────────────────────

export type PageNumberPosition = "bottom-center" | "bottom-left" | "bottom-right" | "top-center" | "top-left" | "top-right";

export async function addPageNumbers(
  file: File,
  options: { startFrom: number; position: PageNumberPosition; fontSize: number; prefix: string; suffix: string; color: { r: number; g: number; b: number }; skipFirst: boolean; }
): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const m = 30;
  doc.getPages().forEach((page, i) => {
    if (options.skipFirst && i === 0) return;
    const { width, height } = page.getSize();
    const text = `${options.prefix}${i + options.startFrom}${options.suffix}`;
    const tw = font.widthOfTextAtSize(text, options.fontSize);
    const { r, g, b } = options.color;
    let x = width / 2 - tw / 2, y = m;
    if (options.position === "bottom-left") x = m;
    if (options.position === "bottom-right") x = width - tw - m;
    if (options.position === "top-center") y = height - m;
    if (options.position === "top-left") { x = m; y = height - m; }
    if (options.position === "top-right") { x = width - tw - m; y = height - m; }
    page.drawText(text, { x, y, size: options.fontSize, font, color: rgb(r, g, b) });
  });
  return doc.save();
}

// ─── Reorder Pages ───────────────────────────────────────────────────────

export async function reorderPages(file: File, newOrder: number[]): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const src = await PDFDocument.load(bytes);
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, newOrder.map((i) => i - 1));
  pages.forEach((p) => doc.addPage(p));
  return doc.save();
}

// ─── Delete Pages ────────────────────────────────────────────────────────

export async function deletePages(file: File, pagesToDelete: number[]): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const src = await PDFDocument.load(bytes);
  const total = src.getPageCount();
  const del = new Set(pagesToDelete.map((p) => p - 1));
  const keep = Array.from({ length: total }, (_, i) => i).filter((i) => !del.has(i));
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, keep);
  pages.forEach((p) => doc.addPage(p));
  return doc.save();
}

// ─── Images → PDF ────────────────────────────────────────────────────────

export type PageSize = "a4" | "letter" | "a3" | "fit";

export async function imagesToPDF(imageFiles: File[], pageSize: PageSize = "a4", margin = 0): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const sizes: Record<string, [number, number]> = { a4: [595, 842], letter: [612, 792], a3: [842, 1191], fit: [0, 0] };
  for (const file of imageFiles) {
    const bytes = await readFileAsArrayBuffer(file);
    const u8 = new Uint8Array(bytes);
    let img: any;
    const isJpeg = file.type === "image/jpeg" || file.name.toLowerCase().endsWith(".jpg");
    try { img = isJpeg ? await doc.embedJpg(u8) : await doc.embedPng(u8); }
    catch { try { img = await doc.embedPng(u8); } catch { img = await doc.embedJpg(u8); } }
    let [pw, ph] = sizes[pageSize];
    if (pageSize === "fit") { pw = img.width + margin * 2; ph = img.height + margin * 2; }
    const page = doc.addPage([pw, ph]);
    const maxW = pw - margin * 2, maxH = ph - margin * 2;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = img.width * scale, h = img.height * scale;
    page.drawImage(img, { x: margin + (maxW - w) / 2, y: margin + (maxH - h) / 2, width: w, height: h });
  }
  return doc.save();
}

// ─── Redact ──────────────────────────────────────────────────────────────

export interface RedactBox { pageIndex: number; x: number; y: number; width: number; height: number; }

export async function redactPDF(file: File, boxes: RedactBox[]): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();
  for (const box of boxes) {
    const page = pages[box.pageIndex];
    if (page) page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, color: rgb(0, 0, 0), opacity: 1 });
  }
  return doc.save();
}

// ─── Add Signature Image ─────────────────────────────────────────────────

export async function addSignature(
  file: File,
  signatureDataUrl: string,
  placement: { pageIndex: number; x: number; y: number; width: number; height: number }
): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  const base64 = signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const img = await doc.embedPng(imgBytes);
  const page = doc.getPages()[placement.pageIndex];
  if (page) page.drawImage(img, { x: placement.x, y: placement.y, width: placement.width, height: placement.height });
  return doc.save();
}

// ─── Text Annotations ────────────────────────────────────────────────────

export interface TextAnnotation {
  pageIndex: number;
  text: string;
  x: number; y: number;
  fontSize: number;
  color: { r: number; g: number; b: number };
}

export async function addTextAnnotations(file: File, annotations: TextAnnotation[]): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const ann of annotations) {
    const page = doc.getPages()[ann.pageIndex];
    if (!page) continue;
    const { r, g, b } = ann.color;
    page.drawText(ann.text, { x: ann.x, y: ann.y, size: ann.fontSize, font, color: rgb(r, g, b) });
  }
  return doc.save();
}

// ─── Invert Colors ───────────────────────────────────────────────────────

export async function invertPDF(file: File): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  
  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(1, 1, 1),
      blendMode: BlendMode.Difference,
    });
  });
  
  return doc.save();
}

// ─── Print Layout Generator ──────────────────────────────────────────────

export interface PrintOptions {
  layout: "normal" | "2up" | "4up" | "booklet" | "custom";
  customGrid?: { rows: number; cols: number };
  paperSize: "a4" | "letter" | "a3" | "legal";
  orientation: "portrait" | "landscape";
  margins: { top: number; bottom: number; left: number; right: number };
  pageIndices?: number[]; // Array of 0-based page indices to print
}

export async function generatePrintLayout(file: File, opts: PrintOptions): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const srcDoc = await PDFDocument.load(bytes);
  const destDoc = await PDFDocument.create();
  
  const mmToPt = 2.83465;
  const margins = {
    t: opts.margins.top * mmToPt,
    b: opts.margins.bottom * mmToPt,
    l: opts.margins.left * mmToPt,
    r: opts.margins.right * mmToPt,
  };

  const sizes: any = { a4: [595, 842], letter: [612, 792], a3: [842, 1191], legal: [612, 1008] };
  let [pw, ph] = sizes[opts.paperSize];
  if (opts.orientation === "landscape") { [pw, ph] = [ph, pw]; }

  const totalSrcPages = srcDoc.getPageCount();
  const targetIndices = opts.pageIndices || Array.from({ length: totalSrcPages }, (_, i) => i);
  // Filter out invalid indices
  const validIndices = targetIndices.filter(i => i >= 0 && i < totalSrcPages);
  
  if (validIndices.length === 0) {
    // If no valid pages, just return an empty page so it doesn't crash
    destDoc.addPage([pw, ph]);
    return destDoc.save();
  }

  // embedPdf only takes unique indices to embed. 
  // If the user wants page [0, 0, 0, 0], we embed [0] once, and reference it 4 times.
  const uniqueIndices = Array.from(new Set(validIndices));
  const embeddedPages = await destDoc.embedPdf(srcDoc, uniqueIndices);
  
  // Map index back to embedded page
  const embedMap = new Map();
  uniqueIndices.forEach((idx, i) => embedMap.set(idx, embeddedPages[i]));

  const pagesToDraw = validIndices.map(idx => embedMap.get(idx));

  const drawPages = (pageArr: any[], layoutRows: number, layoutCols: number) => {
    let i = 0;
    while (i < pageArr.length) {
      const page = destDoc.addPage([pw, ph]);
      const contentW = pw - margins.l - margins.r;
      const contentH = ph - margins.t - margins.b;
      const cellW = contentW / layoutCols;
      const cellH = contentH / layoutRows;

      for (let r = 0; r < layoutRows; r++) {
        for (let c = 0; c < layoutCols; c++) {
          if (i >= pageArr.length) break;
          const ep = pageArr[i++];
          if (!ep) continue;

          const scale = Math.min(cellW / ep.width, cellH / ep.height);
          const scaledW = ep.width * scale;
          const scaledH = ep.height * scale;
          const x = margins.l + (c * cellW) + (cellW - scaledW) / 2;
          const y = ph - margins.t - (r * cellH) - cellH + (cellH - scaledH) / 2;
          page.drawPage(ep, { x, y, width: scaledW, height: scaledH });
        }
      }
    }
  };

  if (opts.layout === "normal") drawPages(pagesToDraw, 1, 1);
  else if (opts.layout === "2up") {
    if (opts.orientation === "portrait") drawPages(pagesToDraw, 2, 1);
    else drawPages(pagesToDraw, 1, 2);
  } else if (opts.layout === "4up") {
    drawPages(pagesToDraw, 2, 2);
  } else if (opts.layout === "custom" && opts.customGrid) {
    drawPages(pagesToDraw, opts.customGrid.rows, opts.customGrid.cols);
  } else if (opts.layout === "booklet") {
    const padded = [...pagesToDraw];
    while (padded.length % 4 !== 0) padded.push(null as any);
    const total = padded.length;
    const ordered = [];
    for (let i = 0; i < total / 2; i += 2) {
      ordered.push(padded[total - 1 - i]); 
      ordered.push(padded[i]);             
      ordered.push(padded[i + 1]);         
      ordered.push(padded[total - 2 - i]); 
    }
    if (opts.orientation === "portrait") drawPages(ordered, 2, 1);
    else drawPages(ordered, 1, 2);
  }

  return destDoc.save();
}
