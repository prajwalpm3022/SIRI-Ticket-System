const {
    asyncHandler,
    EmailService,
    ApiError,
    ApiResponse,
    DatabaseHandler } = require("../utils");
const OracleDB = require("oracledb");
const dbHandler = new DatabaseHandler();

const getGroupMaster = asyncHandler(async (req, res) => {
    const db = new DatabaseHandler();

    try {
        const query = `
           select GROUP_ID ,GROUP_NAME from user_group_master
            order by GROUP_NAME
        `;

        const result = await db.executeQuery(query, undefined, "siri_db");
        const rows = result.rows || [];

        res.status(200).json(new ApiResponse(200, rows, "Group list fetched successfully"));
    } catch (err) {
        throw new ApiError(500, "Error fetching group list", err.message);
    } 
});

const postGroupMaster = asyncHandler(async (req, res) => {
    const db = new DatabaseHandler();
    const { GROUP_NAME } = req.body;

    try {
        const query = `
      INSERT INTO user_group_master (GROUP_NAME)
      VALUES (:GROUP_NAME)
    `;
        const binds = { GROUP_NAME };

        const result = await db.executeQuery(query, { GROUP_NAME }, "siri_db");

        res.status(200).json(new ApiResponse(200, { rowsAffected: result.rowsAffected }, "Group Name added successfully")
        );
    } catch (err) {
        throw new ApiError(500, "Error inserting Group Name", err.message);
    } 
});

const deleteGroupMaster = asyncHandler(async (req, res) => {
    const db = new DatabaseHandler();
    const GROUP_ID = req.params.id;

    try {
        const query = `
      DELETE FROM user_group_master
      WHERE GROUP_ID = :GROUP_ID
    `;

        const result = await db.executeQuery(query, { GROUP_ID }, "siri_db");

        if (result.rowsAffected === 0) {
            return res.status(404).json(new ApiResponse(404, {}, "Group not found"));
        }

        res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { rowsAffected: result.rowsAffected },
                    "Group deleted successfully"
                )
            );
    } catch (error) {
        throw new ApiError(500, "Error deleting Group", error.message);
    } 
});

const updateGroupMaster = asyncHandler(async (req, res) => {
    const db = new DatabaseHandler();

    const GROUP_ID = req.params.id;
    const { GROUP_NAME } = req.body;

    try {
        const query = `
      UPDATE user_group_master
      SET GROUP_NAME = :GROUP_NAME
      WHERE GROUP_ID = :GROUP_ID
    `;

        const result = await db.executeQuery(query, { GROUP_NAME, GROUP_ID }, "siri_db");

        if (result.rowsAffected === 0) {
            return res
                .status(404)
                .json(new ApiResponse(404, {}, "Group Name not found"));
        }

        res.status(200)
            .json(
                new ApiResponse(
                    200,
                    { rowsAffected: result.rowsAffected },
                    "Group Name updated successfully"
                )
            );
    } catch (error) {
        throw new ApiError(500, "Error updating Group Name", error.message);
    } 
});

module.exports = {
    getGroupMaster,
    postGroupMaster,
    deleteGroupMaster,
    updateGroupMaster,
};
