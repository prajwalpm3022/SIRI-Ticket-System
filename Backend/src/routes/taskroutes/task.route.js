const { Router } = require("express")
const { authenticate } = require('../../middlewares/auth.middleware')
const { get_taskcategory,get_taskpriority,get_taskstatus,get_documenttype,create_task } = require("../../controllers/Task/task.controller")

const router = Router()
router.get("/getpriority", authenticate, get_taskpriority);
router.get("/getcategory", authenticate, get_taskcategory);
router.get("/getstatus", authenticate, get_taskstatus);
router.get("/getdoctype", authenticate, get_documenttype);
router.post("/createtask", authenticate, create_task);

module.exports = router