const { asyncHandler,  ApiError, ApiResponse, DatabaseHandler } = require("../../utils");
const { EmailService } = require("../../utils");
const emailService = new EmailService();



const get_pending_leaves = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    
    const query = `
SELECT
  eld.EMP_LEAVE_DETAIL_ID AS "emp_leave_detail_id",
  eld.EMP_ID              AS "emp_id",
  eld.LEAVE_ID            AS "leave_id",
  e.NAME                  AS "employee_name",
  lm.LEAVE_NAME           AS "leave_name",
  eld.REQ_LEAVE_FROM      AS "from_date",
  eld.REQ_LEAVE_TO        AS "to_date",
  eld.NO_OF_DAYS          AS "no_of_days",
  eld.LEAVE_REASON        AS "leave_reason",
  eld.EMER_CONTACT_NO     AS "emer_contact_no",

  /* ✅ DOC_ID : DOC_NAME */
  LISTAGG(
    ed.EMP_LEAVE_DOC_ID || ':' || ed.DOC_NAME,
    ','
  ) WITHIN GROUP (ORDER BY ed.EMP_LEAVE_DOC_ID) AS "doc_names",

  COUNT(ed.EMP_LEAVE_DOC_ID) AS "doc_count"

FROM EMP_LEAVE_DETAIL eld
JOIN LEAVE_MASTER lm
  ON lm.LEAVE_ID = eld.LEAVE_ID
JOIN EMP e
  ON e.EMP_ID = eld.EMP_ID
LEFT JOIN EMP_LEAVE_DOCS ed
  ON ed.EMP_LEAVE_DETAIL_ID = eld.EMP_LEAVE_DETAIL_ID

WHERE NVL(eld.STATUS,0) = 0

GROUP BY
  eld.EMP_LEAVE_DETAIL_ID,
  eld.LEAVE_ID,
   eld.EMP_ID,
  e.NAME,
  lm.LEAVE_NAME,
  eld.REQ_LEAVE_FROM,
  eld.REQ_LEAVE_TO,
  eld.NO_OF_DAYS,
  eld.LEAVE_REASON,
  eld.EMER_CONTACT_NO

ORDER BY eld.REQ_LEAVE_FROM ASC

`;


    

    const result = await db.executeQuery(query, [], 'siri_db');

    return res
      .status(200)
      .json(new ApiResponse(200, result?.rows));

  } catch (error) {
    console.error(error);
    throw new ApiError(500, 'Internal server error');
  }
});


const getleaveapprovestatusdd = asyncHandler(async (req, res) => {

    try {
        const db = new DatabaseHandler()
        const query = `
      SELECT
  STATUS_ID  AS "status_id",
  APR_STATUS AS "apr_status"
FROM LEAVE_STATUS
ORDER BY STATUS_ID

    `;

        const result = await db.executeQuery(query, undefined, 'siri_db');
        const rows = result.rows || [];

        res.status(200).json(
            new ApiResponse(200, rows, "status fetched successfully")
        );
    } catch (err) {
        throw new ApiError(500, "Error fetching status", err.message);
    }
});

// here we apply logic as earned leave as continuity logic between two earned leaves for cl and ml it not includes an holiday or sunday


const approve_leave = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();

  const {
    emp_leave_detail_id,
    leave_id,
    approved_from,
    approved_to,
    status_id,
    remarks,
  } = req.body;

  /* 1️⃣ VALIDATE STATUS */
  const statusRes = await db.executeQuery(
    `
    SELECT UPPER(APR_STATUS) APR_STATUS
    FROM LEAVE_STATUS
    WHERE STATUS_ID = :ID
    `,
    { ID: status_id },
    "siri_db"
  );

  if (!statusRes.rows.length) {
    throw new ApiError(400, "Invalid status");
  }

  /* 2️⃣ REJECT FLOW */

