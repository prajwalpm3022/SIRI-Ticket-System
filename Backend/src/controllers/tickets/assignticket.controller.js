const { asyncHandler, EmailService, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");
const OracleDB = require("oracledb");
const emailService = new EmailService();
const get_taskcategory = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        CATEGORY_ID,
        CATEGORY_NAME as "category_name"
      FROM TICKET_CATEGORY
      ORDER BY CATEGORY_ID DESC
    `;

    const result = await db.executeQuery(query, {}, 'siri_db');

    return res
      .status(200)
      .json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_taskpriority = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        PRIORITY_ID,
        PRIORITY as "priority_name"
      FROM TICKET_PRIORITY
      ORDER BY PRIORITY_ID DESC
    `;

    const result = await db.executeQuery(query, {}, 'siri_db');

    return res
      .status(200)
      .json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_taskstatus = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
     SELECT
  TICKET_STATUS_ID ,
  STATUS AS "status"
FROM TICKET_STATUS
ORDER BY TICKET_STATUS_ID DESC
      
    `;

    const result = await db.executeQuery(query, {}, 'siri_db');

    return res
      .status(200)
      .json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_ticket_by_id = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { id } = req.params;


    const ticketQuery = `
  SELECT 
    TM.TICKET_ID,
    TM.TITLE,
    TM.DESCRIPTION,
    TM.STATUS_ID,
    TS.STATUS,
    TM.PRIORITY_ID,
    TM.PROJECT_ID,         
    TM.CREATED_AT,
    TM.CREATED_BY,
    TM.ASSIGNED_DATE,
    TM.CLI_EXCOMP_DATE,
    TM.REMARKS,
    CL.NAME              AS CLIENT_NAME,
    CD.CUST_DEPT_NAME    AS DEPT_NAME

  FROM TICKET_MASTER TM

  LEFT JOIN TICKET_STATUS TS 
    ON TM.STATUS_ID = TS.TICKET_STATUS_ID

  LEFT JOIN CUST_LOGIN CL
    ON CL.CUST_ID = TM.CREATED_BY    
  LEFT JOIN CUST_DEPT CD
    ON CL.CUST_DEPT_ID = CD.CUST_DEPT_ID

  WHERE TM.TICKET_ID = :id
`;

    const ticketResult = await db.executeQuery(
      ticketQuery,
      { id },
      "siri_db"
    );

    if (!ticketResult.rows.length) {
      throw new ApiError(404, "Ticket not found");
    }

    // 🔹 2️⃣ Get Attachments
    //     const attachmentQuery = `
    //       SELECT
    //   TICKET_DOC_ID   AS ATTACHMENT_ID,
    //   DOC_NAME        AS FILE_NAME,
    //   UPLOADED_DATE
    // FROM TICKET_DOCS
    // WHERE TICKET_ID = :id
    // ORDER BY UPLOADED_DATE DESC
    //     `;
    const attachmentQuery = `
  SELECT
    TICKET_DOC_ID   AS ATTACHMENT_ID,
    DOC_NAME        AS FILE_NAME,
    UPLOADED_DATE,
    TKT_DOC_FROM
  FROM TICKET_DOCS
  WHERE TICKET_ID      = :id
    AND ASSIGNMENT_ID  IS NULL
  ORDER BY UPLOADED_DATE DESC
`;
    const attachmentResult = await db.executeQuery(
      attachmentQuery,
      { id },
      "siri_db"
    );

    
    const responseData = {
      ...ticketResult.rows[0],
      attachments: attachmentResult.rows
    };

    return res.status(200).json(
      new ApiResponse(200, responseData)
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// ─── Notification Insert ──────────────────────────────────────────────────────
const insertNotification = async (db, { 
  message, sender_id, send_to, send_to_type,
  notification_type_id, ticket_id, email_sent_to 
}) => {
  try {
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
         :notification,
         :sender_id,
         :send_to,
         :send_to_type,
         SYSDATE,
         TO_CHAR(SYSTIMESTAMP, 'HH:MI:SS AM'),
         :notification_type_id,
         :ticket_id,
         :email_sent_to
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

// ─── Email HTML Builders ──────────────────────────────────────────────────────

const buildCustomerEmail = ({
  recipientName, ticketId, ticketTitle,
  engineerName, categoryName, priorityName,
  expCompDate, remarks,
}) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;
              border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    <div style="background:#1a73e8;padding:20px 24px;">
      <h2 style="color:#fff;margin:0;">Ticket Assigned ✅</h2>
    </div>
    <div style="padding:24px;">
      <p>Dear <strong>${recipientName || "Customer"}</strong>,</p>
      <p>Your support ticket has been successfully assigned to one of our engineers.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;width:42%;">Ticket ID</td>
          <td style="padding:10px 14px;">#${ticketId}</td>
        </tr>
        ${ticketTitle ? `
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Title</td>
          <td style="padding:10px 14px;">${ticketTitle}</td>
        </tr>` : ""}
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">Assigned Engineer</td>
          <td style="padding:10px 14px;">${engineerName || "—"}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Category</td>
          <td style="padding:10px 14px;">${categoryName}</td>
        </tr>
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">Priority</td>
          <td style="padding:10px 14px;">${priorityName}</td>
        </tr>
        ${expCompDate ? `
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Expected Completion</td>
          <td style="padding:10px 14px;">${expCompDate}</td>
        </tr>` : ""}
        ${remarks ? `
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">Remarks</td>
          <td style="padding:10px 14px;">${remarks}</td>
        </tr>` : ""}
      </table>
      <p>Our team is actively working on your request and will notify you once resolved.</p>
      <p style="color:#888;font-size:12px;margin-top:24px;">
        This is an automated notification. Please do not reply.
      </p>
    </div>
  </div>`;

const buildInternalCustSideEmail = ({
  recipientName, roleLabel, ticketId, ticketTitle,
  engineerName, categoryName, priorityName,
  expCompDate, ticketDesc, workRemarks,
}) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;
              border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    <div style="background:#0d47a1;padding:20px 24px;">
      <h2 style="color:#fff;margin:0;">Ticket Assigned 🔔</h2>
    </div>
    <div style="padding:24px;">
      <p>Dear <strong>${recipientName || roleLabel}</strong>,</p>
      <p>The following ticket has been assigned to an engineer for your reference.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;width:42%;">Ticket ID</td>
          <td style="padding:10px 14px;">#${ticketId}</td>
        </tr>
        ${ticketTitle ? `
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Title</td>
          <td style="padding:10px 14px;">${ticketTitle}</td>
        </tr>` : ""}
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">Assigned Engineer</td>
          <td style="padding:10px 14px;">${engineerName || "—"}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Category</td>
          <td style="padding:10px 14px;">${categoryName}</td>
        </tr>
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">Priority</td>
          <td style="padding:10px 14px;">${priorityName}</td>
        </tr>
        ${expCompDate ? `
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Expected Completion</td>
          <td style="padding:10px 14px;">${expCompDate}</td>
        </tr>` : ""}
        ${ticketDesc ? `
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">Description</td>
          <td style="padding:10px 14px;">${ticketDesc}</td>
        </tr>` : ""}
        ${workRemarks ? `
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Work Remarks</td>
          <td style="padding:10px 14px;">${workRemarks}</td>
        </tr>` : ""}
      </table>
      <p style="color:#888;font-size:12px;margin-top:24px;">
        This is an automated notification. Please do not reply.
      </p>
    </div>
  </div>`;

const buildEngineerEmail = ({
  recipientName, ticketId, ticketTitle,
  categoryName, priorityName, expCompDate,
  ticketDesc, workRemarks, isUpdate,
}) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;
              border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    <div style="background:#2e7d32;padding:20px 24px;">
      <h2 style="color:#fff;margin:0;">
        ${isUpdate ? "Ticket Updated 🔄" : "New Ticket Assigned 🛠️"}
      </h2>
    </div>
    <div style="padding:24px;">
      <p>Dear <strong>${recipientName}</strong>,</p>
      <p>A ticket has been <strong>${isUpdate ? "updated" : "assigned"}</strong> to you. Please review and take action.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;width:42%;">Ticket ID</td>
          <td style="padding:10px 14px;">#${ticketId}</td>
        </tr>
        ${ticketTitle ? `
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Title</td>
          <td style="padding:10px 14px;">${ticketTitle}</td>
        </tr>` : ""}
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">Category</td>
          <td style="padding:10px 14px;">${categoryName}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Priority</td>
          <td style="padding:10px 14px;">${priorityName}</td>
        </tr>
        ${expCompDate ? `
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">Expected Completion</td>
          <td style="padding:10px 14px;">${expCompDate}</td>
        </tr>` : ""}
        ${ticketDesc ? `
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Description</td>
          <td style="padding:10px 14px;">${ticketDesc}</td>
        </tr>` : ""}
        ${workRemarks ? `
        <tr style="background:#f5f5f5;">
          <td style="padding:10px 14px;font-weight:bold;">Work Remarks</td>
          <td style="padding:10px 14px;">${workRemarks}</td>
        </tr>` : ""}
      </table>
      <p style="color:#888;font-size:12px;margin-top:24px;">
        This is an automated notification. Please do not reply.
      </p>
    </div>
  </div>`;

const sendTicketAssignmentNotifications = async (db, {
  isUpdate, role, ticket_id, assigned_to, assigned_by,
  category_id, priority_id, ticket_desc, work_remarks,
  exp_comp_date, remarks,
}) => {
  try {
    
    
   const ticketResult = await db.executeQuery(
  `SELECT TICKET_ID, TITLE, CREATED_BY, CUSTOMER_DEPT_ID, CUST_LOGIN_ID
   FROM TICKET_MASTER
   WHERE TICKET_ID = :ticket_id`,
  { ticket_id: { val: Number(ticket_id), type:OracleDB.NUMBER  } }, 
  "siri_db"
);
const ticket = ticketResult.rows?.[0];
    if (!ticket) return;
    
    const engResult = await db.executeQuery(
      `SELECT UM.USER_ID, E.NAME, E.OFF_EMAIL_ID, E.EMAIL_ID
       FROM USER_MAST UM
       JOIN EMP E ON E.EMP_ID = UM.EMP_ID
       WHERE UM.USER_ID = :user_id`,
      { user_id: { val: Number(assigned_to), type: OracleDB.NUMBER } },
      "siri_db"
    );
    const engineer = engResult.rows?.[0];

   
    const engineerEmail = engineer?.OFF_EMAIL_ID || engineer?.EMAIL_ID || null;

    
    const catResult = await db.executeQuery(
      `SELECT CATEGORY_NAME FROM TICKET_CATEGORY WHERE CATEGORY_ID = :id`,
      { id: { val: Number(category_id), type: OracleDB.NUMBER } },
      "siri_db"
    );
    const priResult = await db.executeQuery(
      `SELECT PRIORITY FROM TICKET_PRIORITY WHERE PRIORITY_ID = :id`, 
      { id: { val: Number(priority_id), type: OracleDB.NUMBER } },
      "siri_db"
    );
    const categoryName = catResult.rows?.[0]?.CATEGORY_NAME || "—";
    const priorityName = priResult.rows?.[0]?.PRIORITY      || "—";

    const notifTypeId = isUpdate ? 2 : 1;

    // ── FIRST ASSIGNMENT ONLY ─────────────────────────────────────────────────
    if (!isUpdate) {

      const custResult = await db.executeQuery(
  `SELECT CUST_LOGIN_ID, NAME, EMAIL, LOGIN_TYPE
   FROM CUST_LOGIN
   WHERE CUST_LOGIN_ID = :cust_login_id   -- ✅ exact match, no ambiguity
     AND ACTIVE = 'Y'`,
  { cust_login_id: { val: Number(ticket.CUST_LOGIN_ID), type: OracleDB.NUMBER  } },
  "siri_db"
);
const createdBy = custResult.rows?.[0];

// Then for SH and Admin, query separately by dept
const deptResult = await db.executeQuery(
  `SELECT CUST_LOGIN_ID, NAME, EMAIL, LOGIN_TYPE
   FROM CUST_LOGIN
   WHERE CUST_DEPT_ID = :dept_id
     AND LOGIN_TYPE IN ('SH', 'A')
     AND ACTIVE = 'Y'`,
  { dept_id: { val: Number(ticket.CUSTOMER_DEPT_ID), type: OracleDB.NUMBER  } },
  "siri_db"
);
const sectionHead = deptResult.rows?.find(r => r.LOGIN_TYPE === 'SH');
const deptAdmin   = deptResult.rows?.find(r => r.LOGIN_TYPE === 'A');

      // ── CU ─────────────────────────────────────────────────────────────────
      if (createdBy) {
        let cuEmail = null;
        try {
          if (createdBy.EMAIL) {
            await emailService.sendEmail(
              "Support Team",
              createdBy.EMAIL,
              `Your Ticket #${ticket_id} Has Been Assigned`,
              buildCustomerEmail({
                recipientName: createdBy.NAME,
                ticketId:      ticket_id,
                ticketTitle:   ticket.TITLE,
                engineerName:  engineer?.NAME,
                categoryName,
                priorityName,
                expCompDate:   exp_comp_date,
                remarks,
              })
            );
            cuEmail = createdBy.EMAIL;
          } else {
            console.warn(`⚠️ CU ${createdBy.NAME} has no email`);
          }
        } catch (emailErr) {
          console.error("Email failed for CU:", emailErr.message);
        }

        try {
          await insertNotification(db, {
            message:              `Your ticket #${ticket_id} "${ticket.TITLE || ""}" has been assigned to engineer ${engineer?.NAME || ""}.`,
            sender_id:            assigned_by,
            send_to:              createdBy.CUST_LOGIN_ID,
            send_to_type:         'CUST',
            notification_type_id: notifTypeId,
            ticket_id,
            email_sent_to:        cuEmail,
          });
        } catch (notifErr) {
          console.error("Notification failed for CU:", notifErr.message);
        }
      }

      // ── SH ─────────────────────────────────────────────────────────────────
      if (sectionHead) {
        let shEmail = null;
        try {
          if (sectionHead.EMAIL) {
            await emailService.sendEmail(
              "Support Team",
              sectionHead.EMAIL,
              `[Info] Ticket #${ticket_id} Assigned — ${categoryName}`,
              buildInternalCustSideEmail({
                recipientName: sectionHead.NAME,
                roleLabel:     "Section Head",
                ticketId:      ticket_id,
                ticketTitle:   ticket.TITLE,
                engineerName:  engineer?.NAME,
                categoryName,
                priorityName,
                expCompDate:   exp_comp_date,
                ticketDesc:    ticket_desc,
                workRemarks:   work_remarks,
              })
            );
            shEmail = sectionHead.EMAIL;
          } else {
            console.warn(`⚠️ SH ${sectionHead.NAME} has no email`);
          }
        } catch (emailErr) {
          console.error("Email failed for SH:", emailErr.message);
        }

        try {
          await insertNotification(db, {
  message: `Ticket #${ticket_id} "${ticket.TITLE || ""}" has been assigned to ${engineer?.NAME || ""}.`,
  
  sender_id:            assigned_by,
  send_to:              sectionHead.CUST_LOGIN_ID,
  send_to_type:         'CUST',
  notification_type_id: notifTypeId,
  ticket_id,
  email_sent_to:        shEmail,
});
        } catch (notifErr) {
          console.error("Notification failed for SH:", notifErr.message);
        }
      }

      // ── Dept Admin ──────────────────────────────────────────────────────────
      if (deptAdmin) {
        let aEmail = null;
        try {
          if (deptAdmin.EMAIL) {
            await emailService.sendEmail(
              "Support Team",
              deptAdmin.EMAIL,
              `[Info] Ticket #${ticket_id} Assigned — ${categoryName}`,
              buildInternalCustSideEmail({
                recipientName: deptAdmin.NAME,
                roleLabel:     "Department Admin",
                ticketId:      ticket_id,
                ticketTitle:   ticket.TITLE,
                engineerName:  engineer?.NAME,
                categoryName,
                priorityName,
                expCompDate:   exp_comp_date,
                ticketDesc:    ticket_desc,
                workRemarks:   work_remarks,
              })
            );
            aEmail = deptAdmin.EMAIL;
          } else {
            console.warn(`⚠️ Dept Admin ${deptAdmin.NAME} has no email`);
          }
        } catch (emailErr) {
          console.error("Email failed for Dept Admin:", emailErr.message);
        }

        try {
         await insertNotification(db, {
  message: `Ticket #${ticket_id} "${ticket.TITLE || ""}" has been assigned to ${engineer?.NAME || ""}.`,
  
  sender_id:            assigned_by,
  send_to:              deptAdmin.CUST_LOGIN_ID,
  send_to_type:         'CUST',
  notification_type_id: notifTypeId,
  ticket_id,
  email_sent_to:        aEmail,
});
        } catch (notifErr) {
          console.error("Notification failed for Dept Admin:", notifErr.message);
        }
      }
    }

   
   
