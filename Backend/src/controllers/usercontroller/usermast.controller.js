import bcrypt from "bcrypt";
const { asyncHandler, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");


// const update_password = asyncHandler(async (req, res) => {
//   const db = new DatabaseHandler();

//   const { user_id } = req.user;
//   const { current_password, new_password } = req.body;
//   console.log("Stored password:", storedHashedPassword);
// console.log("Type:", typeof storedHashedPassword);
// console.log("Length:", storedHashedPassword?.length);
// console.log("Starts with $2:", storedHashedPassword?.startsWith("$2"));


//   // 1️⃣ Fetch stored hashed password
//   const userRes = await db.executeQuery(
//     `
//     SELECT PASSWORD
//     FROM USER_MAST
//     WHERE USER_ID = :USER_ID
//     `,
//     { USER_ID: user_id },
//     "siri_db"
//   );

//   if (!userRes.rows.length) {
//     throw new ApiError(400, "User not found");
//   }

//   const storedHashedPassword = userRes.rows[0].PASSWORD;

//   // 2️⃣ Compare current password with bcrypt
//   const isMatch = await bcrypt.compare(
//     current_password,
//     storedHashedPassword
//   );

//   if (!isMatch) {
//     throw new ApiError(400, "Current password is incorrect");
//   }

//   // 3️⃣ Hash new password
//   const saltRounds = 10;
//   const newHashedPassword = await bcrypt.hash(
//     new_password,
//     saltRounds
//   );

//   // 4️⃣ Update password
//   await db.executeQuery(
//     `
//     UPDATE USER_MAST
//     SET PASSWORD = :PASSWORD,
//         MODIFIED_DATE = SYSDATE
//     WHERE USER_ID = :USER_ID
//     `,
//     {
//       USER_ID: user_id,
//       PASSWORD: newHashedPassword,
//     },
//     "siri_db"
//   );

//   return res.status(200).json(
//     new ApiResponse(200, "Password updated successfully")
//   );
// });
const update_password = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();

  const { user_id } = req.user;
  const { current_password, new_password } = req.body;

  // 1️⃣ Fetch stored password
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

  const storedHashedPassword =
    userRes.rows[0].PASSWORD || userRes.rows[0].password;

  

  // 2️⃣ Compare password
  const isMatch = await bcrypt.compare(
    current_password,
    storedHashedPassword
  );

  if (!isMatch) {
    throw new ApiError(400, "Current password is incorrect");
  }

  // 3️⃣ Hash new password
  const saltRounds = 10;
  const newHashedPassword = await bcrypt.hash(new_password, saltRounds);

  // 4️⃣ Update password
  await db.executeQuery(
    `
    UPDATE USER_MAST
    SET PASSWORD = :PASSWORD,
        MODIFIED_DATE = SYSDATE
    WHERE USER_ID = :USER_ID
    `,
    {
      USER_ID: user_id,
      PASSWORD: newHashedPassword,
    },
    "siri_db"
  );

  return res.status(200).json(
    new ApiResponse(200, "Password updated successfully")
  );
});
const getEmployeeDropdown = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        EMP_ID   AS "emp_id",
        NAME     AS "emp_name"
      FROM EMP
      WHERE STATUS = 'WORKING'
      ORDER BY NAME
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(
        200,
        result.rows || [],
        "Employee list fetched successfully"
      )
    );
  } catch (err) {
    console.error("Error fetching employee list:", err);
    throw new ApiError(500, "Error fetching employee list", err.message);
  }
});
const getRoleDropdown = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        USER_TYPE_ID   AS "user_type_id",
        USER_TYPES     AS "user_types"
      FROM USER_TYPES
      
      ORDER BY USER_TYPE_ID
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res.status(200).json(
      new ApiResponse(
        200,
        result.rows || [],
        "Employee list fetched successfully"
      )
    );
  } catch (err) {
    console.error("Error fetching employee list:", err);
    throw new ApiError(500, "Error fetching employee list", err.message);
  }
});
const insertRole = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { user_types } = req.body;

    const query = `
      INSERT INTO USER_TYPES
        (USER_TYPES)
      VALUES
        (:USER_TYPES)
    `;

    const result = await db.executeQuery(
      query,
      {
        USER_TYPES: user_types,
      },
      "siri_db"
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        result.rows || [],
        "Role inserted successfully"
      )
    );
  } catch (err) {
    console.error("Error inserting role:", err);
    throw new ApiError(500, "Error inserting role", err.message);
  }
});
const getusers = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { USER_ID } = req.query; 

    const query = `
      SELECT
        u.USER_ID,
        u.LOGIN_ID,
        u.EMP_ID,
        e.NAME AS EMP_NAME,
        u.USER_TYPE_ID
      FROM USER_MAST u
      JOIN EMP e ON e.EMP_ID = u.EMP_ID
      WHERE (:USER_ID IS NULL OR u.USER_ID = :USER_ID)
      ORDER BY u.USER_ID
    `;

    const binds = {
      USER_ID: USER_ID ? Number(USER_ID) : null
    };

    const result = await db.executeQuery(query, binds, "siri_db");

    return res.status(200).json(
      new ApiResponse(
        200,
        result.rows || [],
        "Employee list fetched successfully"
      )
    );
  } catch (err) {
    console.error("Error fetching employee list:", err);
    throw new ApiError(500, "Error fetching employee list", err.message);
  }
});
const getuserscount = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { USER_ID } = req.query; 

    const query = `
     SELECT
  u.USER_ID,
  u.LOGIN_ID,
  u.EMP_ID,
  e.NAME AS EMP_NAME,
  e.STATUS AS EMP_STATUS,   -- 👈 add this
  u.USER_TYPE_ID
FROM USER_MAST u
JOIN EMP e ON e.EMP_ID = u.EMP_ID
WHERE (:USER_ID IS NULL OR u.USER_ID = :USER_ID)
ORDER BY u.USER_ID
    `;

    const binds = {
      USER_ID: USER_ID ? Number(USER_ID) : null
    };

    const result = await db.executeQuery(query, binds, "siri_db");

    return res.status(200).json(
      new ApiResponse(
        200,
        result.rows || [],
        "Employee list fetched successfully"
      )
    );
  } catch (err) {
    console.error("Error fetching employee list:", err);
    throw new ApiError(500, "Error fetching employee list", err.message);
  }
});


