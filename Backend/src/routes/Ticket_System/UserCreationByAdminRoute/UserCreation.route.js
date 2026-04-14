const express = require("express");
const router = express.Router();
const {
    getCustLogins,
    getCustDepartments,
    createCustLogin,
    updateCustLogin,
} = require("../../../controllers/Ticket_System/UserCreationByAdmin/UserCreation.controller");
const { authenticate } = require("../../../middlewares/TicketAuth.middleware");


router.get("/getCustLogins", authenticate, getCustLogins);
router.get("/getCustDepartments", authenticate, getCustDepartments);
router.post("/createCustLogin", authenticate, createCustLogin);
router.put("/updateCustLogin", authenticate, updateCustLogin);

module.exports = router;