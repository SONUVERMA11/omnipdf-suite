# OmniPDF Suite — Complete Master Blueprint

> **For AI Agents:** This document is the single source of truth. Read it fully before writing any code.

---

## 1. Project Identity

| Field | Value |
|---|---|
| Name | OmniPDF Suite |
| Version | 1.0.0 |
| Root | `/run/media/kaal/CodeBase/Projects/omnipdf` |
| Goal | 100% free, cross-platform document management suite |
| Platforms | Web, Windows, Linux, macOS (Tauri), Android (Expo) |
| Cost | Zero — no paid SDKs, no paid APIs, no subscriptions |
| Backend Host | Render.com (free tier, lifetime) |
| Privacy Model | All PDF ops run **client-side in-browser** (pdf-lib WASM) |

---

## 2. Tech Stack

### Web App (Primary)
- **Framework:** Next.js 15 (App Router), TypeScript
- **Styling:** TailwindCSS v4 + custom CSS variables (globals.css)
- **UI Theme:** iOS-inspired dark glassmorphic — `backdrop-filter: blur`, indigo/violet palette, `#0a0a0f` background
- **Icons:** lucide-react
- **Animations:** framer-motion
- **Font:** Inter (Google Fonts)

### PDF Processing (Client-Side, No Server)
- `pdf-lib` — merge, split, rotate, crop, watermark, encrypt/decrypt, annotate, sign, redact, page numbers, reorder
- `pdfjs-dist` — render PDF pages to canvas (live preview in every tool)
- `tesseract.js` — OCR text extraction (runs in browser Web Worker)
- `mammoth` — DOCX → HTML → PDF conversion (client-side)
- `xlsx` — Excel read/write
- `jszip` — zip multiple output files for download
- `file-saver` — trigger browser downloads

### Desktop (Tauri)
- Wrap Next.js web app in Tauri v2 (Rust)
- Native file system access (`tauri-plugin-fs`)
- OS print spooler integration via Rust commands
- Builds: `npm run tauri build` → produces `.deb`, `.AppImage`, `.exe`, `.dmg`

### Mobile (Expo / React Native)
- `expo` + `react-native`
- `react-native-vision-camera` — camera for document scanning
- OpenCV (via WASM or native bridge) — edge detection + perspective warp
- EAS (Expo Application Services) — remote cloud builds for Android APK

### Backend (Render.com — Free Tier)
- Node.js/Express server
- LibreOffice Headless — converts DOCX/PPTX/XLSX → PDF server-side
- ImageMagick — image processing
- Endpoint: `POST /api/convert` with multipart form data
- Free tier: 750 hours/month, spins down after inactivity

---

## 3. Design System

All design tokens are in `app/globals.css`:

```css
--bg-primary: #0a0a0f
--bg-secondary: #0d0d18
--accent-primary: #6366f1  (indigo)
--accent-secondary: #8b5cf6 (violet)
--accent-tertiary: #a78bfa
--glass-bg: rgba(255,255,255,0.04)
--glass-border: rgba(255,255,255,0.08)
```

### CSS Classes (already in globals.css)
- `.glass-card` — glassmorphic card with hover lift
- `.tool-card` — clickable tool card with gradient overlay
- `.btn-primary` — gradient indigo button
- `.btn-secondary` — glass outline button
- `.btn-danger` — red gradient button
- `.drop-zone` — dashed drag-and-drop area
- `.input-field` — dark glass input
- `.select-field` — dark glass select
- `.badge`, `.badge-indigo`, `.badge-green`, etc.
- `.nav-item`, `.nav-item.active` — sidebar nav
- `.progress-bar`, `.progress-fill` — animated progress
- `.modal-overlay`, `.modal-content` — modal system
- `.spinner` — CSS loading spinner
- `.gradient-text` — indigo→violet→pink gradient text
- `.page-thumb`, `.page-thumb.selected` — PDF page thumbnail
- Animations: `.animate-fade-in-up`, `.animate-slide-in-right`, `.animate-float`, `.animate-glow`

