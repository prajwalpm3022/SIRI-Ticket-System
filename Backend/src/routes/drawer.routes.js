const { Router } = require("express");
const { authenticate } = require("../middlewares/auth.middleware");
const router = Router();
const { getMenus } = require("../controllers/drawer.controller");
router.get("/", authenticate, getMenus);
module.exports = router;
