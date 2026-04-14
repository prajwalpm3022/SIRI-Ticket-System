const {
    DatabaseHandler,
    ApiError,
    ApiResponse,
    asyncHandler,
} = require("../utils");
const OracleDB = require("oracledb");

const getDragandDropUsers = asyncHandler(async (req, res) => {
    const db = new DatabaseHandler();

    try {
        const query = `
            SELECT USER_ID ,LOGIN_ID  from user_mast order by LOGIN_ID
        `;

        const result = await db.executeQuery(query, undefined, "siri_db");
        const rows = result.rows || [];

        res
            .status(200)
            .json(new ApiResponse(200, rows, "Users list fetched successfully"));
    } catch (err) {
        throw new ApiError(500, "Error fetching Users list", err.message);
    }
});

const getDragandDropUserActions = asyncHandler(async (req, res) => {
    const db = new DatabaseHandler();

    try {
        const query = `
           select ACTION ,ACTION_NAME  from allowed_actions
            order by ACTION_NAME
        `;

        const result = await db.executeQuery(query, undefined, "siri_db");
        const rows = result.rows || [];

        res
            .status(200)
            .json(new ApiResponse(200, rows, "Actions fetched successfully"));
    } catch (err) {
        throw new ApiError(500, "Error fetching Actions", err.message);
    }
});

const postDragandDropUsers = asyncHandler(async (req, res) => {
    const db = new DatabaseHandler();
    const normalize = (v) =>
        v === undefined || v === null || v === "null" || v === ""
            ? null
            : Number(v);

    try {
        // ✅ Always convert body to array
        const rows = Array.isArray(req.body) ? req.body : [req.body];

        for (const row of rows) {
            const MODULE_MENU_ID = normalize(row.MODULE_MENU_ID);
            const MAIN_MENU_ID = normalize(row.MAIN_MENU_ID);
            const MENU_ITEM_ID = normalize(row.MENU_ITEM_ID);
            const SUB_MENU_ITEM_ID = normalize(row.SUB_MENU_ITEM_ID);
            const ACTION_ID = normalize(row.ACTION_ID);
            const USER_ID = normalize(row.USER_ID);

            // ------------------------------
            // DELETE FIRST (NULL SAFE)
            // ------------------------------
            const deleteQuery = `
        DELETE FROM user_menu_access
        WHERE USER_ID = :USER_ID
          AND ${MODULE_MENU_ID === null
                    ? "MODULE_MENU_ID IS NULL"
                    : "MODULE_MENU_ID = :MODULE_MENU_ID"
                }
          AND ${MAIN_MENU_ID === null
                    ? "MAIN_MENU_ID IS NULL"
                    : "MAIN_MENU_ID = :MAIN_MENU_ID"
                }
          AND ${MENU_ITEM_ID === null
                    ? "MENU_ITEM_ID IS NULL"
                    : "MENU_ITEM_ID = :MENU_ITEM_ID"
                }
          AND ${SUB_MENU_ITEM_ID === null
                    ? "SUB_MENU_ITEM_ID IS NULL"
                    : "SUB_MENU_ITEM_ID = :SUB_MENU_ITEM_ID"
                }
      `;

            const deleteParams = {
                USER_ID,
                ...(MODULE_MENU_ID !== null && { MODULE_MENU_ID }),
                ...(MAIN_MENU_ID !== null && { MAIN_MENU_ID }),
                ...(MENU_ITEM_ID !== null && { MENU_ITEM_ID }),
                ...(SUB_MENU_ITEM_ID !== null && { SUB_MENU_ITEM_ID }),
            };

            await db.executeQuery(deleteQuery, deleteParams, "siri_db");

            // ------------------------------
            // INSERT NEW
            // ------------------------------
            const insertQuery = `
        INSERT INTO user_menu_access (
          MODULE_MENU_ID, MAIN_MENU_ID, MENU_ITEM_ID, SUB_MENU_ITEM_ID,
          ACTION_ID, USER_ID
        ) VALUES (
          :MODULE_MENU_ID, :MAIN_MENU_ID, :MENU_ITEM_ID, :SUB_MENU_ITEM_ID,
          :ACTION_ID, :USER_ID
        )
      `;

            await db.executeQuery(insertQuery, {
                MODULE_MENU_ID, MAIN_MENU_ID,
                MENU_ITEM_ID, SUB_MENU_ITEM_ID,
                ACTION_ID, USER_ID
            }, "siri_db");
        }

        res
            .status(200)
            .json(new ApiResponse(200, {}, "Permissions updated successfully"));
    } catch (err) {
        throw new ApiError(500, "Upsert error", err.message);
    }
});