### Layout Pattern (EVERY tool page)
```
LEFT PANEL (settings/options) | RIGHT PANEL (live PDF preview)
  - Options, sliders, inputs  |   - PDFViewer component
  - Action buttons            |   - Page thumbnails (if needed)
  - File info                 |   - Zoom + page navigation
```

---

## 4. Directory Structure

```
omnipdf/
├── app/
│   ├── globals.css              ✅ DONE — full design system
│   ├── layout.tsx               ✅ DONE — root layout + Sidebar + Toaster
│   ├── page.tsx                 ⬜ TODO — landing/dashboard homepage
│   ├── tools/
│   │   ├── merge/page.tsx       ⬜ TODO
│   │   ├── split/page.tsx       ⬜ TODO
│   │   ├── compress/page.tsx    ⬜ TODO
│   │   ├── crop/page.tsx        ⬜ TODO
│   │   ├── rotate/page.tsx      ⬜ TODO
│   │   ├── watermark/page.tsx   ⬜ TODO
│   │   ├── encrypt/page.tsx     ⬜ TODO
│   │   ├── convert/page.tsx     ⬜ TODO
│   │   ├── ocr/page.tsx         ⬜ TODO
│   │   ├── pdf-to-images/page.tsx ⬜ TODO
│   │   ├── images-to-pdf/page.tsx ⬜ TODO
│   │   ├── edit/page.tsx        ⬜ TODO
│   │   ├── sign/page.tsx        ⬜ TODO
│   │   ├── redact/page.tsx      ⬜ TODO
│   │   └── compare/page.tsx     ⬜ TODO
│   ├── scanner/page.tsx         ⬜ TODO
│   └── print/page.tsx           ⬜ TODO
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx          ✅ DONE — collapsible, color-coded, all routes
│   └── ui/
│       ├── PDFViewer.tsx        ✅ DONE — pdfjs canvas renderer + thumbnails
│       ├── DropZone.tsx         ✅ DONE — drag-and-drop file picker
│       └── Toaster.tsx          ✅ DONE — toast notification system
├── lib/
│   ├── pdf/
│   │   └── engine.ts            ✅ DONE — all PDF operations (pdf-lib)
│   ├── convert/                 ⬜ TODO — Office conversion helpers
│   ├── ocr/                     ⬜ TODO — Tesseract.js wrapper
│   ├── print/                   ⬜ TODO — print engine helpers
│   └── scanner/                 ⬜ TODO — OpenCV/camera helpers
├── next.config.ts               ✅ DONE — WASM support, COOP/COEP headers
├── package.json                 ✅ DONE — all deps installed
└── OMNIPDF_MASTER_PLAN.md       ✅ THIS FILE
```

---

## 5. Installed Dependencies

```json
"dependencies": {
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "@types/file-saver": "^2.0.7",
  "canvas-confetti": "^1.9.4",
  "file-saver": "^2.0.5",
  "framer-motion": "^12.42.0",
  "jszip": "^3.10.1",
  "lucide-react": "^1.22.0",
  "mammoth": "^1.12.0",
  "next": "16.2.9",
  "pdf-lib": "^1.17.1",
  "pdfjs-dist": "^6.1.200",
  "react": "19.2.4",
  "react-colorful": "^5.7.0",
  "react-dom": "19.2.4",
  "react-dropzone": "^15.0.0",
  "react-hot-toast": "^2.6.0",
  "tesseract.js": "^7.0.0",
  "xlsx": "^0.18.5"
}
```

---

## 6. Completed Files (What's Already Built)

### `app/globals.css` ✅
Full design system: CSS variables, glass cards, buttons, dropzone, progress bars, modals, toasts, page thumbnails, scan animations, grid patterns, hero gradients, keyframes.

### `app/layout.tsx` ✅
Root layout with Inter font, metadata, Sidebar + Toaster, sticky sidebar.

### `components/layout/Sidebar.tsx` ✅
- Collapsible (icon-only or full width)
- Groups: Organize, Optimize, Convert, Edit & Enhance, Security, AI & Vision, Scan & Print
- Active route highlighting with color-coded icons
- All 20+ tool routes defined

