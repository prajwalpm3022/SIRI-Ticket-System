const express = require("express");
const cors = require("cors");
const app = express();
app.set("trust proxy", true); 
const { ApiResponse, ApiError } = require("./utils");
const { errorHandler } = require("./middlewares");
const path = require("path");
require("./cron/earnedleave.cron");
require("./cron/compoffexpiry.corn");

/* COMMON MIDDLEWARE */
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(
  express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 })
);

/* ROUTES */
app.get("/", (req, res) => {
  res.status(200).json(new ApiResponse(200, null, "hello world"));
});

/* API ROUTES */
app.use("/api/v1/calender_year", require("./routes/calender_year.route"));
app.use("/api/v1/module_menu", require("./routes/module_menu.route"));
app.use("/api/v1/main_menu", require("./routes/main_menu.route"));
app.use("/api/v1/menuitems", require("./routes/menue_items.route"));
app.use("/api/v1/sub_menu", require("./routes/sub_menu_items.route"));
app.use("/api/v1/employee", require("./routes/Employee/employee.route"));
app.use("/api/v1/KT", require("./routes/KT/KT.route"));
app.use("/api/v1/holidaylist", require("./routes/HolidayList/HolidayList.route"));
app.use("/api/v1/login", require("./routes/loginroutes/login.route"));
app.use("/api/v1/holiday", require("./routes/holiday.route"));
app.use("/api/v1/users", require("./routes/usermastroutes/usermast.route"));
app.use("/api/v1/logout", require("./routes/logoutroutes/logout.route"));
app.use("/api/v1/leave", require("./routes/leaveroutes/leave.route"));
app.use("/api/v1/adminleave", require("./routes/leaveroutes/adminleave.route"));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/api/v1/customer", require("./routes/customerroutes/customer.routes"));
app.use("/api/v1/leaveallotment",require("./routes/leaveroutes/leaveallotment.route"));
app.use("/api/v1/module", require("./routes/project/module.route"));
app.use("/api/v1/project", require("./routes/project/project.route"));
app.use("/api/v1/projectteam", require("./routes/project/projectteam.route"));
app.use("/api/v1/compoff", require("./routes/compoffroutes/compoff.route"));
app.use("/api/v1/approvecompoff", require("./routes/compoffroutes/admincompoff.route"));
app.use("/api/v1/permission", require("./routes/Permission/permission.route"));
app.use("/api/v1/empdash", require("./routes/employeedashboard/empdashboard.route"));
app.use('/api/v1/SingleLeaveAllotment', require("./routes/SingleLeaveAllotment/SingleLeaveAllotment.route"));
app.use("/api/v1/Group", require("./routes/groupMaster.route"));
app.use("/api/v1/draganddrop", require("./routes/dragAndDrop.route"));
app.use("/api/v1/drawer", require("./routes/drawer.routes"));
app.use("/api/v1/task", require("./routes/taskroutes/task.route"));
app.use("/api/v1/ticket", require("./routes/ticketroutes/ticket.route"));
app.use("/api/v1/workschedule", require("./routes/workscheduleroutes/workschedule.route"));
app.use("/api/v1/Login", require("./routes/Ticket_System/Login.route"));
app.use("/api/v1/CreateTicket", require("./routes/Ticket_System/CreateTicket.route"));
app.use("/api/v1/AdminDashBoard", require("./routes/Ticket_System/AdminDashBoard.route"));
app.use("/api/v1/UserCreationByAdmin", require("./routes/Ticket_System/UserCreationByAdminRoute/UserCreation.route"));
app.use("/api/v1/DeptCreation", require("./routes/Ticket_System/DeptCreationRoute/DeptCreation.route"));
app.use("/*splat", (req, res, next) => {
  console.log(`Undefined route accessed: ${req.originalUrl}`);
  next(new ApiError(404, "Route not found"));
});

/* ERROR HANDLER */
app.use(errorHandler);

/* EXPORT APP */
module.exports = { app };
