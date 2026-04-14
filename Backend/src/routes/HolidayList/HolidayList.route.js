const { Router } = require("express");
const { authenticate } = require("../../middlewares/auth.middleware");
const { get_Holiday_List } = require("../../controllers/HolidayList/HolidayList.controller");
const router = Router()

router.get("/",authenticate, get_Holiday_List);

module.exports = router;