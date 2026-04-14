const { asyncHandler, ApiError, ApiResponse, DatabaseHandler } = require("../utils");

const getMainMenusSelectModuleDD = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const query = `
      select module_menu_id "module_menu_id",
      module_name "module_name"
      from module_menu
    `;

    const result = await db.executeQuery(query, undefined, 'siri_db');

    const rows = result.rows || [];

    res
      .status(200)
      .json(new ApiResponse(200, rows, "Module Menu fetched successfully"));
  } catch (err) {
    console.error("Error fetching Module Menu:", err);
    throw new ApiError(500, "Error fetching Module Menu", err.message);
  }
});

const getAllMainMenus = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const query = `
      select main_menu_id "main_menu_id",
      main_menu_name "main_menu_name",
      a.icon "icon",
      a.module_menu_id "module_menu_id",
      a.page_name_navigation "page_name_navigation",
      position "position",
      b.module_name from main_menu a, module_menu b 
      where a.module_menu_id= b.module_menu_id order by position asc
    `;

    const result = await db.executeQuery(query, undefined, 'siri_db');

    const rows = result.rows || [];

    res
      .status(200)
      .json(new ApiResponse(200, rows, "Main Menu fetched successfully"));
  } catch (err) {
    console.error("Error fetching Main Menu:", err);
    throw new ApiError(500, "Error fetching Main Menu", err.message);
  }
});

const postMainMenus = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { main_menu_name, icon, module_menu_id, page_name_navigation, position } = req.body;

    // 🔍 Step 1: Check if POSITION already exists
    const checkQuery = `
      SELECT COUNT(*) AS count
      FROM main_menu
      WHERE position = :position
    `;

    const checkResult = await db.executeQuery(checkQuery, {
      position,
    }, 'siri_db');

    if (checkResult.rows[0].COUNT > 0) {
      throw new ApiError(400, "Position already exists");
    }

    // 🟢 Step 2: Insert if unique
    const insertQuery = `
      INSERT INTO main_menu (
        main_menu_name ,
        icon ,
        module_menu_id ,
        page_name_navigation ,
        position 
      ) VALUES (
        :main_menu_name,
        :icon,
        :module_menu_id,
        :page_name_navigation,
        :position
      )
    `;

    const result = await db.executeQuery(insertQuery, {
      main_menu_name,
      icon,
      module_menu_id,
      page_name_navigation,
      position,
    },

      'siri_db');

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { rowsAffected: result.rowsAffected },
          "Main Menu inserted successfully"
        )
      );
  } catch (err) {
    console.error("Error inserting Main Menu:", err);
    throw new ApiError(
      err.statusCode || 500,
      err.message || "Error inserting Main Menu",
      err.details || err.message
    );
  }
});

const updateMainMenus = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { main_menu_id } = req.params;
    const { main_menu_name, icon, module_menu_id, page_name_navigation, position } = req.body;

    const query = `
      UPDATE main_menu
      SET 
        main_menu_name = :main_menu_name,
        icon = :icon,
        module_menu_id = :module_menu_id,
        page_name_navigation=:page_name_navigation,
        position = :position
      WHERE main_menu_id = :main_menu_id
    `;

    const result = await db.executeQuery(query, {
      main_menu_id,
      main_menu_name,
      icon,
      module_menu_id,
      page_name_navigation,
      position,
    }, 'siri_db');

    res.status(200).json({
      status: 200,
      message: "Main Menu updated successfully",
      rowsAffected: result.rowsAffected,
    });
  } catch (err) {
    console.error("Error updating Main Menu:", err);
    throw new ApiError(500, "Error updating Main Menu", err.message);
  }
});

const deleteMainMenus = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { main_menu_id } = req.params;

    const query = `
      DELETE FROM main_menu WHERE main_menu_id = :main_menu_id
    `;

    const result = await db.executeQuery(query, {
      main_menu_id,
    }, 'siri_db');

    res.status(200).json({
      status: 200,
      message: "Main Menu Deleted successfully",
      rowsAffected: result.rowsAffected,
    });
  } catch (err) {
    console.error("Error Deleting Main Menu:", err);
    throw new ApiError(500, "Error Deleting Main Menu", err.message);
  }
});

module.exports = {
  getMainMenusSelectModuleDD,
  getAllMainMenus,
  postMainMenus,
  updateMainMenus,
  deleteMainMenus,
};
