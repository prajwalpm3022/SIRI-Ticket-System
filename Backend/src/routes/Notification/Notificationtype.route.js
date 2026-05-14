const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const {
  get_notification_types,
  get_notification_type_by_id,
  create_notification_type,
  update_notification_type,
  delete_notification_type,
} = require("../../controllers/Notification/Notificationtype.controller");

router.get("/", authenticate, get_notification_types);
router.get("/:id", authenticate,get_notification_type_by_id);
router.post("/", authenticate,create_notification_type);
router.put("/:id",authenticate,update_notification_type);
router.delete("/:id",authenticate ,delete_notification_type);

module.exports = router;