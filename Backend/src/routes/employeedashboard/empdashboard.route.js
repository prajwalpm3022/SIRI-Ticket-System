const { Router } = require("express")
const { getSessionInfo ,get_employee_todo,get_task_details,upsert_ticket_progress} = require("../../controllers/empdashboard/empdashboard.controller")
const { authenticate } = require('../../middlewares/auth.middleware')

const router = Router()

router.get("/session-info", authenticate,getSessionInfo);
router.get("/gettaskofemployee/:empid", authenticate,get_employee_todo);
router.get("/gettaskdetails/:assignmentId", authenticate,get_task_details);
router.put("/updateprogress", authenticate,upsert_ticket_progress);
module.exports = router;