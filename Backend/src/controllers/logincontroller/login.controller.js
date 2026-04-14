const { DatabaseHandler, EmailService, ApiError, ApiResponse, asyncHandler } = require("../../utils");
const OracleDB = require("oracledb");
const { signToken } = require("../../utils/token.util");
const bcrypt = require("bcrypt");
const CryptoJS = require("crypto-js");
const emailService = new EmailService();
const jwt = require("jsonwebtoken");
import dayjs from "dayjs";

function getClientIp(req) {
  let ip =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    req.ip ||
    null;

  if (!ip) return null;

  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }
  console.log("ip",ip);
  return ip;
}
/* ===================== GET LOCATION ===================== */
const getlocationdd = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        emp_loc_id   "emp_loc_id",
        emp_loc_name "emp_loc_name"
      FROM emp_working_loc
      ORDER BY emp_loc_id
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, result.rows || [], "Location list fetched successfully")
    );
  } catch (err) {
    console.error("Error fetching location:", err);
    throw new ApiError(500, "Error fetching location", err.message);
  }
});

// const signin = asyncHandler(async (req, res) => {
//   try {
//     if (!req.body.payload) {
//       throw new ApiError(400, "Encrypted payload is required");
//     }
//     let decryptedData;

//     try {
//       const bytes = CryptoJS.AES.decrypt(
//         req.body.payload,
//         process.env.LOGIN_SECRET_KEY
//       );

//       decryptedData = JSON.parse(
//         bytes.toString(CryptoJS.enc.Utf8)
//       );
//     } catch (err) {
//       throw new ApiError(400, "Invalid encrypted login payload");
//     }
//     const {
//       login_id,
//       password,
//       login_type,
//     } = decryptedData;
//     let {
//       latitude,
//       longitude,
//       login_os,
//       device_type,
//     } = req.body;

//     if (!login_id || !password || !login_type) {
//       throw new ApiError(400, "Login ID, Password and Location are required");
//     }
//     if (login_id === "16") {
//       login_os = "windows";
//     }
//     const db = new DatabaseHandler();

//     const query = `
//     DECLARE
//     v_login_id_input    VARCHAR2(50) := :login_id_input;

//     v_login_id_output   VARCHAR2(50);
//     v_password_output   USER_MAST.PASSWORD%TYPE;

//     v_emp_id            NUMBER;
//     v_user_id           NUMBER;
//     v_login_id          NUMBER;
//     v_group_id          NUMBER;
//     v_user_type_id      NUMBER;

//     v_latitude          VARCHAR2(50) := :latitude;
//     v_longitude         VARCHAR2(50) := :longitude;
//     v_login_os          VARCHAR2(50) := :login_os;
//     v_device_type       VARCHAR2(50) := :device_type;
//     v_login_type        VARCHAR2(50) := :login_type;
//     v_client_ip         VARCHAR2(50) := :client_ip;

//     v_status            NUMBER := 1;
// BEGIN
//     BEGIN
//         SELECT user_id, login_id, emp_id, password, group_id,user_type_id
//         INTO   v_user_id, v_login_id_output, v_emp_id, v_password_output, v_group_id,v_user_type_id
//         FROM   user_mast
//         WHERE  login_id = v_login_id_input;

//     EXCEPTION
//         WHEN NO_DATA_FOUND THEN
//             v_status := 0;
//             RETURN;
//     END;

//     -- ❌ PASSWORD COMPARISON REMOVED (bcrypt will do this in Node)

//     BEGIN
//         INSERT INTO login_log_details
//             (login_dt, login_tm, user_id, latitude, longitude)
//         VALUES
//             (TRUNC(SYSDATE),
//              TO_CHAR(SYSDATE, 'HH:MI:SS AM'),
//              v_user_id,
//              v_latitude,
//              v_longitude);

