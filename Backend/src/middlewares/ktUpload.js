const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname, "..", "..", "uploads", "kt_docs");

// ensure base folder exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
  
function parseKTDate(dateStr) {
  const [dd, mm, yy] = dateStr.split("-");
  const year = Number(yy) + 2000; // 26 → 2026
  return new Date(year, Number(mm) - 1, Number(dd));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const empId = req.body.EMP_ID || "EMP";

    let dateObj;
    try {
      dateObj = req.body.K_DATE
        ? parseKTDate(req.body.K_DATE)
        : new Date();
    } catch {
      dateObj = new Date();
    }

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = dateObj
      .toLocaleString("en-US", { month: "short" })
      .toUpperCase();
    const year = dateObj.getFullYear();

    const ext = path.extname(file.originalname);

    const finalName = `${empId}_${day}_${month}_${year}${ext}`;

    cb(null, finalName);
  },
});

const uploadKT = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("INVALID_FILE_TYPE"));
    }
    cb(null, true);
  },
});

module.exports = { uploadKT };
