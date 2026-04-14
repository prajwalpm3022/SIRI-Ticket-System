const {
    asyncHandler,
    EmailService,
    ApiError,
    ApiResponse,
    DatabaseHandler,
} = require("../../utils");

const get_Holiday_List = asyncHandler(async (req, res) => {
    try {
        const db = new DatabaseHandler();

        const query = `
      SELECT
  h.HOLIDAY_ID "HOLIDAY_ID",
  TO_CHAR(h.HOLIDAY_DATE, 'YYYY-MM-DD') "HOLIDAY_DATE",
  h.CAL_YEAR_ID "CAL_YEAR_ID",
  h.TITLE "TITLE"
FROM HOLIDAYS h
JOIN CALENDAR_YEAR c
  ON h.CAL_YEAR_ID = c.CAL_YEAR_ID
WHERE c.STATUS = 'Y'
ORDER BY h.HOLIDAY_DATE

    `;

        const result = await db.executeQuery(query, {}, "siri_db");

        res.status(200).json(new ApiResponse(200, result.rows));
    } catch (error) {
        console.error("Get Holiday error:", error);
        throw new ApiError(500, "Internal server error");
    }
});


module.exports = {
    get_Holiday_List,
};