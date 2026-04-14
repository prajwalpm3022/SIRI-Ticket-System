const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(
      __dirname,
      "../../uploads/leave_docs"
    );

    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    
    const empId = req.user?.emp_id;

    

    const appliedDate = new Date().toISOString().split("T")[0];
    const ext = path.extname(file.originalname);

    const newFileName = `${empId}_${appliedDate}${ext}`;

    cb(null, newFileName); 
  },
});

const fileFilter = (req, file, cb) => {
  const isPdf = file.mimetype === "application/pdf";
  const isImage = file.mimetype.startsWith("image/");

  if (!isPdf && !isImage) {
    return cb(new Error("Only PDF and image files are allowed"));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, 
});

module.exports = upload;
