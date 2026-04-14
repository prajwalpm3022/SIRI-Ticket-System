const { asyncHandler, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");
const getSessionInfo = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { user_id, login_id } = req.user; 

    const query = `
      SELECT
  U.LOGIN_ID        AS "user_name",
  L.LOGIN_TYPE      AS "logged_from",
  L.DEVICE_TYPE     AS "device",
  L.LOGIN_OS        AS "os",
  L.LATTITUDE       AS "latitude",
  L.LONGITUDE       AS "longitude"
FROM LOGIN_DETAILS L
JOIN USER_MAST U ON U.USER_ID = L.USER_ID
WHERE L.LOGIN_ID = :login_id
AND   L.USER_ID  = :user_id


    `;

    const result = await db.executeQuery(
      query,
      { login_id, user_id },
      "siri_db"
    );

    if (!result.rows.length) {
      throw new ApiError(404, "Session info not found");
    }

    return res.status(200).json(
      new ApiResponse(200, result.rows[0], "Session info fetched successfully")
    );
  } catch (err) {
    throw new ApiError(500, "Failed to fetch session info", err.message);
  }
});

const get_employee_todo = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();

  const { empid } = req.params;

  if (!empid) {
    return res.status(400).json({ message: "Employee ID missing" });
  }

  const query = `
    SELECT
      TA.ASSIGNMENT_ID,
      TA.TICKET_ID,
      TA.TICKET_DESC,
      TA.EXP_COMP_DATE,
      TA.REMARKS,
      TM.TITLE,
      TS.STATUS,

      -- ✅ Employee Names
      E1.NAME AS ASSIGNED_TO_NAME,
      E2.NAME AS ASSIGNED_BY_NAME

    FROM TICKET_ASSIGNMENT TA

    LEFT JOIN TICKET_MASTER TM
      ON TA.TICKET_ID = TM.TICKET_ID

    LEFT JOIN TICKET_STATUS TS
      ON TA.STATUS_ID = TS.TICKET_STATUS_ID

    -- ✅ Assigned To (Employee)
    LEFT JOIN EMP E1
      ON TA.ASSIGNED_TO = E1.EMP_ID

    -- ✅ Assigned By (Manager/Admin)
    LEFT JOIN EMP E2
      ON TA.ASSIGNED_BY = E2.EMP_ID

    WHERE TA.ASSIGNED_TO = :empId
      AND TA.STATUS_ID IN (7, 8)

    ORDER BY TA.ASSIGNMENT_ID DESC
  `;

  const result = await db.executeQuery(
    query,
    { empId: Number(empid) },
    "siri_db"
  );

  return res.status(200).json(
    new ApiResponse(200, result.rows || [])
  );
});
const get_task_details = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const { assignmentId } = req.params;

  const query = `
    SELECT
      TA.ASSIGNMENT_ID,
      TA.TICKET_DESC,
      TA.EXP_COMP_DATE,
      TM.TITLE,
      TM.DESCRIPTION,
      PM.PROJECT_NAME,
      TD.DOC_NAME,
      TS.STATUS
    FROM TICKET_ASSIGNMENT TA
    LEFT JOIN TICKET_MASTER TM
      ON TA.TICKET_ID = TM.TICKET_ID
    LEFT JOIN PROJECT PM
      ON TM.PROJECT_ID = PM.PROJECT_ID
    LEFT JOIN TICKET_DOCS TD
      ON TM.TICKET_ID = TD.TICKET_ID
    LEFT JOIN TICKET_STATUS TS
      ON TA.STATUS_ID = TS.TICKET_STATUS_ID
    WHERE TA.ASSIGNMENT_ID = :assignmentId
  `;

  const result = await db.executeQuery(
    query,
    { assignmentId: Number(assignmentId) },
    "siri_db"
  );

  return res.status(200).json(
    new ApiResponse(200, result.rows[0] || {})
  );
});
// const upsert_ticket_progress = asyncHandler(async (req, res) => {
//   try {
//     const db = new DatabaseHandler();

//     // ✅ SAFE BODY CHECK
//     if (!req.body || Object.keys(req.body).length === 0) {
//       throw new ApiError(400, "Request body is missing");
//     }

//     const ticket_ass_id = req.body.ticket_ass_id;
//     const ticket_id = req.body.ticket_id;
//     const remarks = req.body.remarks;
//     const percentage_comp = req.body.percentage_comp;

//     // ✅ VALIDATION
//     if (!ticket_ass_id) {
//       throw new ApiError(400, "Ticket Assignment ID is required");
//     }

//     if (!ticket_id) {
//       throw new ApiError(400, "Ticket ID is required");
//     }

//     const query = `
//       MERGE INTO TICKET_PROGRESS tp
// USING (
//   SELECT :ticket_ass_id AS TICKET_ASS_ID FROM dual
// ) src
// ON (tp.TICKET_ASS_ID = src.TICKET_ASS_ID)

// WHEN MATCHED THEN
//   UPDATE SET
//     tp.REMARKS = :remarks,
//     tp.PERCENTAGE_COMP = :percentage_comp,
//     tp.CREATED_DATE = SYSDATE,
//     tp.CREATED_TIME = SYSDATE

// WHEN NOT MATCHED THEN
//   INSERT (
    
//     TICKET_ID,
//     CREATED_DATE,
//     CREATED_TIME,
//     REMARKS,
//     PERCENTAGE_COMP,
//     TICKET_ASS_ID
//   )
//   VALUES (
  
