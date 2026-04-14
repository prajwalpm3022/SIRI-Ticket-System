const { Router } = require("express");
const { get_designation,
    get_languages,
    get_emp_status,
    post_emp_data,
    postnewLanguages,
    get_employees,
    get_employee_document,
    update_emp_data,
    // deleteEmployee,
    uploadEmployeeDocuments,
    get_employee_uploaded_documents,
    previewEmployeeDocument,
    delete_employee_uploaded_documents,
    get_employee_DD } = require("../../controllers/Employee/employee.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { upload } = require("../../config/multer.config");

const router = Router()
router.get("/designation", authenticate, get_designation);
router.get("/languages", authenticate, get_languages);
router.get("/emp_status", authenticate, get_emp_status);
router.post("/", authenticate, post_emp_data);
router.post("/languages", authenticate, postnewLanguages);
router.get("/employees", authenticate, get_employees);
router.get('/document', authenticate, get_employee_document);
router.put("/:id", update_emp_data);
// router.delete("/:id", deleteEmployee);
router.post("/employee_documents/:id", authenticate, upload.array("documents", 10), uploadEmployeeDocuments);
router.get("/employee_documents/:id",authenticate, get_employee_uploaded_documents);
router.get("/employee_documents/preview/:id",authenticate, previewEmployeeDocument);
router.delete("/employee_documents/:empId/:docLinkId", authenticate, delete_employee_uploaded_documents);
router.get("/dd", authenticate, get_employee_DD);

module.exports = router;