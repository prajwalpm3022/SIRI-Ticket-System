import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads/docs folder if not exists
const uploadPath = "uploads/TicketDocs";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    const custId = req.user?.userId || "UNKNOWN";

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const monthNames = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
    ];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();

    const formattedDate = `${day}${month}${year}`;
    const extension = path.extname(file.originalname);

    // counter per request
    if (!req.fileIndex) {
      req.fileIndex = 1;
    }

    const index = String(req.fileIndex).padStart(2, "0");

    const finalName =
      `${custId}_${formattedDate}_TK_${index}${extension}`;

    req.fileIndex++;

    cb(null, finalName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    //  Images
    "image/jpeg",
    "image/jpg",
    "image/png",

    //  CSV
    "text/csv",

    // Excel (optional but recommended)
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and DOC files are allowed"), false);
  }
};

export const uploadDocs = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});