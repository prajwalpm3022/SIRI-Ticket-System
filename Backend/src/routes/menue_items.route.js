const { Router } = require("express");
const {
  getModuleMenu,
  getMainMenu,
  createMenuItem,
  updateMenuItem,
  fetchMenuItems,
  deleteMenuItem,
} = require("../controllers/menue_items.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = Router();

router.get("/dd_module", authenticate, getModuleMenu);
router.get("/dd_main_menu", authenticate, getMainMenu);
router.post("/", authenticate, createMenuItem);
router.put("/", authenticate, updateMenuItem);
router.get("/", authenticate, fetchMenuItems);
router.delete("/:id", authenticate, deleteMenuItem);

module.exports = router;
