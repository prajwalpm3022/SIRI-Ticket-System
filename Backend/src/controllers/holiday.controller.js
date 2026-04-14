const { asyncHandler, EmailService, ApiError, ApiResponse, DatabaseHandler } = require("../utils");

const get_yeardd = asyncHandler(async (req, res) => {
    try {
        const db = new DatabaseHandler()
        const query = `SELECT
    cal_year_id "cal_year_id",
    year "year"
    from
    calendar_year`
        const result = await db.executeQuery(query, undefined, 'siri_db')
        return res.status(200).json(new ApiResponse(200, result?.rows))

    } catch (error) {
        throw new ApiError(500, 'Intrenatal server Error')
    }
})

const get_holidayslist = asyncHandler(async (req, res) => {
    try {
        const db = new DatabaseHandler()
        const query = `SELECT
  h.holiday_id   "holiday_id",
  h.holiday_date "holiday_date",
  h.cal_year_id  "cal_year_id",
  h.title        "title"
FROM holidays h
JOIN calendar_year c
  ON h.cal_year_id = c.cal_year_id
WHERE c.status = 'Y'
ORDER BY h.holiday_date
    `
        const result = await db.executeQuery(query, undefined, 'siri_db')

        return res.status(200).json(new ApiResponse(200, result?.rows))

    } catch (error) {
        throw new ApiError(500, 'Intrenatal server Error')
    }
})

const insert_holiday = asyncHandler(async (req, res) => {

    try {
        const db = new DatabaseHandler()
        const { holiday_date, cal_year_id, title } = req.body;

        const query = `
      INSERT INTO HOLIDAYS
        (HOLIDAY_DATE, CAL_YEAR_ID, TITLE)
      VALUES
        (:HOLIDAY_DATE, :CAL_YEAR_ID, :TITLE)
    `;

        const data = {
            HOLIDAY_DATE: new Date(holiday_date),
            CAL_YEAR_ID: cal_year_id,
            TITLE: title,
        };

        await db.executeQuery(query, data, 'siri_db');

        res.status(200).json(
            new ApiResponse(200, "calender inserted successfully")
        );

    } catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "insert failed",
            error
        );
    }
});

const update_holiday = asyncHandler(async (req, res) => {


    try {
        const db = new DatabaseHandler()
        const { id } = req.params;
        const { holiday_date, cal_year_id, title } = req.body;

        const query = `
      UPDATE HOLIDAYS
SET 
  HOLIDAY_DATE = :HOLIDAY_DATE,
  CAL_YEAR_ID  = :CAL_YEAR_ID,
  TITLE        = :TITLE
WHERE HOLIDAY_ID = :HOLIDAY_ID
    `;

        const data = {
            HOLIDAY_ID: id,
            HOLIDAY_DATE: new Date(holiday_date),
            CAL_YEAR_ID: cal_year_id,
            TITLE: title,
        };

        await db.executeQuery(query, data, 'siri_db');

        res.status(200).json(
            new ApiResponse(200, "holiday updated successfully")
        );

    } catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Update failed",
            error
        );
    }
});

const delete_holiday = asyncHandler(async (req, res) => {
    try {
        const db = new DatabaseHandler();
        const { id } = req.params;

        const query = `
      DELETE FROM HOLIDAYS
      WHERE HOLIDAY_ID = :HOLIDAY_ID
    `;

        await db.executeQuery(
            query,
            { HOLIDAY_ID: id },
            "siri_db"
        );

        res.status(200).json(
            new ApiResponse(200, "Holiday deleted successfully")
        );

    } catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Delete failed",
            error
        );
    }
});

module.exports = {
    get_yeardd,
    get_holidayslist,
    insert_holiday,
    update_holiday,
    delete_holiday
}
