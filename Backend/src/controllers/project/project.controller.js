const fs = require("fs");
const path = require("path");
const { asyncHandler, EmailService, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");
const oracledb = require("oracledb");

const getCustomerDropdown = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        CUSTOMER_ID   AS "customer_id",
        CUSTOMER_NAME     AS "customer_name"
      FROM CUSTOMER
      
      ORDER BY CUSTOMER_ID ASC
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(
        200,
        result.rows || [],
        "customer fetched successfully"
      )
    );
  } catch (err) {
    console.error("Error fetching customer:", err);
    throw new ApiError(500, "Error fetching customer", err.message);
  }
});
const getModuleDropdown = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        MODULE_ID   AS "module_id",
        MODULE_NAME     AS "module_name"
      FROM MODULE
      
      ORDER BY MODULE_ID ASC
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(
        200,
        result.rows || [],
        "module fetched successfully"
      )
    );
  } catch (err) {
    console.error("Error fetching module:", err);
    throw new ApiError(500, "Error fetching module", err.message);
  }
});



const createProject = asyncHandler(async (req, res) => {
  try {
    const {
      project_name,
      ponumber,
      customer_id,
      module_id,
      start_date,
      end_date,
      project_leader,
      po_date,
    } = req.body;

    const db = new DatabaseHandler();

    // 🔹 1️⃣ INSERT PROJECT (PL/SQL BLOCK)
    const insertQuery = `
      BEGIN
        INSERT INTO PROJECT (
          PROJECT_NAME,
          PONUMBER,
          CUSTOMER_ID,
          MODULE_ID,
          START_DATE,
          END_DATE,
          PROJECT_LEADER,
          PO_DATE,
          FILES
        ) VALUES (
          :project_name,
          :ponumber,
          :customer_id,
          :module_id,
          :start_date,
          :end_date,
          :project_leader,
          :po_date,
          :files
        )
        RETURNING PROJECT_ID INTO :project_id;
      END;
    `;

    const bindData = {
      project_name,
      ponumber: ponumber || null,
      customer_id,
      module_id,
      start_date: start_date ? new Date(start_date) : null,
      end_date: end_date ? new Date(end_date) : null,
      project_leader,
      po_date: po_date ? new Date(po_date) : null,
      files: null, 

      project_id: {
        dir: oracledb.BIND_OUT,
        type: oracledb.NUMBER,
      },
    };

    const result = await db.executeQuery(insertQuery, bindData, "siri_db");
    const projectId = result.outBinds.project_id;

    
    const renamedFiles = [];

    if (req.files && req.files.length > 0) {
      const now = new Date();
      const date = `${String(now.getDate()).padStart(2, "0")}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-${now.getFullYear()}`;

      for (const file of req.files) {
        const ext = path.extname(file.filename);
        const newFilename = `${projectId}_${date}_${Date.now()}${ext}`;
        const newPath = path.join(path.dirname(file.path), newFilename);

        fs.renameSync(file.path, newPath);
        renamedFiles.push(newFilename);
      }
    }

    // 🔹 3️⃣ UPDATE FILES COLUMN
    await db.executeQuery(
      `UPDATE PROJECT SET FILES = :files WHERE PROJECT_ID = :project_id`,
      {
        files: JSON.stringify(renamedFiles),
        project_id: projectId,
      },
      "siri_db"
    );

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          project_id: projectId,
          files: renamedFiles,
        },
        "Project created successfully"
      )
    );
  } catch (err) {
    
    if (req.files) {
      for (const f of req.files) {
        if (fs.existsSync(f.path)) {
          fs.unlinkSync(f.path);
        }
      }
    }

    console.error("Error creating project:", err);
    throw new ApiError(500, "Error creating project", err.message);
  }
});

const updateProject = asyncHandler(async (req, res) => {
  try {
    const { id: project_id } = req.params;

    const {
      project_name,
      ponumber,
      customer_id,
      module_id,
      start_date,
      end_date,
      project_leader,
      po_date,
      existingFiles 
    } = req.body;

    const db = new DatabaseHandler();

    
    let existingFileList = [];
    if (existingFiles) {
      existingFileList = JSON.parse(existingFiles);
    }

    
    const newFiles = req.files
      ? req.files.map(f => f.filename)
      : [];

    
    const finalFiles = [...existingFileList, ...newFiles];

    
    const query = `
      UPDATE PROJECT
      SET
        PROJECT_NAME   = :project_name,
        PONUMBER       = :ponumber,
        CUSTOMER_ID    = :customer_id,
        MODULE_ID      = :module_id,
        START_DATE     = :start_date,
        END_DATE       = :end_date,
        PROJECT_LEADER = :project_leader,
        PO_DATE        = :po_date,
        FILES          = :files
      WHERE PROJECT_ID = :project_id
    `;

    const data = {
      project_id,
      project_name,
      ponumber: ponumber || null,
      customer_id,
      module_id,
      project_leader,
      start_date: start_date ? new Date(start_date) : null,
      end_date: end_date ? new Date(end_date) : null,
      po_date: po_date ? new Date(po_date) : null,
      files: JSON.stringify(finalFiles), 
    };

    const result = await db.executeQuery(query, data, "siri_db");

    if (result.rowsAffected === 0) {
      throw new ApiError(404, "Project not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Project updated successfully"));
  } catch (err) {
    console.error("Error updating project:", err);
    throw new ApiError(500, "Error updating project", err.message);
  }
});

const getProjects = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        p.PROJECT_ID        AS "project_id",
        p.PROJECT_NAME      AS "project_name",
        p.PONUMBER          AS "ponumber",
        p.CUSTOMER_ID       AS "customer_id",
        p.MODULE_ID         AS "module_id",
        p.PROJECT_LEADER    AS "project_leader",
        c.CUSTOMER_NAME     AS "customer_name",
        m.MODULE_NAME       AS "module_name",
        e.NAME              AS "leader_name",
        p.START_DATE        AS "start_date",
        p.END_DATE          AS "end_date",
        p.PO_DATE           AS "po_date",
        p.FILES             AS "files"
      FROM PROJECT p
      JOIN CUSTOMER c ON c.CUSTOMER_ID = p.CUSTOMER_ID
      JOIN MODULE m   ON m.MODULE_ID = p.MODULE_ID
      JOIN EMP e      ON e.EMP_ID = p.PROJECT_LEADER
      ORDER BY p.PROJECT_ID DESC
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    const rows = (result.rows || []).map(row => ({
      ...row,
      files: row.files ? JSON.parse(row.files) : []
    }));

    return res.status(200).json(
      new ApiResponse(200, rows, "Projects fetched successfully")
    );
  } catch (err) {
    console.error("Error fetching projects:", err);
    throw new ApiError(500, "Error fetching projects", err.message);
  }
});

const delete_project = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
   const { id:project_id } = req.params;

    const query = `
      DELETE FROM PROJECT
      WHERE PROJECT_ID = :project_id
    `;

    await db.executeQuery(
      query,
      { project_id },
      "siri_db"
    );

    return res
      .status(200)
      .json(new ApiResponse(200, "project deleted successfully"));

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});




module.exports = {
  getCustomerDropdown,
  getModuleDropdown,
  updateProject,
  createProject,
  getProjects,
  delete_project
}