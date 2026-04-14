const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Absolute upload directory (always project root)
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "leave_docs");

// Ensure directory exists ON SERVER START
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const empId = req.user?.emp_id || "EMP";
    const date = new Date().toISOString().split("T")[0];
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);

    const safeOriginalName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_.-]/g, "");

    const ext = path.extname(safeOriginalName);

    cb(null, `${empId}_${date}_${unique}${ext}`);
  },
});

// File filter (PDF + images)
const fileFilter = (req, file, cb) => {
  const isPdf = file.mimetype === "application/pdf";
  const isImage = file.mimetype.startsWith("image/");

  if (!isPdf && !isImage) {
    return cb(
      new Error("Only PDF and image files are allowed"),
      false
    );
  }

  cb(null, true);
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB
  },
});

module.exports = upload;
