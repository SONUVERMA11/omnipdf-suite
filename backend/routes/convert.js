/**
 * OmniPDF Conversion Route — POST /api/convert
 * 
 * Handles server-side document conversion using LibreOffice Headless.
 * 
 * Supported conversions:
 *   DOCX → PDF    (Word documents)
 *   PPTX → PDF    (PowerPoint presentations)
 *   XLSX → PDF    (Excel spreadsheets)
 *   ODT  → PDF    (OpenDocument text)
 *   ODS  → PDF    (OpenDocument spreadsheet)
 *   ODP  → PDF    (OpenDocument presentation)
 *   HTML → PDF    (Web pages)
 *   RTF  → PDF    (Rich Text Format)
 *   TXT  → PDF    (Plain text)
 *   CSV  → PDF    (Comma-separated values)
 * 
 * Flow:
 *   1. Client uploads file via multipart/form-data
 *   2. Server saves to temp directory with unique name
 *   3. LibreOffice headless converts to PDF
 *   4. Server streams back the resulting PDF
 *   5. Temp files are cleaned up
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// ─── Configuration ───────────────────────────────────────────────────────────

const TEMP_DIR = path.join(__dirname, "..", "tmp");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const CONVERSION_TIMEOUT = 120_000; // 2 minutes

// Supported input formats → output format
const SUPPORTED_CONVERSIONS = {
  // Office → PDF
  docx: "pdf", doc: "pdf", odt: "pdf", rtf: "pdf", txt: "pdf",
  pptx: "pdf", ppt: "pdf", odp: "pdf",
  xlsx: "pdf", xls: "pdf", ods: "pdf", csv: "pdf",
  // Web → PDF
  html: "pdf", htm: "pdf",
};

const MIME_MAP = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  html: "text/html", htm: "text/html",
  rtf: "application/rtf",
  txt: "text/plain",
  csv: "text/csv",
  pdf: "application/pdf",
};

// ─── Multer Storage ──────────────────────────────────────────────────────────

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    if (SUPPORTED_CONVERSIONS[ext]) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format: .${ext}`), false);
    }
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a file using LibreOffice Headless
 * @param {string} inputPath  - Absolute path to input file
 * @param {string} outputDir  - Directory to write output
 * @param {string} outputFormat - Target format (e.g., "pdf")
 * @returns {Promise<string>} - Path to converted file
 */
function convertWithLibreOffice(inputPath, outputDir, outputFormat = "pdf") {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless",
      "--invisible",
      "--nocrashreport",
      "--nodefault",
      "--nofirststartwizard",
      "--nologo",
      "--norestore",
      "--convert-to", outputFormat,
      "--outdir", outputDir,
      inputPath,
    ];

    // Try common LibreOffice binary locations
    const loBinaries = ["libreoffice", "soffice", "/usr/bin/libreoffice", "/usr/bin/soffice"];
    
    const tryConvert = (binIndex) => {
      if (binIndex >= loBinaries.length) {
        return reject(new Error("LibreOffice not found. Install with: apt-get install libreoffice"));
      }

      const child = execFile(loBinaries[binIndex], args, {
        timeout: CONVERSION_TIMEOUT,
        env: {
          ...process.env,
          HOME: TEMP_DIR, // LibreOffice needs a writable HOME
        },
      }, (error, stdout, stderr) => {
        if (error) {
          if (error.code === "ENOENT") {
            return tryConvert(binIndex + 1);
          }
          console.error(`LibreOffice stderr: ${stderr}`);
          return reject(new Error(`Conversion failed: ${error.message}`));
        }

        // Find the output file
        const inputBaseName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(outputDir, `${inputBaseName}.${outputFormat}`);

        if (fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          // Sometimes LibreOffice creates files with slightly different names
          const files = fs.readdirSync(outputDir);
          const match = files.find(
            (f) => f.startsWith(inputBaseName) && f.endsWith(`.${outputFormat}`)
          );
          if (match) {
            resolve(path.join(outputDir, match));
          } else {
            reject(new Error("Conversion produced no output file"));
          }
        }
      });
    };

    tryConvert(0);
  });
}

/**
 * Clean up temp files safely
 */
function cleanupFiles(...filePaths) {
  for (const fp of filePaths) {
    try {
      if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch { /* ignore */ }
  }
}

// ─── POST /api/convert ───────────────────────────────────────────────────────

router.post("/convert", upload.single("file"), async (req, res) => {
  const startTime = Date.now();
  let inputPath = null;
  let outputPath = null;

  try {
    // Validate upload
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
        message: "Send a file using multipart/form-data with field name 'file'",
      });
    }

    inputPath = req.file.path;
    const inputExt = path.extname(req.file.originalname).toLowerCase().replace(".", "");
    const targetFormat = req.body.to || "pdf";

    // Validate conversion
    if (!SUPPORTED_CONVERSIONS[inputExt]) {
      cleanupFiles(inputPath);
      return res.status(400).json({
        error: "Unsupported format",
        message: `Cannot convert .${inputExt} files. Supported: ${Object.keys(SUPPORTED_CONVERSIONS).join(", ")}`,
      });
    }

    if (targetFormat !== "pdf") {
      cleanupFiles(inputPath);
      return res.status(400).json({
        error: "Unsupported target format",
        message: "Currently only PDF output is supported",
      });
    }

    console.log(`Converting: ${req.file.originalname} (.${inputExt}) → .${targetFormat}`);

    // Convert
    outputPath = await convertWithLibreOffice(inputPath, TEMP_DIR, targetFormat);

    const outputStat = fs.statSync(outputPath);
    const elapsed = Date.now() - startTime;

    console.log(`Converted successfully in ${elapsed}ms — output: ${(outputStat.size / 1024).toFixed(1)} KB`);

    // Stream the result
    const outputFilename = `${path.basename(req.file.originalname, path.extname(req.file.originalname))}.${targetFormat}`;

    res.set({
      "Content-Type": MIME_MAP[targetFormat] || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${outputFilename}"`,
      "Content-Length": outputStat.size,
      "X-Conversion-Time-Ms": elapsed,
      "X-Original-Format": inputExt,
      "X-Output-Format": targetFormat,
    });

    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);

    // Clean up after stream finishes
    stream.on("end", () => cleanupFiles(inputPath, outputPath));
    stream.on("error", () => cleanupFiles(inputPath, outputPath));

  } catch (error) {
    cleanupFiles(inputPath, outputPath);
    console.error("Conversion error:", error.message);

    const status = error.message.includes("not found") ? 503 : 500;
    res.status(status).json({
      error: "Conversion failed",
      message: error.message,
      duration: Date.now() - startTime,
    });
  }
});

// ─── GET /api/formats ────────────────────────────────────────────────────────

router.get("/formats", (req, res) => {
  const formats = Object.entries(SUPPORTED_CONVERSIONS).map(([from, to]) => ({
    from: `.${from}`,
    to: `.${to}`,
    mime: MIME_MAP[from] || "application/octet-stream",
  }));

  res.json({
    supportedConversions: formats,
    maxFileSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    timeout: `${CONVERSION_TIMEOUT / 1000}s`,
    engine: "LibreOffice Headless",
  });
});

module.exports = router;
