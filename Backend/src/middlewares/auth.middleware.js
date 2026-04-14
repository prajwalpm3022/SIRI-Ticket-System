// const { verifyToken } = require("../utils/token.util");
// const { DatabaseHandler } = require("../utils/DatabaseHandler");
// const { ApiError } = require("../utils");

// const authenticate = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       throw new ApiError(401, "Unauthorized");
//     }

//     const token = authHeader.split(" ")[1];

//     const decoded = verifyToken(token);

//     const db = new DatabaseHandler();

//     const query = `
//       SELECT auth "auth"
//       FROM login_details
//       WHERE login_id = :login_id
//     `;

//     const result = await db.executeQuery(
//       query,
//       { login_id: decoded.login_id },
//       "siri_db"
//     );

//     if (!result.rows.length) {
//       throw new ApiError(401, "Invalid session");
//     }

//     if (result.rows[0].auth !== token) {

//       const logoutQuery = `
//         UPDATE login_log_details
//         SET logout_tm = TO_CHAR(SYSDATE, 'HH:MI:SS AM')
//         WHERE login_log_id = (
//           SELECT MAX(login_log_id)
//           FROM login_log_details
//           WHERE user_id = :user_id
//         )
//         AND logout_tm IS NULL
//       `;

//       await db.executeQuery(
//         logoutQuery,
//         { user_id: decoded.user_id },
//         "siri_db"
//       );

//       throw new ApiError(401, "You have been logged in on another device");
//     }

//     req.user = decoded;

//     next();

//   } catch (err) {

//     if (err.name === "TokenExpiredError") {
//       return next(new ApiError(401, "Session expired. Please login again"));
//     }

//     console.error("Auth error:", err);

//     next(new ApiError(401, err.message || "Authentication failed"));
//   }
// };

// module.exports = { authenticate };
const { verifyToken } = require("../utils/token.util");
const { DatabaseHandler } = require("../utils/DatabaseHandler");
const { ApiError } = require("../utils");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // No token → first time opening site → allow request
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    // If token is empty/null → ignore
    if (!token || token === "null" || token === "undefined") {
      return next();
    }

    const decoded = verifyToken(token);

    const db = new DatabaseHandler();

    const query = `
      SELECT auth "auth"
      FROM login_details
      WHERE login_id = :login_id
    `;

    const result = await db.executeQuery(
      query,
      { login_id: decoded.login_id },
      "siri_db"
    );

    if (!result.rows.length) {
      throw new ApiError(500, "Invalid session");
    }

    if (result.rows[0].auth !== token) {

      const logoutQuery = `
        UPDATE login_log_details
        SET logout_tm = TO_CHAR(SYSDATE, 'HH:MI:SS AM')
        WHERE login_log_id = (
          SELECT MAX(login_log_id)
          FROM login_log_details
          WHERE user_id = :user_id
        )
        AND logout_tm IS NULL
      `;

      await db.executeQuery(
        logoutQuery,
        { user_id: decoded.user_id },
        "siri_db"
      );

      throw new ApiError(401, "You have been logged in on another device");
    }

    req.user = decoded;

    next();

  } catch (err) {

    if (err.name === "TokenExpiredError") {
      return next(new ApiError(401, "Session expired. Please login again"));
    }

    console.error("Auth error:", err);

    next(new ApiError(401, err.message || "Authentication failed"));
  }
};

module.exports = { authenticate };