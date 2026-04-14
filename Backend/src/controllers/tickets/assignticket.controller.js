
const { asyncHandler, EmailService, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");
const OracleDB = require("oracledb");
const get_taskcategory = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        CATEGORY_ID,
        CATEGORY_NAME as "category_name"
      FROM TICKET_CATEGORY
      ORDER BY CATEGORY_ID DESC
    `;

    const result = await db.executeQuery(query, {}, 'siri_db');

    return res
          .status(200)
          .json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_taskpriority = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        PRIORITY_ID,
        PRIORITY as "priority_name"
      FROM TICKET_PRIORITY
      ORDER BY PRIORITY_ID DESC
    `;

    const result = await db.executeQuery(query, {}, 'siri_db');

    return res
          .status(200)
          .json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_taskstatus = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
     SELECT
  TICKET_STATUS_ID ,
  STATUS AS "status"
FROM TICKET_STATUS
ORDER BY TICKET_STATUS_ID DESC
      
    `;

    const result = await db.executeQuery(query, {}, 'siri_db');

    return res
          .status(200)
          .json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_ticket_by_id = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { id } = req.params;

    
    const ticketQuery = `
      SELECT 
        TM.TICKET_ID,
        TM.TITLE,
        TM.DESCRIPTION,
        TM.STATUS_ID,
        TS.STATUS,
        TM.PRIORITY_ID,
        TM.PROJECT_ID,         
        TM.CREATED_AT,
        TM.CREATED_BY,
        TM.ASSIGNED_DATE,
        TM.CLI_EXCOMP_DATE,
        TM.REMARKS,

        CL.NAME              AS CLIENT_NAME,
        CD.CUST_DEPT_NAME    AS DEPT_NAME

      FROM TICKET_MASTER TM

      LEFT JOIN TICKET_STATUS TS 
        ON TM.STATUS_ID = TS.TICKET_STATUS_ID

      LEFT JOIN CUST_LOGIN CL
        ON TM.CREATED_BY = CL.CUST_LOGIN_ID

      LEFT JOIN CUST_DEPT CD
        ON CL.CUST_DEPT_ID = CD.CUST_DEPT_ID

      WHERE TM.TICKET_ID = :id
    `;

    const ticketResult = await db.executeQuery(
      ticketQuery,
      { id },
      "siri_db"
    );

    if (!ticketResult.rows.length) {
      throw new ApiError(404, "Ticket not found");
    }

    // 🔹 2️⃣ Get Attachments
//     const attachmentQuery = `
//       SELECT
//   TICKET_DOC_ID   AS ATTACHMENT_ID,
//   DOC_NAME        AS FILE_NAME,
//   UPLOADED_DATE
// FROM TICKET_DOCS
// WHERE TICKET_ID = :id
// ORDER BY UPLOADED_DATE DESC
//     `;
const attachmentQuery = `
  SELECT
    TICKET_DOC_ID   AS ATTACHMENT_ID,
    DOC_NAME        AS FILE_NAME,
    UPLOADED_DATE,
    TKT_DOC_FROM
  FROM TICKET_DOCS
  WHERE TICKET_ID      = :id
    AND ASSIGNMENT_ID  IS NULL
  ORDER BY UPLOADED_DATE DESC
`;
    const attachmentResult = await db.executeQuery(
      attachmentQuery,
      { id },
      "siri_db"
    );

    // 🔹 3️⃣ Combine Data
    const responseData = {
      ...ticketResult.rows[0],
      attachments: attachmentResult.rows
    };

    return res.status(200).json(
      new ApiResponse(200, responseData)
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// const assign_ticket = asyncHandler(async (req, res) => {
//   try {
//     const db = new DatabaseHandler();

//     let {
//       ticket_id,
//       status_id,
//       project_id,
//       remarks,
//       assigned_to,
//       assigned_by,
//       verified_by,
//       exp_comp_date,
//       ticket_desc,
//       category_id,
//       priority_id,
//       work_remarks,
//       assignment_id,
//       deleted_files
//     } = req.body;

//     const files = req.files;

//     if (!ticket_id) {
//       throw new ApiError(400, "Ticket ID is required");
//     }

//     const num = (val) => ({
//       val: val !== undefined && val !== null && val !== "" ? Number(val) : null,
//       type: OracleDB.NUMBER
//     });

//     const str = (val) => ({
//       val: val !== undefined && val !== null ? String(val) : null,
//       type: OracleDB.STRING
//     });

//     const dateStr = (val) => ({
//       val: val ? String(val) : null,
//       type: OracleDB.STRING
//     });

//     const ASSIGNED_STATUS_ID = 7;
//     const OVERRIDE_STATUSES = [6, 13]; // 6 = Attachment Required, 13 = Rejected

//     console.log("INCOMING STATUS ID:", status_id);
//     console.log("FULL BODY:", req.body);

//     // =====================================================
//     // 🔴 REJECTED / ATTACHMENT REQUIRED — only update TICKET_MASTER status
//     // =====================================================
//     if (status_id && OVERRIDE_STATUSES.includes(Number(status_id))) {
//       await db.executeQuery(`
//         UPDATE TICKET_MASTER
//         SET
//           STATUS_ID = :status_id,
//           REMARKS   = :remarks
//         WHERE TICKET_ID = :ticket_id
//       `, {
//         ticket_id : num(ticket_id),
//         status_id : { val: Number(status_id), type: OracleDB.NUMBER },
//         remarks   : str(remarks)
//       }, "siri_db");

//       return res.status(200).json(
//         new ApiResponse(200, null, "Ticket status updated successfully")
//       );
//     }

//     // =====================================================
//     // 🟡 UPDATE ASSIGNMENT
//     // =====================================================
//     if (assignment_id) {

//       await db.executeQuery(`
//         UPDATE TICKET_ASSIGNMENT
//         SET
//           ASSIGNED_TO        = :assigned_to,
//           VERIFIED_BY        = :verified_by,
//           EXP_COMP_DATE      = CASE
//                                  WHEN :exp_comp_date IS NOT NULL
//                                  THEN TO_DATE(:exp_comp_date, 'YYYY-MM-DD')
//                                  ELSE NULL
//                                END,
//           TICKET_DESC        = :ticket_desc,
//           TICKET_CATEGORY_ID = :category_id,
//           PRIORITY_ID        = :priority_id,
//           STATUS_ID          = :status_id,
//           REMARKS            = :work_remarks
//         WHERE ASSIGNMENT_ID  = :assignment_id
//       `, {
//         assignment_id : num(assignment_id),
//         assigned_to   : num(assigned_to),
//         verified_by   : num(verified_by),
//         exp_comp_date : dateStr(exp_comp_date),
//         ticket_desc   : str(ticket_desc),
//         category_id   : num(category_id),
//         priority_id   : num(priority_id),
//         status_id     : { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER },
//         work_remarks  : str(work_remarks)
//       }, "siri_db");

//       // ✅ Update TICKET_MASTER with project, status, assigned date and time
//   // ✅ UPDATE ASSIGNMENT
// await db.executeQuery(`
//   UPDATE TICKET_MASTER
//   SET
//     PROJECT_ID    = :project_id,
//     STATUS_ID     = :status_id,
//     ASSIGNED_DATE = SYSDATE,
//     ASSIGNED_TIME = TO_CHAR(SYSTIMESTAMP, 'HH:MI:SS AM')
//   WHERE TICKET_ID = :ticket_id
// `, {
//   project_id : num(project_id),
//   ticket_id  : num(ticket_id),
//   status_id  : { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER }
// }, "siri_db");

// // ✅ NEW ASSIGNMENT
// await db.executeQuery(`
//   UPDATE TICKET_MASTER
//   SET
//     STATUS_ID     = :status_id,
//     PROJECT_ID    = :project_id,
//     ASSIGNED_DATE = SYSDATE,
//     ASSIGNED_TIME = TO_CHAR(SYSTIMESTAMP, 'HH:MI:SS AM'),
//     REMARKS       = :remarks
//   WHERE TICKET_ID = :ticket_id
// `, {
//   ticket_id  : num(ticket_id),
//   status_id  : { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER },
//   project_id : num(project_id),
//   remarks    : str(remarks)
// }, "siri_db");

//       // 🔹 DELETE removed files
//       const deleted = JSON.parse(deleted_files || "[]");

//       for (const fileName of deleted) {
//         await db.executeQuery(`
//           DELETE FROM TICKET_DOCS
//           WHERE DOC_NAME      = :doc_name
//             AND ASSIGNMENT_ID = :assignment_id
//         `, {
//           doc_name      : str(fileName),
//           assignment_id : num(assignment_id)
//         }, "siri_db");
//       }

//       // 🔹 INSERT new files
//       if (files && files.length > 0) {
//         for (const file of files) {
//           await db.executeQuery(`
//             INSERT INTO TICKET_DOCS (
//               DOC_NAME,
//               UPLOADED_DATE,
//               TICKET_ID,
//               ASSIGNMENT_ID,
//               DOC_UPLOADER
//             ) VALUES (
//               :doc_name,
//               SYSDATE,
//               :ticket_id,
//               :assignment_id,
//               :doc_uploader
//             )
//           `, {
//             doc_name      : str(file.filename),
//             ticket_id     : num(ticket_id),
//             assignment_id : num(assignment_id),
//             doc_uploader  : str("AD")
//           }, "siri_db");
//         }
//       }

//       return res.status(200).json(
//         new ApiResponse(200, null, "Assignment updated successfully")
//       );
//     }

//     // =====================================================
//     // 🟢 NEW ASSIGNMENT
//     // =====================================================

//     // ✅ Update TICKET_MASTER with status, project, assigned date and time
//    await db.executeQuery(`
//   UPDATE TICKET_MASTER
//   SET
//     STATUS_ID     = :status_id,
//     PROJECT_ID    = :project_id,
//     ASSIGNED_DATE = SYSDATE,
//     ASSIGNED_TIME = TO_CHAR(SYSTIMESTAMP, 'HH:MI:SS AM'),
//     REMARKS       = :remarks
//   WHERE TICKET_ID = :ticket_id
// `, {
//   ticket_id  : num(ticket_id),
//   status_id  : { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER },
//   project_id : num(project_id),
//   remarks    : str(remarks)
// }, "siri_db");

//     const insertResult = await db.executeQuery(`
//       INSERT INTO TICKET_ASSIGNMENT (
//         TICKET_ID,
//         ASSIGNED_TO,
//         ASSIGNED_BY,
//         ASSIGNED_DATE,
//         VERIFIED_BY,
//         EXP_COMP_DATE,
//         TICKET_DESC,
//         TICKET_CATEGORY_ID,
//         PRIORITY_ID,
//         STATUS_ID,
//         REMARKS
//       ) VALUES (
//         :ticket_id,
//         :assigned_to,
//         :assigned_by,
//         SYSDATE,
//         :verified_by,
//         CASE
//           WHEN :exp_comp_date IS NOT NULL
//           THEN TO_DATE(:exp_comp_date, 'YYYY-MM-DD')
//           ELSE NULL
//         END,
//         :ticket_desc,
//         :category_id,
//         :priority_id,
//         :status_id,
//         :work_remarks
//       )
//       RETURNING ASSIGNMENT_ID INTO :assignment_id
//     `, {
//       ticket_id     : num(ticket_id),
//       assigned_to   : num(assigned_to),
//       assigned_by   : num(assigned_by),
//       verified_by   : num(verified_by),
//       exp_comp_date : dateStr(exp_comp_date),
//       ticket_desc   : str(ticket_desc),
//       category_id   : num(category_id),
//       priority_id   : num(priority_id),
//       status_id     : { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER },
//       work_remarks  : str(work_remarks),
//       assignment_id : { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER }
//     }, "siri_db");

//     const newAssignmentId = insertResult.outBinds.assignment_id[0];

//     // 🔹 INSERT FILES
//     if (files && files.length > 0) {
//       for (const file of files) {
//         await db.executeQuery(`
//           INSERT INTO TICKET_DOCS (
//             DOC_NAME,
//             UPLOADED_DATE,
//             TICKET_ID,
//             ASSIGNMENT_ID,
//             DOC_UPLOADER
//           ) VALUES (
//             :doc_name,
//             SYSDATE,
//             :ticket_id,
//             :assignment_id,
//             :doc_uploader
//           )
//         `, {
//           doc_name      : str(file.filename),
//           ticket_id     : num(ticket_id),
//           assignment_id : { val: newAssignmentId, type: OracleDB.NUMBER },
//           doc_uploader  : str("AD")
//         }, "siri_db");
//       }
//     }

//     return res.status(200).json(
//       new ApiResponse(200, null, "Ticket assigned successfully")
//     );

//   } catch (error) {
//     console.error("ASSIGN ERROR:", error);

//     throw new ApiError(
//       error.statusCode || 500,
//       error.message || "Internal server error"
//     );
//   }
// });
const assign_ticket = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    let {
      ticket_id,
      status_id,
      project_id,
      remarks,
      assigned_to,
      assigned_by,
      verified_by,
      exp_comp_date,
      ticket_desc,
      category_id,
      priority_id,
      work_remarks,
      assignment_id,
      deleted_files,
      role,                      // ✅ NEW: "PRIMARY" | "SECONDARY"
      confirm_primary_override,  // ✅ NEW: "true" | "false" — sent by frontend after user confirms
    } = req.body;

    const files = req.files;

    if (!ticket_id) {
      throw new ApiError(400, "Ticket ID is required");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    const num = (val) => ({
      val: val !== undefined && val !== null && val !== "" ? Number(val) : null,
      type: OracleDB.NUMBER,
    });

    const str = (val) => ({
      val: val !== undefined && val !== null ? String(val) : null,
      type: OracleDB.STRING,
    });

    const dateStr = (val) => ({
      val: val ? String(val) : null,
      type: OracleDB.STRING,
    });

    const ASSIGNED_STATUS_ID = 7;
    const OVERRIDE_STATUSES = [6, 13]; // 6 = Attachment Required, 13 = Rejected

    // =========================================================================
    // 🔴 REJECTED / ATTACHMENT REQUIRED — only update TICKET_MASTER status
    // =========================================================================
    if (status_id && OVERRIDE_STATUSES.includes(Number(status_id))) {
      await db.executeQuery(
        `UPDATE TICKET_MASTER
         SET STATUS_ID = :status_id,
             REMARKS   = :remarks
         WHERE TICKET_ID = :ticket_id`,
        {
          ticket_id: num(ticket_id),
          status_id: { val: Number(status_id), type: OracleDB.NUMBER },
          remarks: str(remarks),
        },
        "siri_db"
      );

      return res.status(200).json(
        new ApiResponse(200, null, "Ticket status updated successfully")
      );
    }

    // =========================================================================
    // ✅ PRIMARY ROLE CONFLICT CHECK
    // Only applies when role = "PRIMARY" and confirm_primary_override != "true"
    // =========================================================================
    if (role === "PRIMARY" && confirm_primary_override !== "true") {
      // Check if another assignment already has role = PRIMARY for this ticket
      // Exclude the current assignment_id when editing
      const conflictResult = await db.executeQuery(
        `SELECT ASSIGNMENT_ID, ASSIGNED_TO
         FROM TICKET_ASSIGNMENT
         WHERE TICKET_ID = :ticket_id
           AND ROLE      = 'PRIMARY'
           ${assignment_id ? "AND ASSIGNMENT_ID != :assignment_id" : ""}`,
        assignment_id
          ? { ticket_id: num(ticket_id), assignment_id: num(assignment_id) }
          : { ticket_id: num(ticket_id) },
        "siri_db"
      );

      if (conflictResult.rows && conflictResult.rows.length > 0) {
        // Return 409 Conflict so the frontend can show the confirmation dialog
        return res.status(409).json({
          statusCode: 409,
          message: "PRIMARY_CONFLICT",
          data: {
            existingAssignmentId: conflictResult.rows[0].ASSIGNMENT_ID,
            existingAssignedTo: conflictResult.rows[0].ASSIGNED_TO,
          },
        });
      }
    }

    // =========================================================================
    // ✅ If overriding PRIMARY — demote any existing PRIMARY to SECONDARY first
    // =========================================================================
    if (role === "PRIMARY" && confirm_primary_override === "true") {
      await db.executeQuery(
        `UPDATE TICKET_ASSIGNMENT
         SET ROLE = 'SECONDARY'
         WHERE TICKET_ID = :ticket_id
           AND ROLE      = 'PRIMARY'
           ${assignment_id ? "AND ASSIGNMENT_ID != :assignment_id" : ""}`,
        assignment_id
          ? { ticket_id: num(ticket_id), assignment_id: num(assignment_id) }
          : { ticket_id: num(ticket_id) },
        "siri_db"
      );
    }

    // =========================================================================
    // 🟡 UPDATE EXISTING ASSIGNMENT
    // =========================================================================
    if (assignment_id) {
      await db.executeQuery(
        `UPDATE TICKET_ASSIGNMENT
         SET ASSIGNED_TO        = :assigned_to,
             VERIFIED_BY        = :verified_by,
             EXP_COMP_DATE      = CASE
                                    WHEN :exp_comp_date IS NOT NULL
                                    THEN TO_DATE(:exp_comp_date, 'YYYY-MM-DD')
                                    ELSE NULL
                                  END,
             TICKET_DESC        = :ticket_desc,
             TICKET_CATEGORY_ID = :category_id,
             PRIORITY_ID        = :priority_id,
             STATUS_ID          = :status_id,
             REMARKS            = :work_remarks,
             ROLE               = :role
         WHERE ASSIGNMENT_ID    = :assignment_id`,
        {
          assignment_id: num(assignment_id),
          assigned_to: num(assigned_to),
          verified_by: num(verified_by),
          exp_comp_date: dateStr(exp_comp_date),
          ticket_desc: str(ticket_desc),
          category_id: num(category_id),
          priority_id: num(priority_id),
          status_id: { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER },
          work_remarks: str(work_remarks),
          role: str(role || null),
        },
        "siri_db"
      );

      // Update TICKET_MASTER
      await db.executeQuery(
        `UPDATE TICKET_MASTER
         SET PROJECT_ID    = :project_id,
             STATUS_ID     = :status_id,
             ASSIGNED_DATE = SYSDATE,
             ASSIGNED_TIME = TO_CHAR(SYSTIMESTAMP, 'HH:MI:SS AM')
         WHERE TICKET_ID   = :ticket_id`,
        {
          project_id: num(project_id),
          ticket_id: num(ticket_id),
          status_id: { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER },
        },
        "siri_db"
      );

      // Delete removed files
      const deleted = JSON.parse(deleted_files || "[]");
      for (const fileName of deleted) {
        await db.executeQuery(
          `DELETE FROM TICKET_DOCS
           WHERE DOC_NAME      = :doc_name
             AND ASSIGNMENT_ID = :assignment_id`,
          {
            doc_name: str(fileName),
            assignment_id: num(assignment_id),
          },
          "siri_db"
        );
      }

      // Insert new files
      if (files && files.length > 0) {
        for (const file of files) {
          await db.executeQuery(
            `INSERT INTO TICKET_DOCS (
               DOC_NAME,
               UPLOADED_DATE,
               TICKET_ID,
               ASSIGNMENT_ID,
               DOC_UPLOADER,
               TKT_DOC_FROM
             ) VALUES (
               :doc_name,
               SYSDATE,
               :ticket_id,
               :assignment_id,
               :doc_uploader,
               :tkt_doc_from
             )`,
            {
              doc_name: str(file.filename),
              ticket_id: num(ticket_id),
              assignment_id: num(assignment_id),
              doc_uploader: str("SI"),
              tkt_doc_from: str(`SIRI_${assigned_by}`),
            },
            "siri_db"
          );
        }
      }

      return res.status(200).json(
        new ApiResponse(200, null, "Assignment updated successfully")
      );
    }

    // =========================================================================
    // 🟢 NEW ASSIGNMENT
    // =========================================================================

    // Update TICKET_MASTER
    await db.executeQuery(
      `UPDATE TICKET_MASTER
       SET STATUS_ID     = :status_id,
           PROJECT_ID    = :project_id,
           ASSIGNED_DATE = SYSDATE,
           ASSIGNED_TIME = TO_CHAR(SYSTIMESTAMP, 'HH:MI:SS AM'),
           REMARKS       = :remarks
       WHERE TICKET_ID   = :ticket_id`,
      {
        ticket_id: num(ticket_id),
        status_id: { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER },
        project_id: num(project_id),
        remarks: str(remarks),
      },
      "siri_db"
    );

    // Insert into TICKET_ASSIGNMENT (includes ROLE)
    const insertResult = await db.executeQuery(
      `INSERT INTO TICKET_ASSIGNMENT (
         TICKET_ID,
         ASSIGNED_TO,
         ASSIGNED_BY,
         ASSIGNED_DATE,
         VERIFIED_BY,
         EXP_COMP_DATE,
         TICKET_DESC,
         TICKET_CATEGORY_ID,
         PRIORITY_ID,
         STATUS_ID,
         REMARKS,
         ROLE
       ) VALUES (
         :ticket_id,
         :assigned_to,
         :assigned_by,
         SYSDATE,
         :verified_by,
         CASE
           WHEN :exp_comp_date IS NOT NULL
           THEN TO_DATE(:exp_comp_date, 'YYYY-MM-DD')
           ELSE NULL
         END,
         :ticket_desc,
         :category_id,
         :priority_id,
         :status_id,
         :work_remarks,
         :role
       )
       RETURNING ASSIGNMENT_ID INTO :assignment_id`,
      {
        ticket_id: num(ticket_id),
        assigned_to: num(assigned_to),
        assigned_by: num(assigned_by),
        verified_by: num(verified_by),
        exp_comp_date: dateStr(exp_comp_date),
        ticket_desc: str(ticket_desc),
        category_id: num(category_id),
        priority_id: num(priority_id),
        status_id: { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER },
        work_remarks: str(work_remarks),
        role: str(role || null),
        assignment_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
      },
      "siri_db"
    );

    const newAssignmentId = insertResult.outBinds.assignment_id[0];

    // Insert files
    if (files && files.length > 0) {
      for (const file of files) {
        await db.executeQuery(
          `INSERT INTO TICKET_DOCS (
             DOC_NAME,
             UPLOADED_DATE,
             TICKET_ID,
             ASSIGNMENT_ID,
             DOC_UPLOADER,
             TKT_DOC_FROM
           ) VALUES (
             :doc_name,
             SYSDATE,
             :ticket_id,
             :assignment_id,
             :doc_uploader,
             :tkt_doc_from
           )`,
          {
            doc_name: str(file.filename),
            ticket_id: num(ticket_id),
            assignment_id: { val: newAssignmentId, type: OracleDB.NUMBER },
            doc_uploader: str("SI"),
            tkt_doc_from: str(`SIRI_${assigned_by}`),
          },
          "siri_db"
        );
      }
    }

    return res.status(200).json(
      new ApiResponse(200, null, "Ticket assigned successfully")
    );

  } catch (error) {
    console.error("ASSIGN ERROR:", error);
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Internal server error"
    );
  }
});
const get_all_tickets = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { status } = req.query;

    let query = `
      SELECT 
        TM.TICKET_ID           AS ID,
        C.CUSTOMER_NAME        AS CUSTOMER_NAME,
        CD.CUST_DEPT_NAME      AS DEPARTMENT,
        TM.TITLE               AS TITLE,
        TS.STATUS              AS STATUS,
        TM.CLI_EXCOMP_DATE     AS CLI_EXCOMP_DATE,
        CASE 
          WHEN TM.ASSIGNMENT_STATUS = 'Y' THEN 'Yes'
          ELSE 'No'
        END AS ASSIGNMENT_STATUS
      FROM TICKET_MASTER TM

      LEFT JOIN (
        SELECT CUST_ID, CUST_DEPT_ID,
               ROW_NUMBER() OVER (PARTITION BY CUST_ID ORDER BY CUST_ID) AS RN
        FROM CUST_LOGIN
      ) CL ON TM.CREATED_BY = CL.CUST_ID AND CL.RN = 1

      LEFT JOIN CUSTOMER C
             ON CL.CUST_ID = C.CUSTOMER_ID

      LEFT JOIN CUST_DEPT CD
             ON CL.CUST_DEPT_ID = CD.CUST_DEPT_ID

      LEFT JOIN TICKET_STATUS TS
             ON TM.STATUS_ID = TS.TICKET_STATUS_ID

      WHERE 1=1
    `;

    const binds = {};

    if (status) {
      if (status === 'NEW') {
        query += `
          AND NVL(UPPER(TRIM(TM.ASSIGNMENT_STATUS)),'N') = 'N'
          AND TM.STATUS_ID IN (2, 7, 13)
        `;
      } else {
        query += ` AND UPPER(TS.STATUS) = :status`;
        binds.status = status.toUpperCase();
      }
    }

    const result = await db.executeQuery(query, binds, 'siri_db');

    return res.status(200).json(
      new ApiResponse(200, result.rows)
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});