const update_user = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { id } = req.params;
    const {
      login_id,
      emp_id,
      password,
      user_type_id
    } = req.body;

    if (!id) {
      throw new ApiError(400, "USER_ID is required");
    }

    // 🔐 Hash password ONLY if user entered a new one
    let hashedPassword = null;

    if (password && typeof password === "string" && password.trim()) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    // 🧠 Build dynamic query (avoid overwriting password)
    let query = `
      UPDATE USER_MAST
      SET
        LOGIN_ID      = :LOGIN_ID,
        EMP_ID        = :EMP_ID,
        USER_TYPE_ID  = :USER_TYPE_ID,
        MODIFIED_DATE = SYSDATE
    `;

    if (hashedPassword) {
      query += `, PASSWORD = :PASSWORD`;
    }

    query += ` WHERE USER_ID = :USER_ID`;

    const data = {
      USER_ID: id,
      LOGIN_ID: login_id,
      EMP_ID: emp_id,
      USER_TYPE_ID: user_type_id,
      ...(hashedPassword && { PASSWORD: hashedPassword })
    };

    await db.executeQuery(query, data, "siri_db");

    return res.status(200).json(
      new ApiResponse(200, null, "User updated successfully")
    );

  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "User update failed",
      error
    );
  }
});




const create_user = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const {
      login_id,
      emp_id,
      password,
      user_type_id
    } = req.body;

    // 🔐 1. Hash password (NEVER store plain text)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO USER_MAST (
       
        LOGIN_ID,
        EMP_ID,
        PASSWORD,
        USER_TYPE_ID,
        CREATE_DATE
      )
      VALUES (
        
        :LOGIN_ID,
        :EMP_ID,
        :PASSWORD,
        :USER_TYPE_ID,
        SYSDATE
      )
    `;

    const data = {
      LOGIN_ID: login_id,
      EMP_ID: emp_id,
      PASSWORD: hashedPassword, // ✅ hashed
      USER_TYPE_ID: user_type_id
    };

    await db.executeQuery(query, data, "siri_db");

    res.status(201).json(
      new ApiResponse(201, "User created successfully")
    );

  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "User creation failed",
      error
    );
  }
});

const searchUsersByLoginId = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const { login_id } = req.query;

  if (!login_id || typeof login_id !== "string") {
    throw new ApiError(400, "Invalid LOGIN_ID");
  }

  const query = `
    SELECT
      u.USER_ID,
      u.LOGIN_ID,
      u.EMP_ID,
      e.NAME AS EMP_NAME,
      u.USER_TYPE_ID
    FROM USER_MAST u
    LEFT JOIN EMP e ON e.EMP_ID = u.EMP_ID
    WHERE UPPER(u.LOGIN_ID) = UPPER(:login_id)
    ORDER BY u.LOGIN_ID
  `;

  const result = await db.executeQuery(
    query,
    { login_id },
    "siri_db"
  );

  return res.status(200).json(
    new ApiResponse(200, result.rows || [], "Users found")
  );
});







module.exports = {
  update_password,
  getEmployeeDropdown,
  getRoleDropdown,
  insertRole,
  getusers,
  update_user,
  create_user,
  searchUsersByLoginId,
  getuserscount
};
