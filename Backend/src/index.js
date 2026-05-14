require("dotenv").config();
const { app, httpServer } = require("./app")
const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => console.log(`Server started on port ${PORT}`))