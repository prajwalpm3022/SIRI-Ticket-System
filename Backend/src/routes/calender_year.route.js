const { Router } = require("express")
const { authenticate } = require('../middlewares/auth.middleware')
const { get_calender, insert_calender, update_calender } = require("../controllers/calender_year.controller")

const router = Router()
router.get("/", authenticate, get_calender);
router.post("/postcal", authenticate, insert_calender)
router.put("/updcal/:id",authenticate, update_calender);
module.exports = router