const get_ticket_progress_by_ticket_id = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { id } = req.params;

    const query = `
      SELECT
        TP.TICKET_PRO_ID,
        TA.TICKET_ID,
        TM.PROJECT_ID,
        TP.CREATED_DATE,
        TP.CREATED_TIME,
        TP.REMARKS,
        CASE 
          WHEN REGEXP_LIKE(TP.PERCENTAGE_COMP, '^[0-9]+$')
          THEN TO_NUMBER(TP.PERCENTAGE_COMP)
          ELSE 0
        END AS PERCENTAGE_COMP,
        PM.PROJECT_NAME,
        EM.NAME AS EMPLOYEE_NAME,
        TA.ASSIGNED_DATE,
        TA.EXP_COMP_DATE,
        TA.TICKET_DESC,
        PR.PRIORITY AS PRIORITY_NAME,
        TC.CATEGORY_NAME, -- 🟢 ADDED CATEGORY
        -- 🟢 SUBQUERY FOR DOCS (To avoid duplicate rows if multiple docs exist)
        (SELECT LISTAGG(DOC_NAME, ',') WITHIN GROUP (ORDER BY DOC_NAME) 
         FROM TICKET_DOCS 
         WHERE ASSIGNMENT_ID = TA.ASSIGNMENT_ID) AS ATTACHMENTS
      FROM TICKET_ASSIGNMENT TA 
      LEFT JOIN TICKET_PROGRESS TP ON TP.TICKET_ASS_ID = TA.ASSIGNMENT_ID
      LEFT JOIN TICKET_MASTER TM ON TA.TICKET_ID = TM.TICKET_ID
      LEFT JOIN PROJECT PM ON TM.PROJECT_ID = PM.PROJECT_ID
      LEFT JOIN EMP EM ON TA.ASSIGNED_TO = EM.EMP_ID
      LEFT JOIN TICKET_PRIORITY PR ON TA.PRIORITY_ID = PR.PRIORITY_ID
      LEFT JOIN TICKET_CATEGORY TC ON TA.TICKET_CATEGORY_ID = TC.CATEGORY_ID -- 🟢 JOIN CATEGORY
      WHERE TA.TICKET_ID = :id
      ORDER BY TP.CREATED_DATE DESC NULLS LAST
    `;

    const result = await db.executeQuery(query, { id }, "siri_db");
    return res.status(200).json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

