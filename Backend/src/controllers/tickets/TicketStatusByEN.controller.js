
const {
    asyncHandler,
    ApiError,
    ApiResponse,
    DatabaseHandler,
    EmailService
} = require("../../utils");
const cron = require("node-cron");
const OracleDB = require("oracledb");
const emailService = new EmailService();

const COMPLETED_STATUS            = 12;
const IN_PROGRESS_STATUS          = 8;
const VERIFICATION_PENDING_STATUS = 10;
const AUTO_CLOSED_STATUS          = 12;

// ─── Insert Notification ──────────────────────────────────────────────────────
const insertNotification = async (db, {
  message, sender_id, send_to, send_to_type,
  notification_type_id, ticket_id, email_sent_to
}) => {
  try {
    await db.executeQuery(
      `INSERT INTO NOTIFICATION (
         NOTIFICATION_ID, NOTIFICATION, SENDER_ID, SEND_TO, SEND_TO_TYPE,
         SENT_DATE, SENT_TIME, NOTIFICATION_TYPE_ID, TICKET_ID, EMAIL_SENT_TO
       ) VALUES (
         NOTIFICATION_SEQ.NEXTVAL, :notification, :sender_id, :send_to, :send_to_type,
         SYSDATE, TO_CHAR(SYSTIMESTAMP, 'HH:MI:SS AM'), :notification_type_id, :ticket_id, :email_sent_to
       )`,
      {
        notification:         { val: String(message).substring(0, 200), type: OracleDB.STRING },
        sender_id:            { val: Number(sender_id),                  type: OracleDB.NUMBER },
        send_to:              { val: Number(send_to),                    type: OracleDB.NUMBER },
        send_to_type:         { val: send_to_type || 'CUST',             type: OracleDB.STRING },
        notification_type_id: { val: Number(notification_type_id),       type: OracleDB.NUMBER },
        ticket_id:            { val: ticket_id ? Number(ticket_id) : null, type: OracleDB.NUMBER },
        email_sent_to:        { val: email_sent_to || null,              type: OracleDB.STRING },
      },
      "siri_db"
    );
  } catch (err) {
    console.error(`Notification insert failed [send_to: ${send_to}]:`, err.message);
  }
};

// ─── Get Ticket Stakeholders ──────────────────────────────────────────────────
const getTicketStakeholders = async (db, ticket_id) => {
  const ticketResult = await db.executeQuery(
    `SELECT TICKET_ID, TITLE, CREATED_BY, CUSTOMER_DEPT_ID, CUST_LOGIN_ID
     FROM TICKET_MASTER WHERE TICKET_ID = :ticket_id`,
    { ticket_id: { val: Number(ticket_id), type: OracleDB.NUMBER } },
    "siri_db"
  );
  const ticket = ticketResult.rows?.[0];
  if (!ticket) return null;

  // SH + Dept Admin
  const custResult = await db.executeQuery(
    `SELECT CUST_LOGIN_ID, NAME, EMAIL, LOGIN_TYPE
     FROM CUST_LOGIN
     WHERE ACTIVE = 'Y'
       AND LOGIN_TYPE IN ('SH', 'A')
       AND CUST_DEPT_ID = :dept_id`,
    { dept_id: { val: Number(ticket.CUSTOMER_DEPT_ID), type: OracleDB.NUMBER } },
    "siri_db"
  );

  // Ticket Raiser
  const raiserResult = await db.executeQuery(
    `SELECT CUST_LOGIN_ID, NAME, EMAIL
     FROM CUST_LOGIN
     WHERE CUST_LOGIN_ID = :cust_login_id AND ACTIVE = 'Y'`,
    { cust_login_id: { val: Number(ticket.CUST_LOGIN_ID || ticket.CREATED_BY), type: OracleDB.NUMBER } },
    "siri_db"
  );

  // Primary Engineer
  const primaryResult = await db.executeQuery(
    `SELECT TA.ASSIGNED_TO, E.NAME, E.OFF_EMAIL_ID, E.EMAIL_ID
     FROM TICKET_ASSIGNMENT TA
     JOIN USER_MAST UM ON UM.USER_ID = TA.ASSIGNED_TO
     JOIN EMP E ON E.EMP_ID = UM.EMP_ID
     WHERE TA.TICKET_ID = :ticket_id AND TA.ROLE = 'PRIMARY'`,
    { ticket_id: { val: Number(ticket_id), type: OracleDB.NUMBER } },
    "siri_db"
  );

  return {
    ticket,
    custRows:        custResult.rows || [],
    raiser:          raiserResult.rows?.[0] || null,
    primaryEngineer: primaryResult.rows?.[0] || null,
  };
};

