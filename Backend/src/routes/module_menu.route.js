const { Router } = require("express");
const { getmodules, insertModule, updateModule ,deleteModule} = require("../controllers/module_menu.controller");  
// --------------- added .js --------------------//
const { authenticate } = require("../middlewares/auth.middleware");

const router = Router();

router.get("/getmod",authenticate, getmodules);
router.post("/addmod",authenticate,  insertModule);
router.put("/updmod/:id",authenticate,updateModule);
router.delete("/delmod/:id",authenticate, deleteModule);
module.exports = router;