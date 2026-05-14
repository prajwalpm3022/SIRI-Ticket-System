const {
  asyncHandler,
  EmailService,
  ApiError,
  ApiResponse,
  DatabaseHandler,
} = require("../../utils");
const OracleDB = require("oracledb");


const get_notifications = asyncHandler(async (req, res) => {

  const db = new DatabaseHandler();
  const { send_to, send_to_type } = req.query;

  const result = await db.executeQuery(
    `SELECT NOTIFICATION_ID, NOTIFICATION, SENT_DATE, SENT_TIME,
            TICKET_ID, EMAIL_SENT_TO, VIEWED_ON, NOTIFICATION_TYPE_ID
     FROM NOTIFICATION
     WHERE SEND_TO      = :send_to
       AND SEND_TO_TYPE = :send_to_type
     ORDER BY SENT_DATE DESC, NOTIFICATION_ID DESC`,
    {
      send_to:      { val: Number(send_to),      type: OracleDB.NUMBER },
      send_to_type: { val: String(send_to_type), type: OracleDB.STRING },
    },
    "siri_db"
  );

  return res.status(200).json(new ApiResponse(200, result.rows));
});


const mark_notification_viewed = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const { id } = req.params;

  await db.executeQuery(
    `UPDATE NOTIFICATION
     SET VIEWED_ON   = SYSDATE,
         VIEWED_TIME = TO_CHAR(SYSTIMESTAMP, 'HH:MI:SS AM')
     WHERE NOTIFICATION_ID = :id`,
    { id: { val: Number(id), type: OracleDB.NUMBER } },
    "siri_db"
  );

  return res.status(200).json(new ApiResponse(200, null, "Marked as viewed"));
});


const get_modules_list = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const result = await db.executeQuery(
      `SELECT DISTINCT m.MODULE_ID, m.MODULE_NAME
       FROM MODULE m
       INNER JOIN PROJECT_TEAM pt ON pt.MODULE_ID = m.MODULE_ID
       WHERE pt.STATUS_ID = 1`,  // ✅ removed END_DATE filter
      {},
      "siri_db"
    );

    const modules = result.rows.map((row) => ({
      id:   row.MODULE_ID,
      name: row.MODULE_NAME,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, modules, "Modules fetched successfully"));

  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to fetch modules",
      error
    );
  }
});


const get_employees_list = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const result = await db.executeQuery(
      `SELECT EMP_ID, NAME
       FROM EMP
       WHERE STATUS='WORKING'
       ORDER BY NAME`,
      {},
      "siri_db"
    );

    
    const employees = result.rows.map((row) => ({
      id:   row.EMP_ID,
      name: row.NAME,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, employees, "Employees fetched successfully"));

  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to fetch employees",
      error
    );
  }
});


const get_notification_types = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const result = await db.executeQuery(
    
`SELECT NOTIFICATION_TYPE_ID AS "id",
        NOTIFICATION_TYPE    AS "name"
 FROM NOTIFICATION_TYPE
 ORDER BY NOTIFICATION_TYPE_ID`,
    {},
    "siri_db"
  );
 

  return res
    .status(200)
    .json(new ApiResponse(200, { types: result.rows }, "Notification types fetched"));
                               
});


const send_notification = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const { message, sendTo, employeeIds, moduleIds, senderId, notificationTypeId } = req.body;

  if (!senderId) {
    return res.status(400).json(new ApiResponse(400, null, "Sender ID is required"));
  }
  if (!notificationTypeId) {
    return res.status(400).json(new ApiResponse(400, null, "Notification type is required"));
  }

  let empIds = [];

  if (sendTo === "All Employee") {
    const result = await db.executeQuery(
      `SELECT EMP_ID FROM EMP WHERE WORK_ON_OFFICE = 'Y'`,
      {},
      "siri_db"
    );
    empIds = result.rows.map((row) => row.EMP_ID);

  } else if (sendTo === "Logined Employee") {
    const result = await db.executeQuery(
      `SELECT DISTINCT EMP_ID FROM LOGIN_DETAILS WHERE TRUNC(LOGIN_DATE) = TRUNC(SYSDATE)`,
      {},
      "siri_db"
    );
    empIds = result.rows.map((row) => row.EMP_ID);

  } else if (sendTo === "Select Employee") {
    empIds = employeeIds;

  } else if (sendTo === "Select Team") {
    for (const moduleId of moduleIds) {
      const result = await db.executeQuery(
        `SELECT DISTINCT EMP_ID FROM PROJECT_TEAM
         WHERE MODULE_ID = :module_id
           AND (END_DATE IS NULL OR END_DATE >= SYSDATE)
           AND STATUS_ID = 1`,
        { module_id: { val: Number(moduleId), type: OracleDB.NUMBER } },
        "siri_db"
      );
      result.rows.forEach((row) => {
        if (!empIds.includes(row.EMP_ID)) empIds.push(row.EMP_ID);
      });
    }
  }

  if (empIds.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, { sentTo: 0 }, "No employees found to notify"));
  }

  for (const empId of empIds) {
    await db.executeQuery(
      `INSERT INTO NOTIFICATION (
         NOTIFICATION_ID,
         SENDER_ID,
         SEND_TO,
         SEND_TO_TYPE,
         NOTIFICATION,
         NOTIFICATION_TYPE_ID,
         SENT_DATE,
         SENT_TIME
       ) VALUES (
         NOTIFICATION_SEQ.NEXTVAL,
         :sender_id,
         :emp_id,
         'EMP',
         :message,
         :notification_type_id,
         SYSDATE,
         TO_CHAR(SYSTIMESTAMP, 'HH:MI:SS AM')
       )`,
      {
        sender_id:            { val: Number(senderId),           type: OracleDB.NUMBER },
        emp_id:               { val: Number(empId),              type: OracleDB.NUMBER },
        message:              { val: String(message),            type: OracleDB.STRING },
        notification_type_id: { val: Number(notificationTypeId), type: OracleDB.NUMBER },
      },
      "siri_db"
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(201, { sentTo: empIds.length }, "Notification sent successfully"));
});


