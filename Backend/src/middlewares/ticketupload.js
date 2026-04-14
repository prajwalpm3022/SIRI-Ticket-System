const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dayjs = require("dayjs");
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "ticket_docs");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
 filename: (req, file, cb) => {
  const ticketId = req.body.ticket_id || "TICKET";

  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, ""); 

  const empId = req.user?.emp_id || "EMP";

  const unique = Date.now(); 

  const ext = path.extname(file.originalname);

 const fileName = `${ticketId}_siri_${empId}_${dayjs().format("DDMMMYYYYhhmm")}${ext}`;

  cb(null, fileName);
}
});

const fileFilter = (req, file, cb) => {
  const isPdf = file.mimetype === "application/pdf";
  const isImage = file.mimetype.startsWith("image/");

  if (!isPdf && !isImage) {
    return cb(new Error("Only PDF & Image allowed"), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = upload;