//         INSERT INTO login_details
//             (user_id, emp_id, login_date, login_time,
//              login_type, login_os, lattitude, longitude,
//              client_ip, device_type)
//         VALUES
//             (v_user_id, v_emp_id, TRUNC(SYSDATE),
//              TO_CHAR(SYSDATE, 'HH:MI:SS AM'),
//              v_login_type, v_login_os,
//              v_latitude, v_longitude,
//              v_client_ip, v_device_type)
//         RETURNING login_id INTO v_login_id;

//     EXCEPTION
//         WHEN dup_val_on_index THEN
//             INSERT INTO login_log_details
//                 (login_dt, login_tm, user_id, latitude, longitude)
//             VALUES
//                 (TRUNC(SYSDATE),
//                  TO_CHAR(SYSDATE, 'HH:MI:SS AM'),
//                  v_user_id,
//                  v_latitude,
//                  v_longitude);

//             SELECT login_id
//             INTO   v_login_id
//             FROM   login_details
//             WHERE  login_date = TRUNC(SYSDATE)
//             AND    emp_id = v_emp_id;
//     END;

//     :out_login_id        := v_login_id;
//     :out_emp_id          := v_emp_id;
//     :out_user_id         := v_user_id;
//     :out_status          := v_status;
//     :out_password_hash   := v_password_output;
//     :out_group_id        := v_group_id;
//     :out_user_type_id    := v_user_type_id;

// END;

// `;
// const client_ip = getClientIp(req);
//     const bindParams = {
//       login_id_input: login_id,
//       latitude,
//       longitude,
//       login_os,
//       device_type,
//       login_type,
//       client_ip ,

//       out_login_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
//       out_emp_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
//       out_user_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
//       out_status: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
//       out_password_hash: {
//         dir: OracleDB.BIND_OUT,
//         type: OracleDB.STRING,
//         maxSize: 4000
//       },
//       out_group_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
//       out_user_type_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER }

//     };

//     const result = await db.executeQuery(query, bindParams, "siri_db");


//     const {
//       out_status,
//       out_user_id,
//       out_emp_id,
//       out_login_id,
//       out_password_hash,
//       out_group_id,
//       out_user_type_id,
//     } = result.outBinds;


//     if (!out_status || !out_password_hash) {
//       throw new ApiError(500, "Invalid username or password");
//     }


//     const isValidPassword = await bcrypt.compare(
//       password,
//       out_password_hash
//     );

//     if (!isValidPassword) {
//       throw new ApiError(500, "Invalid username or password");
//     }

