const { asyncHandler, EmailService, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");
const oracledb = require("oracledb");
const fs = require("fs");
const path = require("path");


const isEarnedLeave = (leaveName = "") =>
  leaveName.toLowerCase().includes("earned");

const apply_leave = asyncHandler(async (req, res) => {

  const db = new DatabaseHandler();

  try {
    const {
      leave_id,
      req_leave_from,
      req_leave_to,
      no_of_days,
      leave_reason,
      half_day,
      emer_contact_no,
    } = req.body;

    /* 1️⃣ OVERLAP CHECK */
    const overlap = await db.executeQuery(
      `
      SELECT COUNT(*) CNT
      FROM EMP_LEAVE_DETAIL
      WHERE EMP_ID = :EMP_ID
        AND NVL(STATUS,0) NOT IN (2,3)
        AND (
          TRUNC(REQ_LEAVE_FROM) <= TRUNC(TO_DATE(:TO_DATE,'YYYY-MM-DD'))
          AND TRUNC(REQ_LEAVE_TO)   >= TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
        )
      `,
      {
        EMP_ID: req.user.emp_id,
        FROM_DATE: req_leave_from,
        TO_DATE: req_leave_to,
      },
      "siri_db"
    );


    if (overlap.rows[0].CNT > 0) {
      return res.status(409).json(
        new ApiResponse(
          409,
          null,
          "Leave already applied for selected date"
        )
      );
    }



  const fromDate = new Date(req_leave_from);
const toDate = new Date(req_leave_to);

const totalDays = Math.floor(
  (Date.parse(req_leave_to) - Date.parse(req_leave_from)) /
  (1000 * 60 * 60 * 24)
) + 1;

    if (isNaN(totalDays) || totalDays <= 0) {
      return res.status(400).json(
        new ApiResponse(
          400,
          null,
          "Leave cannot be applied for Sundays or holidays"
        )
      );

    }


    const leaveMeta = await db.executeQuery(
      `
      SELECT LEAVE_NAME
      FROM LEAVE_MASTER
      WHERE LEAVE_ID = :ID
      `,
      { ID: leave_id },
      "siri_db"
    );

    if (!leaveMeta.rows.length) {
      throw new ApiError(400, "Invalid leave type");
    }

    const leaveName = leaveMeta.rows[0].LEAVE_NAME;
    /* 🚫 BLOCK APPLY IF LEAVE NOT ALLOTTED AT ALL */
    const allotRes = await db.executeQuery(
      `
  SELECT COUNT(*) CNT
  FROM EMP_LEAVE_MAST
  WHERE EMP_ID = :EMP_ID
    AND LEAVE_ID = :LEAVE_ID
    AND CAL_YEAR_ID = (
      SELECT CAL_YEAR_ID
      FROM CALENDAR_YEAR
      WHERE STATUS = 'Y'
    )
  `,
      {
        EMP_ID: req.user.emp_id,
        LEAVE_ID: leave_id,
      },
      "siri_db"
    );

    if (allotRes.rows[0].CNT === 0) {
      return res.status(400).json(
        new ApiResponse(
          400,
          null,
          "Leave is not allotted for this employee. Please contact HR."
        )
      );
    }


    /* ➕ CALCULATE EXCLUDED DAYS (SUNDAY / HOLIDAY) */
    const isEL = leaveName.toLowerCase().includes("earned");

   let workingDays = isEL ? Number(no_of_days) : totalDays;
    let decHolidayArr = [];

    if (!isEL) {
      const dateRes = await db.executeQuery(
        `
    SELECT
  TO_CHAR(DT, 'YYYY-MM-DD') AS DT_STR,
  CASE
    WHEN MOD(TRUNC(DT) - TRUNC(DT,'IW'), 7) = 6 THEN 'Sunday'
    WHEN EXISTS (
      SELECT 1
      FROM HOLIDAYS h
      WHERE TRUNC(h.HOLIDAY_DATE) = DT
    ) THEN 'Holiday'
    ELSE 'Working Day'
  END AS DAY_TYPE
    FROM (
      SELECT TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD')) + LEVEL - 1 DT
      FROM dual
      CONNECT BY LEVEL <= (
        TRUNC(TO_DATE(:TO_DATE,'YYYY-MM-DD'))
        - TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD')) + 1
      )
    )
    `,
        {
          FROM_DATE: req_leave_from,
          TO_DATE: req_leave_to,
        },
        "siri_db"
      );

      workingDays = 0;

      for (const row of dateRes.rows) {
        if (row.DAY_TYPE === "Working Day") {
          workingDays++;
        } else {
          decHolidayArr.push(
            `${row.DT_STR}:${row.DAY_TYPE}`
          );
        }
      }
      
    }

    const decHolidayValue =
      decHolidayArr.length > 0 ? decHolidayArr.join(",") : null;
      /* 🚫 BLOCK EL IF RANGE HAS ONLY HOLIDAYS OR SUNDAYS */

if (isEL) {

  const workingCheck = await db.executeQuery(
    `
    SELECT COUNT(*) CNT
    FROM (
      SELECT TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD')) + LEVEL - 1 DT
      FROM dual
      CONNECT BY LEVEL <= (
        TRUNC(TO_DATE(:TO_DATE,'YYYY-MM-DD'))
        - TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD')) + 1
      )
    )
    WHERE
      MOD(TRUNC(DT) - TRUNC(DT,'IW'), 7) <> 6
      AND NOT EXISTS (
        SELECT 1
        FROM HOLIDAYS h
        WHERE TRUNC(h.HOLIDAY_DATE) = DT
      )
    `,
    {
      FROM_DATE: req_leave_from,
      TO_DATE: req_leave_to,
    },
    "siri_db"
  );

  if (workingCheck.rows[0].CNT === 0) {
    return res.status(400).json(
      new ApiResponse(
        400,
        null,
        "Selected date range does not contain any working days"
      )
    );
  }
}
      
    if (workingDays <= 0) {
      return res.status(400).json(
        new ApiResponse(
          400,
          null,
          "Selected date range does not contain any working days"
        )
      );



    }/* ✅ COMP OFF BALANCE CHECK  */
    const requestedDays =
      half_day && half_day.toUpperCase() === "Y"
        ? 0.5
        : workingDays;

    const isCompOff = leaveName.toLowerCase().includes("comp");

    if (isCompOff) {

      const compAvailRes = await db.executeQuery(
        `
    SELECT NVL(BAL_LEAVE, 0) AS AVAILABLE_DAYS
    FROM EMP_LEAVE_MAST
    WHERE EMP_ID = :EMP_ID
      AND LEAVE_ID = (
        SELECT LEAVE_ID
        FROM LEAVE_MASTER
        WHERE SHORT_NAME = 'CF'
      )
      AND CAL_YEAR_ID = (
        SELECT CAL_YEAR_ID
        FROM CALENDAR_YEAR
        WHERE STATUS = 'Y'
      )
    `,
        { EMP_ID: req.user.emp_id },
        "siri_db"
      );

      const available =
        Number(compAvailRes.rows[0]?.AVAILABLE_DAYS || 0);

      if (requestedDays > available) {
        throw new ApiError(
          400,
          `Insufficient Comp-Off balance. Available: ${available}, Requested: ${requestedDays}`
        );
      }
    }




    /* 4️⃣ MEDICAL CERTIFICATE RULE */
    if (
      leaveName.toLowerCase().includes("medical") &&
      workingDays > 2 &&
      (!req.files || req.files.length === 0)
    ) {
      throw new ApiError(400, "Medical certificate required");
    }

    /* 5️⃣ INSERT */

    const insertResult = await db.executeQuery(
      `
  INSERT INTO EMP_LEAVE_DETAIL
  (
    EMP_ID, LEAVE_ID,
    REQ_LEAVE_FROM, REQ_LEAVE_TO,
    NO_OF_DAYS, HALF_DAY,
    LEAVE_REASON, EMER_CONTACT_NO,
    DEC_HOLIDAYS,
    REQUESTED_ON, APPLIED_TIME
  )
  VALUES
  (
    :EMP_ID, :LEAVE_ID,
    TO_DATE(:FROM_DATE,'YYYY-MM-DD'),
    TO_DATE(:TO_DATE,'YYYY-MM-DD'),
    :NO_OF_DAYS, :HALF_DAY,
    :REASON, :CONTACT, :DEC_HOLIDAYS,
    SYSDATE, TO_CHAR(SYSDATE,'HH12:MI')
  )
  RETURNING EMP_LEAVE_DETAIL_ID INTO :LEAVE_DETAIL_ID
  `,
      {
        EMP_ID: req.user.emp_id,
        LEAVE_ID: leave_id,
        FROM_DATE: req_leave_from,
        TO_DATE: req_leave_to,
        NO_OF_DAYS: requestedDays,   
        DEC_HOLIDAYS: decHolidayValue,
        HALF_DAY: half_day,
        REASON: leave_reason,
        CONTACT: emer_contact_no,
        LEAVE_DETAIL_ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      "siri_db"
    );

    const leaveDetailId =
      insertResult.outBinds.LEAVE_DETAIL_ID[0];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await db.executeQuery(
          `
          INSERT INTO EMP_LEAVE_DOCS
            (EMP_LEAVE_DETAIL_ID, DOC_NAME)
          VALUES
            (:DETAIL_ID, :DOC_NAME)
          `,
          {
            DETAIL_ID: leaveDetailId,
            DOC_NAME: file.filename,
          },
          "siri_db"
        );
      }
    }


    return res.status(200).json(
      new ApiResponse(200, {
        message: "Leave applied successfully",
       no_of_days: requestedDays,
        dec_holidays: decHolidayValue
      })
    );

  } catch (err) {
    console.error(err);

    if (err instanceof ApiError) {
      throw err; 
    }

    throw new ApiError(500, "Apply leave failed");
  }

});