// ── EVERY TIME: Notify assigned engineer + existing PRIMARY if current is SECONDARY ──
if (engineer) {
  let engEmail = null;
  try {
    if (engineerEmail) {
      await emailService.sendEmail(
        "Support Team",
        engineerEmail,
        `[Action Required] Ticket #${ticket_id} ${isUpdate ? "Updated" : "Assigned"} to You — ${categoryName}`,
        buildEngineerEmail({
          recipientName: engineer.NAME,
          ticketId:      ticket_id,
          ticketTitle:   ticket.TITLE,
          categoryName,
          priorityName,
          expCompDate:   exp_comp_date,
          ticketDesc:    ticket_desc,
          workRemarks:   work_remarks,
          isUpdate,
        })
      );
      engEmail = engineerEmail;
    } else {
      console.warn(`⚠️ Engineer ${engineer.NAME} has no office or personal email`);
    }
  } catch (emailErr) {
    console.error("Email failed for Engineer:", emailErr.message);
  }

  try {
    await insertNotification(db, {
      message:              `You have been assigned ticket #${ticket_id} (${categoryName} | ${priorityName}).`,
      sender_id:            assigned_by,
      send_to:              Number(assigned_to),
      send_to_type:         'EMP',
      notification_type_id: notifTypeId,
      ticket_id,
      email_sent_to:        engEmail,
    });
  } catch (notifErr) {
    console.error("Notification failed for Engineer:", notifErr.message);
  }

  // ── If current role is SECONDARY, also notify existing PRIMARY engineer ──
  if (role === "SECONDARY") {
    const primaryResult = await db.executeQuery(
      `SELECT TA.ASSIGNED_TO, E.NAME, E.OFF_EMAIL_ID, E.EMAIL_ID
       FROM TICKET_ASSIGNMENT TA
       JOIN USER_MAST UM ON UM.USER_ID = TA.ASSIGNED_TO
       JOIN EMP E ON E.EMP_ID = UM.EMP_ID
       WHERE TA.TICKET_ID = :ticket_id
         AND TA.ROLE = 'PRIMARY'
         AND TA.ASSIGNED_TO != :assigned_to`,
      {
        ticket_id:   { val: Number(ticket_id),   type: OracleDB.NUMBER },
        assigned_to: { val: Number(assigned_to), type: OracleDB.NUMBER },
      },
      "siri_db"
    );

    const primaryEngineer = primaryResult.rows?.[0];

    if (primaryEngineer) {
      const primaryEmail = primaryEngineer.OFF_EMAIL_ID || primaryEngineer.EMAIL_ID || null;
      let primEmail = null;

      try {
        if (primaryEmail) {
         await emailService.sendEmail(
  "Support Team",
  primaryEmail,
  `[Info] Ticket #${ticket_id} — Secondary Engineer Assigned — ${categoryName}`,
  buildEngineerEmail({
    recipientName: primaryEngineer.NAME,
    ticketId:      ticket_id,
    ticketTitle:   ticket.TITLE,
    categoryName,
    priorityName,
    expCompDate:   exp_comp_date,
    ticketDesc:    ticket_desc,
    workRemarks:   `Secondary Engineer Assigned: ${engineer.NAME}`, // ← add this
    isUpdate:      true,
  })
);
          primEmail = primaryEmail;
        } else {
          console.warn(`⚠️ PRIMARY Engineer ${primaryEngineer.NAME} has no email`);
        }
      } catch (emailErr) {
        console.error("Email failed for PRIMARY Engineer:", emailErr.message);
      }

      try {
       await insertNotification(db, {
  message: `${engineer.NAME} has been assigned as secondary engineer to ticket #${ticket_id} (${categoryName} | ${priorityName}).`, // ← updated
  sender_id:            assigned_by,
  send_to:              Number(primaryEngineer.ASSIGNED_TO),
  send_to_type:         'EMP',
  notification_type_id: notifTypeId,
  ticket_id,
  email_sent_to:        primEmail,
});
      } catch (notifErr) {
        console.error("Notification failed for PRIMARY Engineer:", notifErr.message);
      }
    }
  }
}
  } catch (err) {
    console.error("sendTicketAssignmentNotifications error:", err);
  }
};

