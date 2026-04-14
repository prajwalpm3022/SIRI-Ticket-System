
const multer = require("multer");
const path = require("path");
const fs = require("fs");


const uploadDir = path.join(__dirname, "..", "..", "uploads", "project_docs");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `TEMP_${Date.now()}${ext}`);
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