const deleteDragandDropUsers = asyncHandler(async (req, res) => {
    const db = new DatabaseHandler();

    const {
        level,
        MODULE_MENU_ID,
        MAIN_MENU_ID,
        MENU_ITEM_ID,
        SUB_MENU_ITEM_ID,
        USER_ID,
    } = req.body;

    if (!level || !USER_ID) {
        throw new ApiError(400, "Missing required fields: level or USER_ID");
    }

    try {
        let query = `
      DELETE FROM user_menu_access
      WHERE USER_ID = :USER_ID
    `;

        const params = { USER_ID };

        switch (level) {
            case "module":
                query += ` AND MODULE_MENU_ID = :MODULE_MENU_ID`;
                params.MODULE_MENU_ID = MODULE_MENU_ID;
                break;

            case "main":
                query += `
          AND MODULE_MENU_ID = :MODULE_MENU_ID
          AND MAIN_MENU_ID = :MAIN_MENU_ID
        `;
                params.MODULE_MENU_ID = MODULE_MENU_ID;
                params.MAIN_MENU_ID = MAIN_MENU_ID;
                break;

            case "item":
                query += `
          AND MODULE_MENU_ID = :MODULE_MENU_ID
          AND MAIN_MENU_ID = :MAIN_MENU_ID
          AND MENU_ITEM_ID = :MENU_ITEM_ID
        `;
                params.MODULE_MENU_ID = MODULE_MENU_ID;
                params.MAIN_MENU_ID = MAIN_MENU_ID;
                params.MENU_ITEM_ID = MENU_ITEM_ID;
                break;

            case "sub":
                query += `
          AND MODULE_MENU_ID = :MODULE_MENU_ID
          AND MAIN_MENU_ID = :MAIN_MENU_ID
          AND MENU_ITEM_ID = :MENU_ITEM_ID
          AND SUB_MENU_ITEM_ID = :SUB_MENU_ITEM_ID
        `;
                params.MODULE_MENU_ID = MODULE_MENU_ID;
                params.MAIN_MENU_ID = MAIN_MENU_ID;
                params.MENU_ITEM_ID = MENU_ITEM_ID;
                params.SUB_MENU_ITEM_ID = SUB_MENU_ITEM_ID;
                break;

            default:
                throw new ApiError(400, "Invalid level provided");
        }

        const result = await db.executeQuery(query, params, "siri_db");

        res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    result,
                    `${level} permission(s) deleted successfully`
                )
            );
    } catch (err) {
        throw new ApiError(500, "Error deleting menu access", err.message);
    }
});

const getUsersbyGroupID = asyncHandler(async (req, res) => {
    const db = new DatabaseHandler();

    try {
        const { group_id } = req.params;

        const query = `
      SELECT USER_ID, LOGIN_ID FROM USER_MAST WHERE GROUP_ID = :GROUP_ID ORDER BY LOGIN_ID

    `;

    
        const result = await db.executeQuery(query, { group_id: Number(group_id) }, "siri_db");

        res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    result.rows || [],
                    "Users list fetched successfully"
                )
            );
    } catch (err) {
        throw new ApiError(500, "Error fetching Users list", err.message);
    }
});

module.exports = {
    getDragandDropUsers,
    postDragandDropUsers,
    getDragandDropUserActions,
    deleteDragandDropUsers,
    getUsersbyGroupID,
};