const assign_ticket = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    let {
      ticket_id,
      status_id,
      project_id,
      remarks,
      assigned_to,
      assigned_by,
      verified_by,
      exp_comp_date,
      ticket_desc,
      category_id,
      priority_id,
      work_remarks,
      assignment_id,
      deleted_files,
      role,
      confirm_primary_override,
    } = req.body;

    const files = req.files;

    if (!ticket_id) {
      throw new ApiError(400, "Ticket ID is required");
    }

    const num = (val) => ({
      val: val !== undefined && val !== null && val !== "" ? Number(val) : null,
      type: OracleDB.NUMBER,
    });

    const str = (val) => ({
      val: val !== undefined && val !== null ? String(val) : null,
      type: OracleDB.STRING,
    });

    const dateStr = (val) => ({
      val: val ? String(val) : null,
      type: OracleDB.STRING,
    });

    const ASSIGNED_STATUS_ID = 7;
    const OVERRIDE_STATUSES  = [6, 13];

   
    if (status_id && OVERRIDE_STATUSES.includes(Number(status_id))) {
      await db.executeQuery(
        `UPDATE TICKET_MASTER
         SET STATUS_ID = :status_id,
             REMARKS   = :remarks
         WHERE TICKET_ID = :ticket_id`,
        {
          ticket_id: num(ticket_id),
          status_id: { val: Number(status_id), type: OracleDB.NUMBER },
          remarks:   str(remarks),
        },
        "siri_db"
      );

      return res.status(200).json(
        new ApiResponse(200, null, "Ticket status updated successfully")
      );
    }

    
    if (role === "PRIMARY" && confirm_primary_override !== "true") {
      const conflictResult = await db.executeQuery(
        `SELECT ASSIGNMENT_ID, ASSIGNED_TO
         FROM TICKET_ASSIGNMENT
         WHERE TICKET_ID = :ticket_id
           AND ROLE      = 'PRIMARY'
           ${assignment_id ? "AND ASSIGNMENT_ID != :assignment_id" : ""}`,
        assignment_id
          ? { ticket_id: num(ticket_id), assignment_id: num(assignment_id) }
          : { ticket_id: num(ticket_id) },
        "siri_db"
      );

      if (conflictResult.rows && conflictResult.rows.length > 0) {
        return res.status(409).json({
          statusCode: 409,
          message: "PRIMARY_CONFLICT",
          data: {
            existingAssignmentId: conflictResult.rows[0].ASSIGNMENT_ID,
            existingAssignedTo:   conflictResult.rows[0].ASSIGNED_TO,
          },
        });
      }
    }

    
    if (role === "PRIMARY" && confirm_primary_override === "true") {
      await db.executeQuery(
        `UPDATE TICKET_ASSIGNMENT
         SET ROLE = 'SECONDARY'
         WHERE TICKET_ID = :ticket_id
           AND ROLE      = 'PRIMARY'
           ${assignment_id ? "AND ASSIGNMENT_ID != :assignment_id" : ""}`,
        assignment_id
          ? { ticket_id: num(ticket_id), assignment_id: num(assignment_id) }
          : { ticket_id: num(ticket_id) },
        "siri_db"
      );
    }

    
    if (assignment_id) {
      await db.executeQuery(
        `UPDATE TICKET_ASSIGNMENT
         SET ASSIGNED_TO        = :assigned_to,
             VERIFIED_BY        = :verified_by,
             EXP_COMP_DATE      = CASE
                                    WHEN :exp_comp_date IS NOT NULL
                                    THEN TO_DATE(:exp_comp_date, 'YYYY-MM-DD')
                                    ELSE NULL
                                  END,
             TICKET_DESC        = :ticket_desc,
             TICKET_CATEGORY_ID = :category_id,
             PRIORITY_ID        = :priority_id,
             STATUS_ID          = :status_id,
             REMARKS            = :work_remarks,
             ROLE               = :role
         WHERE ASSIGNMENT_ID    = :assignment_id`,
        {
          assignment_id: num(assignment_id),
          assigned_to:   num(assigned_to),
          verified_by:   num(verified_by),
          exp_comp_date: dateStr(exp_comp_date),
          ticket_desc:   str(ticket_desc),
          category_id:   num(category_id),
          priority_id:   num(priority_id),
          status_id:     { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER },
          work_remarks:  str(work_remarks),
          role:          str(role || null),
        },
        "siri_db"
      );

      await db.executeQuery(
        `UPDATE TICKET_MASTER
         SET PROJECT_ID    = :project_id,
             STATUS_ID     = :status_id,
             ASSIGNED_DATE = SYSDATE,
             ASSIGNED_TIME = TO_CHAR(SYSTIMESTAMP, 'HH:MI:SS AM')
         WHERE TICKET_ID   = :ticket_id`,
        {
          project_id: num(project_id),
          ticket_id:  num(ticket_id),
          status_id:  { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER },
        },
        "siri_db"
      );

      
      const deleted = JSON.parse(deleted_files || "[]");
      for (const fileName of deleted) {
        await db.executeQuery(
          `DELETE FROM TICKET_DOCS
           WHERE DOC_NAME      = :doc_name
             AND ASSIGNMENT_ID = :assignment_id`,
          {
            doc_name:      str(fileName),
            assignment_id: num(assignment_id),
          },
          "siri_db"
        );
      }

      
      if (files && files.length > 0) {
        for (const file of files) {
          await db.executeQuery(
            `INSERT INTO TICKET_DOCS (
               DOC_NAME, UPLOADED_DATE, TICKET_ID,
               ASSIGNMENT_ID, DOC_UPLOADER, TKT_DOC_FROM
             ) VALUES (
               :doc_name, SYSDATE, :ticket_id,
               :assignment_id, :doc_uploader, :tkt_doc_from
             )`,
            {
              doc_name:      str(file.filename),
              ticket_id:     num(ticket_id),
              assignment_id: num(assignment_id),
              doc_uploader:  str("SI"),
              tkt_doc_from:  str(`SIRI_${assigned_by}`),
            },
            "siri_db"
          );
        }
      }

      const existingAssignmentResult = await db.executeQuery(
  `SELECT COUNT(*) AS CNT FROM TICKET_ASSIGNMENT WHERE TICKET_ID = :ticket_id`,
  { ticket_id: num(ticket_id) },
  "siri_db"
);
const alreadyAssignedBefore = (existingAssignmentResult.rows?.[0]?.CNT || 0) > 1;
      await sendTicketAssignmentNotifications(db, {
       isUpdate: alreadyAssignedBefore,
        role,
        ticket_id,
        assigned_to,
        assigned_by,
        category_id,
        priority_id,
        ticket_desc,
        work_remarks,
        exp_comp_date,
        remarks,
      });

      return res.status(200).json(
        new ApiResponse(200, null, "Assignment updated successfully")
      );
    }

    