const get_all_tickets_onsearch = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { customerName, fromDate, toDate, status } = req.query;

    let query = `
      SELECT
        TM.TICKET_ID        AS ID,
        C.CUSTOMER_NAME     AS CUSTOMER_NAME,
        CD.CUST_DEPT_NAME   AS DEPARTMENT,
        TM.TITLE            AS TITLE,
        TS.STATUS           AS STATUS,
        TM.CREATED_AT       AS CREATED_AT,
        CASE 
          WHEN TM.ASSIGNMENT_STATUS = 'Y' THEN 'Yes'
          ELSE 'No'
        END AS ASSIGNMENT_STATUS

      FROM TICKET_MASTER TM

      LEFT JOIN CUSTOMER C
        ON TM.CREATED_BY = C.CUSTOMER_ID

      LEFT JOIN CUST_DEPT CD
        ON TM.CUSTOMER_DEPT_ID = CD.CUST_DEPT_ID

      LEFT JOIN TICKET_STATUS TS
        ON TM.STATUS_ID = TS.TICKET_STATUS_ID

      WHERE 1=1
    `;

    const binds = {};

    // 🔎 Customer search
    if (customerName) {
      query += `
        AND LOWER(TRIM(C.CUSTOMER_NAME)) 
        LIKE '%' || LOWER(TRIM(:customerName)) || '%'
      `;
      binds.customerName = customerName;
    }

    // 📅 CREATED DATE FILTER (FIXED ✅)
    if (fromDate) {
      query += `
        AND TM.CREATED_AT >= TO_DATE(:fromDate,'YYYY-MM-DD')
      `;
      binds.fromDate = fromDate;
    }

    if (toDate) {
      query += `
        AND TM.CREATED_AT < TO_DATE(:toDate,'YYYY-MM-DD') + 1
      `;
      binds.toDate = toDate;
    }

    // ✅ STATUS LOGIC
    if (status === "NEW") {

      query += `
        AND NVL(UPPER(TRIM(TM.ASSIGNMENT_STATUS)), 'N') = 'N'
        AND UPPER(TRIM(TS.STATUS)) IN (
          'SECTION HEAD APPROVED',
          'ASSIGNED',
          'ATTACHMENT REQUIRED'
        )
      `;

    } else if (status === "ASSIGNED") {

      query += `
        AND UPPER(TRIM(TM.ASSIGNMENT_STATUS)) = 'Y'
        AND UPPER(TRIM(TS.STATUS)) IN (
          'ASSIGNED',
          'INPROGRESS',
          'TESTING',
          'VERIFIED'
        )
      `;

    } else if (status) {

      query += `
        AND UPPER(TRIM(TS.STATUS)) = :status
      `;
      binds.status = status.trim().toUpperCase();

    }

    query += ` ORDER BY TM.TICKET_ID DESC`;

    const result = await db.executeQuery(query, binds, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, result.rows)
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

