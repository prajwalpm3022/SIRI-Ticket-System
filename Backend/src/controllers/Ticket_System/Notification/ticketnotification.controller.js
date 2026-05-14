const {
  asyncHandler,
  EmailService,
  ApiError,
  ApiResponse,
  DatabaseHandler,
} = require("../../../utils");
const OracleDB = require("oracledb");


const get_client_notifications = asyncHandler(async (req, res) => {

  const { send_to, send_to_type } = req.query;



  const db = new DatabaseHandler();

  const result = await db.executeQuery(
    `SELECT NOTIFICATION_ID, NOTIFICATION, SENT_DATE, SENT_TIME,
            TICKET_ID, EMAIL_SENT_TO, VIEWED_ON, NOTIFICATION_TYPE_ID
     FROM NOTIFICATION
     WHERE SEND_TO      = :send_to
       AND SEND_TO_TYPE = :send_to_type
     ORDER BY SENT_DATE DESC, NOTIFICATION_ID DESC`,
    {
      send_to: {
        val: Number(send_to),
        type: OracleDB.NUMBER,
      },
      send_to_type: {
        val: String(send_to_type),
        type: OracleDB.STRING,
      },
    },
    "siri_db"
  );

  return res.status(200).json(
    new ApiResponse(200, result.rows)
  );
});


const mark_client_notification_viewed = asyncHandler(async (req, res) => {
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



module.exports = {
  get_client_notifications,
  mark_client_notification_viewed,
  
  
};