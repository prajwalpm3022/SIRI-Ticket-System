const { Router } = require("express")
const { authenticate } = require('../../middlewares/auth.middleware')
const {insert_module,get_modules,update_module,get_customers_by_module} = require("../../controllers/project/module.controller")

const router = Router()
router.post("/insertmodule",authenticate, insert_module);
router.get("/",authenticate, get_modules);
router.put("/updmodule/:id",authenticate, update_module);
router.get("/module/:id/customers", authenticate, get_customers_by_module);

module.exports = router