const get_leave_type_dd = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        lm.LEAVE_ID   AS "leave_id",
        lm.LEAVE_NAME AS "leave_name",
        NVL(em.BAL_LEAVE, 0) AS "bal_leave"
      FROM LEAVE_MASTER lm
      LEFT JOIN (
        SELECT EMP_ID, LEAVE_ID, BAL_LEAVE
        FROM EMP_LEAVE_MAST
        WHERE CAL_YEAR_ID = (
          SELECT CAL_YEAR_ID
          FROM CALENDAR_YEAR
          WHERE STATUS = 'Y'
        )
      ) em
        ON em.LEAVE_ID = lm.LEAVE_ID
       AND em.EMP_ID  = :EMP_ID
      ORDER BY lm.LEAVE_NAME
    `;

    const result = await db.executeQuery(
      query,
      { EMP_ID: req.user.emp_id },
      "siri_db"
    );

    return res
      .status(200)
      .json(new ApiResponse(200, result.rows));

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});


const get_remaining_leave = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { emp_id, leave_id } = req.params;   // ✅ get employee id

    const query = `
      SELECT BAL_LEAVE
      FROM EMP_LEAVE_MAST
      WHERE EMP_ID = :EMP_ID
        AND LEAVE_ID = :LEAVE_ID
        AND CAL_YEAR_ID = (
          SELECT CAL_YEAR_ID FROM CALENDAR_YEAR WHERE STATUS = 'Y'
        )
    `;

    const data = {
      EMP_ID: emp_id,       // ✅ employee id
      LEAVE_ID: leave_id,
    };

    const result = await db.executeQuery(query, data, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, result.rows?.[0]?.BAL_LEAVE ?? 0)
    );

  } catch (error) {
    throw new ApiError(500, "Failed to fetch remaining leave");
  }
});
// const calculate_leave_days = asyncHandler(async (req, res) => {
//   const db = new DatabaseHandler();
//   const { from_date, to_date, leave_id } = req.body;

//   if (!from_date || !to_date || !leave_id) {
//     throw new ApiError(400, "Missing required fields");
//   }

//   /* 1️⃣ GET LEAVE TYPE */
//   const leaveMeta = await db.executeQuery(
//     `
//     SELECT LEAVE_NAME
//     FROM LEAVE_MASTER
//     WHERE LEAVE_ID = :ID
//     `,
//     { ID: leave_id },
//     "siri_db"
//   );

