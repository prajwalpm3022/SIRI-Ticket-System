const { Router } = require("express")
const { get_status_master, getEmployee, save_work_schedule, get_work_schedule, getAllEmployeeLeavesForSchedule, getHolidaysForSchedule, send_schedule_email, get_weekly_login_details } = require("../../controllers/workschedule/work_schedule")
const { authenticate } = require('../../middlewares/auth.middleware')

const router = Router()
router.get("/getstatusdd", authenticate, get_status_master)
router.get("/getteammembers", authenticate, getEmployee)
router.post("/postschedule", authenticate, save_work_schedule)
router.get("/getworkschedule", authenticate, get_work_schedule)
router.get("/getempleaveforsch", authenticate, getAllEmployeeLeavesForSchedule)
router.get("/getholidayforsch", authenticate, getHolidaysForSchedule)
router.post("/sendemail", authenticate, send_schedule_email)
router.get("/weeklyworkschedule", authenticate, get_weekly_login_details)
module.exports = router