// ─── Notify SH & Dept Admin ───────────────────────────────────────────────────
const notifyCustSide = async (db, {
  ticket_id, ticket, custRows, subject, buildHtml, message, notifTypeId, sender_id
}) => {
  const sectionHead = custRows.find(r => r.LOGIN_TYPE === "SH");
  const deptAdmin   = custRows.find(r => r.LOGIN_TYPE === "A");

  for (const recipient of [sectionHead, deptAdmin].filter(Boolean)) {
    let sentEmail = null;
    try {
      if (recipient.EMAIL) {
        await emailService.sendEmail("Support Team", recipient.EMAIL, subject, buildHtml(recipient));
        sentEmail = recipient.EMAIL;
      } else {
        console.warn(`⚠️ ${recipient.LOGIN_TYPE} ${recipient.NAME} has no email`);
      }
    } catch (e) {
      console.error(`Email failed for ${recipient.LOGIN_TYPE}:`, e.message);
    }

    try {
      await insertNotification(db, {
        message, sender_id,
        send_to:              recipient.CUST_LOGIN_ID,
        send_to_type:         'CUST',
        notification_type_id: notifTypeId,
        ticket_id,
        email_sent_to:        sentEmail,
      });
    } catch (e) {
      console.error(`Notification failed for ${recipient.LOGIN_TYPE}:`, e.message);
    }
  }
};

// ─── Notify Ticket Raiser ─────────────────────────────────────────────────────
const notifyRaiser = async (db, {
  ticket_id, raiser, subject, buildHtml, message, notifTypeId, sender_id
}) => {
  if (!raiser) return;
  let sentEmail = null;
  try {
    if (raiser.EMAIL) {
      await emailService.sendEmail("Support Team", raiser.EMAIL, subject, buildHtml(raiser));
      sentEmail = raiser.EMAIL;
    } else {
      console.warn(`⚠️ Raiser ${raiser.NAME} has no email`);
    }
  } catch (e) {
    console.error("Email failed for Raiser:", e.message);
  }

  try {
    await insertNotification(db, {
      message, sender_id,
      send_to:              raiser.CUST_LOGIN_ID,
      send_to_type:         'CUST',
      notification_type_id: notifTypeId,
      ticket_id,
      email_sent_to:        sentEmail,
    });
  } catch (e) {
    console.error("Notification failed for Raiser:", e.message);
  }
};

// ─── Notify Primary Engineer ──────────────────────────────────────────────────
const notifyPrimaryEngineer = async (db, {
  ticket_id, primaryEngineer, subject, buildHtml, message, notifTypeId, sender_id
}) => {
  if (!primaryEngineer) return;
  const primaryEmail = primaryEngineer.OFF_EMAIL_ID || primaryEngineer.EMAIL_ID || null;
  let sentEmail = null;
  try {
    if (primaryEmail) {
      await emailService.sendEmail("Support Team", primaryEmail, subject, buildHtml());
      sentEmail = primaryEmail;
    } else {
      console.warn(`⚠️ PRIMARY Engineer ${primaryEngineer.NAME} has no email`);
    }
  } catch (e) {
    console.error("Email failed for PRIMARY engineer:", e.message);
  }

  try {
    await insertNotification(db, {
      message, sender_id,
      send_to:              Number(primaryEngineer.ASSIGNED_TO),
      send_to_type:         'EMP',
      notification_type_id: notifTypeId,
      ticket_id,
      email_sent_to:        sentEmail,
    });
  } catch (e) {
    console.error("Notification failed for PRIMARY engineer:", e.message);
  }
};

