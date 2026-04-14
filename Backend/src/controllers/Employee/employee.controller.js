const {
  asyncHandler,
  EmailService,
  ApiError,
  ApiResponse,
  DatabaseHandler,
} = require("../../utils");
const fs = require("fs");
const path = require("path");

const get_designation = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const query = `select desg_id "desg_id",designation "designation" from designation`;
    const result = await db.executeQuery(query, undefined, "siri_db");
    return res.status(200).json(new ApiResponse(200, result?.rows));
  } catch (error) {
    throw new ApiError(500, "Intrenatal server Error");
  }
});

const get_languages = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const query = `SELECT LANG_ID "lang_id",
                LANG_NAME "lang_name" FROM LANGUAGES`;
    const result = await db.executeQuery(query, undefined, "siri_db");
    return res.status(200).json(new ApiResponse(200, result?.rows));
  } catch (error) {
    throw new ApiError(500, "Intrenatal server Error");
  }
});

const get_emp_status = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const query = `SELECT  STATUS_ID "status_id",
        STATUS_NAME "status_name" from EMP_STATUS`;
    const result = await db.executeQuery(query, undefined, "siri_db");
    return res.status(200).json(new ApiResponse(200, result?.rows));
  } catch (error) {
    throw new ApiError(500, "Intrenatal server Error");
  }
});

const post_emp_data = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { employee, languages } = req.body;

    const empInsertQuery = `
   INSERT INTO emp (
    NAME,
    DOB,
    DOJ,
    DESG_ID,
    MOBILE,
    ALT_MOBILE,
    EMAIL_ID,
    ADDRESS,
    STATUS,
    QUALIFICATION, 
    AADHAR,
    PAN, 
    STATUS_REASON,  
   OFF_EMAIL_ID
      ) VALUES (
      :NAME,
      TO_DATE(:DOB, 'DD-MON-YYYY'),
      TO_DATE(:DOJ, 'DD-MON-YYYY'),
      :DESG_ID,
      :MOBILE,
      :ALT_MOBILE,
      :EMAIL_ID,
      :ADDRESS,
      (SELECT STATUS_NAME FROM emp_status WHERE STATUS_ID = :STATUS_ID),
      :QUALIFICATION,
      :AADHAR,
      :PAN,
      :STATUS_REASON,
      :OFF_EMAIL_ID
    )
    `;

    await db.executeQuery(
      empInsertQuery,
      {
        NAME: employee.Name,
        DOB: employee.dob,
        DOJ: employee.dojo,
        DESG_ID: employee.designationId,
        MOBILE: employee.mobileNumber,
        ALT_MOBILE: employee.alternativeMobileNumber,
        EMAIL_ID: employee.personalEmail,
        ADDRESS: employee.Address,
        STATUS_ID: employee.statusId,
        QUALIFICATION: employee.qualification,
        AADHAR: employee.aadhar,
        PAN: employee.pan,
        STATUS_REASON: employee.STATUS_REASON,
        OFF_EMAIL_ID: employee.officeEmail
      },
      "siri_db"
    );

    const empIdQuery = `
        SELECT EMP_ID
        FROM (
        SELECT EMP_ID
        FROM emp
        WHERE MOBILE = :MOBILE
        ORDER BY EMP_ID DESC
         )
         WHERE ROWNUM = 1
        `;

    const empIdResult = await db.executeQuery(
      empIdQuery,
      { MOBILE: employee.mobileNumber },
      "siri_db"
    );

    if (!empIdResult.rows || empIdResult.rows.length === 0) {
      throw new ApiError(500, "Failed to fetch generated EMP_ID");
    }

    const empId = empIdResult.rows[0].EMP_ID;

    const empLangInsertQuery = `
      INSERT INTO emp_lang (
        EMP_ID,
        LANG_ID,
        "READ",
        SPEAK
      ) VALUES (
        :EMP_ID,
        :LANG_ID,
        :READ,
        :SPEAK
      )
    `;

    for (const lang of languages) {
      await db.executeQuery(
        empLangInsertQuery,
        {
          EMP_ID: empId,
          LANG_ID: lang.langId,
          READ: lang.read,
          SPEAK: lang.speak,
        },
        "siri_db"
      );
    }

    res.status(200).json(
      new ApiResponse(
        200,
        { empId },
        "Employee and languages inserted successfully"
      )
    );

  } catch (err) {
    console.error("EMP + LANG INSERT ERROR:", err);
    throw new ApiError(
      err.statusCode || 500,
      err.message || "Error inserting employee data",
      err.details || err.message
    );
  }
});

