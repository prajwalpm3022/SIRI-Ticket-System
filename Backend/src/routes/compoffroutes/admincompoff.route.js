const { Router } = require("express");
const { authenticate } = require("../../middlewares/auth.middleware");
const {getPendingCompoffList,updateCompoffStatus} = require("../../controllers/compoff/appprovecompoff.controller");
const router = Router()

router.put("/approvecompoffrequest",authenticate, updateCompoffStatus);

router.get("/getcompoffrequest",authenticate, getPendingCompoffList);
module.exports = router;