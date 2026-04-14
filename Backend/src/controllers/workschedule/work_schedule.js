import bcrypt from "bcrypt";
const { asyncHandler, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");
const { EmailService } = require("../../utils");
const emailService = new EmailService();
const get_status_master = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();

  const result = await db.executeQuery(
    `
    SELECT STATUS_ID, WORK_STATUS
    FROM WORK_STATUS
    ORDER BY STATUS_ID
    `,
    {},
    "siri_db"
  );

  return res.status(200).json(result.rows);
});

const getEmployee = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        EMP_ID   AS "emp_id",
        NAME     AS "emp_name"
      FROM EMP
      WHERE WORK_ON_OFFICE = 'Y'
      ORDER BY NAME
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(
        200,
        result.rows || [],
        "Employee list fetched successfully"
      )
    );
  } catch (err) {
    console.error("Error fetching employee list:", err);
    throw new ApiError(500, "Error fetching employee list", err.message);
  }
});
const save_work_schedule = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const { schedule } = req.body;

  if (!schedule || !schedule.length) {
    throw new ApiError(400, "Schedule data is required");
  }

  for (const item of schedule) {
    const { emp_id, day, status_id } = item;

    await db.executeQuery(
      `
      MERGE INTO WORK_SCHEDULE ws
      USING dual
      ON (ws.EMP_ID = :EMP_ID AND ws.DAYS = :DAY)
     WHEN MATCHED THEN
  UPDATE SET 
    ws.STATUS_ID = :STATUS_ID,
    ws.UPDATED_DATE = SYSDATE
      WHEN NOT MATCHED THEN
        INSERT (SCHEDULE_ID, EMP_ID, DAYS, STATUS_ID, UPDATED_DATE)
VALUES (
  WORK_SCHEDULE_SEQ.NEXTVAL,
  :EMP_ID,
  :DAY,
  :STATUS_ID,
  SYSDATE
)
      `,
      {
        EMP_ID: emp_id,
        DAY: day,
        STATUS_ID: status_id
      },
      "siri_db"
    );
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Work schedule saved successfully")
  );
});


 const get_work_schedule = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();

  const result = await db.executeQuery(
    `
    SELECT 
      EMP_ID,
      DAYS AS day,
      STATUS_ID
    FROM WORK_SCHEDULE
    `,
    {},
    "siri_db"
  );

  return res.status(200).json(
    new ApiResponse(200, result.rows || result, "Schedule fetched successfully")
  );
});

// const send_schedule_email = asyncHandler(async (req, res) => {
//   const db = new DatabaseHandler();
//   const { force } = req.body;

//   /* ✅ 1. CHECK TODAY EMAIL SENT */
//   const alreadySent = await db.executeQuery(
//     `
//     SELECT 1 FROM SCHEDULE_EMAIL_LOG
//     WHERE TRUNC(SENT_DATE) = TRUNC(SYSDATE)
//     `,
//     {},
//     "siri_db"
//   );

//   if (alreadySent.rows.length && !force) {
//     return res.status(200).json({
//       message: "ALREADY_SENT"
//     });
//   }

//   /* ✅ 2. GET LAST EMAIL DATE */
//   const lastEmailRes = await db.executeQuery(
//     `
//     SELECT MAX(SENT_DATE) AS LAST_SENT
//     FROM SCHEDULE_EMAIL_LOG
//     `,
//     {},
//     "siri_db"
//   );

//   const lastSentDate = lastEmailRes.rows[0]?.LAST_SENT;

//   /* ✅ 3. GET UPDATED RECORDS */
//   let query = `
//     SELECT EMP_ID, DAYS, STATUS_ID
//     FROM WORK_SCHEDULE
//   `;

//   if (lastSentDate) {
//     query += ` WHERE UPDATED_DATE > :LAST_SENT`;
//   }

//   const result = await db.executeQuery(
//     query,
//     lastSentDate ? { LAST_SENT: lastSentDate } : {},
//     "siri_db"
//   );

//   /* ✅ 4. NO CHANGES */
//   if (!result.rows.length && !force) {
//     return res.status(200).json({
//       message: "NO_CHANGES"
//     });
//   }

//   /* ✅ 5. IF FORCE → SEND ALL */
//   let finalRows = result.rows;

//   if (force && !result.rows.length) {
//     const allRes = await db.executeQuery(
//       `
//       SELECT EMP_ID, DAYS, STATUS_ID
//       FROM WORK_SCHEDULE
//       `,
//       {},
//       "siri_db"
//     );

//     finalRows = allRes.rows;
//   }

