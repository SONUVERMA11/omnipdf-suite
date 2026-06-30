# OmniPDF Backend

Server-side document conversion engine for the OmniPDF Suite.

## What it does

Converts Office documents to PDF using **LibreOffice Headless** — runs as a Docker container on [Render.com](https://render.com) (free tier).

### Supported Conversions

| Input Format | Output | Engine |
|---|---|---|
| `.docx`, `.doc`, `.odt`, `.rtf` | PDF | LibreOffice Writer |
| `.pptx`, `.ppt`, `.odp` | PDF | LibreOffice Impress |
| `.xlsx`, `.xls`, `.ods`, `.csv` | PDF | LibreOffice Calc |
| `.html`, `.htm` | PDF | LibreOffice |
| `.txt` | PDF | LibreOffice |

### API Endpoints

```
GET  /api/health   → { status: "ok", version: "1.0.0" }
GET  /api/formats  → List all supported conversion formats
POST /api/convert  → Convert a file (multipart/form-data)
```

### Example Usage

```bash
# Convert a DOCX to PDF
curl -X POST http://localhost:3001/api/convert \
  -F "file=@document.docx" \
  -F "to=pdf" \
  -o output.pdf

# Check health
curl http://localhost:3001/api/health
```

## Local Development

```bash
cd backend
npm install
npm run dev    # Starts on port 3001

# With Docker
docker build -t omnipdf-backend .
docker run -p 3001:3001 omnipdf-backend
```

> **Note:** LibreOffice must be installed locally for conversions to work outside Docker.
> Install: `sudo apt install libreoffice` (Linux) or `brew install libreoffice` (macOS)

## Deploy to Render.com

1. Push to GitHub
2. Connect repo on [render.com](https://dashboard.render.com)
3. Render auto-detects `render.yaml` and deploys
4. Free tier: 750 hrs/month, auto-sleeps after 15 min inactivity

## Architecture

```
Client (browser) ──→ POST /api/convert ──→ Multer saves file
                                            ↓
                                      LibreOffice --headless
                                            ↓
                                      Stream PDF back ──→ Client downloads
                                            ↓
                                      Cleanup temp files
```

All PDF manipulation (merge, split, crop, etc.) runs **client-side** in the browser.
The backend is **only** used for Office format → PDF conversion.
