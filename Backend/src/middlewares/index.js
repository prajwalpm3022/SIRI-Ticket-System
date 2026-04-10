const { errorHandler } = require("./Error.middleWare");
const { authenticate } = require("./auth.middleware");
module.exports = { errorHandler, authenticate };