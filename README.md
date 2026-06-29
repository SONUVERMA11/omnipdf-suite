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
[![Stars](https://img.shields.io/github/stars/yourusername/omnipdf-suite?style=flat-square&color=f59e0b)](https://github.com/yourusername/omnipdf-suite)

[**🚀 Live Demo**](https://omnipdf-suite.vercel.app) · [**📦 Desktop Releases**](https://github.com/yourusername/omnipdf-suite/releases) · [**📱 Android APK**](https://github.com/yourusername/omnipdf-suite/releases)

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

## 🛠️ Feature Set

### 📄 PDF Organization
- **Merge** — Combine multiple PDFs with drag-and-drop reordering
- **Split** — By page range, every N pages, or extract specific pages
- **Rotate** — Per-page rotation (90°, 180°, 270°) with thumbnail grid
- **Reorder** — Drag-and-drop page reordering
- **Crop** — Manual crop box with precise coordinate controls
- **Delete Pages** — Remove unwanted pages

### ⚡ Optimization
- **Compress** — 4 levels (Low/Medium/High/Extreme), shows before/after size
- **Repair** — Fix corrupted PDF structure

### 🔄 Conversion
- **PDF → Word (DOCX)** — Text extraction + document formatting
- **PDF → Images** — PNG/JPEG/WebP at 72/96/150/300 DPI
- **PDF → Excel** — Table extraction to spreadsheet
- **Word/PPTX → PDF** — Via LibreOffice headless (Render backend)
- **Images → PDF** — Sortable, A4/Letter/A3/Fit page sizes
- **HTML → PDF** — Web page to PDF conversion

### ✏️ Edit & Enhance
- **Add Text** — Place text annotations anywhere on pages
- **Add Page Numbers** — 6 positions, custom prefix/suffix
- **Highlight** — Draw colored highlight boxes
- **Watermark** — Text or image, 3 positions, live preview
- **Redact** — Permanently black-out sensitive data

### 🔐 Security
- **Encrypt** — Password protect with AES-256 + permission controls
- **Decrypt** — Remove password from protected PDFs
- **Sign** — Draw, type (5 cursive fonts), or upload signature

### 🤖 AI & Vision
- **OCR** — Tesseract.js, 12 languages, real-time progress, PDF + image input
- **Compare** — Side-by-side synchronized PDF viewer

### 📷 Scan & Print
- **Document Scanner** — Live camera with scan guide overlay, 5 filters (Color/Vivid/Grayscale/Whiteboard/B&W), export to PDF
- **Print Studio** — N-up (1/2/4-up), booklet, duplex, WYSIWYG print preview

---

## 🖥️ Platform Support

| Platform | Technology | Status |
|---|---|---|
| 🌐 Web | Next.js 16 | ✅ Ready |
| 🖥️ Linux | Tauri (.deb, .AppImage) | 🚧 Planned |
| 🖥️ Windows | Tauri (.exe) | 🚧 Planned |
| 🖥️ macOS | Tauri (.dmg) | 🚧 Planned |
| 📱 Android | Expo / React Native | 🚧 Planned |

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

### Production Build
```bash
npm run build
npm run start
```

---

## 🏗️ Tech Stack

### Frontend
| Package | Purpose |
|---|---|
| `next` 16 | React framework (App Router, Turbopack) |
| `react` 19 | UI library |
| `tailwindcss` v4 | Styling |
| `lucide-react` | Icon system |
| `framer-motion` | Animations |

### PDF Processing (100% Client-Side)
| Package | Purpose |
|---|---|
| `pdf-lib` | PDF creation & manipulation |
| `pdfjs-dist` v6 | PDF rendering (canvas) |
| `tesseract.js` v7 | OCR text extraction |
| `mammoth` | DOCX → HTML parsing |
| `xlsx` | Excel file handling |
| `jszip` | ZIP multiple output files |

### Drag & Drop
| Package | Purpose |
|---|---|
| `@dnd-kit/core` | Drag-and-drop engine |
| `@dnd-kit/sortable` | Sortable lists & grids |

### Backend (Render.com — Free Tier)
- Node.js + Express
- LibreOffice Headless (DOCX/PPTX → PDF)
- Docker deployment

---

## 📁 Project Structure

```
omnipdf/
├── app/
│   ├── page.tsx              # Dashboard homepage
│   ├── layout.tsx            # Root layout + sidebar
│   ├── globals.css           # Design system (iOS dark glassmorphic)
│   ├── tools/
│   │   ├── merge/            # Merge PDFs
│   │   ├── split/            # Split PDF
│   │   ├── compress/         # Compress PDF
│   │   ├── crop/             # Crop PDF
│   │   ├── rotate/           # Rotate + Reorder
│   │   ├── watermark/        # Add watermark
│   │   ├── encrypt/          # Encrypt/Decrypt
│   │   ├── convert/          # Format conversions
│   │   ├── ocr/              # OCR text extraction
│   │   ├── pdf-to-images/    # PDF → PNG/JPG/WebP
│   │   ├── images-to-pdf/    # Images → PDF
│   │   ├── edit/             # Text + Page numbers
│   │   ├── sign/             # Digital signature
│   │   ├── redact/           # Content redaction
│   │   └── compare/          # Side-by-side diff
│   ├── scanner/              # Document camera scanner
│   └── print/                # Print Studio
├── components/
│   ├── layout/Sidebar.tsx    # Collapsible navigation
│   └── ui/
│       ├── PDFViewer.tsx     # Live canvas PDF renderer
│       ├── DropZone.tsx      # Drag-and-drop file input
│       └── Toaster.tsx       # Toast notifications
├── lib/pdf/engine.ts         # All PDF operations (client-side)
└── OMNIPDF_MASTER_PLAN.md    # Complete architecture blueprint
```

---

## 🔒 Privacy Guarantee

```
Your files → Browser WASM → Processed → Downloaded
                    ↑
              Never uploaded
              to any server
```

All PDF operations in the core tools use `pdf-lib` running in WebAssembly directly in your browser. For Office format conversions (DOCX/PPTX → PDF), files are sent to the backend — this is clearly indicated in the UI.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes following the master plan in `OMNIPDF_MASTER_PLAN.md`
4. Push and open a Pull Request

---

## 📄 License

MIT License — free for personal and commercial use.

---

<div align="center">

**Built with ❤️ using Next.js, pdf-lib, and Tesseract.js**

[⭐ Star this repo](https://github.com/yourusername/omnipdf-suite) if it's useful!

</div>