if (statusRes.rows[0].APR_STATUS === "REJECTED") {

  
  await db.executeQuery(
    `
    UPDATE EMP_LEAVE_DETAIL
    SET STATUS = :S,
        REMARKS = :R
    WHERE EMP_LEAVE_DETAIL_ID = :ID
    `,
    { S: status_id, R: remarks, ID: emp_leave_detail_id },
    "siri_db"
  );

  /* 2️⃣ FETCH EMPLOYEE DETAILS */
  const empRes = await db.executeQuery(
    `
    SELECT e.EMP_ID, e.NAME, e.EMAIL_ID
    FROM EMP e
    JOIN EMP_LEAVE_DETAIL eld ON eld.EMP_ID = e.EMP_ID
    WHERE eld.EMP_LEAVE_DETAIL_ID = :ID
    `,
    { ID: emp_leave_detail_id },
    "siri_db"
  );

  const EMP_ID   = empRes.rows[0]?.EMP_ID;
  const empName  = empRes.rows[0]?.NAME;
  const empEmail = empRes.rows[0]?.EMAIL_ID;

  /* 3️⃣ FETCH REJECTED LEAVE DETAILS */
  const leaveRes = await db.executeQuery(
    `
    SELECT
      lm.LEAVE_NAME,
      TO_CHAR(eld.REQ_LEAVE_FROM, 'DD-MON-YYYY') AS FROM_DATE,
      TO_CHAR(eld.REQ_LEAVE_TO,   'DD-MON-YYYY') AS TO_DATE
    FROM EMP_LEAVE_DETAIL eld
    JOIN LEAVE_MASTER lm ON lm.LEAVE_ID = eld.LEAVE_ID
    WHERE eld.EMP_LEAVE_DETAIL_ID = :ID
    `,
    { ID: emp_leave_detail_id },
    "siri_db"
  );

  const leaveName = leaveRes.rows[0]?.LEAVE_NAME;
  const fromDate  = leaveRes.rows[0]?.FROM_DATE;
  const toDate    = leaveRes.rows[0]?.TO_DATE;

  /* 4️⃣ FETCH ALL REMAINING LEAVE BALANCES */
  const balanceRes = await db.executeQuery(
    `
    SELECT lm.LEAVE_NAME, em.BAL_LEAVE
    FROM EMP_LEAVE_MAST em
    JOIN LEAVE_MASTER lm ON lm.LEAVE_ID = em.LEAVE_ID
    WHERE em.EMP_ID = :EMP_ID
      AND em.CAL_YEAR_ID = (
        SELECT CAL_YEAR_ID FROM CALENDAR_YEAR WHERE STATUS='Y'
      )
    `,
    { EMP_ID },
    "siri_db"
  );

  const balancesHtml = balanceRes.rows
    .map(r => `<li>${r.LEAVE_NAME}: ${r.BAL_LEAVE}</li>`)
    .join("");

  /* 5️⃣ BUILD REJECTION EMAIL */
  const rejectEmailHtml = `
    <p>Dear ${empName || "Employee"},</p>

    <p>
      Your <b style="color:red;">${leaveName}</b> leave request has been
      <b style="color:red;">rejected</b>.
    </p>

    <p>
      <b>Rejected Leave Details:</b><br/>
      <b>Leave Type:</b> ${leaveName}<br/>
      <b>From:</b> ${fromDate}<br/>
      <b>To:</b> ${toDate}
    </p>

    <p>
      <b>Reason for Rejection:</b><br/>
      ${remarks || "No remarks provided"}
    </p>

    <p><b>Remaining Leave Balance:</b></p>
    <ul>
      ${balancesHtml}
    </ul>

    <p>Regards,<br/>HR Team</p>
  `;

  /* 6️⃣ SEND EMAIL (SAFE) */
  try {
    if (empEmail) {
      await emailService.sendEmail(
        "HR Team",
        empEmail,
        "Leave Request Rejected",
        rejectEmailHtml
      );
    }
  } catch (mailErr) {
    console.error("Rejection email failed:", mailErr);
  }

  return res.json(new ApiResponse(200, "Leave rejected"));
}

  /* 3️⃣ FETCH LEAVE + EMP INFO */
  const infoRes = await db.executeQuery(
    `
    SELECT e.EMP_ID, lm.LEAVE_NAME
    FROM EMP_LEAVE_DETAIL e
    JOIN LEAVE_MASTER lm ON lm.LEAVE_ID = e.LEAVE_ID
    WHERE e.EMP_LEAVE_DETAIL_ID = :ID
    `,
    { ID: emp_leave_detail_id },
    "siri_db"
  );

  if (!infoRes.rows.length) {
    throw new ApiError(400, "Invalid leave request");
  }

  const EMP_ID = infoRes.rows[0].EMP_ID;
  const leaveName = infoRes.rows[0].LEAVE_NAME;
  const isCF = leaveName.toLowerCase().includes("comp");

  // 🔴 CRITICAL: fetch applied days (keeps half-day)
const appliedDaysRes = await db.executeQuery(
  `
  SELECT NO_OF_DAYS
  FROM EMP_LEAVE_DETAIL
  WHERE EMP_LEAVE_DETAIL_ID = :ID
  `,
  { ID: emp_leave_detail_id },
  "siri_db"
);

const appliedDays = Number(appliedDaysRes.rows[0]?.NO_OF_DAYS || 0);
// 🔥 detect half-day
const isHalfDay = appliedDays === 0.5;


  const isEL = leaveName.toLowerCase().includes("earned");

  // eearned leave block logic
  if (isEL) {
  const earlierPendingRes = await db.executeQuery(
    `
    SELECT 1
    FROM EMP_LEAVE_DETAIL e
    WHERE e.EMP_ID = :E
      AND e.LEAVE_ID = :L
      AND e.EMP_LEAVE_DETAIL_ID <> :CURR_ID
      AND NVL(e.STATUS,0) = 0
      AND TRUNC(e.REQ_LEAVE_FROM)
          < TO_DATE(:CURR_FROM,'YYYY-MM-DD')
    `,
    {
      E: EMP_ID,
      L: leave_id,
      CURR_ID: emp_leave_detail_id,
      CURR_FROM: approved_from, // 'YYYY-MM-DD'
    },
    "siri_db"
  );

  if (earlierPendingRes.rows.length) {
    const err = new Error("Please approve earlier dated Earned Leave first.");
err.statusCode = 400;
throw err;

  }
}
  /* 4️⃣ UPDATE APPROVAL */
  
  /* 5️⃣ BUILD APPROVED DATES */
  let approvedDates = [];
  let gapDates = [];

  /* 5A️⃣ EARNED LEAVE GAP CONTINUITY */
  if (isEL) {
    const prevRes = await db.executeQuery(
      `
      SELECT PREV_TO
FROM (
  SELECT NVL(e.APPROVED_TO, e.REQ_LEAVE_TO) PREV_TO
  FROM EMP_LEAVE_DETAIL e
  JOIN LEAVE_MASTER lm
    ON lm.LEAVE_ID = e.LEAVE_ID
  WHERE e.EMP_ID = :EMP_ID
    AND NVL(e.STATUS,0) NOT IN (2,3)
    AND LOWER(lm.LEAVE_NAME) LIKE '%earned%'
    AND e.EMP_LEAVE_DETAIL_ID <> :CURR_ID
    AND TRUNC(NVL(e.APPROVED_TO, e.REQ_LEAVE_TO))
        < TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
  ORDER BY NVL(e.APPROVED_TO, e.REQ_LEAVE_TO) DESC
)
WHERE ROWNUM = 1
      `,
      {
  EMP_ID,
  FROM_DATE: approved_from,
  CURR_ID: emp_leave_detail_id
},
      "siri_db"
    );

    if (prevRes.rows.length) {
      const prevTo = prevRes.rows[0].PREV_TO;

      const workingGap = await db.executeQuery(
  `
  SELECT COUNT(*) CNT
FROM (
  SELECT TRUNC(:PREV_TO) + LEVEL DT
  FROM dual
  CONNECT BY LEVEL <= (
    TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
    - TRUNC(:PREV_TO) - 1
  )
)
WHERE
  MOD(TRUNC(DT) - TRUNC(DT,'IW'), 7) <> 6
  AND NOT EXISTS (
    SELECT 1
    FROM HOLIDAYS h
    WHERE TRUNC(h.HOLIDAY_DATE) = DT
  )
  AND NOT EXISTS (
    SELECT 1
    FROM EMP_LEAVE_DETAIL e
    WHERE e.EMP_ID = :EMP_ID
      AND NVL(e.STATUS,0) NOT IN (2,3)
      AND TRUNC(DT) BETWEEN
          TRUNC(NVL(e.APPROVED_FROM,e.REQ_LEAVE_FROM))
          AND TRUNC(NVL(e.APPROVED_TO,e.REQ_LEAVE_TO))
  )
  `,
  {
    EMP_ID,                 
    PREV_TO: prevTo,
    FROM_DATE: approved_from,
  },
  "siri_db"
);


      if (workingGap.rows[0].CNT === 0) {
        const gapRes = await db.executeQuery(
          `
          SELECT TRUNC(:PREV_TO) + LEVEL DT
          FROM dual
          CONNECT BY LEVEL <= (
            TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
            - TRUNC(:PREV_TO) - 1
          )
          `,
          {
            PREV_TO: prevTo,
            FROM_DATE: approved_from,
          },
          "siri_db"
        );

        gapDates = gapRes.rows.map(r => r.DT);
      }
    }
  }

  /* 5B️⃣ CURRENT APPROVED RANGE */
  if (isEL) {
    const resDates = await db.executeQuery(
      `
      SELECT TRUNC(TO_DATE(:F,'YYYY-MM-DD')) + LEVEL - 1 DT
      FROM dual
      CONNECT BY LEVEL <= (
        TRUNC(TO_DATE(:T,'YYYY-MM-DD'))
        - TRUNC(TO_DATE(:F,'YYYY-MM-DD')) + 1
      )
      `,
      { F: approved_from, T: approved_to },
      "siri_db"
    );
    approvedDates = resDates.rows.map(r => r.DT);
  } else {
    const resDates = await db.executeQuery(
      `
      SELECT DT
      FROM (
        SELECT TRUNC(TO_DATE(:F,'YYYY-MM-DD')) + LEVEL - 1 DT
        FROM dual
        CONNECT BY LEVEL <= (
          TRUNC(TO_DATE(:T,'YYYY-MM-DD'))
          - TRUNC(TO_DATE(:F,'YYYY-MM-DD')) + 1
        )
      )
      WHERE
        MOD(TRUNC(DT) - TRUNC(DT,'IW'), 7) <> 6
        AND NOT EXISTS (
          SELECT 1 FROM HOLIDAYS h
          WHERE TRUNC(h.HOLIDAY_DATE) = DT
        )
      `,
      { F: approved_from, T: approved_to },
      "siri_db"
    );
    approvedDates = resDates.rows.map(r => r.DT);
  }
