const {
    asyncHandler,
    EmailService,
    ApiError,
    ApiResponse,
    DatabaseHandler } = require("../../../utils");
const oracledb = require("oracledb");

let GetChatMembers = asyncHandler(async (req, res) => {
    const db = new DatabaseHandler();

    try {
        const { ticket_id } = req.params;

        if (!ticket_id) {
            throw new ApiError(400, "Ticket ID is required");
        }

        const query = `
    SELECT 
        tcm.CHAT_MEMBER_ID,
        tcm.TICKET_ID,
        tcm.USER_ID,
        tcm.ADDED_DATE,
        tcm.ADDED_TIME,
        tcm.ACTIVE,
        tcm.CHAT_ID,
        tcm.USER_TYPE,
        CASE 
            WHEN tcm.USER_TYPE IN ('CU', 'SH', 'A') THEN cl.NAME
            WHEN tcm.USER_TYPE IN ('EN', 'SA')       THEN e.NAME
            ELSE 'Unknown'
        END AS MEMBER_NAME
    FROM TICKET_CHAT_MEMBERS tcm
    LEFT JOIN CUST_LOGIN cl 
        ON cl.CUST_LOGIN_ID = tcm.USER_ID 
        AND tcm.USER_TYPE IN ('CU', 'SH', 'A')
    LEFT JOIN USER_MAST um 
        ON um.USER_ID = tcm.USER_ID 
        AND tcm.USER_TYPE IN ('EN', 'SA')
    LEFT JOIN EMP e 
        ON e.EMP_ID = um.EMP_ID
    WHERE tcm.TICKET_ID = :ticket_id
    ORDER BY tcm.CHAT_MEMBER_ID
`;

        const result = await db.executeQuery(
            query,
            { ticket_id: Number(ticket_id) },
            "siri_db"
        );

        const rows = result.rows || [];

        res.status(200).json(
            new ApiResponse(
                200,
                { ticket_id: Number(ticket_id), members: rows },
                "Chat members fetched successfully"
            )
        );
    } catch (err) {
        console.error("GetChatMembers Error:", err);

        if (err instanceof ApiError) throw err;

        throw new ApiError(500, "Failed to fetch chat members", err.message);
    }
});

module.exports = { GetChatMembers };