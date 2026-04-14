const { DatabaseHandler, ApiError, ApiResponse, asyncHandler } = require("../utils");
const OracleDB = require('oracledb');

export const getModuleMenu = asyncHandler(async (req, res) => {


  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        module_menu_id AS module_menu_id,
        module_name AS module_name,
        icon AS icon
      FROM module_menu
      ORDER BY module_name
    `;

    const result = await db.executeQuery(
      query,
      undefined,
      'siri_db'
    );

    const rows = result.rows || [];

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          rows,
          "Module menu list fetched successfully"
        )
      );
  } catch (err) {
    console.error("Error fetching module menu:", err);
    throw new ApiError(500, "Error fetching module menu", err.message);
  }
});

export const getMainMenu = asyncHandler(async (req, res) => {

  try {
    const db = new DatabaseHandler();
    // Read module_id from query ?module_id=1
    const module_id = req.query.module_id;

    const query = `
     SELECT
    main_menu_id ,
    main_menu_name ,
    icon ,
    module_menu_id ,
    position ,
    page_name_navigation
    FROM
    main_menu
      WHERE module_menu_id = :module_id
      ORDER BY main_menu_name
    `;

    const result = await db.executeQuery(
      query,
      { module_id },  // bind variable
      'siri_db'
    );

    const rows = result.rows || [];

    res.status(200).json(
      new ApiResponse(
        200,
        rows,
        "Main menu list fetched successfully"
      )
    );
  } catch (err) {
    console.error("Error fetching main menu:", err);
    throw new ApiError(
      500,
      "Error fetching main menu",
      err.message
    );
  }
});

export const createMenuItem = asyncHandler(async (req, res) => {
  try {
   

    const db = new DatabaseHandler();
    const {
      MENUE_ITEM_NAME,
      ICON,
      PAGE_NAME_NAVIGATION,
      MODULE_MENU_ID,
      MAIN_MENUE_ID,
      POSITION,
    } = req.body;

    if (
      MENUE_ITEM_NAME == null ||
      ICON == null ||
      PAGE_NAME_NAVIGATION == null ||
      MODULE_MENU_ID == null ||
      MAIN_MENUE_ID == null ||
      POSITION == null
    ) {
      throw new ApiError(400, "All fields are required");
    }

    const query = `
      INSERT INTO MENUE_ITEMS (
        MENUE_ITEM_NAME,
        ICON,
        PAGE_NAME_NAVIGATION,
        MODULE_MENU_ID,
        MAIN_MENUE_ID,
        POSITION
      )
      VALUES (
        :MENUE_ITEM_NAME,
        :ICON,
        :PAGE_NAME_NAVIGATION,
        :MODULE_MENU_ID,
        :MAIN_MENUE_ID,
        :POSITION
      )
    `;

    await db.executeQuery(query, {
      MENUE_ITEM_NAME,
      ICON,
      PAGE_NAME_NAVIGATION,
      MODULE_MENU_ID: Number(MODULE_MENU_ID),
      MAIN_MENUE_ID: Number(MAIN_MENUE_ID),
      POSITION: Number(POSITION),
    }, "siri_db");

    return res
      .status(201)
      .json(new ApiResponse(201, null, "Menu item created successfully"));

  } catch (err) {
    console.error("Error creating menu item:", err);

    if (err instanceof ApiError) throw err;

    throw new ApiError(500, "Error creating menu item", err.message);
  }
});

export const updateMenuItem = asyncHandler(async (req, res) => {

  try {
    const db = new DatabaseHandler();
    const { id } = req.query;

    const {
      MENUE_ITEM_NAME,
      ICON,
      PAGE_NAME_NAVIGATION,
      MODULE_MENU_ID,
      MAIN_MENUE_ID,
      POSITION
    } = req.body;

    if (!id) {
      throw new ApiError(400, "MENUE_ITEM_ID is required");
    }

    const query = `
    UPDATE MENUE_ITEMS
      SET 
        MENUE_ITEM_NAME        = :MENUE_ITEM_NAME,
        ICON                  = :ICON,
        PAGE_NAME_NAVIGATION  = :PAGE_NAME_NAVIGATION,
        MODULE_MENU_ID       = :MODULE_MENU_ID,
        MAIN_MENUE_ID         = :MAIN_MENUE_ID,
        POSITION             = :POSITION
      WHERE MENUE_ITEM_ID      = :id
    `;

    const binds = {
      MENUE_ITEM_NAME,
      ICON,
      PAGE_NAME_NAVIGATION,
      MODULE_MENU_ID,
      MAIN_MENUE_ID,
      POSITION,
      id
    };

    const result = await db.executeQuery(query, binds, 'siri_db');

    if (result.rowsAffected === 0) {
      throw new ApiError(404, "Menu item not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Menu item updated successfully"));

  } catch (err) {
    console.error("Error updating menu item:", err);
    throw new ApiError(500, "Error updating menu item", err.message);
  }
});

export const fetchMenuItems = asyncHandler(async (req, res) => {


  try {
    const db = new DatabaseHandler();
    const query = `
     SELECT
    mi.menue_item_id        AS "menue_item_id",
    mi.menue_item_name      AS "menue_item_name",
    mi.icon                AS "icon",
    mi.page_name_navigation AS "page_name_navigation",
    mi.module_menu_id       AS "module_menu_id",
    mm.module_name          AS "module_name",
    mi.main_menue_id        AS "main_menue_id",
    m.main_menu_name        AS "main_menu_name",
    mi.position             AS "position"
FROM menue_items mi
LEFT JOIN module_menu mm
       ON mi.module_menu_id = mm.module_menu_id
LEFT JOIN main_menu m
       ON mi.main_menue_id = m.main_menu_id
ORDER BY mi.position

    `;

    const result = await db.executeQuery(query, undefined, 'siri_db');
    const rows = result.rows || [];

    res
      .status(200)
      .json(new ApiResponse(200, rows, "Menu items fetched successfully"));
  } catch (err) {
    throw new ApiError(500, "Error fetching menu items", err.message);
  }
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "MENUE_ITEM_ID is required");
    }

    const query = `
      DELETE FROM MENUE_ITEMS
      WHERE MENUE_ITEM_ID = :id
    `;

    const result = await db.executeQuery(
      query,
      { id: Number(id) },
      "siri_db"
    );

    if (result.rowsAffected === 0) {
      throw new ApiError(404, "Menu item not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { id }, "Menu item deleted successfully"));

  } catch (err) {
    console.error("Error deleting menu item:", err);

    if (err instanceof ApiError) throw err;

    throw new ApiError(500, "Error deleting menu item", err.message);
  }
});