// ─── Email: In Progress ───────────────────────────────────────────────────────
const buildInProgressEmail = ({ recipientName, ticketId, ticketTitle, remarks, percentage }) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;
              border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    <div style="background:#f57c00;padding:20px 24px;">
      <h2 style="color:#fff;margin:0;">Ticket In Progress 🔧</h2>
    </div>
    <div style="padding:24px;">
      <p>Dear <strong>${recipientName}</strong>,</p>
      <p>Work has started on your ticket. Here is the current status:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;width:42%;">Ticket ID</td>
          <td style="padding:10px 14px;">#${ticketId}</td>
        </tr>
        ${ticketTitle ? `<tr><td style="padding:10px 14px;font-weight:bold;">Title</td>
          <td style="padding:10px 14px;">${ticketTitle}</td></tr>` : ""}
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">Status</td>
          <td style="padding:10px 14px;">In Progress</td>
        </tr>
        ${percentage !== undefined ? `<tr><td style="padding:10px 14px;font-weight:bold;">Progress</td>
          <td style="padding:10px 14px;">${percentage}%</td></tr>` : ""}
        ${remarks ? `<tr style="background:#f5f5f5;"><td style="padding:10px 14px;font-weight:bold;">Remarks</td>
          <td style="padding:10px 14px;">${remarks}</td></tr>` : ""}
      </table>
      <p style="color:#888;font-size:12px;margin-top:24px;">This is an automated notification. Please do not reply.</p>
    </div>
  </div>`;

// ─── Email: Verification Pending ──────────────────────────────────────────────
const buildVerificationEmail = ({ recipientName, ticketId, ticketTitle }) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;
              border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    <div style="background:#6a1b9a;padding:20px 24px;">
      <h2 style="color:#fff;margin:0;">Ticket Resolved — Verification Pending ✅</h2>
    </div>
    <div style="padding:24px;">
      <p>Dear <strong>${recipientName}</strong>,</p>
      <p>Your ticket issue has been resolved and is now <strong>pending your verification</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;width:42%;">Ticket ID</td>
          <td style="padding:10px 14px;">#${ticketId}</td>
        </tr>
        ${ticketTitle ? `<tr><td style="padding:10px 14px;font-weight:bold;">Title</td>
          <td style="padding:10px 14px;">${ticketTitle}</td></tr>` : ""}
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">Status</td>
          <td style="padding:10px 14px;">Verification Pending</td>
        </tr>
      </table>
      <p>Please verify and confirm if the issue is resolved within <strong>3 working days</strong>.
         If no response is received, the ticket will be <strong>automatically closed</strong>.</p>
      <p style="color:#888;font-size:12px;margin-top:24px;">This is an automated notification. Please do not reply.</p>
    </div>
  </div>`;

