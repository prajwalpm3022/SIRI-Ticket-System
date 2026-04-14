const { Router } = require("express")
const { get_pending_leaves,getleaveapprovestatusdd,approve_leave,searchEmployeeLeaveDetails } = require("../../controllers/leavecontroller/adminleave.controller")
const { authenticate } = require('../../middlewares/auth.middleware')

const router = Router()

router.get("/pending",authenticate, get_pending_leaves)

router.get("/leave-status",authenticate, getleaveapprovestatusdd)
router.post(
  "/approve-leave",
  authenticate,
  approve_leave
);
router.get("/searchleave",authenticate, searchEmployeeLeaveDetails)

module.exports = router