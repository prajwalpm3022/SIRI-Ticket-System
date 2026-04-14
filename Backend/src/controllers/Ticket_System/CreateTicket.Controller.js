const {
    asyncHandler,
    EmailService,
    ApiError,
    ApiResponse,
    DatabaseHandler } = require("../../utils");
const oracledb = require("oracledb");
import fs from "fs";
import path from "path";
const uploadPath = "uploads/TicketDocs";

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

module.exports = {
    CreateTicket,
    GetCategoryData,
    DeleteTicketDocByUser
};