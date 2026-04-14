const {
    asyncHandler,
    EmailService,
    ApiError,
    ApiResponse,
    DatabaseHandler } = require("../../../utils");
const OracleDB = require("oracledb");

const getDepartments = asyncHandler(async (req, res) => {
    try {
        const db = new DatabaseHandler();

        const query = `
            SELECT CUST_DEPT_ID ,CUST_DEPT_NAME, SHORT_NAME
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

const createDepartment = asyncHandler(async (req, res) => {
    try {
        const db = new DatabaseHandler();
        const { cust_dept_name, short_name } = req.body;

        if (!cust_dept_name || !short_name) {
            throw new ApiError(400, "Department name and short name are required");
        }

        // Check duplicate dept name
        const dupNameCheck = await db.executeQuery(
            `SELECT CUST_DEPT_ID FROM CUST_DEPT WHERE UPPER(CUST_DEPT_NAME) = UPPER(:cust_dept_name)`,
            { cust_dept_name },
            "siri_db"
        );
        if ((dupNameCheck.rows || []).length > 0) {
            throw new ApiError(409, "Department name already exists");
        }

        // Check duplicate short name
        const dupShortCheck = await db.executeQuery(
            `SELECT CUST_DEPT_ID FROM CUST_DEPT WHERE UPPER(SHORT_NAME) = UPPER(:short_name)`,
            { short_name },
            "siri_db"
        );
        if ((dupShortCheck.rows || []).length > 0) {
            throw new ApiError(409, "Short name already exists");
        }

        await db.executeQuery(
            `INSERT INTO CUST_DEPT (CUST_DEPT_NAME, SHORT_NAME) VALUES (:cust_dept_name, :short_name)`,
            {
                cust_dept_name: cust_dept_name.trim().toUpperCase(),
                short_name: short_name.trim().toUpperCase(),
            },
            "siri_db"
        );

        res.status(201).json(
            new ApiResponse(201, null, "Department created successfully")
        );
    } catch (err) {
        console.error("createDepartment Error:", err);
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Failed to create department", err.message);
    }
});


const updateDepartment = asyncHandler(async (req, res) => {
    try {
        const db = new DatabaseHandler();
        const { cust_dept_id, cust_dept_name, short_name } = req.body;

        if (!cust_dept_id) {
            throw new ApiError(400, "cust_dept_id is required for update");
        }
        if (!cust_dept_name || !short_name) {
            throw new ApiError(400, "Department name and short name are required");
        }

        // Check record exists
        const existCheck = await db.executeQuery(
            `SELECT CUST_DEPT_ID FROM CUST_DEPT WHERE CUST_DEPT_ID = :cust_dept_id`,
            { cust_dept_id },
            "siri_db"
        );
        if ((existCheck.rows || []).length === 0) {
            throw new ApiError(404, "Department not found");
        }

        // Check duplicate dept name (exclude current)
        const dupNameCheck = await db.executeQuery(
            `SELECT CUST_DEPT_ID FROM CUST_DEPT 
             WHERE UPPER(CUST_DEPT_NAME) = UPPER(:cust_dept_name) 
             AND CUST_DEPT_ID != :cust_dept_id`,
            { cust_dept_name, cust_dept_id },
            "siri_db"
        );
        if ((dupNameCheck.rows || []).length > 0) {
            throw new ApiError(409, "Department name already exists");
        }

        // Check duplicate short name (exclude current)
        const dupShortCheck = await db.executeQuery(
            `SELECT CUST_DEPT_ID FROM CUST_DEPT 
             WHERE UPPER(SHORT_NAME) = UPPER(:short_name) 
             AND CUST_DEPT_ID != :cust_dept_id`,
            { short_name, cust_dept_id },
            "siri_db"
        );
        if ((dupShortCheck.rows || []).length > 0) {
            throw new ApiError(409, "Short name already exists");
        }

        await db.executeQuery(
            `UPDATE CUST_DEPT SET
                CUST_DEPT_NAME = :cust_dept_name,
                SHORT_NAME     = :short_name
             WHERE CUST_DEPT_ID = :cust_dept_id`,
            {
                cust_dept_id,
                cust_dept_name: cust_dept_name.trim().toUpperCase(),
                short_name: short_name.trim().toUpperCase(),
            },
            "siri_db"
        );

        res.status(200).json(
            new ApiResponse(200, null, "Department updated successfully")
        );
    } catch (err) {
        console.error("updateDepartment Error:", err);
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Failed to update department", err.message);
    }
});


const deleteDepartment = asyncHandler(async (req, res) => {
    try {
        const db = new DatabaseHandler();
        const { cust_dept_id } = req.params;

        if (!cust_dept_id) {
            throw new ApiError(400, "cust_dept_id is required");
        }

        // Check record exists
        const existCheck = await db.executeQuery(
            `SELECT CUST_DEPT_ID FROM CUST_DEPT WHERE CUST_DEPT_ID = :cust_dept_id`,
            { cust_dept_id },
            "siri_db"
        );
        if ((existCheck.rows || []).length === 0) {
            throw new ApiError(404, "Department not found");
        }

        // Check if dept is in use in cust_login
        const inUseCheck = await db.executeQuery(
            `SELECT CUST_LOGIN_ID FROM CUST_LOGIN WHERE CUST_DEPT_ID = :cust_dept_id`,
            { cust_dept_id },
            "siri_db"
        );
        if ((inUseCheck.rows || []).length > 0) {
            throw new ApiError(
                409,
                "Cannot delete. This department is assigned to one or more users."
            );
        }

        await db.executeQuery(
            `DELETE FROM CUST_DEPT WHERE CUST_DEPT_ID = :cust_dept_id`,
            { cust_dept_id },
            "siri_db"
        );

        res.status(200).json(
            new ApiResponse(200, null, "Department deleted successfully")
        );
    } catch (err) {
        console.error("deleteDepartment Error:", err);
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Failed to delete department", err.message);
    }
});

module.exports = {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
};