const { Router } = require("express");
const projectupload = require("../../middlewares/projectUpload"); 
const { authenticate } = require("../../middlewares/auth.middleware");

const {
  getCustomerDropdown,
  getModuleDropdown,
  createProject,
  updateProject,
  getProjects,
  delete_project,
} = require("../../controllers/project/project.controller");

const router = Router();

router.get("/getcustomer", authenticate, getCustomerDropdown);
router.get("/getmodule", authenticate, getModuleDropdown);
router.post(
  "/insproj",
  authenticate,
  projectupload.array("files", 5), // ✅ WORKS
  createProject
  
);

router.put(
  "/updproj/:id",
  authenticate,
  projectupload.array("files", 5),
  updateProject
);

router.get("/getprojecttable", authenticate, getProjects);
router.delete("/delproject/:id", authenticate, delete_project);
router.get("/file/:filename", (req, res) => {
  const path = require("path");
  const fs = require("fs");

  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "uploads",
    "project_docs",
    req.params.filename
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  res.sendFile(filePath);
});




module.exports = router;
