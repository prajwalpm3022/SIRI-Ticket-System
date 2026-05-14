const {
  asyncHandler,
  EmailService,
  ApiError,
  ApiResponse,
  DatabaseHandler } = require("../../utils");
const oracledb = require("oracledb");
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const uploadPath = path.resolve(__dirname, "..", "..", "..", "uploads", "TicketDocs");
const emailService = new EmailService();
const buildTicketCreatedEmail = ({
  recipientName,
  ticketId,
  ticketTitle,
  priorityName,
  description,
  remarks,
}) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;
              border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">

    <div style="background:#1565c0;padding:20px 24px;">
      <h2 style="color:#fff;margin:0;">
        Ticket Created Successfully 🎉
      </h2>
    </div>

    <div style="padding:24px;">

      <p>Dear <strong>${recipientName || "Customer"}</strong>,</p>

      <p>
        Your support ticket has been created successfully.
        Our support team will review and assign it shortly.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">

        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;width:42%;">
            Ticket ID
          </td>
          <td style="padding:10px 14px;">
            #${ticketId}
          </td>
        </tr>

        ${ticketTitle ? `
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">
            Title
          </td>
          <td style="padding:10px 14px;">
            ${ticketTitle}
          </td>
        </tr>` : ""}

        ${priorityName ? `
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">
            Priority
          </td>
          <td style="padding:10px 14px;">
            ${priorityName}
          </td>
        </tr>` : ""}

        ${description ? `
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">
            Description
          </td>
          <td style="padding:10px 14px;">
            ${description}
          </td>
        </tr>` : ""}

        ${remarks ? `
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">
            Remarks
          </td>
          <td style="padding:10px 14px;">
            ${remarks}
          </td>
        </tr>` : ""}

      </table>

      <p style="margin-top:20px;">
        We will notify you once the ticket is assigned.
      </p>

      <p style="color:#888;font-size:12px;margin-top:24px;">
        This is an automated notification. Please do not reply.
      </p>

    </div>
  </div>
`;
const insertNotification = async (db, {
  message,
  sender_id,
  send_to,
  send_to_type,
  notification_type_id,
  ticket_id,
  email_sent_to
}) => {

  await db.executeQuery(
    `INSERT INTO NOTIFICATION (
  NOTIFICATION_ID,
  NOTIFICATION,
  SENDER_ID,
  SEND_TO,
  SEND_TO_TYPE,
  SENT_DATE,
  SENT_TIME,
  NOTIFICATION_TYPE_ID,
  TICKET_ID,
  EMAIL_SENT_TO
) VALUES (
  NOTIFICATION_SEQ.NEXTVAL,
  :NOTIFICATION,
  :SENDER_ID,
  :SEND_TO,
  :SEND_TO_TYPE,
  SYSDATE,
  TO_CHAR(SYSDATE, 'HH:MI:SS AM'),
  :NOTIFICATION_TYPE_ID,
  :TICKET_ID,
  :EMAIL_SENT_TO

    )`,
    {
      NOTIFICATION: message,

      SENDER_ID: Number(sender_id),

      SEND_TO: Number(send_to),

      SEND_TO_TYPE: send_to_type,

      NOTIFICATION_TYPE_ID: Number(notification_type_id),

      TICKET_ID: ticket_id
        ? Number(ticket_id)
        : null,

      EMAIL_SENT_TO: email_sent_to
    },
    "siri_db"
  );

};
const sendTicketCreationNotifications = async (db, {
  ticketId,
  createdBy,
  title,
  description,
  priorityId,
  remarks,
}) => {

  try {

    // ── Get Customer Details ─────────────────────────────
    const custResult = await db.executeQuery(
      `SELECT CUST_LOGIN_ID, NAME, EMAIL
       FROM CUST_LOGIN
       WHERE CUST_LOGIN_ID = :id
         AND ACTIVE = 'Y'`,
      {
        id: {
          val: Number(createdBy),
          type: oracledb.NUMBER,
        }
      },
      "siri_db"
    );

    const customer = custResult.rows?.[0];
    if (!customer) {
      console.warn("Customer not found");
      return;
    }

    // ── Get Priority ─────────────────────────────────────
    let priorityName = "—";

    if (priorityId) {

      const priResult = await db.executeQuery(
        `SELECT PRIORITY
     FROM TICKET_PRIORITY
     WHERE PRIORITY_ID = :id`,
        {
          id: {
            val: Number(priorityId),
            type: oracledb.NUMBER,
          }
        },
        "siri_db"
      );

      priorityName =
        priResult.rows?.[0]?.PRIORITY || "—";
    }

    // ── Send Email ───────────────────────────────────────
    let sentEmail = null;
    try {

      if (customer.EMAIL) {

        await emailService.sendEmail(
          "Support Team",
          customer.EMAIL,
          `Ticket #${ticketId} Created Successfully`,
          buildTicketCreatedEmail({
            recipientName: customer.NAME,
            ticketId,
            ticketTitle: title,
            priorityName,
            description,
            remarks,
          })
        );

        sentEmail = customer.EMAIL;


      }

    } catch (emailErr) {

      console.error(
        "Ticket creation email failed:",
        emailErr.message
      );

    }

    // ── Insert Notification ──────────────────────────────
    try {

      await insertNotification(db, {
        message:
          `Your ticket #${ticketId} "${title}" has been created successfully.`,

        sender_id: createdBy,

        send_to: customer.CUST_LOGIN_ID,

        send_to_type: 'CUST',

        notification_type_id: 3,

        ticket_id: ticketId,

        email_sent_to: sentEmail,
      });

    } catch (notifErr) {

      console.error(
        "Ticket creation notification failed:",
        notifErr.message
      );

    }

  } catch (err) {

    console.error(
      "sendTicketCreationNotifications error:",
      err
    );

  }
};