approvedDates.sort((a, b) => new Date(a) - new Date(b));


 const calculatedDays =
  approvedDates.length + gapDates.length;
  const allLeaveDates = [...gapDates, ...approvedDates];
allLeaveDates.sort((a, b) => new Date(a) - new Date(b));

const totalApprovedDays = isHalfDay
  ? 0.5
  : calculatedDays;



  /* 6️⃣ FETCH BALANCE */
  const balRes = await db.executeQuery(
    `
    SELECT BAL_LEAVE
    FROM EMP_LEAVE_MAST
    WHERE EMP_ID = :E
      AND LEAVE_ID = :L
      AND CAL_YEAR_ID = (
        SELECT CAL_YEAR_ID FROM CALENDAR_YEAR WHERE STATUS='Y'
      )
    `,
    { E: EMP_ID, L: leave_id },
    "siri_db"
  );

  const balance = balRes.rows[0]?.BAL_LEAVE ?? 0;
  /* 🔥 STEP 6A: COMP-OFF FIFO CONSUMPTION */
if (isCF && statusRes.rows[0].APR_STATUS === "APPROVED") {

  let remainingToConsume = totalApprovedDays;

  // 1️⃣ Fetch available comp-offs FIFO
  const fifoRes = await db.executeQuery(
    `
    SELECT
  COMP_OFF_ID,
  ROUND(
    (
      TO_NUMBER(SUBSTR(DURATION,1,2)) +
      TO_NUMBER(SUBSTR(DURATION,4,2)) / 60
    ) / 8,
    2
  ) - NVL(USED_DAYS,0) AS AVAILABLE_DAYS
FROM COMP_OFF
WHERE EMP_ID = :EMP_ID
  AND STATUS = 1
  AND EXPIRES_ON >= TRUNC(SYSDATE)
  AND (
    ROUND(
      (
        TO_NUMBER(SUBSTR(DURATION,1,2)) +
        TO_NUMBER(SUBSTR(DURATION,4,2)) / 60
      ) / 8,
      2
    ) - NVL(USED_DAYS,0)
  ) > 0
ORDER BY COMP_OFF_DATE

    `,
    { EMP_ID },
    "siri_db"
  );

  for (const row of fifoRes.rows) {
    if (remainingToConsume <= 0) break;

    const consume = Math.min(remainingToConsume, row.AVAILABLE_DAYS);

    await db.executeQuery(
      `
      UPDATE COMP_OFF
      SET USED_DAYS = NVL(USED_DAYS,0) + :USED
      WHERE COMP_OFF_ID = :ID
      `,
      {
        USED: consume,
        ID: row.COMP_OFF_ID
      },
      "siri_db"
    );

    remainingToConsume -= consume;
  }

  // ❌ Safety: not enough comp-off balance
  if (remainingToConsume > 0) {
    throw new ApiError(400, "Insufficient Comp-Off balance");
  }
}
await db.executeQuery(
    `
    UPDATE EMP_LEAVE_DETAIL
    SET APPROVED_FROM = TO_DATE(:F,'YYYY-MM-DD'),
        APPROVED_TO   = TO_DATE(:T,'YYYY-MM-DD'),
        STATUS        = :S,
        REMARKS       = :R,
        APPROVED_ON   = SYSDATE
    WHERE EMP_LEAVE_DETAIL_ID = :ID
    `,
    {
      F: approved_from,
      T: approved_to,
      S: status_id,
      R: remarks,
      ID: emp_leave_detail_id,
    },
    "siri_db"
  );


  /* 7️⃣ PAID vs LOP */

// 🔥 Correct LOP calculation (supports half-day)
const approvedFromDate = new Date(approved_from);
const approvedToDate   = new Date(approved_to);

const lopDays = Math.max(0, totalApprovedDays - balance);

let lopDates = [];