// ── INSERT new assignment ─────────────────────────────────────────────────
await db.executeQuery(
  `UPDATE TICKET_MASTER
   SET STATUS_ID     = :status_id,
       PROJECT_ID    = :project_id,
       ASSIGNED_DATE = SYSDATE,
       ASSIGNED_TIME = TO_CHAR(SYSTIMESTAMP, 'HH:MI:SS AM'),
       REMARKS       = :remarks
   WHERE TICKET_ID   = :ticket_id`,
  {
    ticket_id: num(ticket_id),
    status_id: { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER },
    project_id: num(project_id),
    remarks:    str(remarks),
  },
  "siri_db"
);

const insertResult = await db.executeQuery(
  `INSERT INTO TICKET_ASSIGNMENT (
     TICKET_ID, ASSIGNED_TO, ASSIGNED_BY, ASSIGNED_DATE,
     VERIFIED_BY, EXP_COMP_DATE, TICKET_DESC,
     TICKET_CATEGORY_ID, PRIORITY_ID, STATUS_ID, REMARKS, ROLE
   ) VALUES (
     :ticket_id, :assigned_to, :assigned_by, SYSDATE,
     :verified_by,
     CASE
       WHEN :exp_comp_date IS NOT NULL
       THEN TO_DATE(:exp_comp_date, 'YYYY-MM-DD')
       ELSE NULL
     END,
     :ticket_desc, :category_id, :priority_id,
     :status_id, :work_remarks, :role
   )
   RETURNING ASSIGNMENT_ID INTO :assignment_id`,
  {
    ticket_id:     num(ticket_id),
    assigned_to:   num(assigned_to),
    assigned_by:   num(assigned_by),
    verified_by:   num(verified_by),
    exp_comp_date: dateStr(exp_comp_date),
    ticket_desc:   str(ticket_desc),
    category_id:   num(category_id),
    priority_id:   num(priority_id),
    status_id:     { val: ASSIGNED_STATUS_ID, type: OracleDB.NUMBER },
    work_remarks:  str(work_remarks),
    role:          str(role || null),
    assignment_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
  },
  "siri_db"
);

