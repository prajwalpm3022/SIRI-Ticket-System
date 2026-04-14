class ApiResponse {
    constructor(statusCode, data, message = "Success",Status) {
        this.statusCode = statusCode
        this.items = data
        // Object.assign(this, data) 
        this.message = message
        this.sucess = statusCode < 400
        this.Status = Status !== undefined ? Status : (statusCode < 400 ? 1 : 0);
    }
}



module.exports = {
    ApiResponse
}