if (lopDays > 0) {

  const fullLopDays = Math.floor(lopDays);
  const halfLop = lopDays % 1 !== 0;

  // full day LOP
  if (fullLopDays > 0) {
   lopDates = allLeaveDates.slice(-fullLopDays);
  }

  // half day LOP
  if (halfLop) {
    lopDates.push(allLeaveDates[allLeaveDates.length - fullLopDays - 1]);
  }

}



  /* 8️⃣ UPDATE NO_OF_DAYS */
  await db.executeQuery(
    `
    UPDATE EMP_LEAVE_DETAIL
    SET NO_OF_DAYS = :D
    WHERE EMP_LEAVE_DETAIL_ID = :ID
    `,
    { D: totalApprovedDays, ID: emp_leave_detail_id },
    "siri_db"
  );

  


/* 9️⃣ INSERT LOP (Always Individual Record) */
if (lopDates.length > 0) {

  const calYear = await db.executeQuery(
    `SELECT CAL_YEAR_ID FROM CALENDAR_YEAR WHERE STATUS='Y'`,
    {},
    "siri_db"
  );

 let remainingLop = lopDays;

for (let dt of lopDates) {

  const lopValue = remainingLop >= 1 ? 1 : 0.5;

  await db.executeQuery(
    `
    INSERT INTO EMP_LOP
    (
      EMP_LOP_ID,
      CAL_YEAR_ID,
      EMP_ID,
      LEAVE_ID,
      FROM_DATE,
      TO_DATE,
      NO_OF_LOP_DAYS,
      MONTH_YEAR
    )
    VALUES
    (
      EMP_LOP_SEQ.NEXTVAL,
      :CY,
      :E,
      :L,
      :F,
      :T,
      :D,
      TO_CHAR(:F,'MON-YYYY')
    )
    `,
    {
      CY: calYear.rows[0].CAL_YEAR_ID,
      E: EMP_ID,
      L: leave_id,
      F: dt,
      T: dt,
      D: lopValue
    },
    "siri_db"
  );

  remainingLop -= lopValue;
}
}


/* 🔟 UPDATE LEAVE BALANCE (PAID DAYS ONLY) */
// ✅ COMMON LOGIC FOR ALL LEAVES
const paidDays = Math.min(totalApprovedDays, balance);


await db.executeQuery(
  `
  UPDATE EMP_LEAVE_MAST
  SET
    USED_LEAVE = NVL(USED_LEAVE,0) + :TOTAL_USED,
    BAL_LEAVE  =
      CASE
        WHEN NVL(BAL_LEAVE,0) - :PAID < 0 THEN 0
        ELSE NVL(BAL_LEAVE,0) - :PAID
      END
  WHERE EMP_ID = :E
    AND LEAVE_ID = :L
    AND CAL_YEAR_ID = (
      SELECT CAL_YEAR_ID FROM CALENDAR_YEAR WHERE STATUS='Y'
    )
  `,
  {
    TOTAL_USED: totalApprovedDays, 
    PAID: paidDays,                
    E: EMP_ID,
    L: leave_id
  },
  "siri_db"
);


 
/* STEP 11: Fetch employee details */
const empRes = await db.executeQuery(
  `
  SELECT NAME, EMAIL_ID
  FROM EMP
  WHERE EMP_ID = :EMP_ID
  `,
  { EMP_ID },
  "siri_db"
);

const empName = empRes.rows[0]?.NAME;
const empEmail = empRes.rows[0]?.EMAIL_ID;
/* STEP 12: Fetch remaining leave balances */
const balanceRes = await db.executeQuery(
  `
  SELECT lm.LEAVE_NAME, em.BAL_LEAVE
  FROM EMP_LEAVE_MAST em
  JOIN LEAVE_MASTER lm ON lm.LEAVE_ID = em.LEAVE_ID
  WHERE em.EMP_ID = :EMP_ID
    AND em.CAL_YEAR_ID = (
      SELECT CAL_YEAR_ID FROM CALENDAR_YEAR WHERE STATUS='Y'
    )
  `,
  { EMP_ID },
  "siri_db"
);

const balances = {};
balanceRes.rows.forEach(r => {
  balances[r.LEAVE_NAME] = r.BAL_LEAVE;
});
/* STEP 13: Prepare email content */
const emailHtml = `
  <p>Dear ${empName || "Employee"},</p>

  <p>
    Your <b style="color:green;">${leaveName}</b> leave request has been
    <b style="color:green;">approved</b>.
  </p>

  <p>
    <b>Approved Leave Details:</b><br/>
    <b>Leave Type:</b> ${leaveName}<br/>
    <b>From:</b> ${approved_from}<br/>
    <b>To:</b> ${approved_to}<br/>
    <b>Total Days:</b> ${totalApprovedDays}
  </p>

  <p><b>Remaining Leave Balance:</b></p>
  <ul>
    ${Object.entries(balances)
      .map(([name, bal]) => `<li>${name}: ${bal}</li>`)
      .join("")}
  </ul>

  <p>Regards,<br/>HR Team</p>
`;


/* STEP 14: Send approval email */
try {
  if (empEmail) {
    await emailService.sendEmail(
      "HR Team",
      empEmail,
      "Leave Approved",
      emailHtml
    );
  }
} catch (mailErr) {
  console.error("Email sending failed:", mailErr);
}



  return res.json(
    new ApiResponse(200, "Leave approved successfully")
  );
});

// const approve_leave = asyncHandler(async (req, res) => {
//   const db = new DatabaseHandler();

//   const {
//     emp_leave_detail_id,
//     leave_id,
//     approved_from,
//     approved_to,
//     status_id,
//     remarks,
//   } = req.body;

//   /* 1️⃣ VALIDATE STATUS */
//   const statusRes = await db.executeQuery(
//     `
//     SELECT UPPER(APR_STATUS) APR_STATUS
//     FROM LEAVE_STATUS
//     WHERE STATUS_ID = :ID
//     `,
//     { ID: status_id },
//     "siri_db"
//   );

//   if (!statusRes.rows.length) {
//     throw new ApiError(400, "Invalid status");
//   }

//   /* 2️⃣ REJECT FLOW */