//   if (!leaveMeta.rows.length) {
//     throw new ApiError(400, "Invalid leave type");
//   }

//   const leaveName = leaveMeta.rows[0].LEAVE_NAME;
//   const isEL = leaveName.toLowerCase().includes("earned");

//   let totalDays = 0;

//   /* 2️⃣ CASUAL / MEDICAL → EXCLUDE SUNDAYS & HOLIDAYS */
//   if (!isEL) {
//     const daysRes = await db.executeQuery(
//       `
//       SELECT COUNT(*) CNT
//       FROM (
//         SELECT TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD')) + LEVEL - 1 DT
//         FROM dual
//         CONNECT BY LEVEL <= (
//           TRUNC(TO_DATE(:TO_DATE,'YYYY-MM-DD'))
//           - TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD')) + 1
//         )
//       )
//       WHERE
//         MOD(TRUNC(DT) - TRUNC(DT,'IW'), 7) <> 6
//         AND NOT EXISTS (
//           SELECT 1
//           FROM HOLIDAYS h
//           WHERE TRUNC(h.HOLIDAY_DATE) = DT
//         )
//       `,
//       {
//         FROM_DATE: from_date,
//         TO_DATE: to_date,
//       },
//       "siri_db"
//     );

//     totalDays = daysRes.rows[0].CNT;
//   }

