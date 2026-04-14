const {
    asyncHandler,
    EmailService,
    ApiError,
    ApiResponse,
    DatabaseHandler } = require("../../../utils");
const OracleDB = require("oracledb");


const getCustLogins = asyncHandler(async (req, res) => {
    try {
        const { cust_id } = req.query;
        const db = new DatabaseHandler();

        if (!cust_id) {
            throw new ApiError(400, "cust_id is required");
        }

        const query = `
            SELECT
                cl.CUST_LOGIN_ID,
                cl.CUST_ID,
                c.CUSTOMER_NAME,
                cl.CUST_DEPT_ID,
                cd.CUST_DEPT_NAME,
                cl.CUST_USER_ID,
                cl.CUST_PASSWORD,
                cl.NAME,
                cl.EMAIL,
                cl.LOGIN_TYPE,
                cl.MOBILE,
                cl.ACTIVE
            FROM cust_login cl, cust_dept cd, customer c
            WHERE cl.CUST_DEPT_ID = cd.CUST_DEPT_ID
            AND cl.CUST_ID = c.CUSTOMER_ID
            AND cl.CUST_ID = :cust_id
            ORDER BY cl.CUST_LOGIN_ID ASC
        `;

        const result = await db.executeQuery(query, { cust_id }, "siri_db");
        const rows = result.rows || [];

        res.status(200).json(
            new ApiResponse(200, rows, "Customer logins fetched successfully")
        );
    } catch (err) {
        console.error("getCustLogins Error:", err);
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Failed to fetch customer logins", err.message);
    }
});

const getCustDepartments = asyncHandler(async (req, res) => {
    try {
        const db = new DatabaseHandler();

        const query = `
            SELECT CUST_DEPT_ID ,CUST_DEPT_NAME
            FROM CUST_DEPT ORDER BY CUST_DEPT_ID ASC
        `;

        const result = await db.executeQuery(query, {}, "siri_db");
        const rows = result.rows || [];

        res.status(200).json(
            new ApiResponse(200, rows, "Department fetched successfully")
        );
    } catch (err) {
        console.error("Departments Error:", err);
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Failed to fetch departments", err.message);
    }
});

const createCustLogin = asyncHandler(async (req, res) => {
    try {
        const db = new DatabaseHandler();

        const {
            cust_id,
            cust_dept_id,
            cust_user_id,
            cust_password,
            name,
            email,
            login_type,
            mobile,
            active,
        } = req.body;

        // Validation
        if (!cust_id || !cust_dept_id || !cust_user_id || !cust_password || !name) {
            throw new ApiError(400, "Required fields: cust_id, cust_dept_id, cust_user_id, cust_password, name");
        }

        // Check duplicate user ID
        const dupCheck = await db.executeQuery(
            `SELECT CUST_USER_ID FROM cust_login WHERE CUST_USER_ID = :cust_user_id`,
            { cust_user_id },
            "siri_db"
        );
        if ((dupCheck.rows || []).length > 0) {
            throw new ApiError(409, "User ID already exists");
        }

        //  Check if department already has a Section Head
        if (login_type === "SH") {
            const shCheck = await db.executeQuery(
                `SELECT CUST_USER_ID FROM cust_login 
                 WHERE CUST_DEPT_ID = :cust_dept_id 
                 AND LOGIN_TYPE = 'SH'`,
                { cust_dept_id },
                "siri_db"
            );
            if ((shCheck.rows || []).length > 0) {
                throw new ApiError(
                    409,
                    "This department already has a Section Head. Only one Section Head is allowed per department."
                );
            }
        }

        const insertQuery = `
            INSERT INTO cust_login (
                CUST_ID,
                CUST_DEPT_ID,
                CUST_USER_ID,
                CUST_PASSWORD,
                NAME,
                EMAIL,
                LOGIN_TYPE,
                MOBILE,
                ACTIVE
            ) VALUES (
                :cust_id,
                :cust_dept_id,
                :cust_user_id,
                :cust_password,
                :name,
                :email,
                :login_type,
                :mobile,
                :active
            )
        `;

        const binds = {
            cust_id,
            cust_dept_id,
            cust_user_id,
            cust_password,
            name,
            email: email ?? null,
            login_type: login_type ?? null,
            mobile: mobile ?? null,
            active: active ?? 1,
        };

        await db.executeQuery(insertQuery, binds, "siri_db");

        res.status(201).json(
            new ApiResponse(201, null, "Customer login created successfully")
        );
    } catch (err) {
        console.error("createCustLogin Error:", err);
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Failed to create customer login", err.message);
    }
});

