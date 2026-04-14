const {
  asyncHandler,
  EmailService,
  ApiError,
  ApiResponse,
  DatabaseHandler,
} = require("../../utils");
import oracledb from "oracledb";

const get_cal_year_dd = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        cal_year_id AS "cal_year_id",
        year    AS "year"
      FROM calendar_year
      WHERE status = 'Y'
      ORDER BY year
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

const apply_leave_allotment = asyncHandler(async (req, res) => {
  try {
    const { cal_year_id, leave_id, alloted } = req.body;


    if (
      cal_year_id == null ||
      leave_id == null ||
      alloted == null
    ) {
      throw new ApiError(400, "Required fields missing");
    }

    const db = new DatabaseHandler();

    const plsql = `
  DECLARE
  CURSOR emp_cursor IS
    SELECT emp_id
    FROM emp
    WHERE status = 'WORKING';

  v_cal_year_id  NUMBER := :cal_year_id;
  v_prev_year_id NUMBER := :cal_year_id - 1;
  v_leave_id     NUMBER := :leave_id;
  v_alloted      NUMBER := NVL(:alloted, 0);

  v_emp_id       emp.emp_id%TYPE;
  v_prev_bal     NUMBER := 0;

  v_status       NUMBER := 0;
  v_error        VARCHAR2(255);
  v_count        NUMBER;
BEGIN
  -- Check if leave already allotted for this year
  SELECT COUNT(*)
  INTO v_count
  FROM emp_leave_mast
  WHERE cal_year_id = v_cal_year_id
    AND leave_id    = v_leave_id;

  IF v_count > 0 THEN
    v_error  := 'Leave already allotted';
    v_status := 0;
  ELSE
    OPEN emp_cursor;
    LOOP
      FETCH emp_cursor INTO v_emp_id;
      EXIT WHEN emp_cursor%NOTFOUND;

      -- Get previous year's balance
      BEGIN
        SELECT bal_leave
        INTO v_prev_bal
        FROM emp_leave_mast
        WHERE cal_year_id = v_prev_year_id
          AND leave_id    = v_leave_id
          AND emp_id      = v_emp_id;
      EXCEPTION
        WHEN NO_DATA_FOUND THEN
          v_prev_bal := 0;
      END;

      -- Insert new year record
      INSERT INTO emp_leave_mast
        (cal_year_id,
         leave_id,
         alloted,
         bal_leave,
         emp_id,
         used_leave)
      VALUES
        (v_cal_year_id,
         v_leave_id,
         v_prev_bal + v_alloted,  -- works even if v_alloted = 0
         v_prev_bal + v_alloted,
         v_emp_id,
         0);
    END LOOP;

    CLOSE emp_cursor;
    COMMIT;

    v_status := 1;
    v_error  := 'Leave carry-forward completed successfully';
  END IF;

  :status := v_status;
  :error  := v_error;

EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    :status := 0;
    :error  := SQLERRM;
END;

    `;

    const binds = {
      cal_year_id: { val: Number(cal_year_id), type: oracledb.NUMBER },
      leave_id: { val: Number(leave_id), type: oracledb.NUMBER },
      alloted: { val: Number(alloted), type: oracledb.NUMBER },

      status: {
        dir: oracledb.BIND_OUT,
        type: oracledb.NUMBER
      },
      error: {
        dir: oracledb.BIND_OUT,
        type: oracledb.STRING,
        maxSize: 4000
      }
    };


    const result = await db.executeQuery(plsql, binds, "siri_db");

    if (result.outBinds.status === 0) {
      throw new ApiResponse(200, null, result.outBinds.error, 0);
    }

    return res.status(200).json(
      new ApiResponse(200, {
        status: result.outBinds.status,
        message: result.outBinds.error
      })
    );

  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "leaveAllotment failed",
      error
    );
  }
});

module.exports = {
  get_cal_year_dd,
  apply_leave_allotment,

}
