const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const {
  get_notifications,
  mark_notification_viewed,
  get_modules_list,
  get_employees_list,
  send_notification,
  get_loggedin_employees,
  get_office_employees,
  get_employees_by_module,
  get_notification_types,
  get_notification_recipients,
  get_notification_history

} = require("../../controllers/Notification/Notification.controller");

router.get("/", authenticate, get_notifications);
router.put("/:id/viewed", authenticate, mark_notification_viewed);
router.get("/modules/list", authenticate,get_modules_list);
router.get("/employees/list",authenticate, get_employees_list);
router.post("/send", authenticate,send_notification);
router.get("/employees/office", authenticate,   get_office_employees);
router.get("/employees/loggedin",  authenticate,get_loggedin_employees);
router.get("/employees/by-module/:moduleId",authenticate, get_employees_by_module);
router.get("/types", authenticate,get_notification_types);
router.get("/history",  authenticate,get_notification_history);
router.get("/recipients/:notificationId",authenticate, get_notification_recipients);
module.exports = router;