// ─── Email: Auto Closed ───────────────────────────────────────────────────────
const buildAutoClosedEmail = ({ recipientName, ticketId, ticketTitle }) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;
              border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    <div style="background:#b71c1c;padding:20px 24px;">
      <h2 style="color:#fff;margin:0;">Ticket Auto Closed 🔒</h2>
    </div>
    <div style="padding:24px;">
      <p>Dear <strong>${recipientName}</strong>,</p>
      <p>Your ticket has been <strong>automatically closed</strong> as no verification response
         was received within 3 working days.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;width:42%;">Ticket ID</td>
          <td style="padding:10px 14px;">#${ticketId}</td>
        </tr>
        ${ticketTitle ? `<tr><td style="padding:10px 14px;font-weight:bold;">Title</td>
          <td style="padding:10px 14px;">${ticketTitle}</td></tr>` : ""}
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">Status</td>
          <td style="padding:10px 14px;">Completed</td>
        </tr>
      </table>
      <p style="color:#888;font-size:12px;margin-top:24px;">This is an automated notification. Please do not reply.</p>
    </div>
  </div>`;

// ─── UpdateTicketStatus ───────────────────────────────────────────────────────
const UpdateTicketStatus = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  try {
    const { ticket_id } = req.params;
    const { status_id, assignment_id } = req.body;

    if (!ticket_id)     throw new ApiError(400, "Ticket ID is required");
    if (!status_id)     throw new ApiError(400, "Status ID is required");
    if (!assignment_id) throw new ApiError(400, "Assignment ID is required");

    // Check current master status before update
    const currentStatusResult = await db.executeQuery(
      `SELECT STATUS_ID FROM TICKET_MASTER WHERE TICKET_ID = :ticket_id`,
      { ticket_id: Number(ticket_id) },
      "siri_db"
    );
    const currentMasterStatus   = Number(currentStatusResult.rows[0]?.STATUS_ID);
    const isFirstTimeInProgress = currentMasterStatus !== IN_PROGRESS_STATUS;

    // Update assignment status
    await db.executeQuery(
      `UPDATE TICKET_ASSIGNMENT SET STATUS_ID = :status_id
       WHERE ASSIGNMENT_ID = :assignment_id`,
      { assignment_id: Number(assignment_id), status_id: Number(status_id) },
      "siri_db"
    );

    // Insert progress record
    await db.executeQuery(
      `INSERT INTO TICKET_PROGRESS
         (TICKET_ID, TICKET_ASS_ID, REMARKS, PERCENTAGE_COMP, CREATED_DATE, CREATED_TIME)
       VALUES (:ticket_id, :assignment_id, :remarks, :percentage_comp, SYSDATE, SYSDATE)`,
      {
        ticket_id:       Number(ticket_id),
        assignment_id:   Number(assignment_id),
        remarks:         Number(status_id) === IN_PROGRESS_STATUS ? "Work Started" : "Work Completed",
        percentage_comp: Number(status_id) === COMPLETED_STATUS ? "100" : "0",
      },
      "siri_db"
    );

    // Check if all engineers completed
    const checkResult = await db.executeQuery(
      `SELECT COUNT(*) AS TOTAL,
              SUM(CASE WHEN STATUS_ID = :completed_status THEN 1 ELSE 0 END) AS COMPLETED_COUNT
       FROM TICKET_ASSIGNMENT WHERE TICKET_ID = :ticket_id`,
      { ticket_id: Number(ticket_id), completed_status: COMPLETED_STATUS },
      "siri_db"
    );

    const total          = Number(checkResult.rows[0]?.TOTAL || 0);
    const completedCount = Number(checkResult.rows[0]?.COMPLETED_COUNT || 0);
    const allCompleted   = total > 0 && total === completedCount;
    const masterStatusId = allCompleted ? VERIFICATION_PENDING_STATUS : IN_PROGRESS_STATUS;

    // Update ticket master
    if (allCompleted) {
      await db.executeQuery(
        `UPDATE TICKET_MASTER SET STATUS_ID = :status_id, VERIFIED_DATE = SYSDATE
         WHERE TICKET_ID = :ticket_id`,
        { ticket_id: Number(ticket_id), status_id: masterStatusId },
        "siri_db"
      );
    } else {
      await db.executeQuery(
        `UPDATE TICKET_MASTER SET STATUS_ID = :status_id
         WHERE TICKET_ID = :ticket_id`,
        { ticket_id: Number(ticket_id), status_id: masterStatusId },
        "siri_db"
      );
    }

    // Send notifications
    const stakeholders = await getTicketStakeholders(db, ticket_id);
    if (stakeholders) {
      const { ticket, custRows, raiser, primaryEngineer } = stakeholders;
      const sender_id = primaryEngineer?.ASSIGNED_TO || 0;

      if (allCompleted) {
        await notifyCustSide(db, {
          ticket_id, ticket, custRows,
          subject:     `Ticket #${ticket_id} Resolved — Verification Required`,
          buildHtml:   (r) => buildVerificationEmail({ recipientName: r.NAME, ticketId: ticket_id, ticketTitle: ticket.TITLE }),
          message:     `Ticket #${ticket_id} "${ticket.TITLE}" has been resolved. Please verify within 3 working days.`,
          notifTypeId: 2,
          sender_id,
        });
        await notifyPrimaryEngineer(db, {
          ticket_id, primaryEngineer,
          subject:   `Ticket #${ticket_id} — All Engineers Completed, Awaiting Verification`,
          buildHtml: () => buildVerificationEmail({ recipientName: primaryEngineer.NAME, ticketId: ticket_id, ticketTitle: ticket.TITLE }),
          message:   `All engineers completed ticket #${ticket_id}. Awaiting customer verification.`,
          notifTypeId: 2,
          sender_id,
        });
        await notifyRaiser(db, {
          ticket_id, raiser,
          subject:   `Your Ticket #${ticket_id} Has Been Resolved — Please Verify`,
          buildHtml: (r) => buildVerificationEmail({ recipientName: r.NAME, ticketId: ticket_id, ticketTitle: ticket.TITLE }),
          message:   `Your ticket #${ticket_id} "${ticket.TITLE}" has been resolved. Please verify within 3 working days.`,
          notifTypeId: 2,
          sender_id,
        });

      } else if (isFirstTimeInProgress) {
        await notifyCustSide(db, {
          ticket_id, ticket, custRows,
          subject:     `Ticket #${ticket_id} Is Now In Progress`,
          buildHtml:   (r) => buildInProgressEmail({ recipientName: r.NAME, ticketId: ticket_id, ticketTitle: ticket.TITLE }),
          message:     `Work has started on ticket #${ticket_id} "${ticket.TITLE}".`,
          notifTypeId: 2,
          sender_id,
        });
        await notifyRaiser(db, {
          ticket_id, raiser,
          subject:   `Your Ticket #${ticket_id} Is Now In Progress`,
          buildHtml: (r) => buildInProgressEmail({ recipientName: r.NAME, ticketId: ticket_id, ticketTitle: ticket.TITLE }),
          message:   `Work has started on your ticket #${ticket_id} "${ticket.TITLE}".`,
          notifTypeId: 2,
          sender_id,
        });
      }
    }

    res.status(200).json(new ApiResponse(200, {
      ticket_id:            Number(ticket_id),
      assignment_id:        Number(assignment_id),
      assignment_status_id: Number(status_id),
      master_status_id:     masterStatusId,
    }, allCompleted
      ? "All assignees completed — ticket pending verification ✅"
      : Number(status_id) === IN_PROGRESS_STATUS
        ? "Work started — ticket marked as In Progress"
        : "Your work completed — waiting for other assignees"
    ));

  } catch (err) {
    console.error("UpdateTicketStatus Error:", err);
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Failed to update ticket status", err.message);
  }
});

