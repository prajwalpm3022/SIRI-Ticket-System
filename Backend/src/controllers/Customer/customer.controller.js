const { asyncHandler, EmailService, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");
const create_customer = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const {
      customer_name,
      customer_alias,
      city,
      gst_no,
      pan_no,
    } = req.body;

    const query = `
      INSERT INTO CUSTOMER (
        CUSTOMER_NAME,
        CUSTOMER_ALIAS,
        CITY,
        GST_NO,
        PAN_NO
      )
      VALUES (
        :customer_name,
        :customer_alias,
        :city,
        :gst_no,
        :pan_no
      )
    `;

    await db.executeQuery(
      query,
      {
        customer_name,
        customer_alias,
        city,
        gst_no,
        pan_no,
      },
      "siri_db"
    );

    return res
      .status(201)
      .json(new ApiResponse(201, "Customer created successfully"));

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});


const update_customer = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { id: customer_id } = req.params;

    const {
      customer_name,
      customer_alias,
      city,
      gst_no,
      pan_no,
    } = req.body;

    const query = `
      UPDATE CUSTOMER
      SET
        CUSTOMER_NAME  = :customer_name,
        CUSTOMER_ALIAS = :customer_alias,
        CITY           = :city,
        GST_NO         = :gst_no,
        PAN_NO         = :pan_no
      WHERE CUSTOMER_ID = :customer_id
    `;

    const result = await db.executeQuery(
      query,
      {
        customer_id,
        customer_name,
        customer_alias,
        city,
        gst_no,
        pan_no,
      },
      "siri_db"
    );

    return res
      .status(200)
      .json(new ApiResponse(200, "Customer updated successfully"));

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const delete_customer = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
   const { id: customer_id } = req.params;

    const query = `
      DELETE FROM CUSTOMER
      WHERE CUSTOMER_ID = :customer_id
    `;

    await db.executeQuery(
      query,
      { customer_id },
      "siri_db"
    );

    return res
      .status(200)
      .json(new ApiResponse(200, "Customer deleted successfully"));

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_customers = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        CUSTOMER_ID   "customer_id",
        CUSTOMER_NAME "customer_name",
        CUSTOMER_ALIAS "customer_alias",
        CITY          "city",
        GST_NO        "gst_no",
        PAN_NO        "pan_no"
      FROM CUSTOMER
      ORDER BY CUSTOMER_ID DESC
    `;

    const result = await db.executeQuery(query, undefined, "siri_db");

    return res
      .status(200)
      .json(new ApiResponse(200, result.rows));

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
module.exports = {create_customer,get_customers,delete_customer,update_customer}