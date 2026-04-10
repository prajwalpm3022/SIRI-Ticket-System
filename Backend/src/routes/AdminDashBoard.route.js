const express = require("express");
const router = express.Router();
const {
    getTickets,
    updateTicketStatus,
    previewTicketDocument,
    UpdateTicket,
    getTicketsforAdmin,
    deleteTicketDoc,
    TicketStatusDD,
} = require("../controllers/AdminDashBoard.Controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { uploadDocs } = require('../config/multer.config.js');


router.get("/getTickets",authenticate, getTickets);
router.get("/getTicketsforAdmin", authenticate, getTicketsforAdmin);
router.get("/TicketStatusDD", authenticate, TicketStatusDD);
router.put("/updateTicketStatus", authenticate, updateTicketStatus);
router.get("/previewTicketDocument/:id", authenticate, previewTicketDocument);
router.put("/updateTicket/:TICKET_ID", authenticate, uploadDocs.array("documents", 5), UpdateTicket);
router.put("/deleteTicketDoc/:ticket_doc_id", authenticate, deleteTicketDoc);

module.exports = router;