//   /* 3️⃣ EARNED LEAVE → CALENDAR DAYS */
//   else {
//     /* Base calendar days */
//     const baseRes = await db.executeQuery(
//       `
//       SELECT
//         (TRUNC(TO_DATE(:TO_DATE,'YYYY-MM-DD'))
//          - TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD')) + 1) CNT
//       FROM dual
//       `,
//       { FROM_DATE: from_date, TO_DATE: to_date },
//       "siri_db"
//     );

//     totalDays = baseRes.rows[0].CNT;

//     /* 4️⃣ PREVIOUS EARNED LEAVE */
//     const prevRes = await db.executeQuery(
//       `
//       SELECT REQ_LEAVE_TO
//       FROM (
//         SELECT e.REQ_LEAVE_TO
//         FROM EMP_LEAVE_DETAIL e
//         JOIN LEAVE_MASTER lm
//           ON lm.LEAVE_ID = e.LEAVE_ID
//         WHERE e.EMP_ID = :EMP_ID
//           AND NVL(e.STATUS,0) NOT IN (2,3)
//           AND LOWER(lm.LEAVE_NAME) LIKE '%earned%'
//           AND TRUNC(e.REQ_LEAVE_TO) < TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
//         ORDER BY e.REQ_LEAVE_TO DESC
//       )
//       WHERE ROWNUM = 1
//       `,
//       {
//         EMP_ID: req.user.emp_id,
//         FROM_DATE: from_date,
//       },
//       "siri_db"
//     );

//    if (prevRes.rows.length) {
//   const prevTo = prevRes.rows[0].REQ_LEAVE_TO;

//   const gapDays =
//     Math.floor(
//       (new Date(from_date) - new Date(prevTo)) /
//       (1000 * 60 * 60 * 24)
//     ) - 1;

//   // ✅ only run sandwich logic if gap exists
//   if (gapDays > 0) {

//   /* 5️⃣ CHECK IF ANY WORKING DAY EXISTS IN GAP */

//       /* 5️⃣ CHECK IF ANY WORKING DAY EXISTS IN GAP */
//       const workingGapRes = await db.executeQuery(
//         `
//         SELECT COUNT(*) CNT
// FROM (
//   SELECT TRUNC(:PREV_TO) + LEVEL DT
//   FROM dual
//   CONNECT BY LEVEL <= (
//     TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
//     - TRUNC(:PREV_TO) - 1
//   )
// )
// WHERE
//   -- working day (Mon–Sat)
//   MOD(TRUNC(DT) - TRUNC(DT,'IW'), 7) <> 6

//   -- not a holiday
//   AND NOT EXISTS (
//     SELECT 1
//     FROM HOLIDAYS h
//     WHERE TRUNC(h.HOLIDAY_DATE) = DT
//   )

//   -- ❌ NO LEAVE EXISTS AT ALL ON THAT DAY
//   AND NOT EXISTS (
//     SELECT 1
//     FROM EMP_LEAVE_DETAIL e
//     WHERE e.EMP_ID = :EMP_ID
//       AND NVL(e.STATUS,0) NOT IN (2,3)
//       AND TRUNC(DT) BETWEEN TRUNC(e.REQ_LEAVE_FROM)
//                          AND TRUNC(e.REQ_LEAVE_TO)
//   )

