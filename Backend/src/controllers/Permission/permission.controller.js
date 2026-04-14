const {
  asyncHandler,
  EmailService,
  ApiError,
  ApiResponse,
  DatabaseHandler,
} = require("../../utils");

const get_emp_permission = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const empId = req.params.emp_id; // Get emp_id from URL

    const query = `
      SELECT
        p.PERM_ID        "PERM_ID",
        p.EMP_ID         "EMP_ID",
        e.NAME           "EMP_NAME",
        p.FROM_TIME      "FROM_TIME",
        p.TO_TIME        "TO_TIME",
        p.APPLIED_TIME   "APPLIED_TIME",
        TO_CHAR(p.PERM_DATE, 'DD-MON-YYYY') AS "PERM_DATE",
        p.PERM_DURATION  "PERM_DURATION",
        p.PERM_REASON    "PERM_REASON",
        p.STATUS         "STATUS",
        p.REMARKS        "REMARKS"
      FROM PERMISSION p
      JOIN EMP e
        ON e.EMP_ID = p.EMP_ID
      WHERE p.EMP_ID = :empId
      ORDER BY p.PERM_DATE DESC, p.PERM_ID DESC
    `;

    const result = await db.executeQuery(query, { empId }, "siri_db");

    res.status(200).json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error("Get Permission error:", error);
    throw new ApiError(500, "Internal server error");
  }
});


const post_emp_permission = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const {
      emp_id,
      perm_date,
      from_time,
      to_time,
      perm_reason,
      perm_duration,
      status,
      remarks,
      applied_time
    } = req.body;

    const month = perm_date.substring(5, 7);
    const year = perm_date.substring(0, 4);

    const checkQuery = `
      SELECT COUNT(*) AS CNT
      FROM PERMISSION
      WHERE EMP_ID = :EMP_ID
        AND EXTRACT(MONTH FROM PERM_DATE) = :MONTH
        AND EXTRACT(YEAR FROM PERM_DATE) = :YEAR
    `;

    const checkParams = {
      EMP_ID: emp_id,
      MONTH: month,
      YEAR: year,
    };

    const checkResult = await db.executeQuery(checkQuery, checkParams, "siri_db");
    const count = checkResult.rows[0]?.CNT || 0;

    if (count >= 2) {
      return res.status(400).json({
        Status: 0,
        message: "You've already used your 2 permissions for this month.",
      });
    }

    // 4️⃣ Original Insert Query
    const insertQuery = `
      INSERT INTO PERMISSION (
        EMP_ID,
        PERM_DATE,
        FROM_TIME,
        TO_TIME,
        PERM_REASON,
        PERM_DURATION,
        STATUS,
        REMARKS,
        APPLIED_TIME
      )
      VALUES (
        :EMP_ID,
        TO_DATE(:PERM_DATE, 'YYYY-MM-DD'),
        :FROM_TIME,
        :TO_TIME,
        :PERM_REASON,
        :PERM_DURATION,
        :STATUS,
        :REMARKS,
        :APPLIED_TIME
      )
    `;

    const bindParams = {
      EMP_ID: emp_id,
      PERM_DATE: perm_date,
      FROM_TIME: from_time,
      TO_TIME: to_time,
      PERM_REASON: perm_reason,
      PERM_DURATION: perm_duration,
      STATUS: status,
      REMARKS: remarks,
      APPLIED_TIME: applied_time
    };

    await db.executeQuery(insertQuery, bindParams, "siri_db");

    res.status(200).json(new ApiResponse(200, "Permission added successfully"));
  } catch (error) {
    console.error("Add Permission error:", error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_all_permissions = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        p.PERM_ID        "PERM_ID",
        p.EMP_ID         "EMP_ID",
        e.NAME           "EMP_NAME",
        p.FROM_TIME      "FROM_TIME",
        p.TO_TIME        "TO_TIME",
        p.APPLIED_TIME   "APPLIED_TIME",
        TO_CHAR(p.PERM_DATE, 'DD-MON-YYYY') AS "PERM_DATE",
        p.PERM_DURATION  "PERM_DURATION",
        p.PERM_REASON    "PERM_REASON",
        p.STATUS         "STATUS",
        p.REMARKS        "REMARKS"
      FROM PERMISSION p
      JOIN EMP e
        ON e.EMP_ID = p.EMP_ID
      ORDER BY p.PERM_DATE DESC, p.PERM_ID DESC
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    res.status(200).json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error("Get All Permissions error:", error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_today_permissions = asyncHandler(async (req, res) => {

  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        p.PERM_ID        "PERM_ID",
        e.NAME           "EMP_NAME",
        p.FROM_TIME      "FROM_TIME",
        p.TO_TIME        "TO_TIME",
        p.PERM_REASON    "PERM_REASON"
      FROM PERMISSION p
      JOIN EMP e ON e.EMP_ID = p.EMP_ID
      WHERE p.PERM_DATE >= TRUNC(SYSDATE)
        AND p.PERM_DATE < TRUNC(SYSDATE) + 1
      ORDER BY SUBSTR(p.FROM_TIME, 1, 5)
    `;

    const result = await db.executeQuery(query, {}, "siri_db");
    res.status(200).json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error("FINAL today permissions error:", error);
    throw new ApiError(500, "Failed to fetch today's permissions");
  }
});





module.exports = {
  get_emp_permission,
  post_emp_permission,
  get_all_permissions,
  get_today_permissions
};