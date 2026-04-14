const { Router } = require("express");
const {
  getsubmenudata,
  getmenuiddd,
  postSubMenuItems,
  updateSubMenuItems,
  deleteSubMenuItems,
  getdatagrid,
} = require("../controllers/sub_menue_items.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = Router();

router.get("/getall",authenticate, getsubmenudata);
router.get("/getdd",authenticate, getdatagrid);
router.get("/getiddd",authenticate, getmenuiddd);
router.post("/",authenticate, postSubMenuItems);
router.put("/:id", authenticate, updateSubMenuItems);
router.delete("/:id", authenticate, deleteSubMenuItems);

module.exports = router;