// ─── UpdateTicketProgress ─────────────────────────────────────────────────────
const UpdateTicketProgress = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  try {
    const { ticket_id } = req.params;
    const { assignment_id, remarks, percentage_comp } = req.body;

    if (!ticket_id)     throw new ApiError(400, "Ticket ID is required");
    if (!assignment_id) throw new ApiError(400, "Assignment ID is required");
    if (!remarks || !remarks.trim()) throw new ApiError(400, "Remarks is required");
    if (percentage_comp === undefined || percentage_comp === null)
      throw new ApiError(400, "Percentage is required");

    const percentage         = Number(percentage_comp);
    const assignmentStatusId = percentage === 100 ? COMPLETED_STATUS : IN_PROGRESS_STATUS;

    // Check current master status before update
    const currentStatusResult = await db.executeQuery(
      `SELECT STATUS_ID FROM TICKET_MASTER WHERE TICKET_ID = :ticket_id`,
      { ticket_id: Number(ticket_id) },
      "siri_db"
    );
    const currentMasterStatus   = Number(currentStatusResult.rows[0]?.STATUS_ID);
    const isFirstTimeInProgress = currentMasterStatus !== IN_PROGRESS_STATUS;

    // Insert progress record
    await db.executeQuery(
      `INSERT INTO TICKET_PROGRESS
         (TICKET_ID, TICKET_ASS_ID, REMARKS, PERCENTAGE_COMP, CREATED_DATE, CREATED_TIME)
       VALUES (:ticket_id, :assignment_id, :remarks, :percentage_comp, SYSDATE, SYSDATE)`,
      {
        ticket_id:       Number(ticket_id),
        assignment_id:   Number(assignment_id),
        remarks:         remarks.trim(),
        percentage_comp: String(percentage),
      },
      "siri_db"
    );

    // Update assignment status
    await db.executeQuery(
      `UPDATE TICKET_ASSIGNMENT SET STATUS_ID = :status_id
       WHERE ASSIGNMENT_ID = :assignment_id`,
      { assignment_id: Number(assignment_id), status_id: assignmentStatusId },
      "siri_db"
    );

    // Check if all engineers completed
    const checkResult = await db.executeQuery(
      `SELECT COUNT(*) AS TOTAL,
              SUM(CASE WHEN STATUS_ID = :completed_status THEN 1 ELSE 0 END) AS COMPLETED_COUNT
       FROM TICKET_ASSIGNMENT WHERE TICKET_ID = :ticket_id`,
      { ticket_id: Number(ticket_id), completed_status: COMPLETED_STATUS },
      "siri_db"
    );

    const total          = Number(checkResult.rows[0]?.TOTAL || 0);
    const completedCount = Number(checkResult.rows[0]?.COMPLETED_COUNT || 0);
    const allCompleted   = total > 0 && total === completedCount;
    const masterStatusId = allCompleted ? VERIFICATION_PENDING_STATUS : IN_PROGRESS_STATUS;

    // Update ticket master
    if (allCompleted) {
      await db.executeQuery(
        `UPDATE TICKET_MASTER SET STATUS_ID = :status_id, VERIFIED_DATE = SYSDATE
         WHERE TICKET_ID = :ticket_id`,
        { ticket_id: Number(ticket_id), status_id: masterStatusId },
        "siri_db"
      );
    } else {
      await db.executeQuery(
        `UPDATE TICKET_MASTER SET STATUS_ID = :status_id
         WHERE TICKET_ID = :ticket_id`,
        { ticket_id: Number(ticket_id), status_id: masterStatusId },
        "siri_db"
      );
    }

    // Send notifications
    const stakeholders = await getTicketStakeholders(db, ticket_id);
    if (stakeholders) {
      const { ticket, custRows, raiser, primaryEngineer } = stakeholders;
      const sender_id = primaryEngineer?.ASSIGNED_TO || 0;

      if (allCompleted) {
        await notifyCustSide(db, {
          ticket_id, ticket, custRows,
          subject:     `Ticket #${ticket_id} Resolved — Verification Required`,
          buildHtml:   (r) => buildVerificationEmail({ recipientName: r.NAME, ticketId: ticket_id, ticketTitle: ticket.TITLE }),
          message:     `Ticket #${ticket_id} "${ticket.TITLE}" has been resolved. Please verify within 3 working days.`,
          notifTypeId: 2,
          sender_id,
        });
        await notifyPrimaryEngineer(db, {
          ticket_id, primaryEngineer,
          subject:   `Ticket #${ticket_id} — All Engineers Completed, Awaiting Verification`,
          buildHtml: () => buildVerificationEmail({ recipientName: primaryEngineer.NAME, ticketId: ticket_id, ticketTitle: ticket.TITLE }),
          message:   `All engineers completed ticket #${ticket_id}. Awaiting customer verification.`,
          notifTypeId: 2,
          sender_id,
        });
        await notifyRaiser(db, {
          ticket_id, raiser,
          subject:   `Your Ticket #${ticket_id} Has Been Resolved — Please Verify`,
          buildHtml: (r) => buildVerificationEmail({ recipientName: r.NAME, ticketId: ticket_id, ticketTitle: ticket.TITLE }),
          message:   `Your ticket #${ticket_id} "${ticket.TITLE}" has been resolved. Please verify within 3 working days.`,
          notifTypeId: 2,
          sender_id,
        });

      } else if (isFirstTimeInProgress) {
        await notifyCustSide(db, {
          ticket_id, ticket, custRows,
          subject:     `Ticket #${ticket_id} Is Now In Progress`,
          buildHtml:   (r) => buildInProgressEmail({ recipientName: r.NAME, ticketId: ticket_id, ticketTitle: ticket.TITLE, remarks: remarks.trim(), percentage }),
          message:     `Work has started on ticket #${ticket_id} "${ticket.TITLE}".`,
          notifTypeId: 2,
          sender_id,
        });
        await notifyRaiser(db, {
          ticket_id, raiser,
          subject:   `Your Ticket #${ticket_id} Is Now In Progress`,
          buildHtml: (r) => buildInProgressEmail({ recipientName: r.NAME, ticketId: ticket_id, ticketTitle: ticket.TITLE, remarks: remarks.trim(), percentage }),
          message:   `Work has started on your ticket #${ticket_id} "${ticket.TITLE}".`,
          notifTypeId: 2,
          sender_id,
        });
      }
    }

    res.status(200).json(new ApiResponse(200, {
      ticket_id:            Number(ticket_id),
      assignment_id:        Number(assignment_id),
      percentage_comp:      percentage,
      assignment_status_id: assignmentStatusId,
      master_status_id:     masterStatusId,
    }, allCompleted
      ? "All assignees completed — ticket pending verification ✅"
      : percentage === 100
        ? "Your work completed — waiting for other assignees"
        : "Progress updated — ticket In Progress"
    ));

  } catch (err) {
    console.error("UpdateTicketProgress Error:", err);
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Failed to update progress", err.message);
  }
});

