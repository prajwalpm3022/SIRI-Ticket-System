const { Router } = require("express")
const { get_leave_type_dd,apply_leave,get_remaining_leave,calculate_leave_days,getemployeeleavedetail,getEmployeeLeaveCards,previewLeaveDocument,get_employee_lop_days,check_leave_overlap,getTodayApprovedLeavesForAdmin} = require("../../controllers/leavecontroller/leave.controller")
const { authenticate } = require('../../middlewares/auth.middleware')
const upload = require("../../middlewares/upload.middleware");
const router = Router()

router.get("/",authenticate, get_leave_type_dd)
router.post(
  "/apply",
  authenticate,
  upload.array("files"),
  apply_leave
);
router.get(
  "/remaining/:emp_id/:leave_id",
  authenticate,
  get_remaining_leave
);
router.post(
  "/calculate-days",
  authenticate,
  calculate_leave_days
);
router.get("/history",authenticate, getemployeeleavedetail)
router.get("/cards",authenticate, getEmployeeLeaveCards)
router.get(
  "/document/:docId",
  previewLeaveDocument
);
router.get("/getlopcount",authenticate, get_employee_lop_days)
router.post("/checkoverlap",authenticate, check_leave_overlap)
router.get("/gettodaysleaves",authenticate,getTodayApprovedLeavesForAdmin)

module.exports = router