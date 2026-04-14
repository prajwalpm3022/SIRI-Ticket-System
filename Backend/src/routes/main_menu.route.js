const { Router } = require("express");
const {
  getMainMenusSelectModuleDD,
  getAllMainMenus,
  postMainMenus,
  updateMainMenus,
  deleteMainMenus,
} = require("../controllers/main_menu.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = Router();

router.get("/", authenticate, getMainMenusSelectModuleDD);
router.get("/Main", authenticate, getAllMainMenus);
router.post("/", authenticate, postMainMenus);
router.put("/:main_menu_id", authenticate, updateMainMenus);
router.delete("/:main_menu_id", authenticate, deleteMainMenus);

module.exports = router;
