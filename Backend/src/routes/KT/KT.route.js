const { Router } = require("express");
const { authenticate } = require("../../middlewares/auth.middleware");
const { uploadKT } = require("../../middlewares/ktUpload");
const { get_emp_KT, post_emp_KT, get_emp_KT_DD,download_KT_File } = require("../../controllers/KT/KT.controller");

const router = Router()

router.get("/", authenticate, get_emp_KT);
router.get("/Emp_dd", authenticate, get_emp_KT_DD);
router.post("/", authenticate, uploadKT.single("K_FILE"), post_emp_KT);
router.get("/download/:id",authenticate, download_KT_File);

module.exports = router;