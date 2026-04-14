const { Router } = require("express");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  getDragandDropUsers,
  postDragandDropUsers,
  getDragandDropUserActions,
  deleteDragandDropUsers,
  getUsersbyGroupID,
} = require("../controllers/dragAndDrop.contoller");
const router = Router();

router.get("/", authenticate, getDragandDropUsers);
router.get("/actions", authenticate, getDragandDropUserActions);
router.post("/", authenticate, postDragandDropUsers);
router.delete("/", authenticate, deleteDragandDropUsers);
router.get("/group/:group_id", authenticate, getUsersbyGroupID);

module.exports = router;
