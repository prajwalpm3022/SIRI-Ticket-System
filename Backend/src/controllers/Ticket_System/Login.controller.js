const {
  asyncHandler,
  ApiError,
  ApiResponse,
  DatabaseHandler, EmailService } = require("../../utils");
const bcrypt = require("bcrypt");
const { signToken } = require("../../utils/token.util");
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const crypto = require("crypto");
const emailService = new EmailService();

// ─── In-memory block store ────────────────────────────────────────────────────
const failedAttempts = new Map(); // key → { count, blockedUntil }
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function isBlocked(key) {
  const record = failedAttempts.get(key);
  if (!record?.blockedUntil) return null;

  if (Date.now() < record.blockedUntil) {
    return record.blockedUntil - Date.now(); // ms remaining
  }

  failedAttempts.delete(key); // expired — clean up
  return null;
}

function recordFailure(key) {
  const record = failedAttempts.get(key) || { count: 0, blockedUntil: null };
  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = Date.now() + BLOCK_DURATION_MS;
  }
  failedAttempts.set(key, record);
  return record;
}

function clearFailures(...keys) {
  keys.forEach((k) => failedAttempts.delete(k));
}

// ─── IP block middleware (runs before loginLimiter) ───────────────────────────
const checkIpBlock = (req, res, next) => {
  const ip = getClientIp(req);
  const username = req.body?.CUST_USER_ID?.toLowerCase().trim();

  // Check IP block
  const ipMsLeft = isBlocked(`ip:${ip}`);
  if (ipMsLeft) {
    const retryAfterSeconds = Math.ceil(ipMsLeft / 1000);
    return res.status(429).json({
      success: false,
      message: "Too many failed login attempts. Your IP is temporarily blocked.",
      retryAfterSeconds,
      retryAfterMinutes: Math.ceil(retryAfterSeconds / 60),
    });
  }

  // Check username block
  if (username) {
    const userMsLeft = isBlocked(`user:${username}`);
    if (userMsLeft) {
      const retryAfterSeconds = Math.ceil(userMsLeft / 1000);
      return res.status(429).json({
        success: false,
        message: "This account is temporarily blocked due to too many failed attempts.",
        retryAfterSeconds,
        retryAfterMinutes: Math.ceil(retryAfterSeconds / 60),
      });
    }
  }

  next();
};

// ─── Rate limiter (unchanged) ─────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },

  keyGenerator: (req) => {
    const username = req.body?.CUST_USER_ID?.toLowerCase().trim();
    return username || ipKeyGenerator(req);
  },

  handler: (req, res) => {
    const retryAfterSeconds = Math.ceil(
      req.rateLimit.resetTime / 1000 - Date.now() / 1000
    );
    res.status(429).json({
      success: false,
      message: "Too many login attempts.",
      retryAfterSeconds,
      retryAfterMinutes: Math.ceil(retryAfterSeconds / 60),
    });
  },
});

// ─── Login handler ────────────────────────────────────────────────────────────
const CustomerLogin = asyncHandler(async (req, res) => {
  const { CUST_USER_ID, CUST_PASSWORD } = req.body;

  if (!CUST_USER_ID || !CUST_PASSWORD) {
    throw new ApiError(400, "Username and password are required");
  }

  const ip = getClientIp(req);
  const ipKey = `ip:${ip}`;
  const userKey = `user:${CUST_USER_ID.toLowerCase().trim()}`;

  const db = new DatabaseHandler();

  try {
    // ── Step 1: Look up user ──────────────────────────────────────────────────
    const query = `
      SELECT cl.CUST_LOGIN_ID, cl.CUST_ID, cl.CUST_USER_ID, cl.CUST_PASSWORD,
             cl.CUST_DEPT_ID, cl.LOGIN_TYPE, cl.ACTIVE,
             cd.CUST_DEPT_NAME,
             cd.SHORT_NAME AS DEPT_SHORT_NAME,
             c.SHORT_NAME  AS CUST_SHORT_NAME
      FROM   CUST_LOGIN cl
      LEFT JOIN CUST_DEPT cd ON cl.CUST_DEPT_ID = cd.CUST_DEPT_ID
      LEFT JOIN CUSTOMER  c  ON cl.CUST_ID       = c.CUSTOMER_ID
      WHERE  cl.CUST_USER_ID = :CUST_USER_ID
    `;

    const result = await db.executeQuery(query, { CUST_USER_ID }, "siri_db");
    const rows = result.rows || [];

    // ── Step 2: Wrong username → block IP ─────────────────────────────────────
    if (!rows.length) {
      const ipRecord = recordFailure(ipKey);

      if (ipRecord.blockedUntil) {
        const secs = Math.ceil((ipRecord.blockedUntil - Date.now()) / 1000);
        throw new ApiError(429, `Too many failed attempts. IP blocked for ${Math.ceil(secs / 60)} minute(s).`);
      }

      throw new ApiError(401, `Invalid username or password. ${MAX_ATTEMPTS - ipRecord.count} attempt(s) left before your IP is blocked.`);
    }

    const user = rows[0];

    // ── Step 3: Wrong password → block username ───────────────────────────────
    const isMatch = await bcrypt.compare(CUST_PASSWORD.trim(), user.CUST_PASSWORD);
    if (!isMatch) {
      const userRecord = recordFailure(userKey);

      if (userRecord.blockedUntil) {
        const secs = Math.ceil((userRecord.blockedUntil - Date.now()) / 1000);
        throw new ApiError(429, `Too many failed attempts. Account blocked for ${Math.ceil(secs / 60)} minute(s).`);
      }

      throw new ApiError(401, `Invalid username or password. ${MAX_ATTEMPTS - userRecord.count} attempt(s) left before this account is blocked.`);
    }

    // ── Step 4: Inactive account — no penalty ────────────────────────────────
    if (user.ACTIVE === "N") {
      throw new ApiError(403, "Your account is not active. Please contact the administrator.");
    }

    // ── Step 5: Success — clear both counters & issue token ──────────────────
    clearFailures(ipKey, userKey);

    const token = signToken({ userId: user.CUST_USER_ID });

    res.status(200).json(
      new ApiResponse(200, {
        userId: user.CUST_ID,
        deptId: user.CUST_DEPT_ID,
        deptName: user.CUST_DEPT_NAME,
        login_type: user.LOGIN_TYPE,
        loginId: user.CUST_LOGIN_ID,
        DeptshortName: user.DEPT_SHORT_NAME,
        CustshortName: user.CUST_SHORT_NAME,
        token,
      }, "Login Successful")
    );

  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Login Error", err.message);
  }
});

