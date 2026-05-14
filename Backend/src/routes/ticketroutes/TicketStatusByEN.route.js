
const express = require('express');
const router = express.Router();
const {
    UpdateTicketStatus,
    UpdateTicketProgress
} = require("../../controllers/tickets/TicketStatusByEN.controller");

router.put("/updateTicketStatus/:ticket_id", UpdateTicketStatus);
router.post("/updateTicketProgress/:ticket_id", UpdateTicketProgress);

module.exports = router;