const { Router } = require("express");
const { authenticate } = require("../../middlewares/auth.middleware");
const { get_emp_permission, post_emp_permission,get_all_permissions,get_today_permissions } = require("../../controllers/Permission/permission.controller");
const router = Router()
router.get("/today", authenticate, get_today_permissions);
router.get("/:emp_id", authenticate, get_emp_permission);
router.post("/", authenticate, post_emp_permission);
router.get("/", authenticate, get_all_permissions);

module.exports = router;