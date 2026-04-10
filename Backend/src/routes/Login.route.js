const express = require("express");
const router = express.Router();
const {
    CustomerLogin,

} = require("../controllers/Login.controller");

router.post("/", CustomerLogin);


module.exports = router;