const newAssignmentId = insertResult.outBinds.assignment_id[0];

// Insert files for new assignment
if (files && files.length > 0) {
  for (const file of files) {
    await db.executeQuery(
      `INSERT INTO TICKET_DOCS (
         DOC_NAME, UPLOADED_DATE, TICKET_ID,
         ASSIGNMENT_ID, DOC_UPLOADER, TKT_DOC_FROM
       ) VALUES (
         :doc_name, SYSDATE, :ticket_id,
         :assignment_id, :doc_uploader, :tkt_doc_from
       )`,
      {
        doc_name:      str(file.filename),
        ticket_id:     num(ticket_id),
        assignment_id: { val: newAssignmentId, type: OracleDB.NUMBER },
        doc_uploader:  str("SI"),
        tkt_doc_from:  str(`SIRI_${assigned_by}`),
      },
      "siri_db"
    );
  }
}


const existingCountResult = await db.executeQuery(
  `SELECT COUNT(*) AS CNT FROM TICKET_ASSIGNMENT WHERE TICKET_ID = :ticket_id`,
  { ticket_id: num(ticket_id) },
  "siri_db"
);

const alreadyAssignedBefore = (existingCountResult.rows?.[0]?.CNT || 0) > 1;


await sendTicketAssignmentNotifications(db, {
  isUpdate: alreadyAssignedBefore, 
  role,
  ticket_id,
  assigned_to,
  assigned_by,
  category_id,
  priority_id,
  ticket_desc,
  work_remarks,
  exp_comp_date,
  remarks,
});

    return res.status(200).json(
      new ApiResponse(200, null, "Ticket assigned successfully")
    );

  } catch (error) {
    console.error("ASSIGN ERROR:", error);
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Internal server error"
    );
  }
});



