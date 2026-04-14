const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname, "..", "..", "uploads", "employee_docs");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const empId = req.params.id || "EMP";

    let docIds = req.params.docIds || "DOC";
    if (req.body.docIds) {
      docIds = Array.isArray(req.body.docIds)
        ? req.body.docIds[0]
        : req.body.docIds;
    }

    const safeName = file.originalname.replace(/\s+/g, "_");
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext);
    const finalName = `${empId}_${docIds}_${base}${ext}`;
    cb(null, finalName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("INVALID_FILE_TYPE"));
    }
    cb(null, true);
  },
});

module.exports = { upload };