const postnewLanguages = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const { LANG_NAME } = req.body;

    const query = `
      INSERT INTO languages (LANG_NAME)
      VALUES (:LANG_NAME)
    `;

    const result = await db.executeQuery(
      query,
      { LANG_NAME },
      "siri_db"
    );

    res.status(200).json(
      new ApiResponse(
        201,
        { rowsAffected: result.rowsAffected },
        "Language inserted successfully"
      )
    );
  } catch (err) {
    console.error("Language insert error:", err);
    throw new ApiError(
      err.statusCode || 500,
      err.message || "Error inserting new language",
      err.details || err.message
    );
  }
});

const get_employees = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const { fromDate, toDate, name, status } = req.query;

    let query = `
      SELECT
        e.emp_id,
        e.name,
        TO_CHAR(e.dob, 'DD-MON-YYYY', 'NLS_DATE_LANGUAGE=ENGLISH') AS dob,
        TO_CHAR(e.doj, 'DD-MON-YYYY', 'NLS_DATE_LANGUAGE=ENGLISH') AS doj,
        e.desg_id,
        e.mobile,
        e.alt_mobile,
        e.email_id,
        e.address,
        e.status,
        e.qualification,
        e.off_email_id,
        e.aadhar,
        e.pan,
        el.emp_lang_id,
        el.lang_id,
        el."READ",
        el.speak
      FROM emp e
      LEFT JOIN emp_lang el
        ON el.emp_id = e.emp_id
      WHERE 1 = 1
    `;

    const bindParams = {};


    if (fromDate && toDate) {
      query += `
        AND e.doj >= TO_DATE(:FROM_DATE, 'DD-MM-YY')
        AND e.doj <  TO_DATE(:TO_DATE, 'DD-MM-YY') + 1
      `;
      bindParams.FROM_DATE = fromDate;
      bindParams.TO_DATE = toDate;
    }

    if (name) {
      query += ` AND UPPER(e.name) LIKE UPPER(:NAME)`;
      bindParams.NAME = `%${name}%`;
    }


    if (status) {
      query += ` AND UPPER(e.status) = UPPER(:STATUS)`;
      bindParams.STATUS = status;
    } else {
      query += ` AND UPPER(e.status) = 'WORKING'`;
    }

    query += `
      ORDER BY e.doj DESC, e.emp_id, el.lang_id
    `;

    const result = await db.executeQuery(query, bindParams, "siri_db");

    res.status(200).json(
      new ApiResponse(200, result.rows)
    );

  } catch (error) {
    console.error("DB ERROR:", error);
    throw new ApiError(500, "Internal server error");
  }
});

const get_employee_document = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    let query = `
      SELECT DOC_ID,DOC_NAME,SHORT_DOC_NAME FROM DOC_NAMES
    `;

    const result = await db.executeQuery(
      query,
      {},
      "siri_db"
    );

    res.status(200).json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error("DB ERROR:", error);
    throw new ApiError(500, "Internal server error");
  }
});

const update_emp_data = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const empId = req.params.id;
    const { employee, languages } = req.body;

    if (!empId) {
      throw new ApiError(400, "EMP_ID is required for update");
    }

    const empUpdateQuery = `
      UPDATE emp
      SET
        NAME          = :NAME,
        DOB           = TO_DATE(:DOB, 'DD-MON-YYYY'),
        DOJ           = TO_DATE(:DOJ, 'DD-MON-YYYY'),
        DESG_ID       = :DESG_ID,
        MOBILE        = :MOBILE,
        ALT_MOBILE    = :ALT_MOBILE,
        EMAIL_ID      = :EMAIL_ID,
        ADDRESS       = :ADDRESS,
        STATUS        = (SELECT STATUS_NAME FROM emp_status WHERE STATUS_ID = :STATUS_ID),
        QUALIFICATION = :QUALIFICATION,
        AADHAR        = :AADHAR,
        PAN           = :PAN,
        STATUS_REASON = :STATUS_REASON,
        OFF_EMAIL_ID  = :OFF_EMAIL_ID
      WHERE EMP_ID = :EMP_ID
    `;

    const updateResult = await db.executeQuery(
      empUpdateQuery,
      {
        EMP_ID: empId,
        NAME: employee.Name,
        DOB: employee.dob,
        DOJ: employee.dojo,
        DESG_ID: employee.designationId,
        MOBILE: employee.mobileNumber,
        ALT_MOBILE: employee.alternativeMobileNumber,
        EMAIL_ID: employee.personalEmail,
        ADDRESS: employee.Address,
        STATUS_ID: employee.statusId,
        QUALIFICATION: employee.qualification,
        OFF_EMAIL_ID: employee.officeEmail,
        AADHAR: employee.aadhar,
        PAN: employee.pan,
        STATUS_REASON: employee.STATUS_REASON

      },
      "siri_db"
    );

    if (updateResult.rowsAffected === 0) {
      throw new ApiError(404, "Employee not found");
    }


    const deleteLangQuery = `
      DELETE FROM emp_lang
      WHERE EMP_ID = :EMP_ID
    `;

    await db.executeQuery(
      deleteLangQuery,
      { EMP_ID: empId },
      "siri_db"
    );

    const empLangInsertQuery = `
      INSERT INTO emp_lang (
        EMP_ID,
        LANG_ID,
        "READ",
        SPEAK
      ) VALUES (
        :EMP_ID,
        :LANG_ID,
        :READ,
        :SPEAK
      )
    `;

    for (const lang of languages) {
      await db.executeQuery(
        empLangInsertQuery,
        {
          EMP_ID: empId,
          LANG_ID: lang.langId,
          READ: lang.read,
          SPEAK: lang.speak,
        },
        "siri_db"
      );
    }

    res.status(200).json(
      new ApiResponse(
        200,
        { empId },
        "Employee and languages updated successfully"
      )
    );

  } catch (err) {
    console.error("EMP + LANG UPDATE ERROR:", err);
    throw new ApiError(
      err.statusCode || 500,
      err.message || "Error updating employee data",
      err.details || err.message
    );
  }
});

