const { asyncHandler, EmailService, ApiError, ApiResponse, DatabaseHandler } = require("../../utils");
const get_taskcategory = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        CATEGORY_ID,
        CATEGORY_NAME as "category_name"
      FROM TASK_CATEGORY
      ORDER BY CATEGORY_ID DESC
    `;

    const result = await db.executeQuery(query, {}, 'siri_db');

    return res
          .status(200)
          .json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_taskpriority = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        PRIORITY_ID,
        PRIORITY as "priority_name"
      FROM TASK_PRIORITY
      ORDER BY PRIORITY_ID DESC
    `;

    const result = await db.executeQuery(query, {}, 'siri_db');

    return res
          .status(200)
          .json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const get_taskstatus = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        TASK_STATUS_ID,
        STATUS as "status"
      FROM TASK_STATUS
      ORDER BY TASK_STATUS_ID DESC
    `;

    const result = await db.executeQuery(query, {}, 'siri_db');

    return res
          .status(200)
          .json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

const get_documenttype = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const query = `
      SELECT
        DOC_TYPE_ID AS "document_id",
        DOC_TYPE    AS "document_name"
      FROM TASK_DOC_TYPE
      ORDER BY DOC_TYPE_ID DESC
    `;

    const result = await db.executeQuery(query, {}, "siri_db");

    return res
      .status(200)
      .json(new ApiResponse(200, result.rows));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
const create_task = asyncHandler(async (req, res) => {
  try {
    const db = new DatabaseHandler();

    const {
      task_name,
      customer_id,
      project_id,
      module_id,
      category_id,
      priority_id,
      assigned_to,
      assigned_on,
      est_duration,
      varified_by
    } = req.body;

    const bindParams = {
      task_name,
      customer_id,
      project_id,
      module_id,
      category_id,
      priority_id,
      assigned_by: req.user?.id || 1,
      assigned_to,
      assigned_on: assigned_on || null,
      assigned_time: new Date().toLocaleTimeString(),

      exp_end_date: null,
      exp_end_time: null,
      actual_end_date: null,
      actual_end_time: null,
      started_on: assigned_on || null,

      varified_by,
      varified_on: null,

      est_duration,
      planned_duration: est_duration,

      task_status_id: 1,
      verified_status_id: 0,
      past_due: 'N',
      perc_completed: 0,
      task_type_id: 1,
      repetitive_id: null,
      redo_task_id: null,
      task_source_id: 1,
      task_completed: 'N'
    };

    const query = `
      INSERT INTO TASK (
        TASK_ID,
        TASK_NAME,
        CUSTOMER_ID,
        PROJECT_ID,
        MODULE_ID,
        CATEGORY_ID,
        PRIORITY_ID,
        ASSIGNED_BY,
        ASSIGNED_TO,
        ASSIGNED_ON,
        ASSIGNED_TIME,
        EXP_END_DATE,
        EXP_END_TIME,
        ACTUAL_END_DATE,
        ACTUAL_END_TIME,
        STARTED_ON,
        VARIFIED_BY,
        VARIFIED_ON,
        EST_DURATION,
        PLANNED_DURATION,
        TASK_STATUS_ID,
        VERIFIED_STATUS_ID,
        PAST_DUE,
        PERC_COMPLETED,
        TASK_TYPE_ID,
        REPETITIVE_ID,
        REDO_TASK_ID,
        TASK_SOURCE_ID,
        TASK_COMPLETED,
        TASK_DELETED
      ) VALUES (
        TASK_SEQ.NEXTVAL,
        :task_name,
        :customer_id,
        :project_id,
        :module_id,
        :category_id,
        :priority_id,
        :assigned_by,
        :assigned_to,
        CASE 
          WHEN :assigned_on IS NOT NULL 
          THEN TO_DATE(:assigned_on, 'YYYY-MM-DD')
          ELSE SYSDATE
        END,
        :assigned_time,
        NULL,
        NULL,
        NULL,
        NULL,
        CASE 
          WHEN :started_on IS NOT NULL 
          THEN TO_DATE(:started_on, 'YYYY-MM-DD')
          ELSE NULL
        END,
        :varified_by,
        NULL,
        :est_duration,
        :planned_duration,
        :task_status_id,
        :verified_status_id,
        :past_due,
        :perc_completed,
        :task_type_id,
        NULL,
        NULL,
        :task_source_id,
        :task_completed,
        'N'
      )
    `;

    await db.executeQuery(query, bindParams, "siri_db");

    return res
      .status(201)
      .json(new ApiResponse(201, "Task created successfully"));

  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});




module.exports = {
   get_taskcategory,
   get_taskpriority,
   get_taskstatus,
   get_documenttype,
   create_task
}