const { asyncHandler, EmailService, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");

const insert_module = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { MODULE_NAME} = req.body;

    const query = `
      INSERT INTO MODULE
        (MODULE_NAME)
      VALUES
        (:MODULE_NAME)
    `;

    const data = {
      MODULE_NAME:MODULE_NAME,
    };

    await db.executeQuery(query, data, 'siri_db');

    res
      .status(200)
      .json(new ApiResponse(200, "module inserted successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "insert failed",
      error
    );
  }
});
const get_modules = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        MODULE_ID,
        MODULE_NAME as "module_name"
      FROM MODULE
      ORDER BY MODULE_ID DESC
    `;

    const result = await db.executeQuery(query, {}, 'siri_db');

    return res
          .status(200)
          .json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const update_module = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { id } = req.params;
    const {MODULE_NAME } = req.body;

    if (!MODULE_NAME) {
      throw new ApiError(400, "Module title is required");
    }

    const query = `
      UPDATE MODULE
      SET MODULE_NAME = :MODULE_NAME
      WHERE MODULE_ID = :MODULE_ID
    `;

    const data = {
      MODULE_NAME: MODULE_NAME,
      MODULE_ID: id,
    };

    const result = await db.executeQuery(query, data, 'siri_db');

    if (result.rowsAffected === 0) {
      throw new ApiError(404, "Module not found");
    }

    res.status(200).json(
      new ApiResponse(200, "Module updated successfully")
    );
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Update failed",
      error
    );
  }
});
const get_customers_by_module = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "Module ID is required");
    }

    const query = `
      SELECT DISTINCT
        C.CUSTOMER_ID,
        C.CUSTOMER_NAME,
        C.EMAIL
      FROM CUSTOMER C
      JOIN PROJECT P
        ON P.CUSTOMER_ID = C.CUSTOMER_ID
      WHERE P.MODULE_ID = :MODULE_ID
    `;

    const data = { MODULE_ID: id };

    const result = await db.executeQuery(query, data, "siri_db");

    res.status(200).json(
      new ApiResponse(
        200,
        "Customers fetched successfully",
        result.rows || []
      )
    );

  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to fetch customers",
      error
    );
  }
});

module.exports = {
   insert_module,
   update_module,
   get_modules,
   get_customers_by_module 
}