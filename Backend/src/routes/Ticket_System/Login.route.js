const express = require("express");
const router = express.Router();
const {
    CustomerLogin,
    loginLimiter,
    checkIpBlock,
    forgot_password,
    reset_password
} = require("../../controllers/Ticket_System/Login.controller");

router.post("/", checkIpBlock, loginLimiter, CustomerLogin); 
router.post("/forgot-password", forgot_password);
router.post("/reset-password", reset_password);

module.exports = router;