//     const token = signToken({
//       user_id: out_user_id,
//       emp_id: out_emp_id,
//       login_id: out_login_id,
//       group_id: out_group_id,
//       user_type_id: out_user_type_id,
//     });
//     const AuthQuery = `
//     update login_details set auth = :token where login_id = :login_id
//     `
//     const AuthBindParams = {
//       token,
//       login_id: out_login_id
//     }
//     await db.executeQuery(AuthQuery, AuthBindParams, "siri_db");
//     return res.status(200).json(
//       new ApiResponse(
//         200,
//         {
//           token,
//           user: {
//             user_id: out_user_id,
//             emp_id: out_emp_id,
//             login_id: out_login_id,
//             group_id: out_group_id,
//             user_type_id: out_user_type_id
//           }
//         },
//         "Login successful"
//       )
//     );
//   } catch (error) {
//     throw new ApiError(
//       error.statusCode || 500,
//       error.message || "Signin failed",
//       error
//     );
//   }
// });
const signin = asyncHandler(async (req, res) => {
  try {
    if (!req.body.payload) {
      throw new ApiError(400, "Encrypted payload is required");
    }
    let decryptedData;

    try {
      const bytes = CryptoJS.AES.decrypt(
        req.body.payload,
        process.env.LOGIN_SECRET_KEY
      );

      decryptedData = JSON.parse(
        bytes.toString(CryptoJS.enc.Utf8)
      );
    } catch (err) {
      throw new ApiError(400, "Invalid encrypted login payload");
    }
    const {
      login_id,
      password,
      login_type,
    } = decryptedData;
    let {
      latitude,
      longitude,
      login_os,
      device_type,
    } = req.body;

    if (!login_id || !password || !login_type) {
      throw new ApiError(400, "Login ID, Password and Location are required");
    }
    if (login_id === "16") {
      login_os = "windows";
    }
    const db = new DatabaseHandler();

    const query = `
    DECLARE
    v_login_id_input    VARCHAR2(50) := :login_id_input;

    v_login_id_output   VARCHAR2(50);
    v_password_output   USER_MAST.PASSWORD%TYPE;

    v_emp_id            NUMBER;
    v_user_id           NUMBER;
    v_login_id          NUMBER;
    v_group_id          NUMBER;
    v_user_type_id      NUMBER;

    v_latitude          VARCHAR2(50) := :latitude;
    v_longitude         VARCHAR2(50) := :longitude;
    v_login_os          VARCHAR2(50) := :login_os;
    v_device_type       VARCHAR2(50) := :device_type;
    v_login_type        VARCHAR2(50) := :login_type;
    v_intended_login    VARCHAR2(20) ;
    v_client_ip         VARCHAR2(50) := :client_ip;

    v_status            NUMBER := 1;
BEGIN
    BEGIN
        SELECT user_id, login_id, emp_id, password, group_id,user_type_id
        INTO   v_user_id, v_login_id_output, v_emp_id, v_password_output, v_group_id,v_user_type_id
        FROM   user_mast
        WHERE  login_id = v_login_id_input;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            v_status := 0;
            RETURN;
    END;

    -- ❌ PASSWORD COMPARISON REMOVED (bcrypt will do this in Node)

    BEGIN
        INSERT INTO login_log_details
            (login_dt, login_tm, user_id, latitude, longitude)
        VALUES
            (TRUNC(SYSDATE),
             TO_CHAR(SYSDATE, 'HH:MI:SS AM'),
             v_user_id,
             v_latitude,
             v_longitude);
             BEGIN
  SELECT WSM.WORK_STATUS
  INTO v_intended_login
  FROM WORK_SCHEDULE WS
  JOIN WORK_STATUS WSM
    ON WSM.STATUS_ID = WS.STATUS_ID
  WHERE WS.EMP_ID = v_emp_id
    AND WS.DAYS = INITCAP(TRIM(TO_CHAR(SYSDATE,'DY')));

EXCEPTION
  WHEN NO_DATA_FOUND THEN
    v_intended_login := NULL;
END;

        INSERT INTO login_details
            (user_id, emp_id, login_date, login_time,
             login_type, login_os, lattitude, longitude,
             client_ip, device_type,intended_login)
        VALUES
            (v_user_id, v_emp_id, TRUNC(SYSDATE),
             TO_CHAR(SYSDATE, 'HH:MI:SS AM'),
             v_login_type, v_login_os,
             v_latitude, v_longitude,
             v_client_ip, v_device_type,v_intended_login)
        RETURNING login_id INTO v_login_id;

    EXCEPTION
        WHEN dup_val_on_index THEN
            INSERT INTO login_log_details
                (login_dt, login_tm, user_id, latitude, longitude)
            VALUES
                (TRUNC(SYSDATE),
                 TO_CHAR(SYSDATE, 'HH:MI:SS AM'),
                 v_user_id,
                 v_latitude,
                 v_longitude);

            SELECT login_id
            INTO   v_login_id
            FROM   login_details
            WHERE  login_date = TRUNC(SYSDATE)
            AND    emp_id = v_emp_id;
    END;

    :out_login_id        := v_login_id;
    :out_emp_id          := v_emp_id;
    :out_user_id         := v_user_id;
    :out_status          := v_status;
    :out_password_hash   := v_password_output;
    :out_group_id        := v_group_id;
    :out_user_type_id    := v_user_type_id;

END;

`;
const client_ip = getClientIp(req);
    const bindParams = {
      login_id_input: login_id,
      latitude,
      longitude,
      login_os,
      device_type,
      login_type,
      client_ip ,

      out_login_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
      out_emp_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
      out_user_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
      out_status: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
      out_password_hash: {
        dir: OracleDB.BIND_OUT,
        type: OracleDB.STRING,
        maxSize: 4000
      },
      out_group_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
      out_user_type_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER }

    };

    const result = await db.executeQuery(query, bindParams, "siri_db");


    const {
      out_status,
      out_user_id,
      out_emp_id,
      out_login_id,
      out_password_hash,
      out_group_id,
      out_user_type_id,
    } = result.outBinds;


    if (!out_status || !out_password_hash) {
      throw new ApiError(500, "Invalid username or password");
    }


    const isValidPassword = await bcrypt.compare(
      password,
      out_password_hash
    );

    if (!isValidPassword) {
      throw new ApiError(500, "Invalid username or password");
    }

    const token = signToken({
      user_id: out_user_id,
      emp_id: out_emp_id,
      login_id: out_login_id,
      group_id: out_group_id,
      user_type_id: out_user_type_id,
    });
    const AuthQuery = `
    update login_details set auth = :token where login_id = :login_id
    `
    const AuthBindParams = {
      token,
      login_id: out_login_id
    }
    await db.executeQuery(AuthQuery, AuthBindParams, "siri_db");
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          token,
          user: {
            user_id: out_user_id,
            emp_id: out_emp_id,
            login_id: out_login_id,
            group_id: out_group_id,
            user_type_id: out_user_type_id
          }
        },
        "Login successful"
      )
    );
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Signin failed",
      error
    );
  }
});
// const getdetailsindashboard = asyncHandler(async (req, res) => {
//   try {
//     const db = new DatabaseHandler();

