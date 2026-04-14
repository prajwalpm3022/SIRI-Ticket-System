const {
    asyncHandler,
    EmailService,
    ApiError,
    ApiResponse,
    DatabaseHandler } = require("../../utils");
const OracleDB = require("oracledb");
const path = require("path");
const fs = require("fs");
const uploadPath = path.join(path.resolve(), "uploads/TicketDocs");

const getTickets = asyncHandler(async (req, res) => {
    try {
        const { cust_id, cust_dept_id, cust_login_id, from_date, to_date } = req.query;

        const db = new DatabaseHandler();

        const params = { cust_id: Number(cust_id) };
        let filters = "";

        //  optional — only filter if provided
        if (cust_dept_id) {
            filters += ` AND t.CUSTOMER_DEPT_ID = :cust_dept_id`;
            params.cust_dept_id = Number(cust_dept_id);
        }

        //  optional — only filter if provided
        if (cust_login_id) {
            filters += ` AND t.CUST_LOGIN_ID = :cust_login_id`;
            params.cust_login_id = Number(cust_login_id);
        }

        if (from_date) {
            filters += ` AND TRUNC(t.CREATED_AT) >= TO_DATE(:from_date, 'YYYY-MM-DD')`;
            params.from_date = from_date;
        }

        if (to_date) {
            filters += ` AND TRUNC(t.CREATED_AT) <= TO_DATE(:to_date, 'YYYY-MM-DD')`;
            params.to_date = to_date;
        }

        const query = `
            SELECT 
                t.TICKET_ID,
                t.DESCRIPTION,
                t.STATUS_ID,
                t.PRIORITY_ID,
                t.CREATED_AT,
                t.CREATED_BY,
                t.ASSIGNED_DATE,
                t.CLI_EXCOMP_DATE,
                t.REMARKS,
                t.ASSIGNED_TIME,
                t.ASSIGNMENT_STATUS,
                t.PROJECT_ID,
                t.CREATED_TIME,
                t.TICKET_CATG_ID,
                t.TITLE,
                t.CUSTOMER_DEPT_ID,
                t.CUST_LOGIN_ID,
                d.CUST_DEPT_NAME,
                ts.STATUS AS STATUS_NAME,
                td.TICKET_DOC_ID,
                td.DOC_NAME,
                td.UPLOADED_DATE,
                td.DOC_UPLOADER
            FROM ticket_master t
            INNER JOIN cust_dept d ON d.CUST_DEPT_ID = t.CUSTOMER_DEPT_ID
            LEFT JOIN ticket_status ts ON ts.TICKET_STATUS_ID = t.STATUS_ID
            LEFT JOIN ticket_docs td ON td.TICKET_ID = t.TICKET_ID 
                AND td.DELETE_ACTION = 'N'
            WHERE t.CREATED_BY = :cust_id
            ${filters}
            ORDER BY t.CREATED_AT DESC, t.TICKET_ID DESC, td.TICKET_DOC_ID ASC
        `;

        const result = await db.executeQuery(query, params, "siri_db");
        const rows = result.rows || [];

        const ticketMap = new Map();

        for (const row of rows) {
            const ticketId = row.TICKET_ID;

            if (!ticketMap.has(ticketId)) {
                ticketMap.set(ticketId, {
                    TICKET_ID: row.TICKET_ID,
                    TITLE: row.TITLE,
                    DESCRIPTION: row.DESCRIPTION,
                    STATUS_ID: row.STATUS_ID,
                    STATUS_NAME: row.STATUS_NAME,
                    PRIORITY_ID: row.PRIORITY_ID,
                    CREATED_AT: row.CREATED_AT,
                    CREATED_BY: row.CREATED_BY,
                    ASSIGNED_DATE: row.ASSIGNED_DATE,
                    CLI_EXCOMP_DATE: row.CLI_EXCOMP_DATE,
                    REMARKS: row.REMARKS,
                    ASSIGNED_TIME: row.ASSIGNED_TIME,
                    ASSIGNMENT_STATUS: row.ASSIGNMENT_STATUS,
                    PROJECT_ID: row.PROJECT_ID,
                    CREATED_TIME: row.CREATED_TIME,
                    TICKET_CATG_ID: row.TICKET_CATG_ID,
                    CUSTOMER_DEPT_ID: row.CUSTOMER_DEPT_ID,
                    CUST_LOGIN_ID: row.CUST_LOGIN_ID,
                    CUST_DEPT_NAME: row.CUST_DEPT_NAME,
                    DOCS: []
                });
            }

            if (row.DOC_NAME) {
                ticketMap.get(ticketId).DOCS.push({
                    TICKET_DOC_ID: row.TICKET_DOC_ID,
                    DOC_NAME: row.DOC_NAME,
                    UPLOADED_DATE: row.UPLOADED_DATE,
                    DOC_UPLOADER: row.DOC_UPLOADER,
                });
            }
        }

        const tickets = [...ticketMap.values()];

        res.status(200).json(
            new ApiResponse(200, tickets, "Tickets fetched successfully")
        );
    } catch (err) {
        console.error("getTickets Error:", err);
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Failed to fetch tickets", err.message);
    }
});