//   /* ✅ 6. GET STATUS MASTER */
//   const statusRes = await db.executeQuery(
//     `SELECT STATUS_ID, WORK_STATUS FROM WORK_STATUS`,
//     {},
//     "siri_db"
//   );

//   const statusMap = {};
//   statusRes.rows.forEach(s => {
//     statusMap[s.STATUS_ID] = s.WORK_STATUS;
//   });

//   /* ✅ 7. GROUP DATA BY EMPLOYEE */
//   const finalData = {};

//   finalRows.forEach(row => {
//     if (!finalData[row.EMP_ID]) {
//       finalData[row.EMP_ID] = [];
//     }

//     finalData[row.EMP_ID].push({
//       day: row.DAYS,
//       status_id: row.STATUS_ID
//     });
//   });

//   /* ✅ 8. SEND EMAIL */
//   for (const emp_id of Object.keys(finalData)) {
//     try {
//       const empRes = await db.executeQuery(
//         `
//         SELECT NAME, EMAIL_ID
//         FROM EMP
//         WHERE EMP_ID = :EMP_ID
//         `,
//         { EMP_ID: emp_id },
//         "siri_db"
//       );

//       const empName = empRes.rows[0]?.NAME;
//       const empEmail = empRes.rows[0]?.EMAIL_ID;

//       if (!empEmail) continue;

//       const empSchedule = finalData[emp_id];

//       const rows = empSchedule.map(s => `
//         <tr>
//           <td>${s.day}</td>
//           <td>${statusMap[s.status_id] || s.status_id}</td>
//         </tr>
//       `).join("");

//       const emailHtml = `
//         <p>Dear ${empName || "Employee"},</p>

//         <p>Your <b style="color:blue;">work schedule has been updated</b>.</p>

//         <table border="1" cellpadding="6" cellspacing="0">
//           <tr>
//             <th>Day</th>
//             <th>Status</th>
//           </tr>
//           ${rows}
//         </table>

//         <p>Regards,<br/>HR Team</p>
//       `;

//       await emailService.sendEmail(
//         "HR Team",
//         empEmail,
//         "Work Schedule Updated",
//         emailHtml
//       );

//     } catch (err) {
//       console.error("Email failed for emp:", emp_id, err);
//     }
//   }

//   /* ✅ 9. INSERT EMAIL LOG */
//   await db.executeQuery(
//     `
//     INSERT INTO SCHEDULE_EMAIL_LOG (ID, SENT_DATE)
//     VALUES (SCHEDULE_EMAIL_SEQ.NEXTVAL, SYSDATE)
//     `,
//     {},
//     "siri_db"
//   );

//   return res.status(200).json({
//     message: "EMAIL_SENT"
//   });
// });
const send_schedule_email = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const { force } = req.body;

  /* 1. GET LAST EMAIL DATE */
  const lastEmailRes = await db.executeQuery(
    `
    SELECT MAX(SENT_DATE) AS LAST_SENT
    FROM SCHEDULE_EMAIL_LOG
    `,
    {},
    "siri_db"
  );

  const lastSentDate = lastEmailRes.rows[0]?.LAST_SENT;

  /*  2. GET UPDATED RECORDS */
  let query = `
    SELECT EMP_ID, DAYS, STATUS_ID
    FROM WORK_SCHEDULE
  `;

  if (lastSentDate) {
    query += ` WHERE UPDATED_DATE > :LAST_SENT`;
  }

  const result = await db.executeQuery(
    query,
    lastSentDate ? { LAST_SENT: lastSentDate } : {},
    "siri_db"
  );

  /*  3. NO CHANGES FIRST (IMPORTANT FIX) */
  if (!result.rows.length && !force) {
    return res.status(200).json({
      message: "NO_CHANGES"
    });
  }

  /*  4. CHECK TODAY EMAIL SENT */
  const alreadySent = await db.executeQuery(
    `
    SELECT 1 FROM SCHEDULE_EMAIL_LOG
    WHERE TRUNC(SENT_DATE) = TRUNC(SYSDATE)
    `,
    {},
    "siri_db"
  );

  if (alreadySent.rows.length && !force) {
    return res.status(200).json({
      message: "ALREADY_SENT"
    });
  }

  /* 5. IF FORCE → SEND ALL */
 
const changedEmpIds = [...new Set(result.rows.map(r => r.EMP_ID))];

let finalRows = [];

