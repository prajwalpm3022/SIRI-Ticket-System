const { Router } = require("express")
const { update_password,getEmployeeDropdown,getRoleDropdown,insertRole,getusers, update_user,create_user,searchUsersByLoginId,getuserscount} = require("../../controllers/usercontroller/usermast.controller")
const { authenticate } = require('../../middlewares/auth.middleware')

const router = Router()
router.get("/getempdd", authenticate,getEmployeeDropdown)
router.get("/getroledd", authenticate,getRoleDropdown)
router.post("/insrole", authenticate,insertRole)
router.get("/getusers", authenticate,getusers)
router.get("/getuserscnt", authenticate,getuserscount)
router.put("/updusers/:id", authenticate,  update_user)
router.post("/postuser", authenticate, create_user)
router.get("/users/search", authenticate, searchUsersByLoginId);



router.put("/updpas", authenticate,update_password);



module.exports = router