// ─── CRON: Auto-close after 3 working days ────────────────────────────────────
const startAutoCloseCron = () => {
  cron.schedule("0 9 * * 1-5", async () => {
    const db = new DatabaseHandler();
    try {
      const result = await db.executeQuery(
        `SELECT TICKET_ID, TITLE, CUSTOMER_DEPT_ID
         FROM TICKET_MASTER
         WHERE STATUS_ID = :status_id
           AND VERIFIED_DATE IS NOT NULL
           AND (
             SELECT COUNT(*)
             FROM (
               SELECT TRUNC(VERIFIED_DATE) + LEVEL AS CHECK_DATE
               FROM DUAL
               CONNECT BY LEVEL <= 10
             )
             WHERE CHECK_DATE <= TRUNC(SYSDATE)
               AND TO_CHAR(CHECK_DATE, 'DY', 'NLS_DATE_LANGUAGE=ENGLISH')
                   NOT IN ('SAT', 'SUN')
           ) >= 3`,
        { status_id: { val: VERIFICATION_PENDING_STATUS, type: OracleDB.NUMBER } },
        "siri_db"
      );

      const tickets = result.rows || [];

      for (const ticket of tickets) {
        try {
          await db.executeQuery(
            `UPDATE TICKET_MASTER SET STATUS_ID = :status_id
             WHERE TICKET_ID = :ticket_id`,
            {
              ticket_id: { val: Number(ticket.TICKET_ID), type: OracleDB.NUMBER },
              status_id: { val: AUTO_CLOSED_STATUS,       type: OracleDB.NUMBER },
            },
            "siri_db"
          );

          const stakeholders = await getTicketStakeholders(db, ticket.TICKET_ID);
          if (stakeholders) {
            const { custRows, raiser, primaryEngineer } = stakeholders;
            const sender_id = primaryEngineer?.ASSIGNED_TO || 0;

            await notifyCustSide(db, {
              ticket_id:   ticket.TICKET_ID,
              ticket,
              custRows,
              subject:     `Ticket #${ticket.TICKET_ID} Auto Closed`,
              buildHtml:   (r) => buildAutoClosedEmail({ recipientName: r.NAME, ticketId: ticket.TICKET_ID, ticketTitle: ticket.TITLE }),
              message:     `Ticket #${ticket.TICKET_ID} "${ticket.TITLE}" auto-closed after 3 working days with no verification.`,
              notifTypeId: 2,
              sender_id,
            });
            await notifyPrimaryEngineer(db, {
              ticket_id:   ticket.TICKET_ID,
              primaryEngineer,
              subject:     `Ticket #${ticket.TICKET_ID} Auto Closed`,
              buildHtml:   () => buildAutoClosedEmail({ recipientName: primaryEngineer.NAME, ticketId: ticket.TICKET_ID, ticketTitle: ticket.TITLE }),
              message:     `Ticket #${ticket.TICKET_ID} has been auto-closed after 3 working days with no verification.`,
              notifTypeId: 2,
              sender_id,
            });
            await notifyRaiser(db, {
              ticket_id:   ticket.TICKET_ID,
              raiser,
              subject:     `Your Ticket #${ticket.TICKET_ID} Has Been Auto Closed`,
              buildHtml:   (r) => buildAutoClosedEmail({ recipientName: r.NAME, ticketId: ticket.TICKET_ID, ticketTitle: ticket.TITLE }),
              message:     `Your ticket #${ticket.TICKET_ID} "${ticket.TITLE}" has been auto-closed after 3 working days with no verification.`,
              notifTypeId: 2,
              sender_id,
            });
          }
        } catch (ticketErr) {
          console.error(`Failed to auto-close ticket #${ticket.TICKET_ID}:`, ticketErr.message);
        }
      }
    } catch (err) {
      console.error("Auto-close cron error:", err);
    }
  });

};

module.exports = { UpdateTicketStatus, UpdateTicketProgress, startAutoCloseCron };