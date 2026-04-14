const multer = require("multer");
const path = require("path");
const fs = require("fs");

// upload folder
const uploadDir = path.join(__dirname, "..", "..", "uploads", "project_docs");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const projectId = req.body.project_id || "TEMP";

    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const ext = path.extname(file.originalname);
    const unique = Date.now();

    cb(null, `${projectId}_${date}_${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /pdf|png|jpg|jpeg/;
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, PNG, JPG files allowed"));
  }
};

const projectupload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});


module.exports = projectupload;
