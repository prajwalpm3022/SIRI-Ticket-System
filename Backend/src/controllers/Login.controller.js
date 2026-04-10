const {
    asyncHandler,
    EmailService,
    ApiError,
    ApiResponse,
    DatabaseHandler } = require("../utils");
const OracleDB = require("oracledb");

const { signToken } = require("../utils/token.util");

const CustomerLogin = asyncHandler(async (req, res) => {
    const { CUST_USER_ID, CUST_PASSWORD } = req.body;

    if (!CUST_USER_ID || !CUST_PASSWORD) {
        throw new ApiError(400, "Username and password are required");
    }

    const db = new DatabaseHandler();
    try {
        const query = `
       SELECT cl.CUST_LOGIN_ID, cl.CUST_ID, cl.CUST_USER_ID, cl.CUST_PASSWORD, 
       cl.CUST_DEPT_ID, cl.LOGIN_TYPE, cd.CUST_DEPT_NAME, cd.SHORT_NAME AS DEPT_SHORT_NAME,
       c.SHORT_NAME AS CUST_SHORT_NAME
        FROM CUST_LOGIN cl
        LEFT JOIN CUST_DEPT cd ON cl.CUST_DEPT_ID = cd.CUST_DEPT_ID
        LEFT JOIN CUSTOMER c ON cl.CUST_ID = c.CUSTOMER_ID
        WHERE cl.CUST_USER_ID = :CUST_USER_ID 
        AND cl.CUST_PASSWORD = :CUST_PASSWORD
         `;

        const result = await db.executeQueryWithParams(query, { CUST_USER_ID, CUST_PASSWORD }, "siri_db");
        const rows = result.rows || [];

        if (!rows?.length) {
            throw new ApiError(401, "Invalid username or password");
        }

        const user = rows[0];

        const isPasswordValid = CUST_PASSWORD === user.CUST_PASSWORD;

        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid username or password");
        }

        const token = signToken({ userId: user.CUST_USER_ID });
        res.status(200).json(
            new ApiResponse(
                200,
                {
                    userId: user.CUST_ID,
                    deptId: user.CUST_DEPT_ID,
                    deptName: user.CUST_DEPT_NAME,
                    login_type: user.LOGIN_TYPE,
                    loginId: user.CUST_LOGIN_ID,
                    DeptshortName: user.DEPT_SHORT_NAME,
                    CustshortName: user.CUST_SHORT_NAME,
                    token
                },
                "Login Successful"
            )
        );
    } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Login Error", err.message);
    }
});

module.exports = {
    CustomerLogin,
};
