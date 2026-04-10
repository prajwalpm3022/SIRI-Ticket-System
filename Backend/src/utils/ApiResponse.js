class ApiResponse {
    constructor(statusCode, data, message = "Success",Status) {
        this.statusCode = statusCode
        this.data = data
        // Object.assign(this, data) 
        this.message = message
        this.sucess = statusCode < 400
        this.Status = Status !== undefined ? Status : (statusCode < 400 ? 1 : 0);
    }
}

// class ApiResponse {
//     constructor(statusCode, result, message = "Success") {
//         this.statusCode = statusCode
//         this.data = result // Ensuring data is not nested under another "data"
//         this.message = message
//         this.success = statusCode < 400
//         this.Status = statusCode < 400 ? 1 : 0
//     }
// }


module.exports = {
    ApiResponse
}