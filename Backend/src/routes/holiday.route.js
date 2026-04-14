const { Router } = require("express")
const { authenticate } = require('../middlewares/auth.middleware')
const {get_yeardd,get_holidayslist,insert_holiday,update_holiday,delete_holiday} = require("../controllers/holiday.controller")

const router = Router()
router.get("/",authenticate, get_yeardd);
router.get("/gethol",authenticate, get_holidayslist);
router.post("/addhol",authenticate, insert_holiday);
router.put("/updhol/:id",authenticate,update_holiday);
router.delete("/delhol/:id",authenticate,delete_holiday);

module.exports = router