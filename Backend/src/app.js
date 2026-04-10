const express = require("express");
const cors = require("cors");
const app = express();
const { ApiResponse, ApiError } = require("./utils");
const { errorHandler } = require("./middlewares");

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(
  express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 })
);

app.get("/", (req, res) => {
  res.status(200).json(new ApiResponse(200, null, "hello world"));
});

app.use("/api/v1/Login", require("./routes/Login.route"));
app.use("/api/v1/CreateTicket", require("./routes/CreateTicket.route"));
app.use("/api/v1/AdminDashBoard", require("./routes/AdminDashBoard.route"));

app.use("*", (req, res, next) => {
  next(new ApiError(404, "Route not found"));
});

app.use(errorHandler);

/* EXPORT APP */
module.exports = { app };
