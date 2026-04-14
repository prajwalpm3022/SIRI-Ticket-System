const { Router } = require("express");
const { authenticate } = require("../../middlewares/auth.middleware");
const { get_customers,create_customer,update_customer,delete_customer} = require("../../controllers/Customer/customer.controller");
const router = Router()

router.get("/",authenticate, get_customers);
router.post("/createcustomer",authenticate, create_customer);
router.put("/updcust/:id",authenticate, update_customer);
router.delete("/delcust/:id",authenticate, delete_customer);
module.exports = router;