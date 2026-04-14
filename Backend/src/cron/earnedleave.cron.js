const cron = require("node-cron");
const { DatabaseHandler } = require("../utils");

cron.schedule("5 0 1 * *", async () => {


  const db = new DatabaseHandler();

  const plsql = `
  DECLARE
    v_el_id NUMBER;
  BEGIN
    SELECT leave_id
    INTO v_el_id
    FROM leave_master
    WHERE UPPER(leave_name) = 'EARNED LEAVE';

    UPDATE emp_leave_mast elm
    SET
      elm.alloted   = elm.alloted + 1,
      elm.bal_leave = elm.bal_leave + 1
    WHERE elm.leave_id = v_el_id
      AND EXISTS (
        SELECT 1
        FROM emp e
        WHERE e.emp_id = elm.emp_id
          AND e.status = 'WORKING'
      );

    COMMIT;
  END;
  `;

  await db.executeQuery(plsql, {}, "siri_db");
});