### `components/ui/PDFViewer.tsx` ✅
- Uses `pdfjs-dist` with CDN worker
- Device pixel ratio for crisp rendering
- Zoom in/out + reset, page prev/next
- `PageThumbnails` sub-component: renders all page thumbnails to canvas, click to navigate
- Cancel pending renders on data change

### `components/ui/DropZone.tsx` ✅
- Drag-and-drop + click to browse
- File type filtering + max size validation
- Visual feedback on drag-over

### `components/ui/Toaster.tsx` ✅
- Global `toast(message, type)` function (importable anywhere)
- Types: success, error, info, warning
- Auto-dismiss, animated slide-in

### `lib/pdf/engine.ts` ✅
All operations are 100% client-side using pdf-lib:
- `mergePDFs(files[])` → Uint8Array
- `splitPDF(file, mode)` → Uint8Array[] (by range, every-N, or fixed pages)
- `rotatePDF(file, rotations{pageIdx: degrees})` → Uint8Array
- `cropPDF(file, cropBoxes, applyToAll)` → Uint8Array
- `compressPDF(file, level)` → Uint8Array
- `addWatermark(file, options)` → Uint8Array (text/image, tile/center/diagonal)
- `decryptPDF(file, password)` → Uint8Array
- `addPageNumbers(file, options)` → Uint8Array
- `reorderPages(file, newOrder[])` → Uint8Array
- `deletePages(file, pages[])` → Uint8Array
- `imagesToPDF(files[], pageSize, margin)` → Uint8Array
- `redactPDF(file, boxes[])` → Uint8Array
- `addSignature(file, dataUrl, placement)` → Uint8Array
- `addTextAnnotations(file, annotations[])` → Uint8Array
- `getPDFInfo(file)` → PDFInfo
- Helpers: `readFileAsArrayBuffer`, `downloadBlob`, `formatBytes`, `getFileBaseName`

### `next.config.ts` ✅
- WASM async experiments enabled
- canvas/encoding aliased to false (avoid SSR errors)
- `Cross-Origin-Embedder-Policy: require-corp` header (required for SharedArrayBuffer/WASM)
- `Cross-Origin-Opener-Policy: same-origin`

---

## 7. What Needs To Be Built (TODO)

### Priority 1 — Core Tool Pages

Build each as a **two-panel layout**: LEFT = controls, RIGHT = live `<PDFViewer>`.

#### `app/page.tsx` — Dashboard/Homepage
- Hero section: "OmniPDF Suite" gradient title, tagline
- Stats bar: number of tools, file formats supported
- Tool grid: 4-col card grid with icon + name + description for all tools
- Recent files section (localStorage)
- No file upload needed here

#### `app/tools/merge/page.tsx`
- Upload multiple PDFs (DropZone, multiple=true, accept=".pdf")
- Sortable file list using @dnd-kit/sortable (drag to reorder)
- File cards show: filename, page count, file size, remove button
- Live preview of first file in right panel
- "Merge All" button → calls `mergePDFs()` → download
- Show compression stats after merge

#### `app/tools/split/page.tsx`
- Upload one PDF
- Left panel tabs: "By Range" | "Every N Pages" | "Extract Pages"
- By Range: input like "1-3, 5-7, 9" → parse ranges
- Every N: number input
- Extract Pages: thumbnail grid, click to select pages
- Right panel: live preview with page selector
- Download as ZIP (multiple files) using jszip

#### `app/tools/crop/page.tsx`
- Upload PDF
- Right panel: PDF page rendered on canvas with DRAGGABLE crop handles overlay
- User drags corners/edges to define crop area
- Left panel: numeric inputs for X, Y, Width, Height (synced with canvas handles)
- Toggle: "Apply to this page" vs "Apply to all pages"
- Live preview updates as handles are dragged