//     // 🔥 date from frontend or default today
//     const selectedDate = req.query.date
//       ? dayjs(req.query.date).format("YYYY-MM-DD")
//       : dayjs().format("YYYY-MM-DD");

//     const query = `
//       SELECT
//         E.NAME AS "name",

//         CASE
//           WHEN LE.EMP_ID IS NOT NULL THEN 'ON_LEAVE'
//           WHEN L.USER_ID IS NOT NULL THEN 'LOGGED_IN'
//           ELSE 'NOT_LOGGED_IN'
//         END AS "status",

//         L.LOGIN_TYPE    AS "login_type",
//         L.LOGIN_TIME    AS "login_time",
//         L.LOGOUT_TIME   AS "logout_time",
//         L.WORK_DURATION AS "work_duration"

//       FROM EMP E
//       JOIN USER_MAST U
//         ON U.EMP_ID = E.EMP_ID

//       -- login for selected date
//       LEFT JOIN LOGIN_DETAILS L
//         ON L.USER_ID = U.USER_ID
//        AND TRUNC(L.LOGIN_DATE) = TRUNC(TO_DATE(:selectedDate, 'YYYY-MM-DD'))

//       -- approved leave for selected date
//      LEFT JOIN EMP_LEAVE_DETAIL LE
//   ON LE.EMP_ID = E.EMP_ID
//  AND (LE.STATUS IS NULL OR LE.STATUS = 1)
//  AND TRUNC(TO_DATE(:selectedDate,'YYYY-MM-DD')) 
//      BETWEEN 
//      TRUNC(
//         NVL(LE.APPROVED_FROM, LE.REQ_LEAVE_FROM)
//      )
//      AND
//      TRUNC(
//         NVL(LE.APPROVED_TO, LE.REQ_LEAVE_TO)
//      )

//       WHERE E.STATUS = 'WORKING'
//        AND U.USER_TYPE_ID = 2
//       ORDER BY
//   CASE
//     WHEN LE.EMP_ID IS NOT NULL THEN 2       -- ON_LEAVE
//     WHEN L.USER_ID IS NOT NULL THEN 1       -- LOGGED_IN
//     ELSE 3                                  -- NOT_LOGGED_IN
//   END,
//   E.NAME