const get_all_tickets = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { status } = req.query;

    let query = `
      SELECT 
        TM.TICKET_ID           AS ID,
        C.CUSTOMER_NAME        AS CUSTOMER_NAME,
        CD.CUST_DEPT_NAME      AS DEPARTMENT,
        TM.TITLE               AS TITLE,
        TS.STATUS              AS STATUS,
        TM.CLI_EXCOMP_DATE     AS CLI_EXCOMP_DATE,
        CASE 
          WHEN TM.ASSIGNMENT_STATUS = 'Y' THEN 'Yes'
          ELSE 'No'
        END AS ASSIGNMENT_STATUS
      FROM TICKET_MASTER TM

      LEFT JOIN (
        SELECT CUST_ID, CUST_DEPT_ID,
               ROW_NUMBER() OVER (
                 PARTITION BY CUST_ID 
                 ORDER BY CASE WHEN CUST_DEPT_ID IS NOT NULL THEN 0 ELSE 1 END,
                          CUST_LOGIN_ID DESC
               ) AS RN
        FROM CUST_LOGIN
      ) CL ON TM.CREATED_BY = CL.CUST_ID AND CL.RN = 1

      LEFT JOIN CUSTOMER C
        ON CL.CUST_ID = C.CUSTOMER_ID

      LEFT JOIN CUST_DEPT CD
        ON CL.CUST_DEPT_ID = CD.CUST_DEPT_ID

      LEFT JOIN TICKET_STATUS TS
        ON TM.STATUS_ID = TS.TICKET_STATUS_ID

      WHERE 1=1
    `;

    const binds = {};

    if (status) {
      if (status === 'NEW') {
        query += `
          AND NVL(UPPER(TRIM(TM.ASSIGNMENT_STATUS)),'N') = 'N'
          AND TM.STATUS_ID IN (2, 7, 8, 13,14)
        `;
      } else if (status === 'ASSIGNED') {
        query += `
          AND TM.STATUS_ID IN (7, 8,10,11)
        `;
      } else if (status === 'COMPLETED') {
        query += `
          AND TM.STATUS_ID = 12
        `;
      } else if (status === 'SIRI ADMIN REJECTED') {
        query += `
          AND TM.STATUS_ID IN (3, 6)
        `;
      } else {
        query += ` AND UPPER(TS.STATUS) = :status`;
        binds.status = status.toUpperCase();
      }
    }

    const result = await db.executeQuery(query, binds, 'siri_db');

    return res.status(200).json(
      new ApiResponse(200, result.rows)
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});



