const {
  asyncHandler,
  EmailService,
  ApiError,
  ApiResponse,
  DatabaseHandler,
} = require("../../utils");

const fs = require("fs");
const path = require("path");


const get_emp_KT = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { topic, emp_id } = req.query;

    let query = `
      SELECT
        ks.K_ID           "K_ID",
        ks.K_DATE         "K_DATE",
        ks.K_TOPIC        "K_TOPIC",
        ks.K_DESCRIPTION  "K_DESCRIPTION",
        ks.K_FILE_NAME    "K_FILE_NAME",
        ks.EMP_ID         "EMP_ID",
        e.NAME            "NAME"
      FROM KNOWLEDGE_SHARING ks
      JOIN EMP e
        ON e.EMP_ID = ks.EMP_ID
      WHERE 1 = 1
    `;

    const bindParams = {};

    const isSearch = !!(topic?.trim() || emp_id);

    if (!isSearch) {
      query += ` AND ks.K_DATE >= TRUNC(SYSDATE) - 10`;
    }

    if (topic?.trim()) {
      query += ` AND UPPER(ks.K_TOPIC) LIKE UPPER(:TOPIC)`;
      bindParams.TOPIC = `%${topic.trim()}%`;
    }

    if (emp_id?.toString().trim()) {
      query += ` AND ks.EMP_ID = :EMP_ID`;
      bindParams.EMP_ID = Number(emp_id);
    }

    query += `
      ORDER BY ks.K_DATE DESC, ks.K_ID DESC
    `;

    const result = await db.executeQuery(query, bindParams, "siri_db");

    res.status(200).json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error("Get KT error:", error);
    throw new ApiError(500, "Internal server error");
  }
});

const get_emp_KT_DD = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        EMP_ID "EMP_ID",
        NAME   "NAME"
      FROM EMP
      ORDER BY NAME
    `;

    const result = await db.executeQuery(query, undefined, "siri_db");

    return res
      .status(200)
      .json(new ApiResponse(200, result?.rows));
  } catch (error) {
    console.error("Get emp dropdown error:", error);
    throw new ApiError(500, "Internal server Error");
  }
});

const post_emp_KT = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const {
      K_DATE,
      K_TOPIC,
      K_DESCRIPTION,
      EMP_ID,
    } = req.body;

    const K_FILE_NAME = req.file ? req.file.filename : null;

    const checkQuery = `
      SELECT COUNT(*) AS CNT
      FROM KNOWLEDGE_SHARING
      WHERE K_DATE = TO_DATE(:K_DATE, 'DD-MM-YY')
    `;

    const checkResult = await db.executeQuery(
      checkQuery,
      { K_DATE },
      "siri_db"
    );

    if (checkResult.rows[0].CNT > 0) {
        throw new ApiError(400, "A KT already exists for this date");
    }

    const insertQuery = `
      INSERT INTO KNOWLEDGE_SHARING (
        K_DATE,
        K_TOPIC,
        K_DESCRIPTION,
        K_FILE_NAME,
        EMP_ID
      )
      VALUES (
        TO_DATE(:K_DATE, 'DD-MM-YY'),
        :K_TOPIC,
        :K_DESCRIPTION,
        :K_FILE_NAME,
        :EMP_ID
      )
    `;

    const result = await db.executeQuery(
      insertQuery,
      {
        K_DATE,
        K_TOPIC,
        K_DESCRIPTION,
        K_FILE_NAME,
        EMP_ID,
      },
      "siri_db"
    );

    res.status(200).json(
      new ApiResponse(
        201,
        { rowsAffected: result.rowsAffected },
        "Knowledge inserted successfully"
      )
    );
  } catch (err) {
    console.error("Knowledge insert error:", err);
    throw new ApiError(
      err.statusCode || 500,
      err.message || "Error inserting knowledge",
      err.details || err.message
    );
  }
});

const download_KT_File = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const { id } = req.params;

  if (!id || isNaN(Number(id))) {
    throw new ApiError(400, "Invalid EMP ID");
  }

  const result = await db.executeQuery(
    `SELECT K_FILE_NAME FROM KNOWLEDGE_SHARING WHERE EMP_ID = :EMP_ID`,
    { EMP_ID: Number(id) },
    "siri_db"
  );

  if (!result.rows.length) {
    throw new ApiError(404, "File not found in DB");
  }

  // RAW DB name
  let fileName = result.rows[0].K_FILE_NAME?.trim();

  // ensure .pdf
  if (!fileName.toLowerCase().endsWith(".pdf")) {
    fileName += ".pdf";
  }

  // Full file path
  const filePath = path.join(__dirname, "../../../uploads/kt_docs", fileName);



  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, "File not found on server");
  }

  res.download(filePath, fileName);
});


module.exports = {
  get_emp_KT, post_emp_KT, get_emp_KT_DD, download_KT_File
};