// if (statusRes.rows[0].APR_STATUS === "REJECTED") {

  
//   await db.executeQuery(
//     `
//     UPDATE EMP_LEAVE_DETAIL
//     SET STATUS = :S,
//         REMARKS = :R
//     WHERE EMP_LEAVE_DETAIL_ID = :ID
//     `,
//     { S: status_id, R: remarks, ID: emp_leave_detail_id },
//     "siri_db"
//   );

//   /* 2️⃣ FETCH EMPLOYEE DETAILS */
//   const empRes = await db.executeQuery(
//     `
//     SELECT e.EMP_ID, e.NAME, e.EMAIL_ID
//     FROM EMP e
//     JOIN EMP_LEAVE_DETAIL eld ON eld.EMP_ID = e.EMP_ID
//     WHERE eld.EMP_LEAVE_DETAIL_ID = :ID
//     `,
//     { ID: emp_leave_detail_id },
//     "siri_db"
//   );

//   const EMP_ID   = empRes.rows[0]?.EMP_ID;
//   const empName  = empRes.rows[0]?.NAME;
//   const empEmail = empRes.rows[0]?.EMAIL_ID;

//   /* 3️⃣ FETCH REJECTED LEAVE DETAILS */
//   const leaveRes = await db.executeQuery(
//     `
//     SELECT
//       lm.LEAVE_NAME,
//       TO_CHAR(eld.REQ_LEAVE_FROM, 'DD-MON-YYYY') AS FROM_DATE,
//       TO_CHAR(eld.REQ_LEAVE_TO,   'DD-MON-YYYY') AS TO_DATE
//     FROM EMP_LEAVE_DETAIL eld
//     JOIN LEAVE_MASTER lm ON lm.LEAVE_ID = eld.LEAVE_ID
//     WHERE eld.EMP_LEAVE_DETAIL_ID = :ID
//     `,
//     { ID: emp_leave_detail_id },
//     "siri_db"
//   );

//   const leaveName = leaveRes.rows[0]?.LEAVE_NAME;
//   const fromDate  = leaveRes.rows[0]?.FROM_DATE;
//   const toDate    = leaveRes.rows[0]?.TO_DATE;

//   /* 4️⃣ FETCH ALL REMAINING LEAVE BALANCES */
//   const balanceRes = await db.executeQuery(
//     `
//     SELECT lm.LEAVE_NAME, em.BAL_LEAVE
//     FROM EMP_LEAVE_MAST em
//     JOIN LEAVE_MASTER lm ON lm.LEAVE_ID = em.LEAVE_ID
//     WHERE em.EMP_ID = :EMP_ID
//       AND em.CAL_YEAR_ID = (
//         SELECT CAL_YEAR_ID FROM CALENDAR_YEAR WHERE STATUS='Y'
//       )
//     `,
//     { EMP_ID },
//     "siri_db"
//   );

//   const balancesHtml = balanceRes.rows
//     .map(r => `<li>${r.LEAVE_NAME}: ${r.BAL_LEAVE}</li>`)
//     .join("");

//   /* 5️⃣ BUILD REJECTION EMAIL */
//   const rejectEmailHtml = `
//     <p>Dear ${empName || "Employee"},</p>

//     <p>
//       Your <b style="color:red;">${leaveName}</b> leave request has been
//       <b style="color:red;">rejected</b>.
//     </p>

//     <p>
//       <b>Rejected Leave Details:</b><br/>
//       <b>Leave Type:</b> ${leaveName}<br/>
//       <b>From:</b> ${fromDate}<br/>
//       <b>To:</b> ${toDate}
//     </p>

//     <p>
//       <b>Reason for Rejection:</b><br/>
//       ${remarks || "No remarks provided"}
//     </p>

//     <p><b>Remaining Leave Balance:</b></p>
//     <ul>
//       ${balancesHtml}
//     </ul>

//     <p>Regards,<br/>HR Team</p>
//   `;

//   /* 6️⃣ SEND EMAIL (SAFE) */
//   try {
//     if (empEmail) {
//       await emailService.sendEmail(
//         "HR Team",
//         empEmail,
//         "Leave Request Rejected",
//         rejectEmailHtml
//       );
//     }
//   } catch (mailErr) {
//     console.error("Rejection email failed:", mailErr);
//   }

//   return res.json(new ApiResponse(200, "Leave rejected"));
// }

//   /* 3️⃣ FETCH LEAVE + EMP INFO */
//   const infoRes = await db.executeQuery(
//     `
//     SELECT e.EMP_ID, lm.LEAVE_NAME
//     FROM EMP_LEAVE_DETAIL e
//     JOIN LEAVE_MASTER lm ON lm.LEAVE_ID = e.LEAVE_ID
//     WHERE e.EMP_LEAVE_DETAIL_ID = :ID
//     `,
//     { ID: emp_leave_detail_id },
//     "siri_db"
//   );

//   if (!infoRes.rows.length) {
//     throw new ApiError(400, "Invalid leave request");
//   }

//   const EMP_ID = infoRes.rows[0].EMP_ID;
//   const leaveName = infoRes.rows[0].LEAVE_NAME;
//   const isCF = leaveName.toLowerCase().includes("comp");

//   // 🔴 CRITICAL: fetch applied days (keeps half-day)
// const appliedDaysRes = await db.executeQuery(
//   `
//   SELECT NO_OF_DAYS
//   FROM EMP_LEAVE_DETAIL
//   WHERE EMP_LEAVE_DETAIL_ID = :ID
//   `,
//   { ID: emp_leave_detail_id },
//   "siri_db"
// );

// const appliedDays = Number(appliedDaysRes.rows[0]?.NO_OF_DAYS || 0);
// // 🔥 detect half-day
// const isHalfDay = appliedDays === 0.5;


//   const isEL = leaveName.toLowerCase().includes("earned");

//   // eearned leave block logic
//   if (isEL) {
//   const earlierPendingRes = await db.executeQuery(
//     `
//     SELECT 1
//     FROM EMP_LEAVE_DETAIL e
//     WHERE e.EMP_ID = :E
//       AND e.LEAVE_ID = :L
//       AND e.EMP_LEAVE_DETAIL_ID <> :CURR_ID
//       AND NVL(e.STATUS,0) = 0
//       AND TRUNC(e.REQ_LEAVE_FROM)
//           < TO_DATE(:CURR_FROM,'YYYY-MM-DD')
//     `,
//     {
//       E: EMP_ID,
//       L: leave_id,
//       CURR_ID: emp_leave_detail_id,
//       CURR_FROM: approved_from, // 'YYYY-MM-DD'
//     },
//     "siri_db"
//   );

