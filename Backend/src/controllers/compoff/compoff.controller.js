const { asyncHandler, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");
const createCompoff = asyncHandler(async (req, res) => {
  try {
    const {
      comp_off_date,
      start_time,
      end_time,
      duration,
      expires_on,
    } = req.body;

    const emp_id = req.user.emp_id;
    const db = new DatabaseHandler();

    const checkQuery = `
  SELECT COUNT(*) AS CNT
  FROM COMP_OFF
  WHERE EMP_ID = :emp_id
    AND COMP_OFF_DATE = TO_DATE(:comp_off_date, 'YYYY-MM-DD')
`;

    const checkRes = await db.executeQuery(
      checkQuery,
      {
        emp_id,
        comp_off_date,
      },
      "siri_db"
    );

    if (checkRes.rows[0].CNT > 0) {
      return res.status(409).json(
        new ApiResponse(
          409,
          null,
          "Comp-Off already applied for this date"
        )
      );
    }


    const insertQuery = `
  INSERT INTO COMP_OFF (
    COMP_OFF_DATE,
    START_TIME,
    END_TIME,
    STATUS,
    DURATION,
    EXPIRES_ON,
    EMP_ID
  ) VALUES (
    TO_DATE(:comp_off_date, 'YYYY-MM-DD'),
    :start_time,
    :end_time,
    :status,
    :duration,
    TO_DATE(:expires_on, 'YYYY-MM-DD'),
    :emp_id
  )
`;


    const bindData = {
      comp_off_date: comp_off_date || null,
      start_time,
      end_time,
      status: 0,
      duration,
      expires_on: expires_on || null,
      emp_id,
    };


    await db.executeQuery(insertQuery, bindData, "siri_db");

    return res.status(201).json(
      new ApiResponse(201, null, "Comp-off created successfully")
    );
  } catch (err) {
    console.error("Error creating comp-off:", err);

    if (err instanceof ApiError) {
      throw err;
    }

    throw new ApiError(
      500,
      "Error creating comp-off"
    );
  }

});

const getCompoffList = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        c.COMP_OFF_ID,
        e.NAME,
        c.COMP_OFF_DATE,
        c.START_TIME,
        c.END_TIME,
        c.DURATION,

        -- 🔥 FORCE NUMBER
        NVL(c.STATUS, 0) AS STATUS,

        c.EXPIRES_ON
      FROM COMP_OFF c
      JOIN EMP e
        ON e.EMP_ID = c.EMP_ID
      ORDER BY c.COMP_OFF_DATE DESC
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, result.rows, "Comp-off list fetched successfully")
    );
  } catch (err) {
    console.error("Error fetching comp-off list:", err);
    throw new ApiError(500, "Error fetching comp-off list", err.message);
  }
});

const updateCompoffById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const {
      comp_off_date,
      start_time,
      end_time,
      status,
      duration,
      expires_on,
    } = req.body;

    const db = new DatabaseHandler();

    const updateQuery = `
      UPDATE COMP_OFF
      SET
        COMP_OFF_DATE = NVL(:comp_off_date, COMP_OFF_DATE),
        START_TIME    = NVL(:start_time, START_TIME),
        END_TIME      = NVL(:end_time, END_TIME),
        STATUS        = NVL(:status, STATUS),
        DURATION      = NVL(:duration, DURATION),
        EXPIRES_ON    = NVL(:expires_on, EXPIRES_ON)
      WHERE COMP_OFF_ID = :comp_off_id
    `;

    const bindData = {
      comp_off_id: id,
      comp_off_date: comp_off_date ? new Date(comp_off_date) : null,
      start_time: start_time || null,
      end_time: end_time || null,
      status: typeof status === "number" ? status : null,
      duration: duration || null,
      expires_on: expires_on ? new Date(expires_on) : null,
    };

    const result = await db.executeQuery(updateQuery, bindData, "siri_db");

    if (result.rowsAffected === 0) {
      throw new ApiError(404, "Comp-off not found");
    }

    return res.status(200).json(
      new ApiResponse(200, null, "Comp-off updated successfully")
    );
  } catch (err) {
    console.error("Error updating comp-off:", err);
    throw new ApiError(500, "Error updating comp-off", err.message);
  }
});


const getCompOffExpiryAlert = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const EMP_ID = req.user.emp_id;

  const result = await db.executeQuery(
    `
    SELECT
      ROUND(
        (
          (TO_NUMBER(SUBSTR(DURATION, 1, 2)) +
           TO_NUMBER(SUBSTR(DURATION, 4, 2)) / 60
          ) / 8
        ) - NVL(USED_DAYS, 0),
        2
      ) AS REMAINING_DAYS,

      TO_CHAR(
        TO_DATE(EXPIRES_ON, 'DD-MM-YY'),
        'DD-MON-YYYY'
      ) AS EXPIRES_ON,

      TRUNC(TO_DATE(EXPIRES_ON, 'DD-MM-YY')) - TRUNC(SYSDATE) AS DAYS_LEFT

    FROM COMP_OFF
    WHERE EMP_ID = :EMP_ID
      AND STATUS = '1'
      AND NVL(USED_DAYS, 0) <
          (
            (TO_NUMBER(SUBSTR(DURATION, 1, 2)) +
             TO_NUMBER(SUBSTR(DURATION, 4, 2)) / 60
            ) / 8
          )
      -- ✅ NOT expired
      AND TRUNC(TO_DATE(EXPIRES_ON, 'DD-MM-YY')) >= TRUNC(SYSDATE)
      -- ✅ EXPIRING WITHIN 10 DAYS ONLY
      AND TRUNC(TO_DATE(EXPIRES_ON, 'DD-MM-YY')) <= TRUNC(SYSDATE) + 10

    ORDER BY TO_DATE(EXPIRES_ON, 'DD-MM-YY')
    `,
    { EMP_ID },
    "siri_db"
  );

  const items = result.rows.map(r => ({
    remainingDays: r.REMAINING_DAYS,
    expiresOn: r.EXPIRES_ON,
    daysLeft: r.DAYS_LEFT,
  }));

  return res.json(
    new ApiResponse(200, { items }, "Success")
  );
});



module.exports = { createCompoff, getCompoffList, updateCompoffById, getCompOffExpiryAlert }