const express = require("express");
const router = express.Router();
const {
    CreateTicket,
    GetCategoryData,
    DeleteTicketDocByUser,

} = require("../../controllers/Ticket_System/CreateTicket.Controller");
const { authenticate } = require("../../middlewares/TicketAuth.middleware");
const { uploadDocs } = require('../../config/Ticketmulter.config');

router.post("/", authenticate, uploadDocs.array("documents", 10), CreateTicket);
router.get("/category", authenticate, GetCategoryData);
router.delete("/deleteTicketDocByUser/:ticket_doc_id", authenticate, DeleteTicketDocByUser);

module.exports = router;