//   if (earlierPendingRes.rows.length) {
//     const err = new Error("Please approve earlier dated Earned Leave first.");
// err.statusCode = 400;
// throw err;

//   }
// }
//   /* 4️⃣ UPDATE APPROVAL */
  
//   /* 5️⃣ BUILD APPROVED DATES */
//   let approvedDates = [];
//   let gapDates = [];

//   /* 5A️⃣ EARNED LEAVE GAP CONTINUITY */
//   if (isEL) {
//     const prevRes = await db.executeQuery(
//       `
//       SELECT PREV_TO
// FROM (
//   SELECT NVL(e.APPROVED_TO, e.REQ_LEAVE_TO) PREV_TO
//   FROM EMP_LEAVE_DETAIL e
//   JOIN LEAVE_MASTER lm
//     ON lm.LEAVE_ID = e.LEAVE_ID
//   WHERE e.EMP_ID = :EMP_ID
//     AND NVL(e.STATUS,0) NOT IN (2,3)
//     AND LOWER(lm.LEAVE_NAME) LIKE '%earned%'
//     AND e.EMP_LEAVE_DETAIL_ID <> :CURR_ID
//     AND TRUNC(NVL(e.APPROVED_TO, e.REQ_LEAVE_TO))
//         < TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
//   ORDER BY NVL(e.APPROVED_TO, e.REQ_LEAVE_TO) DESC
// )
// WHERE ROWNUM = 1
//       `,
//       {
//   EMP_ID,
//   FROM_DATE: approved_from,
//   CURR_ID: emp_leave_detail_id
// },
//       "siri_db"
//     );

//     if (prevRes.rows.length) {
//       const prevTo = prevRes.rows[0].PREV_TO;

//       const workingGap = await db.executeQuery(
//   `
//   SELECT COUNT(*) CNT
// FROM (
//   SELECT TRUNC(:PREV_TO) + LEVEL DT
//   FROM dual
//   CONNECT BY LEVEL <= (
//     TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
//     - TRUNC(:PREV_TO) - 1
//   )
// )
// WHERE
//   MOD(TRUNC(DT) - TRUNC(DT,'IW'), 7) <> 6
//   AND NOT EXISTS (
//     SELECT 1
//     FROM HOLIDAYS h
//     WHERE TRUNC(h.HOLIDAY_DATE) = DT
//   )
//   AND NOT EXISTS (
//     SELECT 1
//     FROM EMP_LEAVE_DETAIL e
//     WHERE e.EMP_ID = :EMP_ID
//       AND NVL(e.STATUS,0) NOT IN (2,3)
//       AND TRUNC(DT) BETWEEN
//           TRUNC(NVL(e.APPROVED_FROM,e.REQ_LEAVE_FROM))
//           AND TRUNC(NVL(e.APPROVED_TO,e.REQ_LEAVE_TO))
//   )
//   `,
//   {
//     EMP_ID,                 
//     PREV_TO: prevTo,
//     FROM_DATE: approved_from,
//   },
//   "siri_db"
// );


//       if (workingGap.rows[0].CNT === 0) {
//         const gapRes = await db.executeQuery(
//           `
//           SELECT TRUNC(:PREV_TO) + LEVEL DT
//           FROM dual
//           CONNECT BY LEVEL <= (
//             TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
//             - TRUNC(:PREV_TO) - 1
//           )
//           `,
//           {
//             PREV_TO: prevTo,
//             FROM_DATE: approved_from,
//           },
//           "siri_db"
//         );

//         gapDates = gapRes.rows.map(r => r.DT);
//       }
//     }
//   }

//   /* 5B️⃣ CURRENT APPROVED RANGE */
//   if (isEL) {
//     const resDates = await db.executeQuery(
//       `
//       SELECT TRUNC(TO_DATE(:F,'YYYY-MM-DD')) + LEVEL - 1 DT
//       FROM dual
//       CONNECT BY LEVEL <= (
//         TRUNC(TO_DATE(:T,'YYYY-MM-DD'))
//         - TRUNC(TO_DATE(:F,'YYYY-MM-DD')) + 1
//       )
//       `,
//       { F: approved_from, T: approved_to },
//       "siri_db"
//     );
//     approvedDates = resDates.rows.map(r => r.DT);
//   } else {
//     const resDates = await db.executeQuery(
//       `
//       SELECT DT
//       FROM (
//         SELECT TRUNC(TO_DATE(:F,'YYYY-MM-DD')) + LEVEL - 1 DT
//         FROM dual
//         CONNECT BY LEVEL <= (
//           TRUNC(TO_DATE(:T,'YYYY-MM-DD'))
//           - TRUNC(TO_DATE(:F,'YYYY-MM-DD')) + 1
//         )
//       )
//       WHERE
//         MOD(TRUNC(DT) - TRUNC(DT,'IW'), 7) <> 6
//         AND NOT EXISTS (
//           SELECT 1 FROM HOLIDAYS h
//           WHERE TRUNC(h.HOLIDAY_DATE) = DT
//         )
//       `,
//       { F: approved_from, T: approved_to },
//       "siri_db"
//     );
//     approvedDates = resDates.rows.map(r => r.DT);
//   }
// approvedDates.sort((a, b) => new Date(a) - new Date(b));


//  const calculatedDays =
//   approvedDates.length + gapDates.length;
//   const allLeaveDates = [...gapDates, ...approvedDates];
// allLeaveDates.sort((a, b) => new Date(a) - new Date(b));

// const totalApprovedDays = isHalfDay
//   ? 0.5
//   : calculatedDays;



//   /* 6️⃣ FETCH BALANCE */
//   const balRes = await db.executeQuery(
//     `
//     SELECT BAL_LEAVE
//     FROM EMP_LEAVE_MAST
//     WHERE EMP_ID = :E
//       AND LEAVE_ID = :L
//       AND CAL_YEAR_ID = (
//         SELECT CAL_YEAR_ID FROM CALENDAR_YEAR WHERE STATUS='Y'
//       )
//     `,
//     { E: EMP_ID, L: leave_id },
//     "siri_db"
//   );