#### `app/tools/rotate/page.tsx`
- Two modes (query param `?mode=reorder` for reorder mode)
- Rotate mode: thumbnail grid, each thumb has rotate-left/rotate-right buttons
- Reorder mode: @dnd-kit/sortable drag-and-drop thumbnail grid
- "Select All" / "Deselect All"
- Bulk rotate selected pages
- Live preview of selected page in right panel

#### `app/tools/compress/page.tsx`
- Upload PDF
- Compression level slider: Low / Medium / High / Extreme (4 preset buttons)
- Shows estimated size reduction (simulated)
- Right panel: PDF preview
- After processing: show before/after file size comparison with visual bar

#### `app/tools/watermark/page.tsx`
- Upload PDF
- Left tabs: "Text Watermark" | "Image Watermark"
- Text: input text, font size slider, color picker (react-colorful), opacity slider, rotation slider
- Position: Center / Diagonal / Tile (3 buttons)
- Pages: All / First / Last / Custom range input
- Right panel: LIVE preview updating as any option changes (debounced 500ms)
- Image watermark: upload PNG/JPG, opacity + position controls

#### `app/tools/encrypt/page.tsx`
- Mode from query param: `?mode=encrypt` or `?mode=decrypt`
- Encrypt: set user password + owner password, permission checkboxes (print, copy, modify)
- Decrypt: enter password input, "Unlock" button
- Right panel: PDF preview
- Security badge shown after encryption

#### `app/tools/convert/page.tsx`
- Query params: `?from=pdf&to=docx` etc.
- Supported conversions:
  - PDF → Word (DOCX): extract text using pdfjs-dist, re-wrap in mammoth structure
  - PDF → Images: render each page to canvas → download as ZIP
  - PDF → Excel: extract text tables → xlsx
  - Word (DOCX) → PDF: mammoth converts DOCX→HTML, use html2canvas or server route
  - HTML → PDF: use server route (Render backend)
  - PPT → PDF: server route (LibreOffice headless on Render)
- For server-dependent conversions: show "Processing on server..." with progress
- Right panel: preview of input file

#### `app/tools/ocr/page.tsx`
- Upload PDF or Image
- Language selector (dropdown: English, Hindi, French, German, Spanish, Arabic, Chinese, Japanese, Korean, etc.)
- "Start OCR" button → runs tesseract.js in worker
- Real-time progress bar (tesseract emits progress events 0–100%)
- Right panel: input PDF preview + extracted text panel below
- Text output panel: copyable, searchable (Ctrl+F highlight)
- Download as .txt or .pdf with embedded text

#### `app/tools/pdf-to-images/page.tsx`
- Upload PDF
- Format selector: PNG / JPEG / WebP
- DPI/quality slider (72, 96, 150, 300 DPI mapped to pdfjs scale)
- Page range: All / Custom range input
- Right panel: preview of first converted page
- Download single or ZIP of all pages

#### `app/tools/images-to-pdf/page.tsx`
- Upload multiple images (PNG, JPG, WebP, GIF, BMP)
- Sortable image grid with @dnd-kit
- Page size selector: A4 / Letter / A3 / Fit to image
- Margin slider (0–50px)
- Right panel: preview of resulting PDF (first page)
- "Convert & Download" → calls `imagesToPDF()`

#### `app/tools/edit/page.tsx`
- Upload PDF
- Mode tabs: "Add Text" | "Highlight" | "Add Page Numbers" | "Draw"
- Add Text: click on right-panel preview → place text, font/size/color controls
- Highlight: click-drag on preview to draw colored highlight boxes
- Page Numbers: position selector, start number, prefix/suffix, color
- Draw: freehand drawing on canvas overlay (saved as SVG then embedded)
- Right panel: editable PDF canvas with overlays

#### `app/tools/sign/page.tsx`
- Upload PDF
- Left panel: 3 tabs for signature input:
  - "Draw" — canvas where user draws signature with mouse/touch
  - "Type" — type name, choose font style (cursive CSS fonts)
  - "Upload" — upload PNG of signature
- After creating signature: click on right-panel PDF page to place it
- Drag + resize placement handles
- "Apply & Download" → calls `addSignature()`