const get_ticket_progress_by_ticket_id = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { id } = req.params;

    const query = `
      SELECT
        TP.TICKET_PRO_ID,
        TA.TICKET_ID,
        TM.PROJECT_ID,
        TP.CREATED_DATE,
        TP.CREATED_TIME,
        TP.REMARKS,
        CASE 
          WHEN TP.PERCENTAGE_COMP IS NULL THEN 0
          WHEN REGEXP_LIKE(TP.PERCENTAGE_COMP, '^[0-9]+$')
          THEN TO_NUMBER(TP.PERCENTAGE_COMP)
          ELSE 0
        END AS PERCENTAGE_COMP,
        PM.PROJECT_NAME,
        EM.NAME AS EMPLOYEE_NAME,
        TA.ASSIGNED_DATE,
        TA.EXP_COMP_DATE,
        TA.TICKET_DESC,
        PR.PRIORITY AS PRIORITY_NAME,
        TC.CATEGORY_NAME,

        -- ✅ Status based on actual progress, not ticket-level status
        CASE
          WHEN TP.TICKET_PRO_ID IS NULL
            THEN 'Not Started'
          WHEN REGEXP_LIKE(TP.PERCENTAGE_COMP, '^[0-9]+$')
               AND TO_NUMBER(TP.PERCENTAGE_COMP) = 100
            THEN 'Completed'
          WHEN REGEXP_LIKE(TP.PERCENTAGE_COMP, '^[0-9]+$')
               AND TO_NUMBER(TP.PERCENTAGE_COMP) > 0
            THEN 'In Progress'
          ELSE 'Not Started'
        END AS STATUS,

        (SELECT LISTAGG(DOC_NAME, ',') WITHIN GROUP (ORDER BY DOC_NAME) 
         FROM TICKET_DOCS 
         WHERE ASSIGNMENT_ID = TA.ASSIGNMENT_ID) AS ATTACHMENTS

      FROM TICKET_ASSIGNMENT TA 

      -- ✅ Latest progress row per employee only
      LEFT JOIN (
        SELECT *
        FROM (
          SELECT
            TP_INNER.*,
            ROW_NUMBER() OVER (
              PARTITION BY TP_INNER.TICKET_ASS_ID
              ORDER BY TP_INNER.CREATED_DATE DESC, TP_INNER.CREATED_TIME DESC
            ) AS RN
          FROM TICKET_PROGRESS TP_INNER
        )
        WHERE RN = 1
      ) TP ON TP.TICKET_ASS_ID = TA.ASSIGNMENT_ID

      LEFT JOIN TICKET_MASTER TM ON TA.TICKET_ID = TM.TICKET_ID
      LEFT JOIN PROJECT PM ON TM.PROJECT_ID = PM.PROJECT_ID
      LEFT JOIN EMP EM ON TA.ASSIGNED_TO = EM.EMP_ID
      LEFT JOIN TICKET_PRIORITY PR ON TA.PRIORITY_ID = PR.PRIORITY_ID
      LEFT JOIN TICKET_CATEGORY TC ON TA.TICKET_CATEGORY_ID = TC.CATEGORY_ID

      WHERE TA.TICKET_ID = :id
      ORDER BY TA.ASSIGNMENT_ID ASC
    `;

    const result = await db.executeQuery(query, { id }, "siri_db");
    return res.status(200).json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_all_tickets_onsearch = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { customerName, fromDate, toDate, status } = req.query;

    let query = `
      SELECT
        TM.TICKET_ID        AS ID,
        C.CUSTOMER_NAME     AS CUSTOMER_NAME,
        CD.CUST_DEPT_NAME   AS DEPARTMENT,
        TM.TITLE            AS TITLE,
        TS.STATUS           AS STATUS,
        TM.CREATED_AT       AS CREATED_AT,
        CASE 
          WHEN TM.ASSIGNMENT_STATUS = 'Y' THEN 'Yes'
          ELSE 'No'
        END AS ASSIGNMENT_STATUS

      FROM TICKET_MASTER TM

      LEFT JOIN (
        SELECT CUST_ID, CUST_DEPT_ID,
               ROW_NUMBER() OVER (PARTITION BY CUST_ID ORDER BY CUST_LOGIN_ID) AS RN
        FROM CUST_LOGIN
      ) CL ON TM.CREATED_BY = CL.CUST_ID AND CL.RN = 1

      LEFT JOIN CUSTOMER C
        ON CL.CUST_ID = C.CUSTOMER_ID

      LEFT JOIN CUST_DEPT CD
        ON CL.CUST_DEPT_ID = CD.CUST_DEPT_ID

      LEFT JOIN TICKET_STATUS TS
        ON TM.STATUS_ID = TS.TICKET_STATUS_ID

      WHERE 1=1
    `;

    const binds = {};

    if (customerName) {
      query += `
        AND LOWER(TRIM(C.CUSTOMER_NAME)) 
        LIKE '%' || LOWER(TRIM(:customerName)) || '%'
      `;
      binds.customerName = customerName;
    }

    if (fromDate) {
      query += `
        AND TM.CREATED_AT >= TO_DATE(:fromDate,'YYYY-MM-DD')
      `;
      binds.fromDate = fromDate;
    }

    if (toDate) {
      query += `
        AND TM.CREATED_AT < TO_DATE(:toDate,'YYYY-MM-DD') + 1
      `;
      binds.toDate = toDate;
    }

    if (status === "NEW") {
      query += `
        AND NVL(UPPER(TRIM(TM.ASSIGNMENT_STATUS)), 'N') = 'N'
        AND TM.STATUS_ID IN (2, 7, 8, 13,11)
      `;
    } else if (status === "ASSIGNED") {
      query += `
        AND UPPER(TRIM(TM.ASSIGNMENT_STATUS)) = 'Y'
        AND TM.STATUS_ID IN (7, 8,10,11)
      `;
    } else if (status === "COMPLETED") {
      query += `
        AND TM.STATUS_ID = 12
      `;
    } else if (status === "SIRI ADMIN REJECTED") {
      query += `
        AND TM.STATUS_ID IN (3, 6)
      `;
    } else if (status) {
      query += `
        AND UPPER(TRIM(TS.STATUS)) = :status
      `;
      binds.status = status.trim().toUpperCase();
    }

    query += ` ORDER BY TM.TICKET_ID DESC`;

    const result = await db.executeQuery(query, binds, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, result.rows)
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

