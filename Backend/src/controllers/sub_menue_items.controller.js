const {
  DatabaseHandler,
  ApiError,
  ApiResponse,
  asyncHandler,
} = require("../utils");
const OracleDB = require("oracledb");

const getsubmenudata = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const query = `
      SELECT
    sub_menue_item_id "sub_menue_item_id",
    sub_menue_name "sub_menue_name",
    page_name_navigation "page_name_navigation",
    icon "icon",
    menue_items_id "menue_items_id",
    position "position"
    FROM
    sub_menue_items
      ORDER BY sub_menue_name
    `;

    const result = await db.executeQuery(query, undefined, "siri_db");

    const rows = result.rows || [];

    res
      .status(200)
      .json(new ApiResponse(200, rows, "Module Menu fetched successfully"));
  } catch (err) {
    console.error("Error fetching Module Menu:", err);
    throw new ApiError(500, "Error fetching Module Menu", err.message);
  }
});

const getdatagrid = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const query = `
      select sub_menue_item_id "sub_menue_item_id",
      sub_menue_name "sub_menue_name",
      a.page_name_navigation "page_name_navigation",
      a.icon "icon",menue_item_name "menue_item_name",
      a.position "position",b.menue_item_id "menue_item_id"
      from sub_menue_items  a join menue_items b on a.menue_items_id=b.menue_item_id
      
    `;

    const result = await db.executeQuery(query, undefined, "siri_db");

    const rows = result.rows || [];

    res
      .status(200)
      .json(new ApiResponse(200, rows, "Module Menu fetched successfully"));
  } catch (err) {
    console.error("Error fetching Module Menu:", err);
    throw new ApiError(500, "Error fetching Module Menu", err.message);
  }
});

const getmenuiddd = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT Menue_item_name,menue_item_id
      FROM menue_items 
      
    `;

    const result = await db.executeQuery(query, undefined, "siri_db");

    const rows = result.rows || [];

    res
      .status(200)
      .json(new ApiResponse(200, rows, "Module Menu fetched successfully"));
  } catch (err) {
    console.error("Error fetching Module Menu:", err);
    throw new ApiError(500, "Error fetching Module Menu", err.message);
  }
});

const postSubMenuItems = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const {
      SUB_MENUE_NAME,
      PAGE_NAME_NAVIGATION,
      ICON,
      MENUE_ITEMS_ID,
      POSITION,
    } = req.body;

    const checkQuery = `
      SELECT COUNT(*) AS CNT
      FROM SUB_MENUE_ITEMS
      WHERE MENUE_ITEMS_ID = :MENUE_ITEMS_ID
      AND POSITION = :POSITION
    `;

    const checkResult = await db.executeQuery(
      checkQuery,
      { MENUE_ITEMS_ID, POSITION },
      "siri_db"
    );

    const count =
      checkResult.rows?.[0]?.CNT ??
      checkResult.rows?.[0]?.[0] ??
      0;

    if (Number(count) > 0) {
      throw new ApiError(400, "Position already exists for this Menu");
    }

    const insertQuery = `
      INSERT INTO SUB_MENUE_ITEMS (
        SUB_MENUE_NAME,
        PAGE_NAME_NAVIGATION,
        ICON,
        MENUE_ITEMS_ID,
        POSITION
      ) VALUES (
        :SUB_MENUE_NAME,
        :PAGE_NAME_NAVIGATION,
        :ICON,
        :MENUE_ITEMS_ID,
        :POSITION
      )
    `;

    const result = await db.executeQuery(
      insertQuery,
      {
        SUB_MENUE_NAME,
        PAGE_NAME_NAVIGATION,
        ICON,
        MENUE_ITEMS_ID,
        POSITION,
      },
      "siri_db"
    );

    res.status(201).json(
      new ApiResponse(
        201,
        { rowsAffected: result.rowsAffected },
        "Sub Menu inserted successfully"
      )
    );
  } catch (err) {
    console.error("Error inserting Sub Menu:", err);

    if (err.message?.includes("ORA-00001")) {
      throw new ApiError(400, "Position already exists for this Menu");
    }

    throw new ApiError(
      err.statusCode || 500,
      err.message || "Error inserting Sub Menu"
    );
  }
});

const updateSubMenuItems = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const ID = req.params.id;
    const {
      SUB_MENUE_NAME,
      PAGE_NAME_NAVIGATION,
      ICON,
      MENUE_ITEMS_ID,
      POSITION,
    } = req.body;

    if (!ID) {
      return res.status(400).json({ message: "ID is required" });
    }

    const checkQuery = `
      SELECT COUNT(*) AS COUNT
      FROM SUB_MENUE_ITEMS
      WHERE SUB_MENUE_NAME = :SUB_MENUE_NAME
      AND MENUE_ITEMS_ID = :MENUE_ITEMS_ID
      AND POSITION = :POSITION
      AND SUB_MENUE_ITEM_ID != :ID
    `;

    const checkResult = await db.executeQuery(
      checkQuery,
      {
        SUB_MENUE_NAME,
        MENUE_ITEMS_ID,
        POSITION,
        ID,
      },
      "siri_db"
    );

    if (checkResult.rows[0].COUNT > 0) {
      return res.status(400).json({
        message: "Submenu already exists with same Menu & Position",
      });
    }

    const updateQuery = `
      UPDATE SUB_MENUE_ITEMS
      SET SUB_MENUE_NAME = :SUB_MENUE_NAME,
          PAGE_NAME_NAVIGATION = :PAGE_NAME_NAVIGATION,
          ICON = :ICON,
          MENUE_ITEMS_ID = :MENUE_ITEMS_ID,
          POSITION = :POSITION
      WHERE SUB_MENUE_ITEM_ID = :ID
    `;

    const result = await db.executeQuery(updateQuery, {
      ID,
      SUB_MENUE_NAME,
      PAGE_NAME_NAVIGATION,
      ICON,
      MENUE_ITEMS_ID,
      POSITION,
    }, "siri_db");

    res.status(200).json({
      status: "success",
      rowsAffected: result.rowsAffected,
      message: "Sub Menu updated successfully",
    });
  } catch (err) {
    console.error("Backend Error =>", err);
    return res.status(500).json({ message: err.message });
  }
});

const deleteSubMenuItems = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const ID = Number(req.params.id);

    if (isNaN(ID)) {
      return res.status(400).json({
        status: false,
        statusCode: 400,
        message: "Invalid ID",
      });
    }

    const deleteQuery = `
      DELETE FROM SUB_MENUE_ITEMS
      WHERE SUB_MENUE_ITEM_ID = :ID
    `;

    const result = await db.executeQuery(deleteQuery, { ID }, "siri_db");

    if (result.rowsAffected === 0) {
      return res.status(404).json({
        status: false,
        statusCode: 404,
        message: "Sub Menu not found",
      });
    }

    return res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Sub Menu deleted successfully",
      rowsAffected: result.rowsAffected,
    });

  } catch (err) {
    console.error("Backend Error =>", err);
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: err.message,
    });
  }
});

module.exports = {
  getsubmenudata,
  getmenuiddd,
  postSubMenuItems,
  updateSubMenuItems,
  deleteSubMenuItems,
  getdatagrid,
};