//   const balance = balRes.rows[0]?.BAL_LEAVE ?? 0;
//   /* 🔥 STEP 6A: COMP-OFF FIFO CONSUMPTION */
// if (isCF && statusRes.rows[0].APR_STATUS === "APPROVED") {

//   let remainingToConsume = totalApprovedDays;

//   // 1️⃣ Fetch available comp-offs FIFO
//   const fifoRes = await db.executeQuery(
//     `
//     SELECT
//   COMP_OFF_ID,
//   ROUND(
//     (
//       TO_NUMBER(SUBSTR(DURATION,1,2)) +
//       TO_NUMBER(SUBSTR(DURATION,4,2)) / 60
//     ) / 8,
//     2
//   ) - NVL(USED_DAYS,0) AS AVAILABLE_DAYS
// FROM COMP_OFF
// WHERE EMP_ID = :EMP_ID
//   AND STATUS = 1
//   AND EXPIRES_ON >= TRUNC(SYSDATE)
//   AND (
//     ROUND(
//       (
//         TO_NUMBER(SUBSTR(DURATION,1,2)) +
//         TO_NUMBER(SUBSTR(DURATION,4,2)) / 60
//       ) / 8,
//       2
//     ) - NVL(USED_DAYS,0)
//   ) > 0
// ORDER BY COMP_OFF_DATE

//     `,
//     { EMP_ID },
//     "siri_db"
//   );

//   for (const row of fifoRes.rows) {
//     if (remainingToConsume <= 0) break;

//     const consume = Math.min(remainingToConsume, row.AVAILABLE_DAYS);

//     await db.executeQuery(
//       `
//       UPDATE COMP_OFF
//       SET USED_DAYS = NVL(USED_DAYS,0) + :USED
//       WHERE COMP_OFF_ID = :ID
//       `,
//       {
//         USED: consume,
//         ID: row.COMP_OFF_ID
//       },
//       "siri_db"
//     );

//     remainingToConsume -= consume;
//   }

//   // ❌ Safety: not enough comp-off balance
//   if (remainingToConsume > 0) {
//     throw new ApiError(400, "Insufficient Comp-Off balance");
//   }
// }
// await db.executeQuery(
//     `
//     UPDATE EMP_LEAVE_DETAIL
//     SET APPROVED_FROM = TO_DATE(:F,'YYYY-MM-DD'),
//         APPROVED_TO   = TO_DATE(:T,'YYYY-MM-DD'),
//         STATUS        = :S,
//         REMARKS       = :R,
//         APPROVED_ON   = SYSDATE
//     WHERE EMP_LEAVE_DETAIL_ID = :ID
//     `,
//     {
//       F: approved_from,
//       T: approved_to,
//       S: status_id,
//       R: remarks,
//       ID: emp_leave_detail_id,
//     },
//     "siri_db"
//   );


//   /* 7️⃣ PAID vs LOP */

// // 🔥 Correct LOP calculation (supports half-day)
// const approvedFromDate = new Date(approved_from);
// const approvedToDate   = new Date(approved_to);

// const lopDays = Math.max(0, totalApprovedDays - balance);

// let lopDates = [];

// if (lopDays > 0) {

//   const fullLopDays = Math.floor(lopDays);
//   const halfLop = lopDays % 1 !== 0;

//   // full day LOP
//   if (fullLopDays > 0) {
//    lopDates = allLeaveDates.slice(-fullLopDays);
//   }

//   // half day LOP
//   if (halfLop) {
//     lopDates.push(allLeaveDates[allLeaveDates.length - fullLopDays - 1]);
//   }

// }



//   /* 8️⃣ UPDATE NO_OF_DAYS */
//   await db.executeQuery(
//     `
//     UPDATE EMP_LEAVE_DETAIL
//     SET NO_OF_DAYS = :D
//     WHERE EMP_LEAVE_DETAIL_ID = :ID
//     `,
//     { D: totalApprovedDays, ID: emp_leave_detail_id },
//     "siri_db"
//   );

  


// /* 9️⃣ INSERT LOP (Always Individual Record) */
// if (
//   statusRes.rows[0].APR_STATUS === "APPROVED" &&
//   lopDates.length > 0
// ) {

//   const calYear = await db.executeQuery(
//     `SELECT CAL_YEAR_ID FROM CALENDAR_YEAR WHERE STATUS='Y'`,
//     {},
//     "siri_db"
//   );

//  let remainingLop = lopDays;

// for (let dt of lopDates) {

//   const lopValue = remainingLop >= 1 ? 1 : 0.5;

//   await db.executeQuery(
//     `
//     INSERT INTO EMP_LOP
//     (
//       EMP_LOP_ID,
//       CAL_YEAR_ID,
//       EMP_ID,
//       LEAVE_ID,
//       FROM_DATE,
//       TO_DATE,
//       NO_OF_LOP_DAYS,
//       MONTH_YEAR
//     )
//     VALUES
//     (
//       EMP_LOP_SEQ.NEXTVAL,
//       :CY,
//       :E,
//       :L,
//       :F,
//       :T,
//       :D,
//       TO_CHAR(:F,'MON-YYYY')
//     )
//     `,
//     {
//       CY: calYear.rows[0].CAL_YEAR_ID,
//       E: EMP_ID,
//       L: leave_id,
//       F: dt,
//       T: dt,
//       D: lopValue
//     },
//     "siri_db"
//   );

//   remainingLop -= lopValue;
// }
// }


// /* 🔟 UPDATE LEAVE BALANCE (PAID DAYS ONLY) */
// // ✅ COMMON LOGIC FOR ALL LEAVES
// const paidDays = Math.min(totalApprovedDays, balance);