let CreateTicket = asyncHandler(async (req, res) => {
  const {
    TITLE, DESCRIPTION, STATUS_ID, PRIORITY_ID, CREATED_BY,
    ASSIGNED_DATE, CLI_EXCOMP_DATE, REMARKS, ASSIGNED_TIME,
    ASSIGNMENT_STATUS, PROJECT_ID, CUSTOMER_DEPT_ID, DOC_UPLOADER,
    CUST_LOGIN_ID, TICKET_PREFIX, TKT_DOC_FROM,
  } = req.body;

  const db = new DatabaseHandler();
  const renamedFiles = [];

  try {
    // ── 1. Insert ticket + get ID ──
    const ticketResult = await db.executeQuery(
      `INSERT INTO TICKET_MASTER (
                TITLE, DESCRIPTION, STATUS_ID, PRIORITY_ID,
                CREATED_AT, CREATED_BY, ASSIGNED_DATE, CLI_EXCOMP_DATE,
                REMARKS, ASSIGNED_TIME, ASSIGNMENT_STATUS,
                PROJECT_ID, CREATED_TIME, CUSTOMER_DEPT_ID, CUST_LOGIN_ID
            ) VALUES (
                :TITLE, :DESCRIPTION, :STATUS_ID, :PRIORITY_ID,
                TRUNC(SYSDATE), :CREATED_BY,
                TO_DATE(:ASSIGNED_DATE, 'YYYY-MM-DD'),
                TO_DATE(:CLI_EXCOMP_DATE, 'YYYY-MM-DD'),
                :REMARKS,
                TO_TIMESTAMP(:ASSIGNED_TIME, 'HH24:MI:SS'),
                :ASSIGNMENT_STATUS, :PROJECT_ID,
                TO_CHAR(SYSDATE, 'HH:MI:SS AM'),
                :CUSTOMER_DEPT_ID, :CUST_LOGIN_ID
            ) RETURNING TICKET_ID INTO :TICKET_ID`,
      {
        TITLE, DESCRIPTION, STATUS_ID, PRIORITY_ID, CREATED_BY,
        ASSIGNED_DATE: ASSIGNED_DATE || null,
        CLI_EXCOMP_DATE: CLI_EXCOMP_DATE || null,
        REMARKS, ASSIGNED_TIME, ASSIGNMENT_STATUS, PROJECT_ID,
        CUSTOMER_DEPT_ID, CUST_LOGIN_ID,
        TICKET_ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      "siri_db"
    );

    const ticketId = ticketResult.outBinds.TICKET_ID?.[0];
    if (!ticketId) throw new Error("Ticket ID not generated");

    // ── 2. Prepare file renames ──
    const docOperations = [];

    if (req.files && req.files.length > 0) {
      let index = 1;
      for (const file of req.files) {
        const custId = req.user.userId;
        const now = new Date();
        const day = String(now.getDate()).padStart(2, "0");
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
          "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const month = monthNames[now.getMonth()];
        const year = now.getFullYear();
        const formattedDate = `${day}${month}${year}`;
        const extension = path.extname(file.originalname);
        const fileNumber = String(index).padStart(2, "0");
        const newFileName = `${ticketId}_${custId}_${formattedDate}_TK_${fileNumber}${extension}`;

        const oldPath = path.join(uploadPath, file.filename);
        const newPath = path.join(uploadPath, newFileName);

        fs.renameSync(oldPath, newPath);
        renamedFiles.push({ newPath, oldPath });

        docOperations.push({
          query: `INSERT INTO TICKET_DOCS (
                                DOC_NAME, UPLOADED_DATE, TICKET_ID,
                                DOC_UPLOADER, DELETE_ACTION, TKT_DOC_FROM
                            ) VALUES (
                                :DOC_NAME, SYSDATE, :TICKET_ID,
                                :DOC_UPLOADER, 'N', :TKT_DOC_FROM
                            )`,
          params: {
            DOC_NAME: newFileName,
            TICKET_ID: ticketId,
            DOC_UPLOADER,
            TKT_DOC_FROM,
          },

        });

        index++;
      }
    }

    // ── 3. Transaction: update prefix + insert all docs ──
    await db.executeTransaction([
      {
        query: `UPDATE TICKET_MASTER 
                        SET TICKET_PREFIX = :TICKET_PREFIX 
                        WHERE TICKET_ID = :TICKET_ID`,
        params: {
          TICKET_PREFIX: `${TICKET_PREFIX}/${ticketId}`,
          TICKET_ID: ticketId,
        },
      },
      ...docOperations,
    ], "siri_db");
    await sendTicketCreationNotifications(db, {
      ticketId,
      createdBy: CUST_LOGIN_ID,
      title: TITLE,
      description: DESCRIPTION,
      priorityId: PRIORITY_ID,
      remarks: REMARKS,
    });

    res.status(201).json(
      new ApiResponse(201, { ticketId }, "Ticket created successfully")
    );

  } catch (err) {
    // ── Rollback renamed files ──
    for (const { newPath, oldPath } of renamedFiles) {
      try {
        if (fs.existsSync(newPath)) fs.renameSync(newPath, oldPath);
      } catch (fsErr) {
        console.error("File rollback failed:", fsErr);
      }
    }
    console.error("Create Ticket Error:", err);
    throw new ApiError(500, "Create ticket error", err.message);
  }
});

let DeleteTicketDocByUser = asyncHandler(async (req, res) => {
  const { ticket_doc_id } = req.params;

  if (!ticket_doc_id) {
    throw new ApiError(400, "Ticket Doc ID is required");
  }

  const db = new DatabaseHandler();
  try {
    const query = `
            DELETE FROM TICKET_DOCS 
            WHERE TICKET_DOC_ID = :ticket_doc_id
        `;

    const result = await db.executeQuery(
      query,
      { ticket_doc_id },
      "siri_db"
    );

    if (result.rowsAffected === 0) {
      throw new ApiError(404, "Document not found");
    }

    res.status(200).json(
      new ApiResponse(200, null, "Document deleted successfully")
    );
  } catch (err) {
    console.error("DeleteTicketDoc Error:", err);
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Failed to delete document", err.message);
  }
});

let GetCategoryData = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();

  try {
    const query = `
            SELECT CATEGORY_ID, CATEGORY_NAME 
            FROM TICKET_CATEGORY
            ORDER BY CATEGORY_ID
        `;

    const result = await db.executeQuery(query, {}, "siri_db");
    const rows = result.rows || [];

    res.status(200).json(
      new ApiResponse(
        200,
        rows,
        "Category data fetched successfully"
      )
    );
  } catch (err) {
    console.error("GetCategoryData Error:", err);

    if (err instanceof ApiError) throw err;

    throw new ApiError(500, "Failed to fetch category data", err.message);
  }
});