//     :ticket_id,
//     SYSDATE,
//     SYSDATE,
//     :remarks,
//     :percentage_comp,
//     :ticket_ass_id
//   )
//     `;

//     const binds = {
//       ticket_ass_id,
//       ticket_id,
//       remarks,
//       percentage_comp
//     };

//     await db.executeQuery(query, binds, "siri_db");

//     return res.status(200).json(
//       new ApiResponse(200, null, "Ticket progress saved successfully")
//     );

//   } catch (error) {
//     console.error("Update Progress Error:", error);
//     throw new ApiError(500, error.message || "Internal server error");
//   }
// });
const upsert_ticket_progress = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { assignment_id, ticket_id, remarks, percentage_comp } = req.body;

    if (!assignment_id || !ticket_id) {
      throw new ApiError(400, "assignment_id and ticket_id required");
    }

    /* 🔥 STEP 1: UPSERT PROGRESS */
    await db.executeQuery(
      `
      MERGE INTO TICKET_PROGRESS tp
      USING (
        SELECT :ticket_id AS TICKET_ID,
               :assignment_id AS TICKET_ASS_ID
        FROM dual
      ) src
      ON (
        tp.TICKET_ID = src.TICKET_ID
        AND tp.TICKET_ASS_ID = src.TICKET_ASS_ID
      )
      WHEN MATCHED THEN
        UPDATE SET
          tp.REMARKS = :remarks,
          tp.PERCENTAGE_COMP = :percentage_comp,
          tp.CREATED_DATE = SYSDATE,
          tp.CREATED_TIME = SYSDATE
      WHEN NOT MATCHED THEN
        INSERT (
          TICKET_PRO_ID,
          TICKET_ID,
          CREATED_DATE,
          CREATED_TIME,
          REMARKS,
          PERCENTAGE_COMP,
          TICKET_ASS_ID
        )
        VALUES (
          TICKET_PROGRESS_SEQ.NEXTVAL,
          :ticket_id,
          SYSDATE,
          SYSDATE,
          :remarks,
          :percentage_comp,
          :assignment_id
        )
      `,
      { ticket_id, assignment_id, remarks, percentage_comp },
      "siri_db"
    );

    /* 🔥 STEP 2: UPDATE CURRENT ENGINEER ASSIGNMENT → IN PROGRESS (8) */
    await db.executeQuery(
      `
      UPDATE TICKET_ASSIGNMENT
      SET STATUS_ID = 8
      WHERE ASSIGNMENT_ID = :assignment_id
      `,
      { assignment_id },
      "siri_db"
    );

    /* 🔥 STEP 3: UPDATE TICKET_MASTER → IN PROGRESS (8) */
    await db.executeQuery(
      `
      UPDATE TICKET_MASTER
      SET STATUS_ID = 8
      WHERE TICKET_ID = :ticket_id
      `,
      { ticket_id },
      "siri_db"
    );

    /* 🔥 STEP 4: CHECK ALL ENGINEERS COMPLETION */
    const progressCheck = await db.executeQuery(
      `
      SELECT 
        COUNT(DISTINCT TA.ASSIGNMENT_ID)    AS TOTAL_ENGINEERS,
        COUNT(DISTINCT CASE 
          WHEN TO_NUMBER(TP.PERCENTAGE_COMP) = 100 
          THEN TP.TICKET_ASS_ID
        END)                                AS COMPLETED_ENGINEERS
      FROM TICKET_ASSIGNMENT TA
      LEFT JOIN TICKET_PROGRESS TP
        ON TA.ASSIGNMENT_ID = TP.TICKET_ASS_ID
        AND TA.TICKET_ID    = TP.TICKET_ID
      WHERE TA.TICKET_ID      = :ticket_id
      AND   TA.ASSIGNED_TO IS NOT NULL
      `,
      { ticket_id },
      "siri_db"
    );

    const total     = progressCheck.rows[0]?.TOTAL_ENGINEERS     || 0;
    const completed = progressCheck.rows[0]?.COMPLETED_ENGINEERS || 0;

    /* 🔥 STEP 5: IF ALL ENGINEERS HIT 100% → TESTING (9) */
    if (total > 0 && total === completed) {

      /* Update only assignments that hit 100% */
      await db.executeQuery(
        `
        UPDATE TICKET_ASSIGNMENT
        SET STATUS_ID = 9
        WHERE TICKET_ID = :ticket_id
        AND ASSIGNMENT_ID IN (
          SELECT TICKET_ASS_ID
          FROM   TICKET_PROGRESS
          WHERE  TICKET_ID             = :ticket_id
          AND    TO_NUMBER(PERCENTAGE_COMP) = 100
        )
        `,
        { ticket_id },
        "siri_db"
      );

      /* Update master ticket → TESTING */
      await db.executeQuery(
        `
        UPDATE TICKET_MASTER
        SET STATUS_ID = 9
        WHERE TICKET_ID = :ticket_id
        `,
        { ticket_id },
        "siri_db"
      );

      console.log("All engineers completed → moved to TESTING (9)");
    }

    return res.status(200).json(
      new ApiResponse(200, null, "Progress updated successfully")
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, error.message);
  }
});
module.exports = {
 getSessionInfo,
 get_employee_todo,
 get_task_details,
 upsert_ticket_progress

}