//         `,
//         {
//           EMP_ID: req.user.emp_id,
//           PREV_TO: prevTo,
//           FROM_DATE: from_date,
//         },
//         "siri_db"
//       );

//       /* 6️⃣ IF NO WORKING DAY → ADD ALL GAP DAYS */
//       if (workingGapRes.rows[0].CNT === 0) {
//         const gapDaysRes = await db.executeQuery(
//           `
//           SELECT COUNT(*) CNT
//           FROM (
//             SELECT TRUNC(:PREV_TO) + LEVEL DT
//             FROM dual
//             CONNECT BY LEVEL <= (
//               TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
//               - TRUNC(:PREV_TO) - 1
//             )
//           )
//           `,
//           {
//             PREV_TO: prevTo,
//             FROM_DATE: from_date,
//           },
//           "siri_db"
//         );

//         totalDays += gapDaysRes.rows[0].CNT;
//       }
//     }
//   }
// }
//   return res.status(200).json(
//     new ApiResponse(200, totalDays)
//   );

// });
const calculate_leave_days = asyncHandler(async (req, res) => {

  const db = new DatabaseHandler();

 const { from_date, to_date, leave_id, emp_id } = req.body;


const employeeId = emp_id || req.user.emp_id;

if (!from_date || !to_date || !leave_id) {
  throw new ApiError(400, "Missing required fields");
}

  /* 1️⃣ GET LEAVE TYPE */

  const leaveMeta = await db.executeQuery(
    `
    SELECT LEAVE_NAME
    FROM LEAVE_MASTER
    WHERE LEAVE_ID = :ID
    `,
    { ID: leave_id },
    "siri_db"
  );

  if (!leaveMeta.rows.length) {
    throw new ApiError(400, "Invalid leave type");
  }

  const leaveName = leaveMeta.rows[0].LEAVE_NAME;
  const isEL = leaveName.toLowerCase().includes("earned");

  let totalDays = 0;

  /* 2️⃣ CASUAL / MEDICAL → EXCLUDE SUNDAYS & HOLIDAYS */

  if (!isEL) {

    const daysRes = await db.executeQuery(
      `
      SELECT COUNT(*) CNT
      FROM (
        SELECT TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD')) + LEVEL - 1 DT
        FROM dual
        CONNECT BY LEVEL <= (
          TRUNC(TO_DATE(:TO_DATE,'YYYY-MM-DD'))
          - TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD')) + 1
        )
      )
      WHERE
        MOD(TRUNC(DT) - TRUNC(DT,'IW'), 7) <> 6
        AND NOT EXISTS (
          SELECT 1
          FROM HOLIDAYS h
          WHERE TRUNC(h.HOLIDAY_DATE) = DT
        )
      `,
      {
        FROM_DATE: from_date,
        TO_DATE: to_date
      },
      "siri_db"
    );

    totalDays = daysRes.rows[0].CNT;

  }

  /* 3️⃣ EARNED LEAVE → CALENDAR DAYS + CONTINUITY */

  else {

    /* Base calendar days */

    const baseRes = await db.executeQuery(
      `
      SELECT
        (TRUNC(TO_DATE(:TO_DATE,'YYYY-MM-DD'))
         - TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD')) + 1) CNT
      FROM dual
      `,
      { FROM_DATE: from_date, TO_DATE: to_date },
      "siri_db"
    );

    totalDays = baseRes.rows[0].CNT;

    /* 4️⃣ FIND PREVIOUS EL */

    const prevRes = await db.executeQuery(
      `
      SELECT PREV_TO
      FROM (
        SELECT NVL(e.APPROVED_TO,e.REQ_LEAVE_TO) PREV_TO
        FROM EMP_LEAVE_DETAIL e
        JOIN LEAVE_MASTER lm
          ON lm.LEAVE_ID = e.LEAVE_ID
        WHERE e.EMP_ID = :EMP_ID
          AND NVL(e.STATUS,0) NOT IN (2,3)
          AND LOWER(lm.LEAVE_NAME) LIKE '%earned%'
          AND TRUNC(NVL(e.APPROVED_TO,e.REQ_LEAVE_TO))
              < TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
        ORDER BY NVL(e.APPROVED_TO,e.REQ_LEAVE_TO) DESC
      )
      WHERE ROWNUM = 1
      `,
      {
       EMP_ID: employeeId,
        FROM_DATE: from_date
      },
      "siri_db"
    );

    if (prevRes.rows.length) {

      const prevTo = prevRes.rows[0].PREV_TO;

      /* 5️⃣ CHECK IF GAP HAS WORKING DAY */

      const workingGapRes = await db.executeQuery(
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
          EMP_ID: employeeId,
          PREV_TO: prevTo,
          FROM_DATE: from_date
        },
        "siri_db"
      );

      /* 6️⃣ IF NO WORKING DAY → ADD GAP */

      const prevDate = new Date(prevTo);
const currDate = new Date(from_date);

const gapDays =
  Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24)) - 1;

if (gapDays > 0 && workingGapRes.rows[0].CNT === 0) {

  const gapRes = await db.executeQuery(
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
    `,
    {
      PREV_TO: prevTo,
      FROM_DATE: from_date
    },
    "siri_db"
  );

  totalDays += gapRes.rows[0].CNT;

}

    }

  }

  return res.status(200).json(
    new ApiResponse(200, totalDays)
  );

});

const getemployeeleavedetail = asyncHandler(async (req, res) => {

  try {
    const db = new DatabaseHandler();

    const empId = req.user.emp_id;


    const query = `
      SELECT
  e.NAME,              
  eld.EMP_LEAVE_DETAIL_ID,
  eld.EMP_ID,
  lm.LEAVE_NAME,
  eld.STATUS,
  eld.REQ_LEAVE_FROM,
  eld.REQ_LEAVE_TO,
  eld.APPROVED_FROM,
  eld.APPROVED_TO,
  eld.NO_OF_DAYS,
  eld.REQUESTED_ON,
  eld.APPROVED_ON,
  eld.LEAVE_REASON,
  eld.HALF_DAY
FROM EMP_LEAVE_DETAIL eld
JOIN LEAVE_MASTER lm
  ON eld.LEAVE_ID = lm.LEAVE_ID
JOIN EMP e               
  ON e.EMP_ID = eld.EMP_ID
WHERE eld.EMP_ID = :EMP_ID
ORDER BY eld.REQUESTED_ON DESC

    `;

    const result = await db.executeQuery(
      query,
      { EMP_ID: empId },
      "siri_db"

    );

    return res.status(200).json({
      statusCode: 200,
      success: true,
      items: result.rows,
    });

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

const getEmployeeLeaveCards = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const empId = req.user.emp_id;

    const query = `
     SELECT
  lm.LEAVE_NAME,
  elm.ALLOTED     AS ALLOTED,
  elm.USED_LEAVE  AS USED_LEAVE,
  elm.BAL_LEAVE   AS BAL_LEAVE,
  elm.EXP_COMPOFF AS EXP_COMPOFF,

  /* ✅ Previous year Earned Leave balance (Carry Forward) */
  CASE
    WHEN LOWER(lm.LEAVE_NAME) LIKE '%earned%' THEN (
      SELECT NVL(prev.BAL_LEAVE, 0)
      FROM EMP_LEAVE_MAST prev
      WHERE prev.EMP_ID = elm.EMP_ID
        AND prev.LEAVE_ID = elm.LEAVE_ID
        AND prev.CAL_YEAR_ID = elm.CAL_YEAR_ID - 1
    )
    ELSE 0
  END AS CARRY_FORWARD

FROM EMP_LEAVE_MAST elm
JOIN LEAVE_MASTER lm
  ON lm.LEAVE_ID = elm.LEAVE_ID
WHERE elm.EMP_ID = :EMP_ID
  AND elm.CAL_YEAR_ID = (
    SELECT CAL_YEAR_ID
    FROM CALENDAR_YEAR
    WHERE STATUS = 'Y'
  )
    `;

    const result = await db.executeQuery(
      query,
      { EMP_ID: empId },
      "siri_db"
    );


    return res.status(200).json(
      new ApiResponse(200, result.rows)
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(
      500,
      "Failed to fetch leave cards",
      error
    );
  }
});
const previewLeaveDocument = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const { docId } = req.params;


  const result = await db.executeQuery(
    `
    SELECT DOC_NAME
    FROM EMP_LEAVE_DOCS
    WHERE EMP_LEAVE_DOC_ID = :DOC_ID
    `,
    { DOC_ID: docId },
    "siri_db"
  );

  if (!result.rows.length) {
    throw new ApiError(404, "Document not found");
  }

  const { DOC_NAME } = result.rows[0];


  // const filePath = path.join(
  //   process.cwd(),
  //   "uploads",
  //   "leave_docs",
  //   DOC_NAME
  // );
  const filePath = path.join(
    __dirname, '..', '..', '..',
    "uploads",
    "leave_docs",
    DOC_NAME
  );

  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, "File not found on server");
  }

  // 🔥 inline = preview in browser
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${DOC_NAME}"`
  );

  fs.createReadStream(filePath).pipe(res);
});

