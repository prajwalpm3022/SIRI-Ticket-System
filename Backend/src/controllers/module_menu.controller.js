const { DatabaseHandler, ApiError, ApiResponse, asyncHandler } = require("../utils");
const OracleDB = require('oracledb');


const getmodules = asyncHandler(async (req, res) => {

    try {
        const db = new DatabaseHandler()
        const query = `
      SELECT
        module_menu_id AS module_menu_id,
        module_name AS module_name,
        icon AS icon
      FROM module_menu
    `;

        const result = await db.executeQuery(query, undefined, 'siri_db');
        const rows = result.rows || [];

        res.status(200).json(
            new ApiResponse(200, rows, "Modules fetched successfully")
        );
    } catch (err) {
        throw new ApiError(500, "Error fetching modules", err.message);
    }
});

const insertModule = asyncHandler(async (req, res) => {


    try {
        const db = new DatabaseHandler()
        const {
            module_name,
            icon

        } = req.body;

        const data = {
            MODULE_NAME: module_name ?? null,
            ICON: icon ?? null,

        };

        const query = `
            INSERT INTO MODULE_MENU
                (MODULE_NAME , ICON )
            VALUES
                (:MODULE_NAME, :ICON)
        `;

        await db.executeQuery(query, data, 'siri_db');

        res.status(200).json(
            new ApiResponse(200, { module_name }, "Module inserted successfully")
        );

    } catch (err) {
        throw new ApiError(500, "Error inserting module", err.message);
    }
});

const updateModule = asyncHandler(async (req, res) => {


    try {
        const db = new DatabaseHandler()
        const { id } = req.params;
        const {
            module_name,
            icon
        } = req.body;

        const data = {
            MODULE_MENU_ID: id,
            MODULE_NAME: module_name ?? null,
            ICON: icon ?? null
        };

        const query = `
            UPDATE MODULE_MENU
            SET 
                MODULE_NAME  = :MODULE_NAME,
                ICON = :ICON
            WHERE 
                MODULE_MENU_ID = :MODULE_MENU_ID
        `;

        const result = await db.executeQuery(query, data, 'siri_db');

        if (result.rowsAffected === 0) {
            throw new ApiError(404, `Module ID ${id} not found`);
        }

        res.status(200).json(
            new ApiResponse(200, { id, module_name }, "Module updated successfully")
        );

    } catch (err) {
        throw new ApiError(500, "Error updating module", err.message);
    }
});

const deleteModule = asyncHandler(async (req, res) => {

    const { id } = req.params;

    try {
        const db = new DatabaseHandler()
        const query = `
            DELETE FROM MODULE_MENU
            WHERE MODULE_MENU_ID = :id
        `;

        const result = await db.executeQuery(query, { id }, 'siri_db');

        if (result.rowsAffected === 0) {
            throw new ApiError(404, "Module not found");
        }

        res.status(200).json(
            new ApiResponse(200, { id }, "Module deleted successfully")
        );

    } catch (err) {
        throw new ApiError(500, "Error deleting module", err.message);
    }
});


module.exports = {
    getmodules,
    insertModule,
    updateModule,
    deleteModule
};