#### `app/tools/redact/page.tsx`
- Upload PDF
- Right panel: PDF canvas with rectangle selection tool
- Draw black rectangles over sensitive areas
- Sidebar: list of redacted areas per page with remove buttons
- "Apply Redaction" → permanently burns in black rectangles via `redactPDF()`
- Warning notice: "Redaction is permanent and cannot be undone"

#### `app/tools/compare/page.tsx`
- Upload two PDFs (two DropZones side by side)
- Left shows PDF A, Right shows PDF B
- Synchronized scroll/zoom between both panels
- Page-by-page toggle
- Visual diff overlay (highlight differences in red/green using canvas pixel comparison)

### Priority 2 — Scanner & Print

#### `app/scanner/page.tsx`
- Web camera access via `navigator.mediaDevices.getUserMedia`
- Live camera feed in right panel
- Auto edge detection overlay (use canvas + basic CV: find document rectangle)
- Manual corner adjustment handles
- Capture → perspective warp → enhance (whiteboard/color/B&W/grayscale filters)
- Stack multiple scans → convert to PDF using `imagesToPDF()`
- Download as PDF or JPG

#### `app/print/page.tsx`
- Upload PDF
- Left panel: print settings
  - Printer selector (window.print media)
  - Page range
  - Copies
  - Paper size
  - Orientation (Portrait/Landscape)
  - Color mode (Color/B&W)
  - Layout: Normal / 2-up / 4-up / Booklet
  - Duplex toggle
  - Margin controls
- Right panel: WYSIWYG live print preview (canvas render with print layout applied)
- "Print" → `window.print()` with `@media print` CSS injected dynamically
- "Save as PDF" → download current layout as PDF

---

## 8. Backend (Render.com) — What to Build

### Repo: `omnipdf-backend/` (separate directory or subfolder `backend/`)

```
backend/
├── server.js          — Express app
├── routes/
│   └── convert.js     — POST /api/convert
├── Dockerfile         — LibreOffice + Node
└── render.yaml        — Render deployment config
```

### Endpoints
```
POST /api/convert
  Body: multipart/form-data
  Fields:
    - file: File
    - from: "docx" | "pptx" | "xlsx" | "html"
    - to: "pdf"
  Response: application/pdf (binary)

GET /api/health
  Response: { status: "ok", version: "1.0.0" }
```

### Dockerfile
```dockerfile
FROM node:18-slim
RUN apt-get update && apt-get install -y libreoffice imagemagick
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### render.yaml
```yaml
services:
  - type: web
    name: omnipdf-backend
    env: docker
    plan: free
    dockerfilePath: ./Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
