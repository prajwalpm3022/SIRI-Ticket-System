const express = require("express");
const router = express.Router();
const {
    CreateTicket,
    GetCategoryData,
    DeleteTicketDocByUser,

} = require("../controllers/CreateTicket.Controller");
const { authenticate } = require("../middlewares/auth.middleware");
import { uploadDocs } from '../config/multer.config.js';

router.post("/", authenticate, uploadDocs.array("documents", 10), CreateTicket);
router.get("/category", authenticate, GetCategoryData);
router.delete("/deleteTicketDocByUser/:ticket_doc_id", authenticate, DeleteTicketDocByUser);

module.exports = router;
