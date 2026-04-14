const express = require("express");
const router = express.Router();
const {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
} = require("../../../controllers/Ticket_System/DeptCreation/DeptCreation.controller");
const { authenticate } = require("../../../middlewares/TicketAuth.middleware");

router.get("/getDepartments", authenticate, getDepartments);
router.post("/createDepartment", authenticate, createDepartment);
router.put("/updateDepartment", authenticate, updateDepartment);
router.delete("/deleteDepartment/:cust_dept_id", authenticate, deleteDepartment);

module.exports = router;