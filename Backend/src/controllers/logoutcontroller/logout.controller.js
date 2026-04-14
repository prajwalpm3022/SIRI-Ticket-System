const { asyncHandler, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");

const logout = asyncHandler(async (req, res) => {

    try {
        const db = new DatabaseHandler();
        const { login_id } = req.user;

        const query = `
  UPDATE login_details
  SET logout_time = TO_CHAR(SYSDATE, 'HH:MI:SS AM'),
      work_duration =
  LPAD(
    FLOOR(
      (
        SYSDATE
        - TO_DATE(
            TO_CHAR(SYSDATE, 'YYYY-MM-DD') || ' ' || login_time,
            'YYYY-MM-DD HH:MI:SS AM'
          )
      ) * 24
    ), 2, '0'
  ) || ':' ||
  LPAD(
    FLOOR(
      MOD(
        (
          SYSDATE
          - TO_DATE(
              TO_CHAR(SYSDATE, 'YYYY-MM-DD') || ' ' || login_time,
              'YYYY-MM-DD HH:MI:SS AM'
            )
        ) * 24 * 60,
        60
      )
    ), 2, '0'
  ) || ':' ||
  LPAD(
    FLOOR(
      MOD(
        (
          SYSDATE
          - TO_DATE(
              TO_CHAR(SYSDATE, 'YYYY-MM-DD') || ' ' || login_time,
              'YYYY-MM-DD HH:MI:SS AM'
            )
        ) * 24 * 60 * 60,
        60
      )
    ), 2, '0'
  ),

      auth = NULL
  WHERE login_id = :login_id
`;

        await db.executeQuery(query, { login_id }, "siri_db");
        res.status(200).json(
            new ApiResponse(200, "user logout successfully")
        );

    } catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "logout failed",
            error
        );
    }
});

module.exports = {
    logout,
};