const updateCustLogin = asyncHandler(async (req, res) => {
    try {
        const db = new DatabaseHandler();

        const {
            cust_login_id,
            cust_id,
            cust_dept_id,
            cust_user_id,
            cust_password,
            name,
            email,
            login_type,
            mobile,
            active,
        } = req.body;

        // Validation
        if (!cust_login_id) {
            throw new ApiError(400, "cust_login_id is required for update");
        }

        if (!cust_id || !cust_dept_id || !cust_user_id || !cust_password || !name) {
            throw new ApiError(400, "Required fields: cust_id, cust_dept_id, cust_user_id, cust_password, name");
        }

        // Check if record exists
        const existCheck = await db.executeQuery(
            `SELECT CUST_LOGIN_ID FROM cust_login WHERE CUST_LOGIN_ID = :cust_login_id`,
            { cust_login_id },
            "siri_db"
        );
        if ((existCheck.rows || []).length === 0) {
            throw new ApiError(404, "User not found");
        }

        // Check duplicate user ID (exclude current record)
        const dupCheck = await db.executeQuery(
            `SELECT CUST_USER_ID FROM cust_login 
             WHERE CUST_USER_ID = :cust_user_id 
             AND CUST_LOGIN_ID != :cust_login_id`,
            { cust_user_id, cust_login_id },
            "siri_db"
        );
        if ((dupCheck.rows || []).length > 0) {
            throw new ApiError(409, "User ID already exists");
        }

        // Check if department already has a Section Head (exclude current record)
        if (login_type === "SH") {
            const shCheck = await db.executeQuery(
                `SELECT CUST_USER_ID FROM cust_login 
                 WHERE CUST_DEPT_ID = :cust_dept_id 
                 AND LOGIN_TYPE = 'SH'
                 AND CUST_LOGIN_ID != :cust_login_id`,
                { cust_dept_id, cust_login_id },
                "siri_db"
            );
            if ((shCheck.rows || []).length > 0) {
                throw new ApiError(
                    409,
                    "This department already has a Section Head. Only one Section Head is allowed per department."
                );
            }
        }

        const updateQuery = `
            UPDATE cust_login SET
                CUST_ID       = :cust_id,
                CUST_DEPT_ID  = :cust_dept_id,
                CUST_USER_ID  = :cust_user_id,
                CUST_PASSWORD = :cust_password,
                NAME          = :name,
                EMAIL         = :email,
                LOGIN_TYPE    = :login_type,
                MOBILE        = :mobile,
                ACTIVE        = :active
            WHERE CUST_LOGIN_ID = :cust_login_id
        `;

        const binds = {
            cust_login_id,
            cust_id,
            cust_dept_id,
            cust_user_id,
            cust_password,
            name,
            email: email ?? null,
            login_type: login_type ?? null,
            mobile: mobile ?? null,
            active: active ?? "Y",
        };

        await db.executeQuery(updateQuery, binds, "siri_db");

        res.status(200).json(
            new ApiResponse(200, null, "Customer login updated successfully")
        );
    } catch (err) {
        console.error("updateCustLogin Error:", err);
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Failed to update customer login", err.message);
    }
});

module.exports = {
    getCustLogins,
    getCustDepartments,
    createCustLogin,
    updateCustLogin,
};