// await db.executeQuery(
//   `
//   UPDATE EMP_LEAVE_MAST
//   SET
//     USED_LEAVE = NVL(USED_LEAVE,0) + :TOTAL_USED,
//     BAL_LEAVE  =
//       CASE
//         WHEN NVL(BAL_LEAVE,0) - :PAID < 0 THEN 0
//         ELSE NVL(BAL_LEAVE,0) - :PAID
//       END
//   WHERE EMP_ID = :E
//     AND LEAVE_ID = :L
//     AND CAL_YEAR_ID = (
//       SELECT CAL_YEAR_ID FROM CALENDAR_YEAR WHERE STATUS='Y'
//     )
//   `,
//   {
//     TOTAL_USED: totalApprovedDays, 
//     PAID: paidDays,                
//     E: EMP_ID,
//     L: leave_id
//   },
//   "siri_db"
// );


 
// /* STEP 11: Fetch employee details */
// const empRes = await db.executeQuery(
//   `
//   SELECT NAME, EMAIL_ID
//   FROM EMP
//   WHERE EMP_ID = :EMP_ID
//   `,
//   { EMP_ID },
//   "siri_db"
// );

// const empName = empRes.rows[0]?.NAME;
// const empEmail = empRes.rows[0]?.EMAIL_ID;
// /* STEP 12: Fetch remaining leave balances */
// const balanceRes = await db.executeQuery(
//   `
//   SELECT lm.LEAVE_NAME, em.BAL_LEAVE
//   FROM EMP_LEAVE_MAST em
//   JOIN LEAVE_MASTER lm ON lm.LEAVE_ID = em.LEAVE_ID
//   WHERE em.EMP_ID = :EMP_ID
//     AND em.CAL_YEAR_ID = (
//       SELECT CAL_YEAR_ID FROM CALENDAR_YEAR WHERE STATUS='Y'
//     )
//   `,
//   { EMP_ID },
//   "siri_db"
// );

// const balances = {};
// balanceRes.rows.forEach(r => {
//   balances[r.LEAVE_NAME] = r.BAL_LEAVE;
// });
// /* STEP 13: Prepare email content */
// const emailHtml = `
//   <p>Dear ${empName || "Employee"},</p>

//   <p>
//     Your <b style="color:green;">${leaveName}</b> leave request has been
//     <b style="color:green;">approved</b>.
//   </p>

//   <p>
//     <b>Approved Leave Details:</b><br/>
//     <b>Leave Type:</b> ${leaveName}<br/>
//     <b>From:</b> ${approved_from}<br/>
//     <b>To:</b> ${approved_to}<br/>
//     <b>Total Days:</b> ${totalApprovedDays}
//   </p>

//   <p><b>Remaining Leave Balance:</b></p>
//   <ul>
//     ${Object.entries(balances)
//       .map(([name, bal]) => `<li>${name}: ${bal}</li>`)
//       .join("")}
//   </ul>

//   <p>Regards,<br/>HR Team</p>
// `;


// /* STEP 14: Send approval email */
// try {
//   if (empEmail) {
//     await emailService.sendEmail(
//       "HR Team",
//       empEmail,
//       "Leave Approved",
//       emailHtml
//     );
//   }
// } catch (mailErr) {
//   console.error("Email sending failed:", mailErr);
// }



//   return res.json(
//     new ApiResponse(200, "Leave approved successfully")
//   );
// });
const searchEmployeeLeaveDetails = asyncHandler(async (req, res) => {

  try {
    const db = new DatabaseHandler();

    const { emp_id, from_date, to_date } = req.query;

    if (!emp_id) {
      throw new ApiError(400, "Employee is required");
    }

    /* =========================
       1️⃣ LEAVE HISTORY QUERY
    ========================= */

    const query = `
      SELECT
        lm.LEAVE_NAME,
        eld.REQ_LEAVE_FROM,
        eld.REQ_LEAVE_TO,
        eld.NO_OF_DAYS,
        eld.STATUS
      FROM EMP_LEAVE_DETAIL eld
      JOIN LEAVE_MASTER lm
        ON lm.LEAVE_ID = eld.LEAVE_ID
      WHERE eld.EMP_ID = :EMP_ID
        AND (
          :FROM_DATE IS NULL
          OR TRUNC(eld.REQ_LEAVE_FROM) >= TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
        )
        AND (
          :TO_DATE IS NULL
          OR TRUNC(eld.REQ_LEAVE_TO) <= TRUNC(TO_DATE(:TO_DATE,'YYYY-MM-DD'))
        )
      ORDER BY eld.REQ_LEAVE_FROM DESC
    `;

    const result = await db.executeQuery(
      query,
      {
        EMP_ID: emp_id,
        FROM_DATE: from_date || null,
        TO_DATE: to_date || null,
      },
      "siri_db"
    );

    const casual = [];
    const earned = [];
    const medical = [];
    const compoff = [];

    (result.rows || []).forEach((row) => {
      const leave = {
        from: row.REQ_LEAVE_FROM,
        to: row.REQ_LEAVE_TO,
        days: row.NO_OF_DAYS,
        status: row.STATUS,
      };

      const name = row.LEAVE_NAME.toLowerCase();

      if (name.includes("casual")) casual.push(leave);
      else if (name.includes("earned")) earned.push(leave);
      else if (name.includes("medical")) medical.push(leave);
      else if (name.includes("comp")) compoff.push(leave);
    });

    /* =========================
       2️⃣ LEAVE BALANCE QUERY
    ========================= */

    const balanceQuery = `
      SELECT
        lm.LEAVE_NAME,
        elm.BAL_LEAVE
      FROM EMP_LEAVE_MAST elm
      JOIN LEAVE_MASTER lm
        ON lm.LEAVE_ID = elm.LEAVE_ID
      WHERE elm.EMP_ID = :EMP_ID
      ORDER BY lm.LEAVE_NAME
    `;

    const balanceResult = await db.executeQuery(
      balanceQuery,
      { EMP_ID: emp_id },
      "siri_db"
    );

    const leave_summary = (balanceResult.rows || []).map((row) => ({
      LEAVE_NAME: row.LEAVE_NAME,
      BALANCE_LEAVE: row.BAL_LEAVE,
    }));

  

    /* =========================
       FINAL RESPONSE
    ========================= */

    return res.status(200).json(
      new ApiResponse(200, {
        casual,
        earned,
        medical,
        compoff,
        leave_summary,
      })
    );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Failed to fetch leave details");
  }
});




module.exports = {
 get_pending_leaves,
 getleaveapprovestatusdd,
 approve_leave,
 searchEmployeeLeaveDetails

}
 