const get_office_employees = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const result = await db.executeQuery(
      `SELECT EMP_ID, NAME
       FROM EMP
       WHERE WORK_ON_OFFICE = 'Y'
       ORDER BY NAME`,
      {},
      "siri_db"
    );

    const employees = result.rows.map((row) => ({
      id:   row.EMP_ID,
      name: row.NAME,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, employees, "Office employees fetched successfully"));

  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to fetch office employees",
      error
    );
  }
});


const get_loggedin_employees = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const result = await db.executeQuery(
      `SELECT DISTINCT e.EMP_ID, e.NAME
       FROM LOGIN_DETAILS ld
       INNER JOIN EMP e ON e.EMP_ID = ld.EMP_ID
       WHERE TRUNC(ld.LOGIN_DATE) = TRUNC(SYSDATE)
       ORDER BY e.NAME`,
      {},
      "siri_db"
    );

    const employees = result.rows.map((row) => ({
      id:   row.EMP_ID,
      name: row.NAME,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, employees, "Logged in employees fetched successfully"));

  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to fetch logged in employees",
      error
    );
  }
});
const get_employees_by_module = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { moduleId } = req.params;

    const result = await db.executeQuery(
      `SELECT DISTINCT e.EMP_ID, e.NAME
       FROM PROJECT_TEAM pt
       INNER JOIN EMP e ON e.EMP_ID = pt.EMP_ID
       WHERE pt.MODULE_ID = :module_id
         AND pt.STATUS_ID = 1`,   
      { module_id: { val: Number(moduleId), type: OracleDB.NUMBER } },
      "siri_db"
    );

    const employees = result.rows.map((row) => ({
      id:   row.EMP_ID,
      name: row.NAME,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, employees, "Team employees fetched successfully"));

  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to fetch team employees",
      error
    );
  }
});


const get_notification_history = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { fromDate, toDate } = req.query;

    let whereClause = "";
    let binds = {};

    if (fromDate && toDate) {
      whereClause = `WHERE N.SENT_DATE BETWEEN TO_DATE(:from_date, 'YYYY-MM-DD')
                                           AND TO_DATE(:to_date,   'YYYY-MM-DD')`;
      binds = {
        from_date: { val: fromDate, type: OracleDB.STRING },
        to_date:   { val: toDate,   type: OracleDB.STRING },
      };
    }

    const query = `
      SELECT
        MIN(N.NOTIFICATION_ID)                   "id",
        N.NOTIFICATION                           "message",
        E.NAME                               "sender",
        NT.NOTIFICATION_TYPE                     "type",
        TO_CHAR(N.SENT_DATE, 'DD/Mon/YYYY')      "date",
        N.SENT_TIME                              "time",
        COUNT(N.SEND_TO)                         "count"
      FROM NOTIFICATION N
      JOIN EMP E
        ON N.SENDER_ID = E.EMP_ID
      JOIN NOTIFICATION_TYPE NT
        ON N.NOTIFICATION_TYPE_ID = NT.NOTIFICATION_TYPE_ID
      ${whereClause}
      GROUP BY
        N.NOTIFICATION,
        E.NAME,
        NT.NOTIFICATION_TYPE,
        N.SENT_DATE,
        N.SENT_TIME
      ORDER BY N.SENT_DATE DESC, MIN(N.NOTIFICATION_ID)
    `;

    const result = await db.executeQuery(query, binds, "siri_db");

    return res
      .status(200)
      .json(new ApiResponse(200, { items: result.rows }, "Notification history fetched"));

  } catch (error) {
    console.error("Get notification history error:", error);
    throw new ApiError(500, "Internal server error");
  }
});


const get_notification_recipients = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { notificationId } = req.params;

    const query = `
      SELECT
        N.SEND_TO        "id",
        E.NAME       "name",
        N.VIEWED_ON      "viewedOn",
        N.VIEWED_TIME    "viewedTime"
      FROM NOTIFICATION N
      JOIN EMP E
        ON N.SEND_TO = E.EMP_ID
      WHERE N.NOTIFICATION_ID = :notification_id
    `;

    const result = await db.executeQuery(
      query,
      { notification_id: { val: Number(notificationId), type: OracleDB.NUMBER } },
      "siri_db"
    );

    return res
      .status(200)
      .json(new ApiResponse(200, { items: result.rows }, "Recipients fetched"));

  } catch (error) {
    console.error("Get recipients error:", error);
    throw new ApiError(500, "Internal server error");
  }
});
module.exports = {
  get_notifications,
  mark_notification_viewed,
  get_modules_list,
  get_employees_list,
  send_notification,
  get_loggedin_employees,
  get_office_employees,
  get_employees_by_module,
  get_notification_types,
  get_notification_recipients,
  get_notification_history
  
};