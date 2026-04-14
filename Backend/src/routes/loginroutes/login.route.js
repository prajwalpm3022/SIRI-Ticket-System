const { Router } = require("express")
const { getlocationdd, signin, getdetailsindashboard,resetPassword,forgotPassword,refreshToken } = require("../../controllers/logincontroller/login.controller")
const { authenticate } = require('../../middlewares/auth.middleware')

const router = Router()

router.get("/locdd", getlocationdd)
router.post("/signin", signin);
router.get("/session/check", authenticate, (req, res) => {
    res.status(200).json({ active: true });
});
router.get("/dash", authenticate, getdetailsindashboard)
router.post("/forgot-password", forgotPassword);
// router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshToken);
router.post("/reset-password", (req, res, next) => {
  
  next();
}, resetPassword);


module.exports = router