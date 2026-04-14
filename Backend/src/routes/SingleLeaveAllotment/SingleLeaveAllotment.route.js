const { Router } = require("express");
const { authenticate } = require("../../middlewares/auth.middleware");
const { get_emp_DD,
    get_emp_Grid,
    get_calendar_years_DD,
    post_leave_single_employee,
    update_leave_single_employee } = require("../../controllers/SingleLeaveAllotment/SingleLeaveAllotment.controller");
const router = Router()

router.get("/dd", get_emp_DD);
router.get("/grid", get_emp_Grid);
router.get("/caldd", authenticate, get_calendar_years_DD);
router.post("/", authenticate, post_leave_single_employee);
router.put("/",authenticate, update_leave_single_employee);

module.exports = router;