```

---

## 9. Tauri Desktop Wrapper

### Setup (run after web app is complete)
```bash
npm install --save-dev @tauri-apps/cli
npx tauri init
```

### `src-tauri/tauri.conf.json` key settings
```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  },
  "app": {
    "windows": [{
      "title": "OmniPDF Suite",
      "width": 1280,
      "height": 800,
      "resizable": true
    }]
  }
}
```

### Build Commands
```bash
npm run tauri build   # → .deb + .AppImage (Linux), .exe (Windows), .dmg (macOS)
```

---

## 10. Expo Mobile App

### Setup
```bash
npx create-expo-app mobile --template blank-typescript
cd mobile
npx expo install react-native-vision-camera
npx expo install expo-file-system expo-sharing expo-print
```

### Key Files
```
mobile/
├── app/
│   ├── index.tsx         — Home with tool cards
│   ├── scanner.tsx       — Camera + OpenCV scan
│   └── viewer.tsx        — PDF viewer
├── components/
│   └── ScanOverlay.tsx   — Edge detection overlay
└── eas.json              — EAS build config
```

### EAS Build (Android APK without local Android Studio)
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

---

## 11. GitHub Repository Setup

### Repository Name: `omnipdf-suite`
### Description: `🚀 Complete free, open-source PDF & document suite — merge, split, crop, OCR, scan, convert & print. Web + Desktop (Tauri) + Mobile (Expo).`

### README.md structure:
1. Banner image (generated)
2. Badges: License, Stars, Issues, Platform support
3. Feature list with emojis
4. Screenshots (3-panel carousel)
5. Quick start (npm install + npm run dev)
6. Tech stack table
7. Contributing guide
8. License (MIT)

### Releases:
- `v1.0.0-web` — Web app (Vercel deployment link)
- `v1.0.0-linux` — `.deb` + `.AppImage` from Tauri
- `v1.0.0-windows` — `.exe` installer from Tauri
- `v1.0.0-android` — `.apk` from EAS

---

## 12. Deployment

| Platform | Service | Cost | How |
|---|---|---|---|
| Web | Vercel | Free | `vercel --prod` |
| Backend | Render.com | Free | Push to GitHub, connect Render |
| Desktop | GitHub Releases | Free | Upload Tauri build artifacts |
| Android | GitHub Releases / Expo | Free | EAS build → download APK |

---

## 13. Key Patterns Every Agent Must Follow

### Tool Page Template
```tsx
"use client";
// 1. State: file, options, processing, result, previewData
// 2. Left panel: DropZone + options + action button
// 3. Right panel: <PDFViewer data={previewData} />
// 4. On process: call lib/pdf/engine.ts function → set result Uint8Array
// 5. On result: offer download via downloadBlob()
// 6. Use toast() for success/error feedback
// 7. Show progress bar during processing
```

### Import Pattern
```tsx
import { mergePDFs, downloadBlob, formatBytes } from "@/lib/pdf/engine";
import { PDFViewer } from "@/components/ui/PDFViewer";
import { DropZone } from "@/components/ui/DropZone";
import { toast } from "@/components/ui/Toaster";
```

### Two-Panel Layout
```tsx
<div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "24px", height: "calc(100vh - 80px)" }}>
  {/* Left: Controls */}
  <div className="glass-card" style={{ padding: "24px", overflowY: "auto" }}>
    {/* options */}
  </div>
  {/* Right: Live Preview */}
  <div className="glass-card" style={{ padding: "16px" }}>
    <PDFViewer data={previewData} showControls={true} />
  </div>
</div>
```

### Page Header Template
```tsx
<div style={{ padding: "32px 32px 0" }}>
  <div className="badge badge-indigo" style={{ marginBottom: "12px" }}>
    <Icon size={12} /> TOOL NAME
  </div>
  <h1 style={{ fontSize: "28px", fontWeight: 700, color: "white" }}>Tool Title</h1>
  <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "6px" }}>Description</p>
</div>
```

---

## 14. Current Build Status

| Component | Status | Notes |
|---|---|---|
| next.config.ts | ✅ Done | WASM, COOP/COEP headers |
| globals.css | ✅ Done | Full design system |
| layout.tsx | ✅ Done | Root layout |
| Sidebar.tsx | ✅ Done | All 20+ routes |
| PDFViewer.tsx | ✅ Done | pdfjs canvas + thumbnails |
| DropZone.tsx | ✅ Done | Drag-drop + validation |
| Toaster.tsx | ✅ Done | Global toast system |
| lib/pdf/engine.ts | ✅ Done | All PDF operations |
| app/page.tsx | ⬜ TODO | Homepage dashboard |
| All tool pages | ⬜ TODO | 15 pages |
| scanner/page.tsx | ⬜ TODO | Web camera scanner |
| print/page.tsx | ⬜ TODO | Print studio |
| backend/ | ⬜ TODO | Render.com Express |
| Tauri setup | ⬜ TODO | Desktop wrapper |
| Expo mobile | ⬜ TODO | Android scanner app |
| GitHub README | ⬜ TODO | Polish + release |

---

## 15. Running the Project

```bash
cd /run/media/kaal/CodeBase/Projects/omnipdf

# Install deps (already done)
npm install

# Dev server
npm run dev       # → http://localhost:3000

# Production build
npm run build
npm run start

# Type check
npx tsc --noEmit
```

---

*Last updated: 2026-06-29 | OmniPDF Suite v1.0.0*
