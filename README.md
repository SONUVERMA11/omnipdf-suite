<div align="center">

<img src="https://img.shields.io/badge/OmniPDF-Suite-6366f1?style=for-the-badge&logo=adobeacrobatreader&logoColor=white" alt="OmniPDF Suite" height="60"/>

# OmniPDF Suite

**The complete, 100% free, open-source document management platform.**

Merge · Split · Crop · Compress · Convert · OCR · Scan · Sign · Print

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![pdf-lib](https://img.shields.io/badge/pdf--lib-WASM-ec4899?style=flat-square)](https://pdf-lib.js.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)](LICENSE)

[**🚀 Live Demo**](https://omnipdf-suite.vercel.app) · [**📦 Desktop Releases**](https://github.com/sonuverma11/omnipdf-suite/releases) · [**📱 Android APK**](https://github.com/sonuverma11/omnipdf-suite/releases)

</div>

---

## ✨ Why OmniPDF Suite?

> **Your files never leave your device.** Every PDF operation runs entirely in your browser using WebAssembly — no server uploads, zero data exposure.

| Feature | OmniPDF | Adobe Acrobat | Smallpdf |
|---|---|---|---|
| Price | **Free forever** | $239.88/yr | $108/yr |
| Privacy | **100% local** | Cloud upload | Cloud upload |
| Platforms | **Web + Desktop + Android** | Desktop only | Web only |
| OCR | **Yes (12 languages)** | Yes | Limited |
| Open Source | **Yes (MIT)** | No | No |

---

## 🛠️ Complete Feature Set — 22+ Tools

### 📄 PDF Organization
- **Merge** — Combine multiple PDFs with drag-and-drop reordering (`@dnd-kit/sortable`)
- **Split** — By page range, every N pages, or extract specific pages → ZIP download
- **Rotate** — Per-page rotation (90°/180°/270°) with live thumbnail grid
- **Reorder** — Drag-and-drop page reordering with visual preview
- **Crop** — Interactive crop handles on canvas with precise X/Y/W/H controls
- **Delete Pages** — Remove unwanted pages from any PDF

### ⚡ Optimization
- **Compress** — 4 levels (Low/Medium/High/Extreme) with before/after size comparison
- **Invert** — Dark mode PDF — invert all colors for night reading

### 🔄 Conversion (7 formats)
- **PDF → Text** — Extract all text with page-by-page output (client-side)
- **PDF → Images** — Export pages as PNG at 2x scale → ZIP download (client-side)
- **DOCX → PDF** — Word conversion via mammoth (client) or LibreOffice (server)
- **Images → PDF** — Bundle multiple images with A4/Letter/A3/Fit sizing (client-side)
- **PPTX → PDF** — PowerPoint to PDF via LibreOffice headless (server-side)
- **XLSX → PDF** — Spreadsheets to PDF via LibreOffice headless (server-side)
- **HTML → PDF** — Web pages to PDF via LibreOffice headless (server-side)

### ✏️ Edit & Enhance
- **Add Text** — Place text annotations anywhere on any page
- **Add Page Numbers** — 6 positions, custom prefix/suffix, skip first page
- **Watermark** — Text watermarks with color, opacity, rotation; Center/Diagonal/Tile
- **Redact** — Permanently black-out sensitive information (irreversible)

### 🔐 Security
- **Encrypt** — Password protect with permission controls (print/copy/modify)
- **Decrypt** — Remove password from protected PDFs
- **Sign** — Draw signature with mouse/touch, type name (cursive fonts), or upload PNG

### 🤖 AI & Vision
- **OCR** — Tesseract.js v7, 12+ languages, real-time progress, output as TXT or PDF
- **Compare** — Synchronized side-by-side PDF viewer with page navigation

### 📷 Scan & Print
- **Document Scanner** — Live camera feed, edge detection overlay, 5 filters (Color/Vivid/Grayscale/Whiteboard/B&W), multi-page capture → export as PDF
- **Print Studio** — Professional print dialog: N-up (2/4/6/9/16/custom), booklet, duplex, page range, margins, WYSIWYG preview

---

## 🖥️ Platform Support

| Platform | Technology | Status |
|---|---|---|
| 🌐 Web | Next.js 16 + TailwindCSS v4 | ✅ Ready |
| ☁️ Backend | Express + LibreOffice + Docker | ✅ Ready |
| 🖥️ Linux | Tauri (.deb, .AppImage) | ✅ Ready |
| 🖥️ Windows | Tauri (.exe) | ✅ Ready |
| 🖥️ macOS | Tauri (.dmg) | ✅ Ready |
| 📱 Android | Expo / React Native | ✅ Ready |

---

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/omnipdf-suite.git
cd omnipdf-suite

# Install dependencies
npm install

# Start development server
npm run dev
# → http://localhost:3000
```

### 🖥️ Desktop (Tauri)
```bash
# Start desktop development
npm run tauri dev

# Build desktop packages (.deb, .AppImage, .exe, .dmg)
npm run tauri build
```

### 📱 Mobile (Expo)
```bash
# Navigate to mobile directory
cd mobile

# Start Expo development server (simulated camera is included)
npm run start
```

### Backend (for Office format conversions)
```bash
cd backend
npm install
npm start
# → http://localhost:3001
```

### Production Build
```bash
npm run build
npm run start
```

### Docker (Backend)
```bash
cd backend
docker build -t omnipdf-backend .
docker run -p 3001:3001 omnipdf-backend
```

---

## 🏗️ Tech Stack

### Frontend
| Package | Purpose |
|---|---|
| `next` 16.2 | React framework (App Router, Turbopack) |
| `react` 19.2 | UI library |
| `tailwindcss` v4 | Styling + design system |
| `lucide-react` | 200+ icons |
| `framer-motion` | Animations |

### PDF Processing (100% Client-Side)
| Package | Purpose |
|---|---|
| `pdf-lib` | PDF creation & manipulation (WASM) |
| `pdfjs-dist` v6 | PDF canvas rendering + text extraction |
| `tesseract.js` v7 | OCR text recognition (Web Worker) |
| `mammoth` | DOCX → HTML parsing |
| `xlsx` | Excel file handling |
| `jszip` | ZIP multiple output files |
| `react-colorful` | Color picker for watermark tool |

### Drag & Drop
| Package | Purpose |
|---|---|
| `@dnd-kit/core` | Drag-and-drop engine |
| `@dnd-kit/sortable` | Sortable lists & grids |

### Backend (Render.com — Free Tier)
| Component | Purpose |
|---|---|
| Express.js | HTTP server + routing |
| LibreOffice Headless | DOCX/PPTX/XLSX/HTML → PDF |
| Multer | Multipart file uploads |
| Helmet | Security headers |
| Docker | Container deployment |

---

## 📁 Project Structure

```
omnipdf/
├── app/
│   ├── page.tsx              # Dashboard homepage (22+ tool cards)
│   ├── layout.tsx            # Root layout + collapsible sidebar
│   ├── globals.css           # Design system (iOS dark glassmorphic)
│   ├── tools/
│   │   ├── merge/            # Merge PDFs (sortable file list)
│   │   ├── split/            # Split PDF (range/everyN/extract)
│   │   ├── compress/         # Compress PDF (4 levels)
│   │   ├── crop/             # Crop PDF (draggable handles)
│   │   ├── rotate/           # Rotate + Reorder pages
│   │   ├── watermark/        # Text/Image watermarks
│   │   ├── encrypt/          # Encrypt/Decrypt (AES-256)
│   │   ├── convert/          # 7-format converter hub
│   │   ├── ocr/              # OCR (12 languages)
│   │   ├── pdf-to-images/    # PDF → PNG/JPG/WebP
│   │   ├── images-to-pdf/    # Images → PDF
│   │   ├── edit/             # Text + page numbers
│   │   ├── sign/             # Draw/Type/Upload signature
│   │   ├── redact/           # Permanent content redaction
│   │   ├── compare/          # Side-by-side PDF diff
│   │   └── invert/           # Invert colors (dark mode PDF)
│   ├── scanner/              # Document camera scanner
│   └── print/                # Print Studio (N-up, booklet)
├── components/
│   ├── layout/Sidebar.tsx    # Collapsible navigation (7 sections)
│   └── ui/
│       ├── PDFViewer.tsx     # Live canvas PDF renderer (pdfjs v6)
│       ├── DropZone.tsx      # Drag-and-drop file input
│       └── Toaster.tsx       # Toast notification system
├── lib/
│   ├── pdf/engine.ts         # All PDF operations (18 functions)
│   └── convert/backend-client.ts  # Backend API client
├── backend/
│   ├── server.js             # Express server
│   ├── routes/convert.js     # POST /api/convert
│   ├── Dockerfile            # LibreOffice + Node.js
│   ├── render.yaml           # Render.com deployment
│   └── README.md             # Backend documentation
├── src-tauri/                # Tauri Desktop configuration & Rust source
├── mobile/                   # Expo React Native App (Android/iOS Scanner)
│   ├── App.tsx               # Mobile app interface + scanner logic
│   └── app.json              # Expo configuration
└── OMNIPDF_MASTER_PLAN.md    # Complete architecture blueprint
```

---

## 🔒 Privacy Architecture

```
┌─────────────────────────────────────────────────┐
│  Your Browser                                    │
│                                                   │
│  PDF File → pdf-lib (WASM) → Processed PDF       │
│                ↑                                  │
│          Never uploaded                           │
│          to any server                            │
│                                                   │
│  ── Only Office format conversions use server ── │
│  DOCX/PPTX → Backend (LibreOffice) → PDF back    │
│                clearly marked in UI               │
└─────────────────────────────────────────────────┘
```

All core PDF operations use `pdf-lib` running in WebAssembly. For Office conversions (DOCX/PPTX/XLSX → PDF), files are sent to the self-hosted backend — clearly indicated in the UI with a server status badge.

---

## 📡 API Reference (Backend)

```
GET  /api/health    → { status: "ok", version: "1.0.0", uptime: ... }
GET  /api/formats   → List of all supported conversion formats
POST /api/convert   → Convert file (multipart/form-data)
     Fields: file (File), to (string, default: "pdf")
     Response: application/pdf (binary stream)
```

### Example
```bash
curl -X POST http://localhost:3001/api/convert \
  -F "file=@presentation.pptx" \
  -F "to=pdf" \
  -o output.pdf
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Follow the architecture in `OMNIPDF_MASTER_PLAN.md`
4. Run `npx tsc --noEmit` to verify types
5. Push and open a Pull Request

---

## 📄 License

MIT License — free for personal and commercial use.

---

<div align="center">

**Built with ❤️ using Next.js 16, pdf-lib, pdfjs-dist, Tesseract.js & LibreOffice**

[⭐ Star this repo](https://github.com/sonuverma11/omnipdf-suite) if it's useful!

</div>
