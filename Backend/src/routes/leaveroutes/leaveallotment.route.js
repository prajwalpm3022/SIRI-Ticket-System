const { Router } = require("express")
const { get_cal_year_dd,apply_leave_allotment } = require("../../controllers/leavecontroller/leaveallotment.controller")
const { authenticate } = require('../../middlewares/auth.middleware')

const router = Router()

router.get("/",authenticate, get_cal_year_dd)
router.post("/yearlyleave",authenticate, apply_leave_allotment)


module.exports = router