const move_ticket_to_assigned = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { ticket_id } = req.body;

    if (!ticket_id) {
      throw new ApiError(400, "Ticket ID is required");
    }

    const query = `
      UPDATE TICKET_MASTER
      SET ASSIGNMENT_STATUS = 'Y'
      WHERE TICKET_ID = :ticket_id
    `;

    await db.executeQuery(query, { ticket_id }, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, null, "Assignment status updated to Y")
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

const get_ticket_assignments = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { id } = req.params;

    const query = `
      SELECT
        TA.ASSIGNMENT_ID,
        TA.ASSIGNED_DATE,
        TA.ROLE,                    -- ✅ Added to detect conflicts on frontend
        TA.EXP_COMP_DATE,
        TA.TICKET_DESC AS WORK_REMARKS,
        TA.VERIFIED_BY,

        TM.PROJECT_ID,

        EM.NAME AS ASSIGNED_TO,
        EM.EMP_ID AS ASSIGNED_TO_ID,

        PR.PRIORITY AS PRIORITY_NAME,
        PR.PRIORITY_ID AS PRIORITY_ID,

        TC.CATEGORY_NAME,
        TC.CATEGORY_ID AS CATEGORY_ID,

        TS.STATUS,
        TS.TICKET_STATUS_ID AS STATUS_ID,

        TD.DOC_NAME

      FROM TICKET_ASSIGNMENT TA

      LEFT JOIN TICKET_MASTER TM
        ON TA.TICKET_ID = TM.TICKET_ID

      LEFT JOIN EMP EM
        ON TA.ASSIGNED_TO = EM.EMP_ID

      LEFT JOIN TICKET_PRIORITY PR
        ON TA.PRIORITY_ID = PR.PRIORITY_ID

      LEFT JOIN TICKET_CATEGORY TC
        ON TA.TICKET_CATEGORY_ID = TC.CATEGORY_ID

      LEFT JOIN TICKET_STATUS TS
        ON TA.STATUS_ID = TS.TICKET_STATUS_ID

      LEFT JOIN TICKET_DOCS TD
        ON TD.ASSIGNMENT_ID = TA.ASSIGNMENT_ID

      WHERE TA.TICKET_ID = :ticket_id
      ORDER BY TA.ASSIGNED_DATE DESC        -- Added ordering for better history view
    `;

    const result = await db.executeQuery(
      query,
      { ticket_id: Number(id) },   // ✅ FIXED
      "siri_db"
    );

    return res.status(200).json(
      new ApiResponse(200, result.rows)
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_active_ticket_count = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT COUNT(*) AS COUNT
      FROM TICKET_MASTER TM
      LEFT JOIN TICKET_STATUS TS
        ON TM.STATUS_ID = TS.TICKET_STATUS_ID
      WHERE UPPER(TRIM(TS.STATUS)) IN (
        'SECTION HEAD APPROVED',
        'ASSIGNED',
        'INPROGRESS',
        'TESTING',
        'VERIFIED'
      )
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, {
        count: result.rows[0]?.COUNT || 0
      })
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});


const get_new_ticket_count = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    // STATUS_ID = 2 represents the initial "New" or "Open" status
    const query = `
      SELECT COUNT(*) AS COUNT
      FROM TICKET_MASTER
      WHERE STATUS_ID = 2
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    // We return a simple object so the frontend can easily access res.data.count
    return res.status(200).json(
      new ApiResponse(200, {
        count: result.rows[0]?.COUNT || 0
      }, "New ticket count fetched successfully")
    );

  } catch (error) {
    console.error("GET NEW TICKET COUNT ERROR:", error);
    throw new ApiError(500, "Internal server error while fetching ticket count");
  }
});
module.exports = {
   get_taskcategory,
   get_taskpriority,
   get_taskstatus,
   assign_ticket,
   get_ticket_by_id,
   get_all_tickets,
   get_ticket_progress_by_ticket_id,
   get_all_tickets_onsearch,
   move_ticket_to_assigned,
   get_ticket_assignments,
   get_active_ticket_count,
   get_new_ticket_count
  
}

