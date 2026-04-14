const express = require("express");
const router = express.Router();
const {
    CustomerLogin,

} = require("../../controllers/Ticket_System/Login.controller");

router.post("/", CustomerLogin);


module.exports = router;
