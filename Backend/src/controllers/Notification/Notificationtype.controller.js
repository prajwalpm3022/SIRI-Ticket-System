const { asyncHandler, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");


const get_notification_types = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        NOTIFICATION_TYPE_ID   "notification_type_id",
        NOTIFICATION_TYPE      "notification_type"
      FROM NOTIFICATION_TYPE
      ORDER BY NOTIFICATION_TYPE_ID DESC
    `;

    const result = await db.executeQuery(query, undefined, "siri_db");

    return res
      .status(200)
      .json(new ApiResponse(200, result.rows));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ Status: 0, message: error.message });
  }
});


const get_notification_type_by_id = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { id: notification_type_id } = req.params;

    const query = `
      SELECT
        NOTIFICATION_TYPE_ID   "notification_type_id",
        NOTIFICATION_TYPE      "notification_type"
      FROM NOTIFICATION_TYPE
      WHERE NOTIFICATION_TYPE_ID = :notification_type_id
    `;

    const result = await db.executeQuery(
      query,
      { notification_type_id },
      "siri_db"
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ Status: 0, message: "Notification type not found" });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, result.rows[0]));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ Status: 0, message: error.message });
  }
});


const create_notification_type = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { notification_type } = req.body;

    const query = `
      INSERT INTO NOTIFICATION_TYPE (
        NOTIFICATION_TYPE
      )
      VALUES (
        :notification_type
      )
    `;

    await db.executeQuery(
      query,
      { notification_type },
      "siri_db"
    );

    return res
      .status(201)
      .json(new ApiResponse(201, "Notification type created successfully"));

  } catch (error) {
    console.error(error);

    if (error?.errorNum === 1) {
      let message = "Duplicate record found!";
      if (error.message.includes("UK_NOTIFICATION_TYPE")) {
        message = "Notification Type already exists!";
      }
      return res.status(400).json({ Status: 0, message });
    }

    if (error?.errorNum === 1400) {
      return res.status(400).json({ Status: 0, message: error.message });
    }

    if (error?.errorNum === 12899) {
      return res.status(400).json({ Status: 0, message: error.message });
    }

    return res.status(500).json({ Status: 0, message: error.message });
  }
});


const update_notification_type = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { id: notification_type_id } = req.params;
    const { notification_type } = req.body;

    const query = `
      UPDATE NOTIFICATION_TYPE
      SET
        NOTIFICATION_TYPE = :notification_type
      WHERE NOTIFICATION_TYPE_ID = :notification_type_id
    `;

    const result = await db.executeQuery(
      query,
      {
        notification_type_id,
        notification_type,
      },
      "siri_db"
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ Status: 0, message: "Notification type not found" });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "Notification type updated successfully"));

  } catch (error) {
    console.error(error);

    if (error?.errorNum === 1) {
      let message = "Duplicate record found!";
      if (error.message.includes("UK_NOTIFICATION_TYPE")) {
        message = "Notification Type already exists!";
      }
      return res.status(400).json({ Status: 0, message });
    }

    if (error?.errorNum === 1400) {
      return res.status(400).json({ Status: 0, message: error.message });
    }

    if (error?.errorNum === 12899) {
      return res.status(400).json({ Status: 0, message: error.message });
    }

    return res.status(500).json({ Status: 0, message: error.message });
  }
});


const delete_notification_type = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { id: notification_type_id } = req.params;

    const query = `
      DELETE FROM NOTIFICATION_TYPE
      WHERE NOTIFICATION_TYPE_ID = :notification_type_id
    `;

    const result = await db.executeQuery(
      query,
      { notification_type_id },
      "siri_db"
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ Status: 0, message: "Notification type not found" });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "Notification type deleted successfully"));

  } catch (error) {
    console.error(error);

    if (error?.errorNum === 2292) {
      return res.status(400).json({ Status: 0, message: error.message });
    }

    return res.status(500).json({ Status: 0, message: error.message });
  }
});

module.exports = {
  get_notification_types,
  get_notification_type_by_id,
  create_notification_type,
  update_notification_type,
  delete_notification_type,
};
module.exports={
  get_notification_types,
  get_notification_type_by_id,
  create_notification_type,
  update_notification_type,
  delete_notification_type
}