//     `;

//     const result = await db.executeQuery(
//       query,
//       { selectedDate },
//       "siri_db"
//     );

//     return res.status(200).json(
//       new ApiResponse(200, result.rows || [])
//     );
//   } catch (err) {
//     console.error(err);
//     throw new ApiError(500, "Error fetching dashboard data");
//   }
// });
const getdetailsindashboard = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const selectedDate = req.query.date
      ? dayjs(req.query.date).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD");

    const query = `
      SELECT
        E.NAME AS "name",

        CASE
          WHEN LE.EMP_ID IS NOT NULL THEN 'ON_LEAVE'
          WHEN L.USER_ID IS NOT NULL THEN 'LOGGED_IN'
          ELSE 'NOT_LOGGED_IN'
        END AS "status",

        L.LOGIN_TYPE    AS "login_type",
        L.LOGIN_TIME    AS "login_time",
        L.LOGOUT_TIME   AS "logout_time",
        L.WORK_DURATION AS "work_duration",

        /* 🔥 NEW: INTENDED LOGIN */
        WS.STATUS_ID AS "schedule_status",
        WSM.WORK_STATUS AS "schedule_name"

      FROM EMP E
      JOIN USER_MAST U
        ON U.EMP_ID = E.EMP_ID

      /* 🔥 LOGIN */
      LEFT JOIN LOGIN_DETAILS L
        ON L.USER_ID = U.USER_ID
       AND TRUNC(L.LOGIN_DATE) = TRUNC(TO_DATE(:selectedDate, 'YYYY-MM-DD'))

      /* 🔥 LEAVE */
      LEFT JOIN EMP_LEAVE_DETAIL LE
        ON LE.EMP_ID = E.EMP_ID
       AND (LE.STATUS IS NULL OR LE.STATUS = 1)
       AND TRUNC(TO_DATE(:selectedDate,'YYYY-MM-DD')) 
           BETWEEN 
           TRUNC(NVL(LE.APPROVED_FROM, LE.REQ_LEAVE_FROM))
           AND
           TRUNC(NVL(LE.APPROVED_TO, LE.REQ_LEAVE_TO))

      /* 🔥 WORK SCHEDULE */
     LEFT JOIN WORK_SCHEDULE WS
  ON WS.EMP_ID = E.EMP_ID
 AND WS.DAYS = INITCAP(TRIM(TO_CHAR(TO_DATE(:selectedDate,'YYYY-MM-DD'),'DY')))

LEFT JOIN WORK_STATUS WSM
  ON WSM.STATUS_ID = WS.STATUS_ID

      WHERE E.STATUS = 'WORKING'
        AND U.USER_TYPE_ID = 2

      ORDER BY
        CASE
          WHEN LE.EMP_ID IS NOT NULL THEN 2
          WHEN L.USER_ID IS NOT NULL THEN 1
          ELSE 3
        END,
        E.NAME
    `;

    const result = await db.executeQuery(
      query,
      { selectedDate },
      "siri_db"
    );

    return res.status(200).json(
      new ApiResponse(200, result.rows || [])
    );
  } catch (err) {
    console.error(err);
    throw new ApiError(500, "Error fetching dashboard data");
  }
});
const forgotPassword = asyncHandler(async (req, res) => {
  const { login_id } = req.body;

  if (!login_id) {
    throw new ApiError(400, "Login ID is required");
  }

  const db = new DatabaseHandler();

  const result = await db.executeQuery(
    `
    SELECT U.USER_ID, E.EMAIL_ID
    FROM USER_MAST U
    JOIN EMP E ON E.EMP_ID = U.EMP_ID
    WHERE U.LOGIN_ID = :login_id
    `,
    { login_id },
    "siri_db"
  );

  if (!result.rows.length) {
    throw new ApiError(400, "Invalid login id");
  }

  const tokenPayload = {
    user_id: result.rows[0].USER_ID,
    exp: Date.now() + 10 * 60 * 1000 
  };

  const resetToken = CryptoJS.AES.encrypt(
    JSON.stringify(tokenPayload),
    process.env.LOGIN_SECRET_KEY
  ).toString();

  const resetLink =
    `${process.env.FRONTEND_URL}/#/reset-password?token=${encodeURIComponent(resetToken)}`;

  await emailService.sendEmail(
    "SIRI Workbench",
    result.rows[0].EMAIL_ID,
    "Reset Your Password",
    `
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
    `
  );

  return res.json(
    new ApiResponse(200, null, "Reset link sent to email")
  );
});