const verify_ticket = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { ticket_id } = req.params;
    const { remarks } = req.body;
    if (!ticket_id) throw new ApiError(400, "Ticket ID is required");

    await db.executeQuery(
      `UPDATE TICKET_MASTER SET STATUS_ID = 12, COMPLETED_DATE = SYSDATE, REMARKS = :remarks WHERE TICKET_ID = :ticket_id`,
      { ticket_id: Number(ticket_id), remarks: remarks ?? null },
      "siri_db"
    );

    return res.status(200).json(new ApiResponse(200, null, "Ticket verified successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

const reopen_ticket = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { ticket_id } = req.params;
    if (!ticket_id) throw new ApiError(400, "Ticket ID is required");

    await db.executeQuery(
      `UPDATE TICKET_ASSIGNMENT SET STATUS_ID = 11 WHERE TICKET_ID = :ticket_id`,
      { ticket_id: Number(ticket_id) },
      "siri_db"
    );

    await db.executeQuery(
      `UPDATE TICKET_MASTER SET STATUS_ID = 14, VERIFIED_DATE = NULL WHERE TICKET_ID = :ticket_id`,
      { ticket_id: Number(ticket_id) },
      "siri_db"
    );

    return res.status(200).json(new ApiResponse(200, null, "Ticket reassigned successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

module.exports = {
  CreateTicket,
  GetCategoryData,
  DeleteTicketDocByUser,
  verify_ticket,
  reopen_ticket
};