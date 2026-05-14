const express = require("express");
const router = express.Router();

const {
  get_client_notifications,
  mark_client_notification_viewed
} = require("../../../controllers/Ticket_System/Notification/ticketnotification.controller");

router.get("/", get_client_notifications);
router.put("/:id/viewed", mark_client_notification_viewed);

module.exports = router;