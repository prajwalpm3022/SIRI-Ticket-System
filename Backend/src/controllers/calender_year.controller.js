const { asyncHandler, EmailService, ApiError, ApiResponse, DatabaseHandler } = require("../utils");

const get_calender = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler()
    const query = `SELECT
    cal_year_id "cal_year_id",
    year "year",
    CASE status WHEN 'Y' THEN 'ACTIVE' ELSE 'INACTIVE' END "status",
    CASE posted WHEN 'Y' THEN 'ACTIVE' ELSE 'INACTIVE' END "posted"
    FROM
    calendar_year`
    const result = await db.executeQuery(query, undefined, 'siri_db')
    return res.status(200).json(new ApiResponse(200, result?.rows))

  } catch (error) {
    throw new ApiError(500, 'Intrenatal server Error')
  }
})

const insert_calender = asyncHandler(async (req, res) => {


  try {
    const db = new DatabaseHandler()
    const { year, posted, status } = req.body;

    const data = {
      YEAR: year,
      POSTED: posted,
      STATUS: status,
    };


    const query = `
            INSERT INTO CALENDAR_YEAR
                (YEAR,POSTED,STATUS )
            VALUES
                ( :YEAR,:POSTED,:STATUS)
        `;

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

const update_calender = asyncHandler(async (req, res) => {


  try {
    const db = new DatabaseHandler()
    const { id } = req.params;
    const { year, posted, status } = req.body;

    const data = {
      CAL_YEAR_ID: id,
      YEAR: year,
      POSTED: posted,
      STATUS: status,
    };


    const query = `
            UPDATE CALENDAR_YEAR
            SET 
                YEAR  = :YEAR,
                POSTED= :POSTED,
                STATUS= :STATUS
            WHERE 
                CAL_YEAR_ID = :CAL_YEAR_ID
        `;

    await db.executeQuery(query, data, 'siri_db');

    res.status(200).json(
      new ApiResponse(200, "calender Updated successfully")
    );

  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "update failed",
      error
    );
  }
});

module.exports = { get_calender, insert_calender, update_calender }