if (changedEmpIds.length > 0) {
 
  const fullRes = await db.executeQuery(
    `
    SELECT EMP_ID, DAYS, STATUS_ID
    FROM WORK_SCHEDULE
    WHERE EMP_ID IN (${changedEmpIds.join(",")})
    `,
    {},
    "siri_db"
  );

  finalRows = fullRes.rows;
}

 if (force && !result.rows.length) {
  const allRes = await db.executeQuery(
    `
    SELECT EMP_ID, DAYS, STATUS_ID
    FROM WORK_SCHEDULE
    `,
    {},
    "siri_db"
  );

  finalRows = allRes.rows;
}

  /* 6. GET STATUS MASTER */
  const statusRes = await db.executeQuery(
    `SELECT STATUS_ID, WORK_STATUS FROM WORK_STATUS`,
    {},
    "siri_db"
  );

  const statusMap = {};
  statusRes.rows.forEach(s => {
    statusMap[s.STATUS_ID] = s.WORK_STATUS;
  });

  /* 7. GROUP DATA */
  const finalData = {};

  finalRows.forEach(row => {
    if (!finalData[row.EMP_ID]) {
      finalData[row.EMP_ID] = [];
    }

    finalData[row.EMP_ID].push({
      day: row.DAYS,
      status_id: row.STATUS_ID
    });
  });

  /* 8. SEND EMAIL */
  for (const emp_id of Object.keys(finalData)) {
    try {
      const empRes = await db.executeQuery(
        `
        SELECT NAME, EMAIL_ID
        FROM EMP
        WHERE EMP_ID = :EMP_ID
        `,
        { EMP_ID: emp_id },
        "siri_db"
      );

      const empName = empRes.rows[0]?.NAME;
      const empEmail = empRes.rows[0]?.EMAIL_ID;

      if (!empEmail) continue;

      const rows = finalData[emp_id].map(s => `
        <tr>
          <td>${s.day}</td>
          <td>${statusMap[s.status_id] || s.status_id}</td>
        </tr>
      `).join("");

    const emailHtml = `
  <p>Dear ${empName || "Employee"},</p>

  <p>
    Your <b style="color:blue;">work schedule has been updated</b>.
    Kindly review the details below.
  </p>

  <p><b>Schedule Details:</b></p>

  <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
    <tr style="background-color:#f2f2f2;">
      <th>Day</th>
      <th>Status</th>
    </tr>
    ${rows}
  </table>

  <p style="margin-top:10px;">
    Kindly follow this schedule from the <b>next working day</b>.
  </p>

  <p>
    If you have any questions, please contact HR.
  </p>

  <p>
    Regards,<br/>
    <b>HR Team</b>
  </p>
`;

      await emailService.sendEmail(
        "HR Team",
        empEmail,
        "Work Schedule Updated",
        emailHtml
      );

    } catch (err) {
      console.error("Email failed for emp:", emp_id, err);
    }
  }

  /*  9. INSERT EMAIL LOG */
  await db.executeQuery(
    `
    INSERT INTO SCHEDULE_EMAIL_LOG (ID, SENT_DATE)
    VALUES (SCHEDULE_EMAIL_SEQ.NEXTVAL, SYSDATE)
    `,
    {},
    "siri_db"
  );

  return res.status(200).json({
    message: "EMAIL_SENT"
  });
});
const getAllEmployeeLeavesForSchedule = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
SELECT
  e.NAME,
  eld.EMP_ID,
  lm.LEAVE_NAME,

  TO_CHAR(eld.REQ_LEAVE_FROM, 'YYYY-MM-DD') AS "FROM_DATE",
  TO_CHAR(eld.REQ_LEAVE_TO, 'YYYY-MM-DD')   AS "TO_DATE"

FROM EMP_LEAVE_DETAIL eld
JOIN LEAVE_MASTER lm ON lm.LEAVE_ID = eld.LEAVE_ID
JOIN EMP e ON e.EMP_ID = eld.EMP_ID
WHERE NVL(eld.STATUS,0) IN (0,1)
`;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, result.rows, "All employee leaves fetched")
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Failed to fetch employee leaves");
  }
});
const getHolidaysForSchedule = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const result = await db.executeQuery(
      `
      SELECT
        TO_CHAR(HOLIDAY_DATE, 'YYYY-MM-DD') AS HOLIDAY_DATE_STR,
        TITLE AS NAME
      FROM HOLIDAYS
      ORDER BY HOLIDAY_DATE
      `,
      {},
      "siri_db"
    );

    return res.status(200).json(
      new ApiResponse(200, result.rows, "Holidays fetched")
    );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Failed to fetch holidays");
  }
});
module.exports = {
  get_status_master,
  getEmployee,
  save_work_schedule,
  get_work_schedule,
  getAllEmployeeLeavesForSchedule,
  getHolidaysForSchedule,
  send_schedule_email
  
};