const previewTicketDocument = asyncHandler(async (req, res) => {
    const db = new DatabaseHandler();
    const { id } = req.params;

    if (!id) throw new ApiError(400, "Invalid Document ID");

    // Fetch doc name from ticket_docs
    const result = await db.executeQuery(
        `SELECT DOC_NAME FROM ticket_docs WHERE TICKET_DOC_ID = :id`,
        { id: Number(id) },
        "siri_db"
    );

    if (!result.rows || !result.rows.length) {
        throw new ApiError(404, "Document not found");
    }

    const fileName = result.rows[0].DOC_NAME?.trim();

    if (!fileName) throw new ApiError(404, "Document name is empty");

    const filePath = path.join(
        path.resolve(),
        "uploads/TicketDocs",
        fileName
    );


    if (!fs.existsSync(filePath)) {
        throw new ApiError(404, "File does not exist on server");
    }

    const ext = fileName.split(".").pop().toLowerCase();

    const mimeTypes = {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        csv: "text/csv",
    };

    const mimeType = mimeTypes[ext] || "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);

    const stream = fs.createReadStream(filePath);

    stream.on("error", (err) => {
        console.error("Stream error:", err);
        throw new ApiError(500, "Failed to stream file");
    });

    stream.pipe(res);
});

const updateTicketStatus = asyncHandler(async (req, res) => {
    try {
        const { ticket_id, action, remarks } = req.body;

        if (!ticket_id || !action) {
            throw new ApiError(400, "ticket_id and action are required");
        }

        if (!["accept", "reject"].includes(action)) {
            throw new ApiError(400, "action must be 'accept' or 'reject'");
        }

        // Remarks is mandatory if rejecting
        if (action === "reject" && !remarks?.trim()) {
            throw new ApiError(400, "remarks are required when rejecting a ticket");
        }

        const db = new DatabaseHandler();

        const fetchQuery = `
            SELECT STATUS_ID FROM ticket_master WHERE TICKET_ID = :ticket_id
        `;
        const fetchResult = await db.executeQuery(
            fetchQuery,
            { ticket_id },
            "siri_db"
        );

        if (!fetchResult.rows || fetchResult.rows.length === 0) {
            throw new ApiError(404, "Ticket not found");
        }

        const currentStatus = fetchResult.rows[0][0];

        if (currentStatus != null) {
            throw new ApiError(400, "Ticket has already been reviewed. Section Head action not allowed.");
        }

        const newStatusId = action === "accept" ? 2 : 3;

        // Build query dynamically — remarks only written on reject
        const updateQuery = `
            UPDATE ticket_master
            SET STATUS_ID = :new_status_id
                ${action === "reject" ? ", REMARKS = :remarks" : ""}
            WHERE TICKET_ID = :ticket_id
        `;

        const updateParams = {
            new_status_id: newStatusId,
            ticket_id,
            ...(action === "reject" && { remarks: remarks.trim() }),
        };

        await db.executeQuery(updateQuery, updateParams, "siri_db");

        res.status(200).json(
            new ApiResponse(
                200,
                { ticket_id, new_status_id: newStatusId },
                `Ticket ${action === "accept" ? "approved" : "rejected"} by Section Head`
            )
        );
    } catch (err) {
        console.error("updateTicketStatus Error:", err);
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Failed to update ticket status", err.message);
    }
});

const TicketStatusDD = asyncHandler(async (req, res) => {
    try {
        const db = new DatabaseHandler();

        const query = `SELECT TICKET_STATUS_ID ,STATUS FROM TICKET_STATUS ORDER BY TICKET_STATUS_ID`;

        const result = await db.executeQuery(query, {}, "siri_db");
        const rows = result.rows || [];

        res.status(200).json(
            new ApiResponse(
                200,
                rows,
                "Ticket status fetched successfully"
            )
        );

    } catch (error) {
        console.error("TicketStatusDD Error:", error);
        throw new ApiError(500, "Failed to fetch ticket status", error.message);
    }

})