const get_employee_lop_days = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const emp_id = req.user.emp_id;

    const query = `
      SELECT
  lm.LEAVE_NAME,
  SUM(el.NO_OF_LOP_DAYS) AS LOP_DAYS
FROM EMP_LOP el
JOIN LEAVE_MASTER lm
  ON lm.LEAVE_ID = el.LEAVE_ID
WHERE el.EMP_ID = :EMP_ID
  AND el.CAL_YEAR_ID = (
    SELECT CAL_YEAR_ID FROM CALENDAR_YEAR WHERE STATUS='Y'
  )
GROUP BY lm.LEAVE_NAME


    `;

    const result = await db.executeQuery(query, { emp_id }, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, result.rows)
    );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const check_leave_overlap = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const { from_date, to_date } = req.body;

  if (!from_date || !to_date) {
    throw new ApiError(400, "Dates required");
  }

  const overlap = await db.executeQuery(
    `
    SELECT COUNT(*) CNT
    FROM EMP_LEAVE_DETAIL
    WHERE EMP_ID = :EMP_ID
      AND NVL(STATUS,0) NOT IN (2,3)
      AND (
        TRUNC(REQ_LEAVE_FROM) <= TRUNC(TO_DATE(:TO_DATE,'YYYY-MM-DD'))
        AND TRUNC(REQ_LEAVE_TO)   >= TRUNC(TO_DATE(:FROM_DATE,'YYYY-MM-DD'))
      )
    `,
    {
      EMP_ID: req.user.emp_id,
      FROM_DATE: from_date,
      TO_DATE: to_date,
    },
    "siri_db"
  );

  return res.status(200).json(
    new ApiResponse(200, {
      hasOverlap: overlap.rows[0].CNT > 0,
    })
  );
});

