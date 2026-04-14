const cron = require("node-cron");
const { DatabaseHandler } = require("../utils");

cron.schedule("5 0 * * *", async () => {
 

  const db = new DatabaseHandler();

  const plsql = `
DECLARE
  CURSOR c_exp IS
    SELECT
      c.COMP_OFF_ID,
      c.EMP_ID,

      /* ✅ remaining days only (FIFO safe) */
      ROUND(
        (
          TO_NUMBER(SUBSTR(c.DURATION,1,2)) +
          TO_NUMBER(SUBSTR(c.DURATION,4,2)) / 60
        ) / 8,
        2
      ) - NVL(c.USED_DAYS,0) AS REMAINING_DAYS

    FROM COMP_OFF c
    WHERE c.STATUS = 1
      AND c.EXPIRES_ON < TRUNC(SYSDATE)
      AND (
        ROUND(
          (
            TO_NUMBER(SUBSTR(c.DURATION,1,2)) +
            TO_NUMBER(SUBSTR(c.DURATION,4,2)) / 60
          ) / 8,
          2
        ) - NVL(c.USED_DAYS,0)
      ) > 0;

  v_comp_id  COMP_OFF.COMP_OFF_ID%TYPE;
  v_emp_id   COMP_OFF.EMP_ID%TYPE;
  v_days     NUMBER;
  v_cf_id    NUMBER;
  v_year_id  NUMBER;

BEGIN
  /* Comp-Off leave id */
  SELECT LEAVE_ID
  INTO v_cf_id
  FROM LEAVE_MASTER
  WHERE SHORT_NAME = 'CF';

  /* Current calendar year */
  SELECT CAL_YEAR_ID
  INTO v_year_id
  FROM CALENDAR_YEAR
  WHERE STATUS = 'Y';

  OPEN c_exp;
  LOOP
    FETCH c_exp INTO v_comp_id, v_emp_id, v_days;
    EXIT WHEN c_exp%NOTFOUND;

    /* ✅ Update summary (EMP_LEAVE_MAST) */
    UPDATE EMP_LEAVE_MAST
    SET
      EXP_COMPOFF = ROUND(NVL(EXP_COMPOFF,0) + v_days, 2),
      BAL_LEAVE  = ROUND(
        NVL(ALLOTED,0)
        - NVL(USED_LEAVE,0)
        - (NVL(EXP_COMPOFF,0) + v_days),
        2
      )
    WHERE EMP_ID = v_emp_id
      AND LEAVE_ID = v_cf_id
      AND CAL_YEAR_ID = v_year_id;

    /* ✅ Mark comp-off as expired */
    UPDATE COMP_OFF
    SET STATUS = 3
    WHERE COMP_OFF_ID = v_comp_id;

  END LOOP;

  CLOSE c_exp;
  COMMIT;

EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
`;

  await db.executeQuery(plsql, {}, "siri_db");
});
