const express = require("express");
const router = express.Router();
const {
  getGroupMaster,
  postGroupMaster,
  deleteGroupMaster,
  updateGroupMaster,
} = require("../controllers/groupMaster.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.get("/", authenticate, getGroupMaster);
router.post("/", authenticate, postGroupMaster);
router.put("/:id", authenticate, updateGroupMaster);
router.delete("/:id", authenticate, deleteGroupMaster);

module.exports = router;