const UpdateTicket = asyncHandler(async (req, res) => {
    try {
        const { TICKET_ID } = req.params;
        const { CLI_EXCOMP_DATE, DESCRIPTION, DOC_UPLOADER } = req.body;
        const db = new DatabaseHandler();

        const updateTicketQuery = `
            UPDATE TICKET_MASTER
            SET 
                CLI_EXCOMP_DATE = TO_DATE(:CLI_EXCOMP_DATE, 'YYYY-MM-DD'),
                DESCRIPTION = :DESCRIPTION
            WHERE TICKET_ID = :TICKET_ID
        `;

        await db.executeQuery(
            updateTicketQuery,
            {
                CLI_EXCOMP_DATE: CLI_EXCOMP_DATE || null,
                DESCRIPTION,
                TICKET_ID
            },
            "siri_db"
        );


        if (req.files && req.files.length > 0) {

            const insertDocQuery = `
                INSERT INTO TICKET_DOCS (
                    DOC_NAME,
                    UPLOADED_DATE,
                    TICKET_ID,
                    DOC_UPLOADER,
                    DELETE_ACTION
                ) VALUES (
                    :DOC_NAME,
                    SYSDATE,
                    :TICKET_ID,
                    :DOC_UPLOADER,
                    'N'
                )
            `;

            const existingDocsQuery = `
                SELECT COUNT(*) AS DOC_COUNT FROM TICKET_DOCS WHERE TICKET_ID = :TICKET_ID
            `;

            const existingResult = await db.executeQuery(
                existingDocsQuery,
                { TICKET_ID },
                "siri_db"
            );


            let existingCount = 0;
            if (existingResult.rows?.[0]?.[0] !== undefined) {
                existingCount = existingResult.rows[0][0];
            } else if (existingResult.rows?.[0]?.DOC_COUNT !== undefined) {
                existingCount = existingResult.rows[0].DOC_COUNT;
            }


            let index = existingCount + 1;

            for (const file of req.files) {

                const custId = req.user.userId;
                const now = new Date();
                const day = String(now.getDate()).padStart(2, "0");
                const monthNames = [
                    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
                ];
                const month = monthNames[now.getMonth()];
                const year = now.getFullYear();

                const formattedDate = `${day}${month}${year}`;
                const extension = path.extname(file.originalname);
                const fileNumber = String(index).padStart(2, "0");

                const newFileName =
                    `${TICKET_ID}_${custId}_${formattedDate}_TK_${fileNumber}${extension}`;

                const oldPath = path.join(uploadPath, file.filename);
                const newPath = path.join(uploadPath, newFileName);

                fs.renameSync(oldPath, newPath);

                await db.executeQuery(
                    insertDocQuery,
                    {
                        DOC_NAME: newFileName,
                        DOC_UPLOADER: DOC_UPLOADER,
                        TICKET_ID
                    },
                    "siri_db"
                );


                index++;
            }
        } else {
            console.error("No files to upload");
        }

        res.status(200).json(
            new ApiResponse(200, { TICKET_ID }, "Ticket updated successfully")
        );

    } catch (err) {
        console.error("Update Ticket Error:", err);
        throw new ApiError(500, "Update ticket error", err.message);
    }
});

