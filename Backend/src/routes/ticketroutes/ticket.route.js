const { Router } = require("express")
const { authenticate } = require('../../middlewares/auth.middleware')
const { get_taskcategory,get_taskpriority,get_taskstatus,assign_ticket,get_ticket_by_id,get_all_tickets,get_ticket_progress_by_ticket_id,get_all_tickets_onsearch, move_ticket_to_assigned,get_ticket_assignments,get_active_ticket_count,get_new_ticket_count} = require("../../controllers/tickets/assignticket.controller")
const upload = require("../../middlewares/ticketupload");
const router = Router()
router.get("/getpriority", authenticate, get_taskpriority);
router.get("/getcategory", authenticate, get_taskcategory);
router.get("/getstatus", authenticate, get_taskstatus);
// router.post("/assignticket", authenticate, assign_ticket);
router.post(
  "/assignticket",
  authenticate,
  upload.array("attachments", 5), // 🔥 FIX
  assign_ticket
);
router.get("/gettickets/:id", authenticate, get_ticket_by_id);
router.get("/getalltickets", authenticate, get_all_tickets);
router.get("/getassignticketprogress/:id", authenticate, get_ticket_progress_by_ticket_id);
router.get("/getallticketsonsearch", authenticate, get_all_tickets_onsearch);
router.put("/movetoassigned",  authenticate, move_ticket_to_assigned);
router.get("/getassignhistory/:id", authenticate, get_ticket_assignments);
router.get("/getticketcount", authenticate, get_active_ticket_count);
router.get("/getnewticketcount", authenticate, get_new_ticket_count);
module.exports = router