const move_ticket_to_assigned = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { ticket_id } = req.body;

    if (!ticket_id) {
      throw new ApiError(400, "Ticket ID is required");
    }

    const query = `
      UPDATE TICKET_MASTER
      SET ASSIGNMENT_STATUS = 'Y'
      WHERE TICKET_ID = :ticket_id
    `;

    await db.executeQuery(query, { ticket_id }, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, null, "Assignment status updated to Y")
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

const get_ticket_assignments = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { id } = req.params;

    const query = `
  SELECT
    TA.ASSIGNMENT_ID,
    TA.ASSIGNED_DATE,
    TA.ROLE,                    
    TA.EXP_COMP_DATE,
    TA.TICKET_DESC AS WORK_REMARKS,
    TA.VERIFIED_BY,

    PM.PROJECT_NAME,          -- ✅ now gets the actual name

    EM.NAME AS ASSIGNED_TO,
    EM.EMP_ID AS ASSIGNED_TO_ID,

    PR.PRIORITY AS PRIORITY_NAME,
    PR.PRIORITY_ID,

    TC.CATEGORY_NAME,
    TC.CATEGORY_ID,

    TS.STATUS,
    TS.TICKET_STATUS_ID AS STATUS_ID,

    TD.DOC_NAME

  FROM TICKET_ASSIGNMENT TA

  LEFT JOIN TICKET_MASTER TM
    ON TA.TICKET_ID = TM.TICKET_ID

  LEFT JOIN PROJECT PM              -- ✅ add this
    ON TM.PROJECT_ID = PM.PROJECT_ID

  LEFT JOIN EMP EM
    ON TA.ASSIGNED_TO = EM.EMP_ID

  LEFT JOIN TICKET_PRIORITY PR
    ON TA.PRIORITY_ID = PR.PRIORITY_ID

  LEFT JOIN TICKET_CATEGORY TC
    ON TA.TICKET_CATEGORY_ID = TC.CATEGORY_ID

  LEFT JOIN TICKET_STATUS TS
    ON TA.STATUS_ID = TS.TICKET_STATUS_ID

  LEFT JOIN TICKET_DOCS TD
    ON TD.ASSIGNMENT_ID = TA.ASSIGNMENT_ID

  WHERE TA.TICKET_ID = :ticket_id
  ORDER BY TA.ASSIGNED_DATE DESC
`;

    const result = await db.executeQuery(
      query,
      { ticket_id: Number(id) },   
      "siri_db"
    );

    return res.status(200).json(
      new ApiResponse(200, result.rows)
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_active_ticket_count = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT COUNT(*) AS COUNT
      FROM TICKET_MASTER TM
      WHERE TM.STATUS_ID IN (2, 7, 8,10,11)
    `;

   

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, {
        count: result.rows[0]?.COUNT || 0
      })
    );

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});


const get_new_ticket_count = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    
    const query = `
      SELECT COUNT(*) AS COUNT
      FROM TICKET_MASTER
      WHERE STATUS_ID = 2
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    
    return res.status(200).json(
      new ApiResponse(200, {
        count: result.rows[0]?.COUNT || 0
      }, "New ticket count fetched successfully")
    );

  } catch (error) {
    console.error("GET NEW TICKET COUNT ERROR:", error);
    throw new ApiError(500, "Internal server error while fetching ticket count");
  }
});
module.exports = {
  get_taskcategory,
  get_taskpriority,
  get_taskstatus,
  assign_ticket,
  get_ticket_by_id,
  get_all_tickets,
  get_ticket_progress_by_ticket_id,
  get_all_tickets_onsearch,
  move_ticket_to_assigned,
  get_ticket_assignments,
  get_active_ticket_count,
  get_new_ticket_count

}

