const { Router } = require("express")
const { logout } = require("../../controllers/logoutcontroller/logout.controller")
const { authenticate } = require('../../middlewares/auth.middleware')

const router = Router()

router.put("/", authenticate, logout);

module.exports = router