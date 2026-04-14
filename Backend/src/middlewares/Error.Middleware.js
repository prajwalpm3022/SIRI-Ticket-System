const { ApiError } = require("../utils");

const errorHandler = (err, req, res, next) => {
    let error = err;
    

    if (!(err instanceof ApiError)) {
        const statusCode = err.statusCode || 500;
        const message = err.message || "Internal Server Error";

        error = new ApiError(statusCode, message, err.errors || [], err.stack);
    }

 
    const currentDate = new Date();

    const formattedDate = new Intl.DateTimeFormat('en-IN', {
        weekday: 'short', 
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true, 
        timeZone: 'Asia/Kolkata',
    }).format(currentDate);

    console.error(`[${formattedDate}] Error encountered on ${req.originalUrl}:`, error);


    const response = {
        ...error,
        message: error?.message,
        ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
    };

    return res.status(error.statusCode).json(response);
};

module.exports = { errorHandler };
