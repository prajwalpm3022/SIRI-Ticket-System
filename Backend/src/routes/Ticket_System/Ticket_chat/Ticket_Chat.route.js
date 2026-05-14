const express = require('express');
const router = express.Router();
const {
    GetChatMembers

} = require("../../../controllers/Ticket_System/Ticket_chat/Ticket_Chat.Controller");
const { authenticate } = require("../../../middlewares/TicketAuth.middleware");

router.get("/getChatMembers/:ticket_id",authenticate, GetChatMembers);


module.exports = router;

