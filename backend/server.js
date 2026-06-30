/**
 * OmniPDF Backend — Express server for server-side document conversions
 * 
 * Uses LibreOffice Headless for DOCX/PPTX/XLSX/HTML → PDF conversion.
 * Designed for deployment on Render.com (free tier Docker).
 * 
 * All client-side-capable operations (merge, split, crop, etc.) are NOT here —
 * they run entirely in the browser via pdf-lib/pdfjs-dist.
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");

const convertRouter = require("./routes/convert");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security & Middleware ───────────────────────────────────────────────────

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST"],
  maxAge: 86400,
}));

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(express.json({ limit: "1mb" }));

// ─── Temp directory for uploads/conversions ─────────────────────────────────

const TEMP_DIR = path.join(__dirname, "tmp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Clean temp directory on startup
const cleanTemp = () => {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stat = fs.statSync(filePath);
      // Delete files older than 10 minutes
      if (now - stat.mtimeMs > 10 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (e) { /* ignore cleanup errors */ }
};

// Clean temp every 5 minutes
cleanTemp();
setInterval(cleanTemp, 5 * 60 * 1000);

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    service: "omnipdf-backend",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Conversion routes
app.use("/api", convertRouter);

// ─── Error Handling ──────────────────────────────────────────────────────────

// 404
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} does not exist`,
    availableEndpoints: [
      "GET  /api/health",
      "POST /api/convert",
      "GET  /api/formats",
    ],
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  
  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "File too large",
      message: "Maximum file size is 50MB",
    });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  OmniPDF Backend v1.0.0                      ║
║  Server running on port ${PORT}                  ║
║  Environment: ${(process.env.NODE_ENV || "development").padEnd(30)}║
╚══════════════════════════════════════════════╝
  `);
  console.log("Endpoints:");
  console.log("  GET  /api/health   — Health check");
  console.log("  POST /api/convert  — Convert documents");
  console.log("  GET  /api/formats  — List supported formats");
  console.log("");
});

module.exports = app;
