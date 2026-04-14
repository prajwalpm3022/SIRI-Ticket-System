const { Router } = require("express");

const { authenticate } = require("../../middlewares/auth.middleware");

const {getRoleDropdown,
  getProjectDropdown,
  getStatusDropdown,
  createProjectTeam,
  updateProjectTeam,
  getProjectTeam

} = require("../../controllers/project/projectteam.controller");

const router = Router();

router.get("/getproject", authenticate, getProjectDropdown);
router.get("/getrole", authenticate, getRoleDropdown);
router.get("/getstatus", authenticate, getStatusDropdown);
router.post("/createteam", authenticate, createProjectTeam);
router.put("/updateteam/:team_id", authenticate, updateProjectTeam);
router.get("/getteamtable", authenticate, getProjectTeam);







module.exports = router;