const getTicketsforAdmin = asyncHandler(async (req, res) => {
    try {
        const { cust_id, from_date, to_date, dept_id, status_id } = req.query;
        const db = new DatabaseHandler();

        const params = { cust_id };
        let filters = "";

        if (from_date) {
            filters += ` AND TRUNC(t.CREATED_AT) >= TO_DATE(:from_date, 'YYYY-MM-DD')`;
            params.from_date = from_date;
        }

        if (to_date) {
            filters += ` AND TRUNC(t.CREATED_AT) <= TO_DATE(:to_date, 'YYYY-MM-DD')`;
            params.to_date = to_date;
        }

        if (dept_id) {
            filters += ` AND t.CUSTOMER_DEPT_ID = :dept_id`;
            params.dept_id = dept_id;
        }

        if (status_id !== undefined && status_id !== "") {
            filters += ` AND t.STATUS_ID = :status_id`;
            params.status_id = status_id;
        }

        const query = `
            SELECT 
                t.TICKET_ID,
                t.DESCRIPTION,
                t.STATUS_ID,
                t.PRIORITY_ID,
                t.CREATED_AT,
                t.CREATED_BY,
                t.ASSIGNED_DATE,
                t.CLI_EXCOMP_DATE,
                t.REMARKS,
                t.ASSIGNED_TIME,
                t.ASSIGNMENT_STATUS,
                t.PROJECT_ID,
                t.CREATED_TIME,
                t.TICKET_CATG_ID,
                t.TITLE,
                t.CUSTOMER_DEPT_ID,
                d.CUST_DEPT_NAME,
                ts.STATUS AS STATUS_NAME,
                td.TICKET_DOC_ID,
                td.DOC_NAME,
                td.UPLOADED_DATE,
                td.DOC_UPLOADER
            FROM ticket_master t
            INNER JOIN cust_dept d ON d.CUST_DEPT_ID = t.CUSTOMER_DEPT_ID
            LEFT JOIN ticket_status ts ON ts.TICKET_STATUS_ID = t.STATUS_ID
            LEFT JOIN ticket_docs td ON td.TICKET_ID = t.TICKET_ID 
                AND td.DELETE_ACTION = 'N'
            WHERE t.CREATED_BY = :cust_id
            ${filters}
            ORDER BY t.CREATED_AT DESC, t.TICKET_ID DESC, td.TICKET_DOC_ID ASC
        `;

        const result = await db.executeQuery(query, params, "siri_db");
        const rows = result.rows || [];

        const ticketMap = new Map();

        for (const row of rows) {
            const ticketId = row.TICKET_ID;

            if (!ticketMap.has(ticketId)) {
                ticketMap.set(ticketId, {
                    TICKET_ID: row.TICKET_ID,
                    TITLE: row.TITLE,
                    DESCRIPTION: row.DESCRIPTION,
                    STATUS_ID: row.STATUS_ID,
                    STATUS_NAME: row.STATUS_NAME,
                    PRIORITY_ID: row.PRIORITY_ID,
                    CREATED_AT: row.CREATED_AT,
                    CREATED_BY: row.CREATED_BY,
                    ASSIGNED_DATE: row.ASSIGNED_DATE,
                    CLI_EXCOMP_DATE: row.CLI_EXCOMP_DATE,
                    REMARKS: row.REMARKS,
                    ASSIGNED_TIME: row.ASSIGNED_TIME,
                    ASSIGNMENT_STATUS: row.ASSIGNMENT_STATUS,
                    PROJECT_ID: row.PROJECT_ID,
                    CREATED_TIME: row.CREATED_TIME,
                    TICKET_CATG_ID: row.TICKET_CATG_ID,
                    CUSTOMER_DEPT_ID: row.CUSTOMER_DEPT_ID,
                    CUST_DEPT_NAME: row.CUST_DEPT_NAME,
                    DOCS: []
                });
            }

            if (row.DOC_NAME) {
                ticketMap.get(ticketId).DOCS.push({
                    TICKET_DOC_ID: row.TICKET_DOC_ID,
                    DOC_NAME: row.DOC_NAME,
                    UPLOADED_DATE: row.UPLOADED_DATE,
                    DOC_UPLOADER: row.DOC_UPLOADER,
                });
            }
        }

        const tickets = [...ticketMap.values()];

        res.status(200).json(
            new ApiResponse(200, tickets, "Tickets fetched successfully")
        );
    } catch (err) {
        console.error("getTickets Error:", err);
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Failed to fetch tickets", err.message);
    }
});

const deleteTicketDoc = asyncHandler(async (req, res) => {
    try {
        const { ticket_doc_id } = req.params;
        const db = new DatabaseHandler();

        const query = `
            UPDATE TICKET_DOCS
            SET DELETE_ACTION = 'Y'
            WHERE TICKET_DOC_ID = :ticket_doc_id
        `;

        const params = { ticket_doc_id };
        const result = await db.executeQuery(query, params, "siri_db");

        if (result.rowsAffected === 0) {
            throw new ApiError(404, "Document not found");
        }

        res.status(200).json(
            new ApiResponse(200, null, "Document deleted successfully")
        );
    } catch (err) {
        console.error("deleteTicketDoc Error:", err);
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Failed to delete document", err.message);
    }
});



module.exports = {
    getTickets,
    updateTicketStatus,
    previewTicketDocument,
    UpdateTicket,
    getTicketsforAdmin,
    deleteTicketDoc,
    TicketStatusDD,
}

