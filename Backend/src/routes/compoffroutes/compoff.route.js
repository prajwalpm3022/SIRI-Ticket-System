const { Router } = require("express");
const { authenticate } = require("../../middlewares/auth.middleware");
const { createCompoff,getCompoffList,updateCompoffById,getCompOffExpiryAlert} = require("../../controllers/compoff/compoff.controller");
const router = Router()


router.post("/createcompoff",authenticate, createCompoff);
router.get("/getcompoff",authenticate,getCompoffList );
router.put("/updatecompoff/:id",authenticate,updateCompoffById );
router.get("/comoffalert",authenticate,getCompOffExpiryAlert );

module.exports = router;