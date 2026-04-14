const { asyncHandler, EmailService, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");

const getProjectDropdown = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        PROJECT_ID   AS "project_id",
        PROJECT_NAME     AS "project_name"
      FROM PROJECT
      
      ORDER BY PROJECT_ID ASC
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(
        200,
        result.rows || [],
        "Projectname fetched successfully"
      )
    );
  } catch (err) {
    console.error("Error fetching projectname:", err);
    throw new ApiError(500, "Error fetching projectname", err.message);
  }
});
const getRoleDropdown = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        ROLE_ID   AS "role_id",
        ROLE_NAME     AS "role_name"
      FROM PROJECT_ROLE
      
      ORDER BY ROLE_ID ASC
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(
        200,
        result.rows || [],
        "Role fetched successfully"
      )
    );
  } catch (err) {
    console.error("Error fetching role:", err);
    throw new ApiError(500, "Error fetching role", err.message);
  }
});
const getStatusDropdown = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        STATUS_ID   AS "status_id",
        STATUS_NAME     AS "status_name"
      FROM PROJECT_EMP_STATUS
      
      ORDER BY STATUS_ID ASC
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(
        200,
        result.rows || [],
        "Status fetched successfully"
      )
    );
  } catch (err) {
    console.error("Error fetching status:", err);
    throw new ApiError(500, "Error fetching status", err.message);
  }
});
const createProjectTeam = asyncHandler(async (req, res) => {
  try {
    console.log("BODY:", req.body);
    const {
      project_id,
      module_id,
      emp_id,
      role_id,

      status_id,
      start_date,
      end_date
    } = req.body;



    const db = new DatabaseHandler();

    const query = `
      INSERT INTO PROJECT_TEAM (
        PROJECT_ID,
        MODULE_ID,
        EMP_ID,
        ROLE_ID,
        STATUS_ID,
        START_DATE,
        END_DATE
      ) VALUES (
        :project_id,
        :module_id,
        :emp_id,
        :role_id,
        :status_id,
        :start_date,
        :end_date
      )
    `;

    const params = {
      project_id,
      module_id,
      emp_id,
      role_id,
      status_id,
      start_date: new Date(start_date),
      end_date: end_date ? new Date(end_date) : null,
    };

    await db.executeQuery(query, params, "siri_db");

    return res.status(201).json(
      new ApiResponse(
        201,
        null,
        "Project team created successfully"
      )
    );
  } catch (err) {
    console.error("Error creating project team:", err);
    throw new ApiError(500, "Error creating project team", err.message);
  }
});
const updateProjectTeam = asyncHandler(async (req, res) => {
  try {
    const { team_id } = req.params;

    const {
      project_id,
      module_id,
      emp_id,
      role_id,
      status_id,
      start_date,
      end_date
    } = req.body;

    if (!team_id) {
      throw new ApiError(400, "Team ID is required");
    }

    const db = new DatabaseHandler();

    const query = `
      UPDATE PROJECT_TEAM
      SET
        PROJECT_ID = :project_id,
        MODULE_ID =  :module_id,
        EMP_ID     = :emp_id,
        ROLE_ID    = :role_id,
        STATUS_ID  = :status_id,
        START_DATE = :start_date,
        END_DATE   = :end_date
      WHERE TEAM_ID = :team_id
    `;

    const params = {
      team_id,
      project_id,
      module_id,
      emp_id,
      role_id,
      status_id,
      start_date: new Date(start_date),
      end_date: end_date ? new Date(end_date) : null,
    };

    await db.executeQuery(query, params, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, null, "Project team updated successfully")
    );
  } catch (err) {
    console.error("Error updating project team:", err);
    throw new ApiError(500, "Error updating project team", err.message);
  }
});


const getProjectTeam = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
  pt.TEAM_ID,

  pt.PROJECT_ID,
  pt.MODULE_ID,
  pt.EMP_ID,
  pt.ROLE_ID,
  pt.STATUS_ID,

  p.PROJECT_NAME,
  M.MODULE_NAME,
  e.NAME,
  um.LOGIN_ID,
  pr.ROLE_NAME,
  ps.STATUS_NAME,

  pt.START_DATE,
  pt.END_DATE
FROM PROJECT_TEAM pt
JOIN PROJECT p ON p.PROJECT_ID = pt.PROJECT_ID
JOIN EMP e ON e.EMP_ID = pt.EMP_ID
JOIN USER_MAST um ON um.EMP_ID = pt.EMP_ID
LEFT JOIN MODULE m ON m.MODULE_ID = pt.MODULE_ID
JOIN PROJECT_ROLE pr ON pr.ROLE_ID = pt.ROLE_ID
JOIN PROJECT_EMP_STATUS ps ON ps.STATUS_ID = pt.STATUS_ID
ORDER BY pt.TEAM_ID DESC

    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(
        200,
        result.rows || [],
        "Project team fetched successfully"
      )
    );
  } catch (err) {
    console.error("Error fetching project team:", err);
    throw new ApiError(500, "Error fetching project team", err.message);
  }
});


module.exports = {
  getProjectDropdown,
  getRoleDropdown,
  getStatusDropdown,
  createProjectTeam,
  updateProjectTeam,
  getProjectTeam

}