const getTodayApprovedLeavesForAdmin = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();

  const result = await db.executeQuery(
    `
    SELECT
      e.NAME,
      eld.EMP_ID,
      lm.LEAVE_NAME,
      eld.APPROVED_FROM,
      eld.APPROVED_TO
    FROM EMP_LEAVE_DETAIL eld
    JOIN LEAVE_MASTER lm ON lm.LEAVE_ID = eld.LEAVE_ID
    JOIN EMP e ON e.EMP_ID = eld.EMP_ID
  WHERE (eld.STATUS IS NULL OR eld.STATUS IN (0,1))
  AND TRUNC(SYSDATE)
      BETWEEN TRUNC(NVL(eld.APPROVED_FROM, eld.REQ_LEAVE_FROM))
          AND TRUNC(NVL(eld.APPROVED_TO, eld.REQ_LEAVE_TO))
    `,
    {},
    "siri_db"
  );

  return res.status(200).json(
    new ApiResponse(200, result.rows)
  );
});



module.exports = {
  get_leave_type_dd,
  apply_leave,
  get_remaining_leave,
  calculate_leave_days,
  getemployeeleavedetail,
  getEmployeeLeaveCards,
  previewLeaveDocument,
  get_employee_lop_days,
  check_leave_overlap,
  getTodayApprovedLeavesForAdmin

}