// const deleteEmployee = asyncHandler(async (req, res) => {
//   try {
//     const db = new DatabaseHandler();
//     const empId = req.params.id;

//     if (!empId) {
//       throw new ApiError(400, "EMP_ID is required for delete");
//     }

//     const uploadDir = path.join(
//       __dirname,
//       "..",
//       "..",
//       "..",
//       "uploads",
//       "employee_docs"
//     );

//     const docResult = await db.executeQuery(
//       `
//       SELECT FILE_NAME
//       FROM EMP_DOC_LINK
//       WHERE EMP_ID = :EMP_ID
//       `,
//       { EMP_ID: empId },
//       "siri_db"
//     );

//     if (docResult?.rows?.length > 0) {
//       for (const row of docResult.rows) {
//         if (!row.FILE_NAME) continue;

//         const filePath = path.join(uploadDir, row.FILE_NAME);

//         if (fs.existsSync(filePath)) {
//           fs.unlinkSync(filePath);
//         }
//       }
//     }

//     await db.executeQuery(
//       `DELETE FROM EMP_DOC_LINK WHERE EMP_ID = :EMP_ID`,
//       { EMP_ID: empId },
//       "siri_db"
//     );

//     await db.executeQuery(
//       `DELETE FROM EMP_LANG WHERE EMP_ID = :EMP_ID`,
//       { EMP_ID: empId },
//       "siri_db"
//     );

//     await db.executeQuery(
//       `DELETE FROM KNOWLEDGE_SHARING WHERE EMP_ID = :EMP_ID`,
//       { EMP_ID: empId },
//       "siri_db"
//     );

//     const result = await db.executeQuery(
//       `DELETE FROM EMP WHERE EMP_ID = :EMP_ID`,
//       { EMP_ID: empId },
//       "siri_db"
//     );

//     if (result.rowsAffected === 0) {
//       throw new ApiError(404, "Employee not found");
//     }

//     res.status(200).json(
//       new ApiResponse(
//         200,
//         { empId },
//         "Employee, documents and files deleted successfully"
//       )
//     );
//   } catch (err) {
//     console.error("EMP DELETE ERROR:", err);
//     throw new ApiError(
//       err.statusCode || 500,
//       err.message || "Error deleting employee"
//     );
//   }
// });