const resetPassword = asyncHandler(async (req, res) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) {
    throw new ApiError(400, "Token and password are required");
  }

  // 🔓 Decrypt reset token
  let tokenData;
  try {
    const bytes = CryptoJS.AES.decrypt(
      token,
      process.env.LOGIN_SECRET_KEY
    );
    tokenData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch {
    throw new ApiError(400, "Invalid reset link");
  }

  const { user_id, exp } = tokenData;

  if (!user_id || Date.now() > exp) {
    throw new ApiError(400, "Reset link expired or invalid");
  }

  if (new_password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const db = new DatabaseHandler();

  // 🔍 Get old password
  const userRes = await db.executeQuery(
    `
    SELECT PASSWORD
    FROM USER_MAST
    WHERE USER_ID = :USER_ID
    `,
    { USER_ID: user_id },
    "siri_db"
  );

  if (!userRes.rows.length) {
    throw new ApiError(400, "User not found");
  }

  const oldHash = userRes.rows[0].PASSWORD;

  // 🚫 Prevent same password
  const isSame = await bcrypt.compare(new_password, oldHash);
  if (isSame) {
    throw new ApiError(
      400,
      "Please use a different password. Old password not allowed."
    );
  }

  // 🔐 Hash new password
  const newHash = await bcrypt.hash(new_password, 10);

  await db.executeQuery(
    `
    UPDATE USER_MAST
    SET PASSWORD = :PASSWORD,
        MODIFIED_DATE = SYSDATE
    WHERE USER_ID = :USER_ID
    `,
    { PASSWORD: newHash, USER_ID: user_id },
    "siri_db"
  );


  return res.json(
    new ApiResponse(200, null, "Password reset successful")
  );
});

const refreshToken = async (req, res) => {
  try {

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    /* decode token even if expired */
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { ignoreExpiration: true }
    );

    const now = Math.floor(Date.now() / 1000);

    /* allow refresh only within 2 minutes after expiry */

    if (now - decoded.exp > 120) {
      return res.status(401).json({
        message: "Session expired"
      });
    }

    const db = new DatabaseHandler();

    const result = await db.executeQuery(
      `SELECT auth FROM login_details WHERE login_id = :login_id`,
      { login_id: decoded.login_id },
      "siri_db"
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "Session invalid" });
    }

    if (result.rows[0].AUTH !== token) {
      return res.status(401).json({ message: "Session expired" });
    }

    const newToken = signToken({
      user_id: decoded.user_id,
      emp_id: decoded.emp_id,
      login_id: decoded.login_id,
      group_id: decoded.group_id,
      user_type_id: decoded.user_type_id
    });

    await db.executeQuery(
      `UPDATE login_details SET auth = :token WHERE login_id = :login_id`,
      {
        token: newToken,
        login_id: decoded.login_id
      },
      "siri_db"
    );

    return res.json({
      items: { token: newToken }
    });

  } catch (err) {

    return res.status(401).json({
      message: "Session expired"
    });

  }
};


/* ===================== EXPORTS ===================== */
module.exports = {
  getlocationdd,
  signin,
  getdetailsindashboard,
  resetPassword,
  forgotPassword,
  refreshToken
};