const forgot_password = asyncHandler(async (req, res) => {

  try {
    const db = new DatabaseHandler();
    const { email } = req.body;

    if (!email) throw new ApiError(400, "Email is required");

    const result = await db.executeQuery(
      `SELECT CUST_LOGIN_ID, NAME, EMAIL
       FROM CUST_LOGIN
       WHERE LOWER(TRIM(EMAIL)) = LOWER(TRIM(:email))`,
      { email },
      "siri_db"
    );

    if (!result.rows.length) {
      throw new ApiError(404, "No account found with this email");
    }

    const user = result.rows[0];


    const resetToken = crypto.randomBytes(32).toString("hex");

    const expiry = new Date(Date.now() + 10 * 60 * 1000 + 5.5 * 60 * 60 * 1000);
    const expiryStr = expiry.toISOString().slice(0, 19).replace("T", " ");

    await db.executeQuery(
      `UPDATE CUST_LOGIN
       SET RESET_TOKEN = :token,
           RESET_TOKEN_EXPIRY = TO_DATE(:expiry, 'YYYY-MM-DD HH24:MI:SS')
       WHERE CUST_LOGIN_ID = :id`,
      {
        token: resetToken,
        expiry: expiryStr,
        id: user.CUST_LOGIN_ID
      },
      "siri_db"
    );


    const frontendUrl =
      process.env.FRONTEND_URL || "http://localhost:5173";

    const resetLink = `${frontendUrl.replace(/\/$/, "")}/reset-password/${resetToken}`;

    const emailService = new EmailService();
    await emailService.sendEmail(
      "SIRI ServiceDesk",
      user.EMAIL,
      "Password Reset Request - SIRI ServiceDesk",
      `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color:#6367C0;">Password Reset Request</h2>
      <p>Hello <strong>${user.NAME}</strong>,</p>
      <p>We received a request to reset your password.</p>
      <p>
        <a href="${resetLink}"
           style="display:inline-block;
                  padding:12px 24px;
                  background:#6367C0;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p>This link expires in <strong>1 hour</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
      <hr />
      <p style="font-size:12px;color:#999;">© 2026 SIRI ServiceDesk</p>
    </div>
  `

    );

    return res.status(200).json(
      new ApiResponse(200, null, "Password reset link sent to your email")
    );

  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    throw new ApiError(
      error.statusCode || 500,
      error.message || "Internal server error"
    );
  }
});

const reset_password = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { token, newPassword } = req.body;


    if (!token) throw new ApiError(400, "Token is required");
    if (!newPassword) throw new ApiError(400, "New password is required");


    const result = await db.executeQuery(
      `SELECT CUST_LOGIN_ID 
       FROM CUST_LOGIN 
       WHERE RESET_TOKEN = :token
         AND RESET_TOKEN_EXPIRY > SYSDATE`,
      { token },
      "siri_db"
    );

    if (!result.rows.length) {
      throw new ApiError(400, "Invalid or expired reset token");
    }

    const userId = result.rows[0].CUST_LOGIN_ID;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.executeQuery(
      `UPDATE CUST_LOGIN 
       SET CUST_PASSWORD = :password,
           RESET_TOKEN = NULL,
           RESET_TOKEN_EXPIRY = NULL
       WHERE CUST_LOGIN_ID = :id`,
      { password: hashedPassword, id: userId },
      "siri_db"
    );

    return res.status(200).json(
      new ApiResponse(200, null, "Password reset successfully")
    );

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    throw new ApiError(error.statusCode || 500, error.message || "Internal server error");
  }
});



module.exports = { CustomerLogin, loginLimiter, checkIpBlock, reset_password, forgot_password }; 