const uploadEmployeeDocuments = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();

  const empId = req.params.id;
  const files = req.files;
  const { docIds } = req.body;

  if (!files || files.length === 0) {
    throw new ApiError(400, "No documents uploaded");
  }

  const docIdArray = Array.isArray(docIds) ? docIds : [docIds];

  if (files.length !== docIdArray.length) {
    throw new ApiError(400, "Document type mismatch");
  }


  const bindParams = {};
  const bindKeys = docIdArray.map((id, index) => {
    const key = `DOC_ID_${index}`;
    bindParams[key] = id;
    return `:${key}`;
  });

  const docMetaResult = await db.executeQuery(
    `
    SELECT DOC_ID, SHORT_DOC_NAME
    FROM DOC_NAMES
    WHERE DOC_ID IN (${bindKeys.join(",")})
    `,
    bindParams,
    "siri_db"
  );


  const docMap = {};
  docMetaResult.rows.forEach(row => {
    docMap[row.DOC_ID] = row.SHORT_DOC_NAME;
  });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const docId = docIdArray[i];
    const shortName = docMap[docId];

    if (!shortName) {
      throw new ApiError(400, `Invalid DOC_ID: ${docId}`);
    }

    const ext = path.extname(file.originalname);
    const finalName = `${empId}_${docId}_${shortName}${ext}`;
    const finalPath = path.join(file.destination, finalName);

    fs.renameSync(file.path, finalPath);

    await db.executeQuery(
      `
      INSERT INTO EMP_DOC_LINK (EMP_ID, DOC_ID, FILE_NAME)
      VALUES (:EMP_ID, :DOC_ID, :FILE_NAME)
      `,
      {
        EMP_ID: empId,
        DOC_ID: docId,
        FILE_NAME: finalName,
      },
      "siri_db"
    );
  }

  res.status(200).json(
    new ApiResponse(200, null, "Documents uploaded successfully")
  );
});

const get_employee_uploaded_documents = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const empId = req.params.id;

  const result = await db.executeQuery(
    `
    SELECT
      l.EMP_DOC_LINK_ID,
      l.DOC_ID,
      d.DOC_NAME,
      d.SHORT_DOC_NAME,
      l.FILE_NAME
    FROM EMP_DOC_LINK l
    JOIN DOC_NAMES d ON d.DOC_ID = l.DOC_ID
    WHERE l.EMP_ID = :EMP_ID
    `,
    { EMP_ID: empId },
    "siri_db"
  );

  res.status(200).json(
    new ApiResponse(200, result.rows, "Employee documents fetched")
  );
});

const previewEmployeeDocument = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const { id } = req.params;

  if (!id) throw new ApiError(400, "Invalid Document ID");

  // Fetch file name
  const result = await db.executeQuery(
    `
      SELECT FILE_NAME
      FROM EMP_DOC_LINK
      WHERE EMP_DOC_LINK_ID = :ID
    `,
    { ID: Number(id) },
    "siri_db"
  );

  if (!result.rows.length) throw new ApiError(404, "Document not found");

  const fileName = result.rows[0].FILE_NAME.trim();

  const filePath = path.join(
    __dirname,
    "../../../uploads/employee_docs",
    fileName
  );

  console.log("Preview File:", filePath);

  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, "File does not exist on server");
  }

  // Detect type for correct preview
  const ext = fileName.split(".").pop().toLowerCase();

  const mimeTypes = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    word: "application/msword",
  };

  const mimeType = mimeTypes[ext] || "application/octet-stream";

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

const delete_employee_uploaded_documents = asyncHandler(async (req, res) => {
  const db = new DatabaseHandler();
  const { empId, docLinkId } = req.params;

  if (!empId || !docLinkId) {
    throw new ApiError(400, "Employee ID and Document Link ID are required");
  }

  const result = await db.executeQuery(
    `
    SELECT FILE_NAME
    FROM EMP_DOC_LINK
    WHERE EMP_ID = :EMP_ID
      AND EMP_DOC_LINK_ID = :DOC_ID
    `,
    {
      EMP_ID: empId,
      DOC_ID: docLinkId,
    },
    "siri_db"
  );

  if (!result.rows || result.rows.length === 0) {
    throw new ApiError(404, "Document not found for this employee");
  }

  const fileName = result.rows[0].FILE_NAME;

  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "uploads",
    "employee_docs",
    fileName
  );

  await db.executeQuery(
    `
    DELETE FROM EMP_DOC_LINK
    WHERE EMP_ID = :EMP_ID
      AND EMP_DOC_LINK_ID = :DOC_ID
    `,
    {
      EMP_ID: empId,
      DOC_ID: docLinkId,
    },
    "siri_db"
  );

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn("File delete warning:", err.message);
  }

  res.status(200).json(
    new ApiResponse(200, null, "Document deleted successfully")
  );
});

const get_employee_DD = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();
    const query = `select emp_id,name from emp order by name`;
    const result = await db.executeQuery(query, undefined, "siri_db");
    return res.status(200).json(new ApiResponse(200, result?.rows));
  } catch (error) {
    throw new ApiError(500, "Intrenatal server Error");
  }
})

module.exports = {
  get_designation,
  get_languages,
  get_emp_status,
  post_emp_data,
  postnewLanguages,
  get_employees,
  get_employee_document,
  update_emp_data,
  // deleteEmployee,
  uploadEmployeeDocuments,
  get_employee_uploaded_documents,
  previewEmployeeDocument,
  delete_employee_uploaded_documents,
  get_employee_DD,
};
