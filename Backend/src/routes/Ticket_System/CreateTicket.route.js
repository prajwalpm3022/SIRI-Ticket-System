const express = require("express");
const router = express.Router();
const {
    CreateTicket,
    GetCategoryData,
    DeleteTicketDocByUser,
     verify_ticket,
   reopen_ticket

} = require("../../controllers/Ticket_System/CreateTicket.Controller");
const { authenticate } = require("../../middlewares/TicketAuth.middleware");
const { uploadDocs } = require('../../config/Ticketmulter.config');

router.post("/", authenticate, uploadDocs.array("documents", 10), CreateTicket);
router.get("/category", authenticate, GetCategoryData);
router.delete("/deleteTicketDocByUser/:ticket_doc_id", authenticate, DeleteTicketDocByUser);
router.put("/verify-ticket/:ticket_id", authenticate,  verify_ticket);
router.put("/reopen-ticket/:ticket_id",authenticate, reopen_ticket);


router.put("/verify-ticket/:ticket_id", authenticate, verify_ticket);
module.exports = router;
