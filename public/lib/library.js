const connect_db = require("./connect_db/db_connect.js");
const libFunc = require("./functions.js");
const jwt = require("jsonwebtoken");
const query = require("./connect_db/queries.js");
const db_query = require("./connect_db/query_wrapper.js");
const path = require("path");
const runCron = require("./run_cron/crons.js");
// const auth = require('./authentication/connect.js');

const { sendNotification } = require("./firebase_notification/fb_connect.js");
// var fs = require('fs');
// const fetch = require('node-fetch');
// const db_connector = require('./connect_db/config.js');
// const { update } = require('bower/lib/commands/index.js');
// var shortid = require('shortid');
// const auth_config = require('./authentication/config.js');
// const auth = require('./authentication/connect.js');
const ExcelJS = require("exceljs");
// const moment = require('moment-timezone');
const queries = require("./connect_db/queries.js");
const PDFDocument = require("pdfkit");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function () {
  this.common_fn = common_fn;
};

/**
 *  Description :  Common Data Base Functions
 */
let common_fn = {
  // how many task create

  fet_days: fetchalldays,
  fet_months: fetchallmonths,
  fet_date: fetchalldate,
  fet_schedule: fetchallrepeat_schedule,
  dow_show: downloadAndShowbyfilename,

  /**
   * New API Creation
   * Organization
   */

  re_org: registerOrganization,
  lo_ap_us: loginAppUser,
  cr_de: createDepartment, // create departments
  fe_de: fetchDepartments,
  cr_ap_us: createAppUser,
  up_ap_us: updateAppUser,
  ge_us_de: getUserDetails,
  cr_ta: createTask,
  // fe_no: fetchNotifications,
  fe_my_ta: fetchMyTasks,
  fe_us_ta: fetchUserTasks,
  sho_createdTas: fetchMyAssignedTasks,
  fe_us_li: fetchUserList,
  chg_st_tas: updateTaskStatus,
  add_device: addDeviceToken,
  get_comm_task_id: fetchComments,
  cr_comm_on_tas: createComment,
  get_notif: fetchNotifications,
  get_tasById: getTaskDAtaById,
  tot_rec_assigned: totalReceivedAssignedTasks,
  task_reports: taskReports,
  bulk_ta_status_chg: updateTaskStatusBulk,
  cr_df_comm: createdefaultComment,
  fe_ta_count: fetchTaskCounts,

  month_task_compl_rat: taskCompletionRateMonthly,
  cr_wo_fl: createWorkflow,
  fe_wo_fl: fetchWorkflow,
  ge_re_ta: getRecurringTask,

  in_ac_us: inactiveUser,
  in_ac_ta: inactiveTask,
  in_re_ta: inactiveRecurringTask,
  fe_in_ac_ta: fetchInactiveTask,
  fe_in_ac_re_ta: fetchInactiveRecurringTask,
  fe_in_us: fetchInactiveUserList,
  ac_us: activeUser,

  se_ot: sendOtp,
  ve_ot: verifyOtp,
  re_pa: resetPassword,

  cr_ch_li: createChecklist,
  fe_ch_li: fetchChecklist,
  cr_compl: createComplaince,
  fe_compl: fetchComplaince,

  fe_ch_li_da: fetchCheckListData,
  up_ta_ch_li: updateChecklist,

  ge_to_ta_cr_by_me: getTotalCountofTaskCreatedByMe,
  up_ta: updateTask,
  up_re_ta: updateRecurringTaskTemplate,

  /**
   * Import Modules
   */
  bu_ta_im: bulkTaskImport,
  bu_us_im: bulkUserImport,
  fe_la_im: fetchlastImporttask,

  /**
   * ACUBE REPLY MANAGEMENT
   */

  markAsDone: markAsDone,
  SaveTempateDataInto: SaveTempateDataInto,

  /**
   * admin
   */
  fe_all_task: fetchTasks,
  ex_tas: exportTasksToExcel,

  /**
   * Super admin
   */

  cr_sup_ad: createSuperAdmin,
  fe_all_org: fetchOrganizations,
  up_org_bil_data: updateOrganizations,
  fe_reports_whtapp: fetchReportsofwhatapps,

  // tes_da: testdata

  /**
   *  Tasks Categories
   */
  cr_ta_cat: createTaskCategory,
  fe_ta_cat: fetchTaskCategory,

  /**
   * searching
   */
  fe_search_ta: fetchMyTasksSearch,
  fe_my_assign_se_ta: fetchMyAssignedTasksSearch,

  /**
   * comments seen
   */
  comm_seen: markCommentsSeen,
};

/**
 * Organizartion Registeration
 * current_setting('TIMEZONE'::text)
 */
const schema = "prosys";
async function registerOrganization(req, res) {
  var tablename = schema + ".organizations";
  const organization_name = req.data.organization_name;
  const owner_name = req.data.Owns_name;
  const mobile_number = req.data.mobile_no;
  const email = req.data.email;
  const password = req.data.password;
  const gstin = req.data.GST_NO;
  if (
    !organization_name ||
    !owner_name ||
    !mobile_number ||
    !email ||
    !password ||
    !gstin
  ) {
    const resp = { status: 1, msg: "Missing required fields" };
    // console.log("response of validation ", resp);
    libFunc.sendResponse(res, resp);
  } else {
    var checkEmail = await checkEmailExist(email);
    var checkMob = await checkMobExist(mobile_number);
    if (checkEmail) {
      const resp = { status: 1, msg: "Email already exists" };
      // console.log("response of validation ", resp);
      libFunc.sendResponse(res, resp);
    } else if (checkMob) {
      const resp = { status: 1, msg: "Mobile Number already exists" };
      // console.log("response of validation ", resp);
      libFunc.sendResponse(res, resp);
    } else {
      var columns = {
        organization_name: organization_name.trim().replaceAll("'", "`"),
        owner_name: owner_name.trim().replaceAll("'", "`"),
        mobile_number: mobile_number,
        gstin: gstin,
      };
      var resp = await db_query.addData(
        tablename,
        columns,
        req.data.row_id,
        "Organization"
      );
      // console.log("resp", resp);
      if (resp.status == 0 && resp.data["row_id"] != undefined) {
        const orgId = resp.data["row_id"];

        //  Create default task category
        const categoryTable = schema + ".tasks_categories";

        const categoryColumns = {
          category_name: "General",
          organizationid: orgId,
        };

        await db_query.addData(
          categoryTable,
          categoryColumns,
          null, // auto row_id
          "Task Category"
        );

        var tablename = schema + ".users";
        var columns = {
          name: owner_name.trim().replaceAll("'", "`"),
          email: email.trim(),
          password: password.trim(),
          mobilenumber: mobile_number.trim(),
          organizationid: resp.data["row_id"],
          role: 1,
        };
        var respuser = await db_query.addData(
          tablename,
          columns,
          null,
          "Users"
        );
        // console.log("respuser", respuser);
      }
      libFunc.sendResponse(res, resp);
    }
  }
}

function checkLoginUser(username, password) {
  return new Promise((resolve, reject) => {
    var query = `SELECT * FROM ${schema}.users where (email=$1 OR mobilenumber=$1) and password=$2`;
    var queryparam = [username, password];
    // console.log("query===========");
    // console.log(query);
    connect_db.query(query, queryparam, (err, result) => {
      if (err) {
        // console.log(err);
        resolve({ status: 1 });
      } else {
        // console.log(result.rows);
        if (result.rows.length > 0) {
          resolve(result.rows[0]);
        } else {
          resolve(false);
        }
      }
    });
  });
}

function checkDeviceExist(userid) {
  return new Promise((resolve, reject) => {
    var query = `SELECT * FROM ${schema}.devices where userid=$1`;
    // console.log("query===========");
    // console.log(query);
    var queryParam = [userid];
    connect_db.query(query, queryParam, (err, result) => {
      if (err) {
        // console.log(err);
        resolve(false);
      } else {
        // console.log(result.rows);
        if (result.rows.length > 0) {
          resolve(result.rows[0]);
        } else {
          resolve(false);
        }
      }
    });
  });
}
function checkDeviceExistForToken(token, userid) {
  return new Promise((resolve, reject) => {
    var query = `DELETE FROM ${schema}.devices where device_id='${token}' AND userid <> '${userid}'`;
    // console.log("query===========");
    // console.log(query);
    connect_db.query(query, (err, result) => {
      if (err) {
        // console.log(err);
        resolve(false);
      } else {
        // console.log("result.rows==========Delete");
        // console.log(result.rows);
        if (result.rows.length > 0) {
          resolve(result.rows[0]);
        } else {
          resolve(false);
        }
      }
    });
  });
}
async function addDeviceToken(req, res) {
  var tablename = schema + ".devices";
  var columns = {
    device_id: req.data.device_Id,
    userid: req.data.userId,
    organizationid: req.data.orgId,
  };
  var checkDevice = await checkDeviceExist(req.data.userId);
  var delTokenAvailable = await checkDeviceExistForToken(
    req.data.device_Id,
    req.data.userId
  );
  if (checkDevice) {
    var resp = await db_query.addData(
      tablename,
      columns,
      checkDevice.row_id,
      "Device"
    );
  } else {
    var resp = await db_query.addData(tablename, columns, null, "Device");
  }
  // console.log("resp", resp);
  libFunc.sendResponse(res, resp);
}

async function loginAppUser(req, res) {
  // console.log("req",req)

  var username = req.data.email || req.data.mobilenumber;
  var password = req.data.password;
  // var type="mob"
  if (!username || !password) {
    const resp = { status: 1, msg: "Missing required fields" };
    // console.log("response of validation ", resp);
    libFunc.sendResponse(res, resp);
  } else {
    var checkUser = await checkLoginUser(username, password);
    // console.log("checkUser---", checkUser);
    if (checkUser) {
      if (checkUser.activestatus != 0) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Your account is inactive. Please contact admin.",
        });
      }

      var rowId = checkUser.row_id;
      var jwtData = {
        userId: rowId,
        orgId: checkUser.organizationid,
        role: checkUser.role,
        depId: checkUser.deptid,
      };
      // console.log("jwtData", jwtData);
      // var role = checkUser.role == 0 ? "user" : "admin";
      // var role = checkUser.role == 0 ? "user" : "admin";
      // console.log("role",checkUser.role)
      // const role = checkUser.role == 0 ? 'user' : checkUser.role == 1 ? 'admin' : checkUser.role == 2 ? 'dept-admin' : 'super-admin';
      const role =
        checkUser.role == 0
          ? "user"
          : checkUser.role == 1
          ? "admin"
          : checkUser.role == 2
          ? "dept-admin"
          : checkUser.role == 3
          ? "top-management"
          : "super-admin";

      var token = jwt.sign(
        jwtData,
        JWT_SECRET,
        { expiresIn: 259200 } // expires in 72 hours/ 3 days
      );
      if (checkUser.role == 9) {
        let msg_data = {
          status: 0,
          msg: "Login Successfully",
          data: { token: token, role: role, department_id: "" },
        };
        //console.log("response---", msg_data);
        libFunc.sendResponse(res, msg_data);
      } else {
        var resp = {
          status: 0,
          msg: "Login Successfully",
          data: { token: token, role: role, department_id: checkUser.deptid },
        };
        console.log("response", resp);
        libFunc.sendResponse(res, resp);
      }
    } else {
      var resp = {
        status: 1,
        msg: "Invalid Username or Password",
      };
      // console.log("response", resp);
      libFunc.sendResponse(res, resp);
    }
  }
}

/**
 * Create Complainces
 */

async function createComplaince(req, res) {
  //  console.log("req---", req)
  var tablename = schema + ".complaince";
  var repeat_schedule = req.data.repeat_schedule;
  var schedule_type =
    repeat_schedule == "Daily"
      ? 0
      : repeat_schedule == "Weekly"
      ? 1
      : repeat_schedule == "Monthly"
      ? 2
      : repeat_schedule == "Yearly"
      ? 3
      : undefined;
  var active_status =
    req.data.status == "ongoing"
      ? 0
      : req.data.status == "complete"
      ? 1
      : req.data.status == "overdue"
      ? 2
      : undefined;

  let reminderOnArray = [];
  if (req.data.reminderList) {
    if (Array.isArray(req.data.reminderList)) {
      reminderOnArray = req.data.reminderList;
    } else {
      try {
        reminderOnArray = JSON.parse(req.data.reminderList);
      } catch (e) {
        // console.warn("Invalid reminder_on format, fallback to empty array");
        reminderOnArray = [];
      }
    }
  }

  var schedule_details = {
    type: repeat_schedule,

    // "reminder_on": req.data.reminder_on,//previously it was days
    // "complete_till": req.data.complete_till,
    // "remind_me_before": req.data.remind_me_before ?? "1",
    reminderList: reminderOnArray,

    customdates: req.data.customdates,
    days: req.data.days,
    date: req.data.date,
    months: req.data.months,
  };
  var columns = {
    category: req.data.category_id,
    active_status: active_status,
    subcategory: req.data.sub_categoryId,
    complaincedetails: JSON.stringify(req.data.complaincedetails),
    attachments: JSON.stringify(req.data.file_path),
    scheduletype: schedule_type,
    scheduledetails: JSON.stringify(schedule_details),
    assignedto: JSON.stringify(req.data.assigned_to),
    othernumbers: req.data.othernumbers,
    createdby: req.data.userId,
    organizationid: req.data.orgId,
  };

  //     if (schedule_type == 0) {
  // console.log("schedule_type", schedule_type);

  //         await notifyForComplainceonWA(req.data.complaincedetails, req.data.assigned_to, req.data.othernumbers, req.data.userId);
  //     }
  await checkComplaincesAtCreationTime(req.data.row_id);
  var resp = await db_query.addData(
    tablename,
    columns,
    req.data.row_id,
    "Complaince"
  );
  //////  console.log("resp", resp);
  libFunc.sendResponse(res, resp);
}

async function getAssignedToNumbers(assignedto) {
  var assignedtoNumbers = [];
  for (const user of assignedto) {
    var userDetails = await getUserData(user);
    // console.log("userDetails----->",userDetails)
    // var userDetails = true;
    if (userDetails) {
      assignedtoNumbers.push(userDetails);
    }
  }
  return assignedtoNumbers;
}

async function notifyForComplainceonWA(
  complaincedetails,
  assignedto,
  othernumbers,
  userId
) {
  // console.log("complaincedetails----",complaincedetails)
  var assignedtoNumbers = await getAssignedToNumbers(assignedto);
  var othNum = [];
  if (othernumbers != undefined && othernumbers != null && othernumbers != "") {
    var tempothNum = othernumbers.split(",");
    for (var i = 0; i < tempothNum.length; i++) {
      if (tempothNum[i] != "") {
        othNum.push({ name: tempothNum[i], mobilenumber: tempothNum[i] });
      }
    }
  }
  var allNumbers = [];
  if (othNum.length > 0) {
    allNumbers = [...assignedtoNumbers, ...othNum];
  } else {
    allNumbers = assignedtoNumbers;
  }
  //////  console.log("allNumbers", allNumbers);
  for (var j = 0; j < allNumbers.length; j++) {
    async function loop(i) {
      var reNu = allNumbers[i].mobilenumber;

      var templateData = {
        templateName: process.env.notifyForComplainceonWA,
        languageCode: "en",
        variable: [complaincedetails.category, complaincedetails.sub_category],
      };
      //////  console.log("templateData------------", templateData);
      //////  console.log("reNu------------", reNu);
      var wa_se_ms = await connect_acube24.sendTemplate(reNu, templateData);

      var row_id = libFunc.randomid();
      var others_details = {
        complaincedetails: complaincedetails,
        assignedto: assignedto,
      };

      var query = `INSERT INTO prosys.whatsapp_log (row_id,mobilenumber, receiver_user, template_name, request_data, response_data, status,others_details) 
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`;
      var resp = await db_query.customQuery(query, "data saved", [
        row_id,
        reNu,
        allNumbers[i].name,
        templateData.templateName,
        JSON.stringify(templateData),
        JSON.stringify(wa_se_ms),
        wa_se_ms?.status || "UNKNOWN",
        JSON.stringify(others_details),
      ]);

      // var AdreNu = "7878038514";
      // var wa_se_ms = await connect_acube24.sendTemplate(AdreNu, templateData);

      // var id = libFunc.randomid();

      // var query = `INSERT INTO prosys.whatsapp_log (row_id,mobilenumber, receiver_user, template_name, request_data, response_data, status,others_details)
      //      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`
      // var resp = await db_query.customQuery(query, "data saved", [id, AdreNu, allNumbers[i].name, templateData.templateName, JSON.stringify(templateData), JSON.stringify(wa_se_ms), wa_se_ms?.status || "UNKNOWN", JSON.stringify(others_details)]);
    }
    loop(j);
  }
}

async function fetchComplaince(req, res) {
  var organizationid = req.data.orgId;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;
  var category = req.data.category_id;
  var subcategory = req.data.sub_categoryId;

  // Build base query and parameters array
  let query = `SELECT comp.*, json_agg(us.name) AS assigned_to FROM ${schema}.complaince comp
    INNER JOIN 
    LATERAL jsonb_array_elements_text(comp.assignedto) AS assigned_to_id ON TRUE
INNER JOIN 
    prosys.users us ON us.row_id = assigned_to_id::text
    WHERE comp.organizationid = $1 AND comp.createdby = $2`;
  const params = [organizationid, req.data.userId];

  // Add category filter if present
  if (category) {
    query += ` AND comp.category = $3`;
    params.push(category);
  }
  // Add subcategory filter if present
  if (subcategory) {
    query += ` AND comp.subcategory = $4`;
    params.push(subcategory);
  }

  query += ` GROUP BY comp.row_id
ORDER BY comp.cr_on DESC
LIMIT $5 OFFSET $6;`;
  params.push(limit, offset);

  // console.log("query===========");
  // console.log(query, params);
  connect_db.query(query, params, (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "Complaince Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      if (result.rows.length > 0) {
        var resp = {
          status: 0,
          msg: "Complaince Fetched Successfully",
          data: result.rows,
        };
        // console.log("response", resp);
        libFunc.sendResponse(res, resp);
      } else {
        var resp = {
          status: 1,
          msg: "Complaince Not Found",
        };
        // console.log("response", resp);
        libFunc.sendResponse(res, resp);
      }
    }
  });
}

//=============================================//

/**
 * Check List Creation/ Update/Fetch
 */

async function createChecklist(req, res) {
  var tablename = schema + ".checklist";
  if (
    !req.data["checklist_title"] ||
    !req.data["description"] ||
    !req.data["checklist_items"]
  ) {
    const resp = { status: 1, msg: "Missing required fields" };
    // console.log("response of validation ", resp);
    return libFunc.sendResponse(res, resp);
  }
  var columns = {
    title: req.data["checklist_title"],
    description: req.data["description"],
    items: JSON.stringify(req.data["checklist_items"]),
    userid: req.data["userId"],
    organizationid: req.data["orgId"],
  };
  var resp = await db_query.addData(
    tablename,
    columns,
    req.data.row_id,
    "checklist"
  );
  // console.log("resp", resp);
  libFunc.sendResponse(res, resp);
}
function fetchChecklist(req, res) {
  var organizationid = req.data.orgId;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;
  var query = `SELECT * FROM ${schema}.checklist WHERE organizationid = $1 ORDER BY cr_on DESC LIMIT $2 OFFSET $3`;
  // console.log("query===========");
  // console.log(query);
  connect_db.query(query, [organizationid, limit, offset], (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "Checklist Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      if (result.rows.length > 0) {
        var resp = {
          status: 0,
          msg: "Checklist Fetched Successfully",
          data: result.rows,
        };
        // console.log("response", resp);
        libFunc.sendResponse(res, resp);
      } else {
        var resp = {
          status: 1,
          msg: "Checklist Not Found",
        };
        // console.log("response", resp);
        libFunc.sendResponse(res, resp);
      }
    }
  });
}

//=========================================//
async function createDepartment(req, res) {
  try {
    // console.log("req", req);
    var organizationid = req.data.orgId;
    var department_name = req.data.dep_name;
    if (department_name == undefined || department_name == "") {
      const resp = { status: 1, msg: "Missing required fields" };
      // console.log("response of validation ", resp);
      libFunc.sendResponse(res, resp);
    } else {
      var tablename = schema + ".departments";

      const checkQuery = `
            SELECT 1 FROM ${tablename}
            WHERE organizationid = '${organizationid}'
            AND LOWER(department_name) = LOWER('${department_name
              .trim()
              .replaceAll("'", "`")}')
            LIMIT 1
        `;
      const checkResult = await db_query.customQuery(checkQuery, "fetched");

      // console.log("checkResult---",checkResult)

      if (checkResult.status === 0) {
        // console.log("Department name already exists")
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Department name already exists",
        });
      }

      var columns = {
        organizationid: organizationid,
        department_name: department_name.trim().replaceAll("'", "`"),
      };
      var resp = await db_query.addData(
        tablename,
        columns,
        req.data.row_id,
        "Department"
      );
      // console.log("resp", resp);
      libFunc.sendResponse(res, resp);
    }
  } catch (err) {
    // console.error("Error in createDepartment:", err);
    libFunc.sendResponse(res, {
      status: 0,
      msg: "Server error",
      error: err.message,
    });
  }
}

async function fetchDepartments(req, res) {
  var organizationid = req.data.orgId;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;
  var query = `SELECT * FROM ${schema}.departments WHERE organizationid = $1 ORDER BY department_name, cr_on DESC LIMIT $2 OFFSET $3`;
  // console.log("query===========");
  // console.log(query);
  connect_db.query(query, [organizationid, limit, offset], (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "Departments Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      if (result.rows.length > 0) {
        var resp = {
          status: 0,
          msg: "Departments Fetched Successfully",
          data: result.rows,
        };
        // console.log("response", resp);
        libFunc.sendResponse(res, resp);
      } else {
        var resp = {
          status: 1,
          msg: "Departments Not Found",
        };
        // console.log("response", resp);
        libFunc.sendResponse(res, resp);
      }
    }
  });
}

async function checkEmailExist(email) {
  return new Promise((resolve, reject) => {
    var query = `SELECT * FROM ${schema}.users WHERE email = $1`;
    // console.log("query===========");
    // console.log(query);
    connect_db.query(query, [email], (err, result) => {
      if (err) {
        // console.log(err);
        resolve(false);
      } else {
        // console.log(result.rows);
        if (result.rows.length > 0) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    });
  });
}
async function checkMobExist(mobilenumber) {
  return new Promise((resolve, reject) => {
    var query = `SELECT * FROM ${schema}.users WHERE mobilenumber = $1`;
    // console.log("query===========");
    // console.log(query);
    connect_db.query(query, [mobilenumber], (err, result) => {
      if (err) {
        // console.log(err);
        resolve(false);
      } else {
        // console.log(result.rows);
        if (result.rows.length > 0) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    });
  });
}

async function fetchUserList(req, res) {
  // console.log("req----->", req);
  var organizationid = req.data.orgId;
  var isTeam = req.data.isTeam;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;
  let query, params;
  if (isTeam) {
    query = `SELECT us.name,us.row_id,de.department_name as dep_name,us.image_url as photo_path,
         CASE 
                WHEN us.role = 0 THEN 'User'
                WHEN us.role = 1 THEN 'Admin'
                WHEN us.role = 2 THEN 'Dept-admin'
                WHEN us.role = 3 THEN 'Top-management'
                ELSE 'unknown'
            END AS rolevalue
            FROM ${schema}.users us
            LEFT JOIN ${schema}.departments de on us.deptid=de.row_id
            WHERE us.organizationid = $1 AND us.row_id <> $2 AND us.activestatus = 0
            ORDER BY us.deptid, us.cr_on DESC LIMIT $3 OFFSET $4`;
    params = [organizationid, req.data.userId, limit, offset];
  } else {
    query = `SELECT us.name,us.row_id,us.image_url as photo_path,de.department_name as dep_name,
         CASE 
                WHEN us.role = 0 THEN 'User'
                WHEN us.role = 1 THEN 'Admin'
                WHEN us.role = 2 THEN 'Dept-admin'
                WHEN us.role = 3 THEN 'Top-management'
                ELSE 'unknown'
            END AS rolevalue
            FROM ${schema}.users us
            LEFT JOIN ${schema}.departments de on us.deptid=de.row_id
            WHERE us.organizationid = $1 AND us.activestatus = 0
            ORDER BY us.deptid, us.cr_on DESC LIMIT $2 OFFSET $3`;
    params = [organizationid, limit, offset];
  }
  // console.log("query===========");
  // console.log(query, params);
  connect_db.query(query, params, (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "Users Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      if (result.rows.length > 0) {
        var resp = {
          status: 0,
          msg: "Users Fetched Successfully",
          data: result.rows,
        };
        // console.log("active users ", resp);
        libFunc.sendResponse(res, resp);
      } else {
        var resp = {
          status: 1,
          msg: "Users Not Found",
        };
        // console.log("response", resp);
        libFunc.sendResponse(res, resp);
      }
    }
  });
}

/**
 * OTP Management
 */
function sendOtp(req, res) {
  // console.log("request otp ---->",req.data)

  var mobileNumber = req.data.mobilenumber;
  var sqlquery = `SELECT * FROM ${schema}.users WHERE mobilenumber = '${mobileNumber}'`;
  // console.log("sqlquery==============", sqlquery);
  connect_db.query(sqlquery, async (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "Mobile Number Not Found",
      };
      // console.log("resp error ----->",resp)
      libFunc.sendResponse(res, resp);
    } else {
      if (result.rows.length > 0) {
        // console.log("result--->",result.rows[0].activestatus)

        //  Added condition to block inactive users
        if (result.rows[0].activestatus === 1) {
          var resp = {
            status: 1,
            msg: "We can't send a OTP because your account is inactive",
          };
          // console.log("inactive user ---->", resp)
          return libFunc.sendResponse(res, resp);
        }

        var otp = libFunc.randomNumber(6);
        var mobileNumber = result.rows[0]["mobilenumber"];
        var rowID = libFunc.randomid();
        var otpDAta = {
          row_id: rowID,
          mobilenumber: mobileNumber,
          otp: otp,
        };
        var respOtp = await query.insert_data(schema + ".otp_mgmt", otpDAta);

        // console.log("respOtp----->",respOtp)

        var resp1 = await send_sms(mobileNumber, otp, 0);
        // console.log("resp", resp1);
        var resp = {
          status: 0,
          msg: "OTP Sent Successfully to Your Mobile Number",
        };
        // console.log("msg suscess--->",resp)
        libFunc.sendResponse(res, resp);
      } else {
        var resp = {
          status: 1,
          msg: "Mobile Number is Not Registered",
        };
        // console.log("resp---->",resp)
        libFunc.sendResponse(res, resp);
      }
    }
  });
}

function fetchUserDAta(mobilenumber) {
  return new Promise((resolve, reject) => {
    var query = `SELECT * FROM ${schema}.users WHERE mobilenumber = $1`;
    connect_db.query(query, [mobilenumber], (err, result) => {
      if (err) {
        resolve(false);
      } else {
        if (result.rows.length > 0) {
          resolve(result.rows[0]);
        } else {
          resolve(false);
        }
      }
    });
  });
}

function verifyOtp(req, res) {
  var mobileNumber = req.data.mobilenumber;
  var query = `SELECT * FROM ${schema}.otp_mgmt WHERE mobilenumber = $1 order by cr_on desc limit 1`;
  connect_db.query(query, [mobileNumber], async (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "Mobile Number Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      if (result.rows.length > 0) {
        var userDAta = await fetchUserDAta(mobileNumber);
        var otp =
          mobileNumber == "7742529160" ? "112233" : result.rows[0]["otp"];
        var getOTP = req.data.otp;
        if (otp == getOTP) {
          var resp = {
            status: 0,
            msg: "Mobile Number Verified Successfully",
            data: userDAta,
          };
          libFunc.sendResponse(res, resp);
        } else {
          var resp = {
            status: 1,
            msg: "Invalid OTP",
          };
          libFunc.sendResponse(res, resp);
        }
      } else {
        var resp = {
          status: 1,
          msg: "Mobile Number Not Found",
        };
        libFunc.sendResponse(res, resp);
      }
    }
  });
}

function resetPassword(req, res) {
  var userid = req.data.userid;
  var password = req.data.password;
  var query = `UPDATE ${schema}.users SET password = $1 WHERE row_id = $2`;
  // console.log("sqlquery", query);
  connect_db.query(query, [password, userid], (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "User Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      var resp = {
        status: 0,
        msg: "Password Reset Successfully",
      };
      libFunc.sendResponse(res, resp);
    }
  });
}

//======================================================//
async function inactiveUser(req, res) {
  // console.log("in_ac_us",req)
  var memberid = req.data.memberid;
  var tablename = schema + ".users";
  var sqlquery = `UPDATE ${schema}.users SET activestatus = 1 WHERE row_id = $1`;
  // console.log("sqlquery", sqlquery);
  connect_db.query(sqlquery, [memberid], (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "User Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      var resp = {
        status: 0,
        msg: "Inactive User Successfully",
      };
      // console.log("response", resp);
      libFunc.sendResponse(res, resp);
    }
  });
}
async function inactiveTask(req, res) {
  //activestatus for task show or hide --- active_status for task status ongoing or completed
  var taskid = req.data.taskid;
  var sqlquery = `UPDATE ${schema}.tasks SET activestatus = 1 WHERE row_id = $1`;
  // console.log("sqlquery", sqlquery);
  connect_db.query(sqlquery, [taskid], (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "Task Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      var resp = {
        status: 0,
        msg: "Inactive Task Successfully",
      };
      // console.log("response", resp);
      libFunc.sendResponse(res, resp);
    }
  });
}
async function inactiveRecurringTask(req, res) {
  var taskid = req.data.taskid;
  var sqlquery = `UPDATE ${schema}.recurring_task SET activestatus = 1 WHERE row_id = $1`;
  // console.log("sqlquery", sqlquery);
  connect_db.query(sqlquery, [taskid], (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "Task Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      var resp = {
        status: 0,
        msg: "Inactive Recurring Task Successfully",
      };
      // console.log("response", resp);
      libFunc.sendResponse(res, resp);
    }
  });
}
async function fetchInactiveTask(req, res) {
  var userid = req.data.userId;
  var organizationid = req.data.orgId;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;
  var sqlquery = `
        SELECT ta.row_id,
            ta.title,
            ta.description,
            ta.completion_date,
            us1.name AS created_by,
            ta.cr_on AS created_at,
           
             CASE 
                WHEN COUNT(DISTINCT assigned_to_id) = 1
                     AND MAX(assigned_to_id) = $2
                THEN NULL
                ELSE json_agg(DISTINCT us.name)
            END AS assigned_to,
            CASE WHEN ta.task_type = '0' THEN 'Single Task' ELSE 'Recurring Task' END AS task_type,
             COUNT(DISTINCT c.id) AS comment_count,
     COALESCE(
        SUM(
            CASE 
                WHEN jsonb_typeof(c.attachments) = 'array'
                THEN jsonb_array_length(c.attachments)
                ELSE 0
            END
        ), 0
    ) AS attachment_count,
              COUNT(
    DISTINCT CASE
        WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
        THEN c.id
    END
) AS unseen_comment_count,
 CASE
    WHEN COUNT(
        DISTINCT CASE
            WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
            THEN c.id
        END
    ) > 0
    THEN TRUE
    ELSE FALSE
END AS has_unseen_comments

        FROM ${schema}.tasks ta
        INNER JOIN prosys.users us1 ON ta.assigned_by = us1.row_id
        INNER JOIN LATERAL jsonb_array_elements_text(ta.assigned_to) AS assigned_to_id ON TRUE
        INNER JOIN prosys.users us ON us.row_id = assigned_to_id::text
      
         LEFT JOIN ${schema}.comments c
    ON c.taskid = ta.row_id
    AND c.organizationid = ta.organizationid
    LEFT JOIN prosys.comment_reads cr
    ON cr.taskid = ta.row_id
    AND cr.userid = $2
    AND cr.organizationid = ta.organizationid
        WHERE ta.activestatus = $1
            AND ta.assigned_by = $2
            AND ta.organizationid = $3
        GROUP BY ta.row_id, us1.name
        ORDER BY ta.cr_on DESC
        LIMIT $4 OFFSET $5
    `;
  // console.log("sqlquery", sqlquery);
  connect_db.query(
    sqlquery,
    [1, userid, organizationid, limit, offset],
    (err, result) => {
      if (err) {
        // console.log(err);
        var resp = {
          status: 1,
          msg: "Task Not Found",
        };
        // console.log("Task Not Found")
        libFunc.sendResponse(res, resp);
      } else {
        var resp = {
          status: 0,
          msg: "Inactive Recurring Task Successfully",
          data: result.rows,
        };
        // console.log("response", resp);
        libFunc.sendResponse(res, resp);
      }
    }
  );
}

async function createAppUser(req, res) {
  const organizationid = req.data.orgId;
  const deptid = req.data.department_id || null;
  const email = req.data.email.trim();
  // const mobilenumber = "7742529160";
  const mobilenumber = req.data.mobilenumber.trim();
  const password = req.data.password.trim();
  const role = req.data.role;
  // const role = req.data.role == 'user' ? 0 : req.data.role == 'admin' ? 1 : 2;
  const name = req.data.user_name.trim().replaceAll("'", "`");
  const image_url = req.data.photo_path;
  const duties =
    req.data.Top_duties != undefined
      ? JSON.stringify(req.data.Top_duties).replaceAll("'", "`")
      : undefined;

  //  Top Management user: department_id NOT required
  if (role === "3") {
    if (!password || !name || !mobilenumber) {
      console.log("Missing required fields for Top Management");
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Missing required fields for Top Management",
      });
    }
  }
  //  Dept-admin/user: department_id IS required
  if (role === "1" || role === "2") {
    if (!deptid || !password || !name || !mobilenumber) {
      console.log("Missing required fields");
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Missing required fields",
      });
    }
  }

  var checkEmail = await checkEmailExist(email);
  var checkMob = await checkMobExist(mobilenumber);
  // if (checkEmail) {

  //     const resp = { status: 1, msg: "Email already exists" };
  //     // console.log("response of validation ", resp);
  //     libFunc.sendResponse(res, resp);
  // }
  // else
  if (checkMob) {
    const resp = { status: 1, msg: "Mobile Number already exists" };
    // console.log("response of validation ", resp);
    return libFunc.sendResponse(res, resp);
  }
  var columns = {
    organizationid: organizationid,
    deptid: role === "3" ? "" : deptid, //  Top Management has no department
    email: email,
    password: password,
    role: role,
    name: name,
    image_url: image_url,
    mobilenumber: mobilenumber,
    duties: duties,
  };

  // console.log("columns---",columns)
  var tablename = schema + ".users";
  var resp = await db_query.addData(
    tablename,
    columns,
    req.data.row_id,
    "User"
  );
  console.log("resp", resp);
  var smsmessage = `You are registered.`;
  // var resp1 = await send_sms(mobilenumber, smsmessage, 0);
  // console.log("resp", resp);
  libFunc.sendResponse(res, resp);
}

// async function checkMobExistForSpecificUser(mobilenumber) {
//     return new Promise((resolve, reject) => {
//         var query = `SELECT row_id FROM ${schema}.users WHERE mobilenumber = $1`;
//         // console.log("query===========");
//         // console.log(query);
//         connect_db.query(query, [mobilenumber], (err, result) => {
//             if (err) {
//                 // console.log(err);
//                 resolve(false);
//             } else {
//                 // console.log(result.rows);
//                 if (result.rows.length > 0) {
//                     userids = [];
//                     for (var i = 0; i < result.rows.length; i++) {
//                         userids.push(result.rows[i].row_id);
//                     }
//                     resolve(userids);
//                 } else {
//                     resolve([]);
//                 }
//             }
//         });
//     }
//     );
// }

async function checkMobExistForSpecificUser(mobilenumber, excludeRowId = null) {
  return new Promise((resolve, reject) => {
    let query = `SELECT row_id FROM ${schema}.users WHERE mobilenumber = $1`;
    const params = [mobilenumber];

    if (excludeRowId) {
      query += ` AND row_id != $2`;
      params.push(excludeRowId);
    }

    connect_db.query(query, params, (err, result) => {
      if (err) {
        resolve(false);
      } else {
        resolve(result.rows.map((r) => r.row_id));
      }
    });
  });
}

async function updateAppUser(req, res) {
  // console.log("req", req);
  const userid = req.data.userId;
  const organizationid = req.data.orgId;
  const deptid = req.data.department_id;
  // const email = req.data.email.trim();
  const password = req.data.password.trim();
  const role = req.data.role;
  const mobilenumber = req.data.mobilenumber.trim();
  // const role = req.data.role == 'user' ? 0 : req.data.role == 'admin' ? 1 : 2;
  const name = req.data.name.trim().replaceAll("'", "`");
  const image_url = req.data.photo_path;
  const rowId = req.data.row_id;
  const duties = JSON.stringify(req.data.top_duties).replaceAll("'", "`");
  var checkMob = await checkMobExistForSpecificUser(mobilenumber, rowId);
  ////  console.log("checkMob", checkMob);
  if (checkMob.length > 0) {
    var resp = {
      status: 1,
      msg: "Mobile Number already exists for another user",
    };
    // console.log("resp",resp)
    libFunc.sendResponse(res, resp);
  } else {
    var columns = {
      // "organizationid": organizationid,
      deptid: deptid,
      // "email": email,
      password: password,
      mobilenumber: mobilenumber,
      // "role": role,
      name: name,
      image_url: image_url,
      duties: duties,
    };

    var tablename = schema + ".users";
    var resp = await db_query.addData(tablename, columns, rowId, "User");
    if (req.data.user_role == 1) {
      var columns = {
        organization_name: req.data.organizationData.organization_name,
        owner_name: req.data.name,
        mobile_number: req.data.organizationData.mobilenumber,
        gstin: req.data.organizationData.gst_no,
      };
      var tablename = schema + ".organizations";
      var resp1 = await db_query.addData(
        tablename,
        columns,
        organizationid,
        "Organization"
      );
    }

    libFunc.sendResponse(res, resp);
  }
}

async function getUserDetails(req, res) {
  //user role -- 0 for user, 1 for admin, 2 for dept-admin
  var userid = req.data.ismember ? req.data.memberid : req.data.userId;
  var organizationid = req.data.orgId;
  var query = `SELECT us.row_id,us.email,us.name,us.password,us.mobilenumber, us.role as rolevalue, CASE
  WHEN (us.role='0') THEN 'User'
  WHEN (us.role='1') THEN 'Admin'
  WHEN (us.role='2') THEN 'Dept-Admin'
  WHEN (us.role='3') THEN 'Top-Management'
 END AS role,us.image_url as photo_path,
 us.cr_on as created_at,
    us.duties as top_duties, us.deptid as department_id,de.department_name as dep_name,
    org.organization_name as organization_name    
    FROM ${schema}.users us
    LEFT JOIN ${schema}.departments de on us.deptid=de.row_id
    INNER JOIN ${schema}.organizations org on us.organizationid=org.row_id
    where us.row_id=$1  `;
  // console.log("query=====ge-us-id======");
  // console.log(query);
  connect_db.query(query, [userid], (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "User Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      if (result.rows.length > 0) {
        var userData = result.rows[0];
        var role = req.data.user_role;
        // var role = req.data.user_role == 'user' ? 0 : req.data.user_role == 'admin' ? 1 : 2;
        if (role == 1) {
          var query = `SELECT * FROM ${schema}.organizations WHERE row_id = $1`;
          // console.log("query===========");
          // console.log(query);
          connect_db.query(query, [organizationid], (err, result) => {
            if (err) {
              // console.log(err);
              var resp = {
                status: 1,
                msg: "Organization Not Found",
              };
              libFunc.sendResponse(res, resp);
            } else {
              if (result.rows.length > 0) {
                var organizationData = {
                  organization_name: result.rows[0].organization_name,
                  user_name: result.rows[0].owner_name,
                  mobile_no: result.rows[0].mobile_number,
                  gst_no: result.rows[0].gstin,
                };
                userData.organizationData = organizationData;
                var resp = {
                  status: 0,
                  msg: "User Fetched Successfully",
                  data: userData,
                };
                libFunc.sendResponse(res, resp);
              } else {
                var resp = {
                  status: 1,
                  msg: "Organization Not Found",
                };
                libFunc.sendResponse(res, resp);
              }
            }
          });
        } else {
          var resp = {
            status: 0,
            msg: "User Fetched Successfully",
            data: userData,
          };
          // console.log("response", resp);
          libFunc.sendResponse(res, resp);
        }
      } else {
        var resp = {
          status: 1,
          msg: "User Not Found",
        };
        // console.log("response", resp);
        libFunc.sendResponse(res, resp);
      }
    }
  });
}

/**
 * Tasks
 *
 * type - 0 for single task, 1 for recurring task
 *
 * status
 * 0 - ongoing
 * 1 - completed
 * 2 - overdue
 *
 *  */

async function getDeviceId(assignedTo) {
  return new Promise(async (resolve, reject) => {
    // Prepare parameterized query for user IDs
    var placeholders = assignedTo.map((_, i) => `$${i + 1}`).join(",");
    var query = `SELECT device_id, userid FROM ${schema}.devices WHERE userid = ANY($1)`;
    connect_db.query(query, [assignedTo], (err, result) => {
      if (err) {
        // console.log(err);
        resolve(false);
      } else {
        if (result.rows.length > 0) {
          resolve(result.rows);
        } else {
          resolve(false);
        }
      }
    });
  });
}
async function getUserData(userid) {
  // console.log("user_id---> ",userid)
  return new Promise(async (resolve, reject) => {
    var query = `SELECT name, mobilenumber FROM ${schema}.users WHERE row_id = $1`;
    connect_db.query(query, [userid], (err, result) => {
      // console.log("result.rows.length--",result.rows.length)
      if (err) {
        // console.log("error------>",err);
        resolve(false);
      } else {
        if (result.rows.length > 0) {
          resolve(result.rows[0]);
        } else {
          resolve(false);
        }
      }
    });
  });
}

async function addTask(taskColumns, assignedto, userid) {
  return new Promise(async (resolve, reject) => {
    var tablename = schema + ".tasks";
    var resp = await db_query.addData(tablename, taskColumns, null, "Task");
    // console.log("resp", resp);
    resolve(resp);
    // libFunc.sendResponse(res, resp);
  });
}

async function notifyUser(assignedto, userid, title, taskid) {
  return new Promise(async (resolve, reject) => {
    var deviceid = await getDeviceId(assignedto);
    var assigned_by_name = await getUserData(userid);
    // console.log("deviceid", deviceid);
    if (deviceid != false && deviceid.length > 0) {
      // var taskid = resp.data.row_id;
      var messageTitle = "Task Assigned";
      var messageBody = `Task ${title} has been assigned by ${assigned_by_name["name"]}`;
      for (var j = 0; j < deviceid.length; j++) {
        async function loop(i) {
          var token = deviceid[i].device_id;
          var result = await sendNotification(token, messageTitle, messageBody);
          // console.log("res", result);
          var column = {
            taskid: taskid,
            assigned_to: deviceid[i].userid,
            message: messageBody,
          };
          var tablename = schema + ".notifications";
          var resp1 = await db_query.addData(
            tablename,
            column,
            null,
            "Notification"
          );
          if (i == deviceid.length - 1) {
            resolve(true);
          }
        }
        loop(j);
      }
    } else {
      resolve(false);
    }
  });
}

async function notifyUserForComments(assignedto, userid, title, taskid) {
  return new Promise(async (resolve, reject) => {
    try {
      var deviceid = await getDeviceId(assignedto);
      var sender = await getUserData(userid);

      if (!deviceid || deviceid.length === 0) {
        return resolve(false);
      }

      let messageTitle = "";
      let messageBody = "";

      messageTitle = "New Comment on Task";
      messageBody = `${sender.name} commented on task ${title}`;

      for (let i = 0; i < deviceid.length; i++) {
        const token = deviceid[i].device_id;

        //  Push notification
        await sendNotification(token, messageTitle, messageBody);

        //  Save in DB
        const column = {
          taskid: taskid,
          assigned_to: deviceid[i].userid,
          message: messageBody,
        };

        const tablename = schema + ".notifications";
        await db_query.addData(tablename, column, null, "Notification");

        if (i === deviceid.length - 1) {
          resolve(true);
        }
      }
    } catch (err) {
      console.error("notifyUser error:", err);
      reject(err);
    }
  });
}

function getOrganizationName(organizationid) {
  return new Promise(async (resolve, reject) => {
    var query = `SELECT organization_name FROM ${schema}.organizations WHERE row_id = $1`;
    connect_db.query(query, [organizationid], (err, result) => {
      if (err) {
        resolve(false);
      } else {
        if (result.rows.length > 0) {
          resolve(result.rows[0]["organization_name"]);
        } else {
          resolve(false);
        }
      }
    });
  });
}

async function notifyOnWA(taskdetails, assignedto) {
  var assignedtoNumbers = await getAssignedToNumbers(assignedto);
  var assignedby = await getUserData(taskdetails.assignedby);
  var organizationName = await getOrganizationName(
    taskdetails["organizationid"]
  );
  var othNum;
  // var othNum = ["7878038514"];
  const completionDate = new Date(taskdetails.completion_date);
  const formattedCompletionDate = completionDate.toDateString();

  const organizationid = taskdetails.organizationid;

  var allNumbers = [];
  if (othNum != undefined && othNum.length > 0) {
    allNumbers = [...assignedtoNumbers, ...othNum];
  } else {
    allNumbers = assignedtoNumbers;
  }
  //////  console.log("allNumbers", allNumbers);
  for (var j = 0; j < allNumbers.length; j++) {
    async function loop(i) {
      var reNu = allNumbers[i].mobilenumber;
      var reNa = allNumbers[i].name;

      var templateData = {
        //"templateName": "test",
        templateName: process.env.notifyOnWA,
        // "templateName": "task_reminder_mac",
        // "templateName": "task_reminder_with_mad",
        languageCode: "en",
        variable: [
          taskdetails.title,
          formattedCompletionDate,
          taskdetails.description,
          assignedby["name"],
          reNa,
          organizationName,
        ],
      };
      //  console.log("templateData------------", templateData);
      //  console.log("reNu------------", reNu);
      var wa_se_ms = await connect_acube24.sendTemplate(reNu, templateData);

      //  console.log("response whatapps", wa_se_ms)

      var row_id = libFunc.randomid();

      var others_details = {
        taskdetails: taskdetails,
        assignedto: assignedto,
      };

      var query = `INSERT INTO prosys.whatsapp_log (row_id,mobilenumber, receiver_user, template_name, request_data, response_data, status,others_details,organizationid) 
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
      var resp = await db_query.customQuery(query, "data saved", [
        row_id,
        reNu,
        reNa,
        templateData.templateName,
        JSON.stringify(templateData),
        JSON.stringify(wa_se_ms),
        wa_se_ms?.status || "UNKNOWN",
        JSON.stringify(others_details),
        organizationid,
      ]);
      //  console.log("whatsapp send to=======", reNu)
      // var AdreNu = "7878038514";
      // var wa_se_ms = await connect_acube24.sendTemplate(AdreNu, templateData);

      // var id = libFunc.randomid();

      // var query = `INSERT INTO prosys.whatsapp_log (row_id,mobilenumber, receiver_user, template_name, request_data, response_data, status,others_details,organizationid)
      //      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`
      // var resp = await db_query.customQuery(query, "data saved",
      //     [id, AdreNu, reNa, templateData.templateName, JSON.stringify(templateData), JSON.stringify(wa_se_ms), wa_se_ms?.status || "UNKNOWN", JSON.stringify(others_details), organizationid]
      // );
    }
    loop(j);
  }
}

async function createTask(req, res) {
  // console.log("data--",req)
  var title =
    req.data.title != undefined
      ? req.data.title.trim().replaceAll("'", "`")
      : undefined;
  var description =
    req.data.description != undefined
      ? req.data.description.trim().replaceAll("'", "`")
      : undefined;
  var userid =
    req.data.assignedby != null ? req.data.assignedby : req.data.userId;
  var organizationid = req.data.orgId;
  var completion_date = req.data.completion_date;
  var newComplDate = new Date(completion_date);
  // console.log("newComplDate", newComplDate);
  // console.log("newComplDate", newComplDate.toDateString());
  var checklistid = req.data.checklist;
  var task_category = req.data.task_category ?? 0; // Non-mandatory, allows custom
  var task_priority = req.data.task_priority ?? 0; // Default = Regular
  var is_attachmentCompulsory = req.data.is_attachmentCompulsory ?? false;

  if (
    !title ||
    !description ||
    !userid ||
    !req.data.assigned_to ||
    req.data.assigned_to.length == 0
  ) {
    const resp = { status: 1, msg: "Missing required fields" };
    // console.log("response of validation ", resp);
    libFunc.sendResponse(res, resp);
  } else {
    var taskColumns = {
      organizationid: organizationid,
      title: title,
      description: description,
      assigned_to: JSON.stringify(req.data.assigned_to),
      assigned_by: userid,

      checklist: JSON.stringify(checklistid),
      completion_date: completion_date,
      task_category: task_category, // default 0
      task_priority: task_priority, // default Regular
      is_attachment: is_attachmentCompulsory,
    };

    // console.log("taskcloumn --->",taskColumns)

    if (req.data.commentdetails != undefined) {
      var commentdetails = req.data.commentdetails;
      var commentColumns = {
        comment: commentdetails.comment,
        userid: userid,
        attachments: commentdetails.file_path,
        organizationid: organizationid,
      };
    }
    if (req.data.is_recurring == false) {
      var resp = await addTask(taskColumns, req.data.assigned_to, userid);
      //  //  console.log("resp --->",resp)
      var whatsappTAskDetails = {
        title: title,
        description: description,
        completion_date: newComplDate,
        organizationid: organizationid,
        assignedby: userid,
      };
      if (organizationid != "1739861234068_66iA") {
        await notifyOnWA(whatsappTAskDetails, req.data.assigned_to);
      }
      //   if (organizationid === '1756191731327_jiOU') {
      //     await notifyOnWA(whatsappTAskDetails, req.data.assigned_to)
      //    }

      if (req.data.commentdetails != undefined) {
        commentColumns.taskid = resp.data.row_id;
        commentColumns.attachments = JSON.stringify(commentColumns.attachments);
        var tablename = schema + ".comments";
        var resp11 = await db_query.addData(
          tablename,
          commentColumns,
          null,
          "Comment"
        );
      }

      var notify = await notifyUser(
        req.data.assigned_to,
        userid,
        title,
        resp.data.row_id
      );

      libFunc.sendResponse(res, resp);
    } else {
      if (req.data.repeat_schedule == undefined) {
        const resp = { status: 1, msg: "Missing required fields" };
        // console.log("response of validation ", resp);
        libFunc.sendResponse(res, resp);
      } else {
        var repeat_schedule = req.data.repeat_schedule;
        var repeat_time = req.data.repeat_time;
        var reminder_list = req.data.reminder_list;
        var months = req.data.months;
        var customdates = req.data.customdates;
        var date = req.data.date;
        var remind_me_before = req.data.remind_me_before;
        var complete_till = req.data.complete_till;
        var schedule_type =
          repeat_schedule == "Daily"
            ? 0
            : repeat_schedule == "Weekly"
            ? 1
            : repeat_schedule == "Monthly"
            ? 2
            : repeat_schedule == "Yearly"
            ? 3
            : undefined;
        var schedule_details = {
          type: repeat_schedule,

          reminder_list: reminder_list, //previously it was days
          // "complete_till": complete_till,
          //"remind_me_before": remind_me_before ?? "1"
        };
        taskColumns.assigned_to = req.data.assigned_to;
        taskColumns.checklist = checklistid;
        var recurringColumns = {
          organizationid: organizationid,
          taskdetails: JSON.stringify(taskColumns),
          schedule_details: JSON.stringify(schedule_details),
          schedule_type: schedule_type,
          commentdetails: JSON.stringify(commentColumns),
        };
        // console.log("recurringColumns",recurringColumns)
        var tablename = schema + ".recurring_task";
        var resp = await db_query.addData(
          tablename,
          recurringColumns,
          null,
          "Recurring Task"
        );
        // console.log("resp----",resp)
        await createRecurringAtCreationTime(resp.data.row_id);
        libFunc.sendResponse(res, resp);
      }
    }
  }
}

async function fetchNotifications(req, res) {
  var userid = req.data.userId;
  var organizationid = req.data.orgId;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;

  var query = `SELECT no.row_id,no.message as message,ta.title as tasktitle,us.name as assigned_username,no.assigned_to,no.taskid ,no.cr_on as created_at FROM ${schema}.notifications no 
    INNER JOIN ${schema}.tasks ta on no.taskid=ta.row_id
    INNER JOIN ${schema}.users us on ta.assigned_by=us.row_id
    where no.assigned_to=$1 ORDER BY no.cr_on DESC LIMIT $2 OFFSET $3`;
  // console.log("query===========");
  // console.log(query);
  var resp = await db_query.customQuery(query, "Notifications Fetched", [
    userid,
    limit,
    offset,
  ]);
  libFunc.sendResponse(res, resp);
}

async function fetchUserTasks(req, res) {
  var userid = req.data.memberid;
  var organizationid = req.data.orgId;
  // var active_status = req.data.status == 'ongoing' ? 0 : req.data.status == 'complete' ? 1 : req.data.status == 'overdue' ? 2 : undefined;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;
  var query = `SELECT ta.row_id, ta.title, ta.description, ta.completion_date, us1.name AS created_by,
    ta.cr_on AS created_at,
    CASE
        WHEN (ta.active_status = '0') THEN 'ongoing'
        WHEN (ta.active_status = '1') THEN 'complete'
        WHEN (ta.active_status = '2') THEN 'overdue'
    END AS status,
    (ta.completion_date - CURRENT_DATE) AS due_days,
    us2.name AS updated_by, 
     COUNT(DISTINCT c.id) AS comment_count,
     COALESCE(
        SUM(
            CASE 
                WHEN jsonb_typeof(c.attachments) = 'array'
                THEN jsonb_array_length(c.attachments)
                ELSE 0
            END
        ), 0
    ) AS attachment_count,
    ta.completedon, ta.checklist,
     COUNT(
    DISTINCT CASE
        WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
        THEN c.id
    END
) AS unseen_comment_count,
 CASE
    WHEN COUNT(
        DISTINCT CASE
            WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
            THEN c.id
        END
    ) > 0
    THEN TRUE
    ELSE FALSE
END AS has_unseen_comments
    FROM ${schema}.tasks ta
    INNER JOIN ${schema}.users us1 ON ta.assigned_by = us1.row_id
    LEFT JOIN ${schema}.users us2 ON ta.completed_by = us2.row_id
    LEFT JOIN ${schema}.comments c
    ON c.taskid = ta.row_id
    AND c.organizationid = ta.organizationid
    LEFT JOIN prosys.comment_reads cr
    ON cr.taskid = ta.row_id
    AND cr.userid = $5
    AND cr.organizationid = ta.organizationid
    WHERE ta.assigned_to::text LIKE $1
        AND ta.organizationid = $2
        AND ta.activestatus = 0
    GROUP BY
    ta.row_id,us1.name,us2.name
    ORDER BY ta.cr_on DESC
    LIMIT $3 OFFSET $4`;

  const params = [`%${userid}%`, organizationid, limit, offset, userid];

  // console.log("query===========");
  // console.log(query);
  var resp = await db_query.customQuery(query, "Tasks Fetched", params);
  // console.log("resp---",resp)
  libFunc.sendResponse(res, resp);
}

function groupTasksByRecurringId(tasks) {
  if (!Array.isArray(tasks)) return [];

  const map = {};
  const result = [];

  for (const task of tasks) {
    // CASE 1: recurringid NULL
    if (!task.recurringid) {
      result.push({
        ...task,
        tasks: [],
        total_tasks: 0,
      });
      continue;
    }

    const key = task.recurringid;

    if (!map[key]) {
      map[key] = {
        ...task,
        comment_count: Number(task.comment_count) || 0,
        attachment_count: Number(task.attachment_count) || 0,
        unseen_comment_count: Number(task.unseen_comment_count) || 0,
        has_unseen_comments: Number(task.unseen_comment_count) > 0,
        tasks: [
          {
            row_id: task.row_id,
            title: task.title,
            description: task.description,
            completion_date: task.completion_date,
            created_by: task.created_by,
            assigned_to: task.assigned_to,
            created_at: task.created_at,
            checklist: task.checklist,
            task_category_id: task.task_category_id,
            task_category_name: task.task_category_name,
            task_priority: task.task_priority,
            status: task.status,
            due_days: task.due_days,
            comment_count: task.comment_count,
            attachment_count: task.attachment_count,
            updated_by: task.updated_by,
            completedon: task.completedon,
            unseen_comment_count: task.unseen_comment_count,
            has_unseen_comments: task.has_unseen_comments,
            is_parent: true,
          },
        ],
        total_tasks: 1,
      };
    } else {
      map[key].tasks.push({
        row_id: task.row_id,
        title: task.title,
        description: task.description,
        completion_date: task.completion_date,
        created_by: task.created_by,
        assigned_to: task.assigned_to,
        created_at: task.created_at,
        checklist: task.checklist,
        task_category_id: task.task_category_id,
        task_category_name: task.task_category_name,
        task_priority: task.task_priority,
        status: task.status,
        due_days: task.due_days,
        comment_count: task.comment_count,
        attachment_count: task.attachment_count,
        completedon: task.completedon,
        updated_by: task.updated_by,
        unseen_comment_count: task.unseen_comment_count,
        has_unseen_comments: task.has_unseen_comments,
        is_parent: false,
      });

      map[key].comment_count += Number(task.comment_count) || 0;
      map[key].attachment_count += Number(task.attachment_count) || 0;
      map[key].unseen_comment_count += Number(task.unseen_comment_count) || 0;
      map[key].has_unseen_comments = map[key].unseen_comment_count > 0;
      map[key].total_tasks += 1;
    }
  }

  //  ONLY ADDITION (VERY IMPORTANT)
  for (const group of Object.values(map)) {
    // SORT latest task first (created_at DESC)
    if (group.tasks.length > 1) {
      group.tasks.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    }

    // single recurring → parent bar only
    if (group.total_tasks === 1) {
      group.flag = 1;
      group.tasks = [];

      // console.log("group--->",group)

      //     const parentTask = group.tasks[0]; // parent task data

      //   // USE PARENT COUNTS (NO SUM)
      //   group.comment_count = Number(parentTask.comment_count) || 0;
      //   group.attachment_count = Number(parentTask.attachment_count) || 0;
      //   group.unseen_comment_count = Number(parentTask.unseen_comment_count) || 0;
      //   group.has_unseen_comments = group.unseen_comment_count > 0;

      //   // UI requirement
      //   group.tasks = [];
    }

    result.push(group);
  }

  return result;
}

function groupAssignedTasksByRecurringId(tasks) {
  // console.log("groupAssignedTasksByRecurringId -->",tasks)
  if (!Array.isArray(tasks)) return [];

  const map = {};
  const result = [];

  for (const task of tasks) {
    // CASE 1: recurringid NULL
    if (!task.recurringid) {
      result.push({
        ...task,
        tasks: [],
        total_tasks: 0,
      });
      continue;
    }

    const key = task.recurringid;

    if (!map[key]) {
      map[key] = {
        ...task,
        comment_count: Number(task.comment_count) || 0,
        attachment_count: Number(task.attachment_count) || 0,
        unseen_comment_count: Number(task.unseen_comment_count) || 0,
        has_unseen_comments: Number(task.unseen_comment_count) > 0,
        tasks: [
          {
            row_id: task.row_id,
            title: task.title,
            description: task.description,
            task_category_id: task.task_category_id,
            task_category_name: task.task_category_name,
            task_priority: task.task_priority,
            is_attachmentcompulsory: task.is_attachmentcompulsory,
            completion_date: task.completion_date,
            checklist: task.checklist,
            created_by: task.created_by,
            created_at: task.created_at,
            assigned_to: task.assigned_to,
            status: task.status,
            task_type_title: task.task_type_title,
            due_days: task.due_days,
            updated_by: task.updated_by,
            task_type: task.task_type,
            recurring_task_id: task.recurring_task_id,
            schedule_type: task.schedule_type,
            complet_till: task.complet_till,
            reminder_list: task.reminder_list,
            remind_me_before: task.remind_me_before,
            comment_count: task.comment_count,
            attachment_count: task.attachment_count,
            completedon: task.completedon,
            unseen_comment_count: task.unseen_comment_count,
            has_unseen_comments: task.has_unseen_comments,
            is_parent: true,
          },
        ],
        total_tasks: 1,
      };
    } else {
      map[key].tasks.push({
        row_id: task.row_id,
        title: task.title,
        description: task.description,
        task_category_id: task.task_category_id,
        task_category_name: task.task_category_name,
        task_priority: task.task_priority,
        is_attachmentcompulsory: task.is_attachmentcompulsory,
        completion_date: task.completion_date,
        checklist: task.checklist,
        created_by: task.created_by,
        created_at: task.created_at,
        assigned_to: task.assigned_to,
        status: task.status,
        task_type_title: task.task_type_title,
        due_days: task.due_days,
        updated_by: task.updated_by,
        task_type: task.task_type,
        recurring_task_id: task.recurring_task_id,
        schedule_type: task.schedule_type,
        complet_till: task.complet_till,
        reminder_list: task.reminder_list,
        remind_me_before: task.remind_me_before,
        comment_count: task.comment_count,
        attachment_count: task.attachment_count,
        completedon: task.completedon,
        unseen_comment_count: task.unseen_comment_count,
        has_unseen_comments: task.has_unseen_comments,
        is_parent: false,
      });

      map[key].comment_count += Number(task.comment_count) || 0;
      map[key].attachment_count += Number(task.attachment_count) || 0;
      map[key].unseen_comment_count += Number(task.unseen_comment_count) || 0;
      map[key].has_unseen_comments = map[key].unseen_comment_count > 0;
      map[key].total_tasks += 1;
    }
  }

  //  ONLY ADDITION (VERY IMPORTANT)
  for (const group of Object.values(map)) {
    // SORT latest task first (created_at DESC)
    if (group.tasks.length > 1) {
      group.tasks.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    }

    // single recurring → parent bar only
    if (group.total_tasks === 1) {
      group.flag = 1;
      group.tasks = [];

      // console.log("group--->",group)

      //     const parentTask = group.tasks[0]; // parent task data

      //   // USE PARENT COUNTS (NO SUM)
      //   group.comment_count = Number(parentTask.comment_count) || 0;
      //   group.attachment_count = Number(parentTask.attachment_count) || 0;
      //   group.unseen_comment_count = Number(parentTask.unseen_comment_count) || 0;
      //   group.has_unseen_comments = group.unseen_comment_count > 0;

      //   // UI requirement
      //   group.tasks = [];
    }

    result.push(group);
  }

  return result;
}

async function fetchMyTasks(req, res) {
  const userid = req.data.userId;
  const organizationid = req.data.orgId;

  const active_status =
    req.data.status === "ongoing"
      ? 0
      : req.data.status === "complete"
      ? 1
      : req.data.status === "overdue"
      ? 2
      : 0;

  const limit = req.data.limit || 100;
  const page = req.data.page || 1;
  const offset = (page - 1) * limit;

  const query = `
    SELECT 
      ta.row_id,
      ta.title,
      ta.description,
      ta.completion_date,
      us1.name AS created_by,
      CASE 
        WHEN COUNT(DISTINCT assigned_to_id) = 1
             AND MAX(assigned_to_id) = $6
        THEN NULL
        ELSE json_agg(DISTINCT us.name)
      END AS assigned_to,
      ta.cr_on AS created_at,
      ta.checklist,
      ta.task_category AS task_category_id,
      tc.category_name AS task_category_name,
      CASE
        WHEN ta.task_priority = '0' THEN 'Regular'
        WHEN ta.task_priority = '1' THEN 'Critical'
      END AS task_priority,
      CASE
        WHEN ta.active_status = '0' THEN 'ongoing'
        WHEN ta.active_status = '1' THEN 'complete'
        WHEN ta.active_status = '2' THEN 'overdue'
      END AS status,
      (ta.completion_date - CURRENT_DATE) AS due_days,
      COUNT(DISTINCT c.id) AS comment_count,
      
(
  SELECT COALESCE(
    SUM(
      CASE
        WHEN jsonb_typeof(c2.attachments) = 'array'
        THEN jsonb_array_length(c2.attachments)
        ELSE 0
      END
    ), 0
  )
  FROM prosys.comments c2
  WHERE c2.taskid = ta.row_id
    AND c2.organizationid = ta.organizationid
) AS attachment_count
,
      us2.name AS updated_by,
      ta.completedon,
      COUNT(
        DISTINCT CASE
          WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
          THEN c.id
        END
      ) AS unseen_comment_count,
      CASE
        WHEN COUNT(
          DISTINCT CASE
            WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
            THEN c.id
          END
        ) > 0
        THEN TRUE ELSE FALSE
      END AS has_unseen_comments,
      ta.recurringid
    FROM ${schema}.tasks ta
    LEFT JOIN ${schema}.tasks_categories tc 
      ON tc.row_id = ta.task_category
    INNER JOIN ${schema}.users us1 
      ON ta.assigned_by = us1.row_id
    LEFT JOIN ${schema}.users us2 
      ON ta.completed_by = us2.row_id
    INNER JOIN LATERAL jsonb_array_elements_text(ta.assigned_to) 
      AS assigned_to_id ON TRUE
    INNER JOIN prosys.users us 
      ON us.row_id = assigned_to_id::text
    LEFT JOIN ${schema}.comments c
      ON c.taskid = ta.row_id
      AND c.organizationid = ta.organizationid
    LEFT JOIN prosys.comment_reads cr
      ON cr.taskid = ta.row_id
      AND cr.userid = $6
      AND cr.organizationid = ta.organizationid
    WHERE ta.assigned_to::text LIKE $1
      AND ta.organizationid = $2
      AND ta.active_status = $3
      AND ta.activestatus = 0
    GROUP BY 
      ta.row_id, us1.name, us2.name, tc.category_name
    ORDER BY due_days ASC
    LIMIT $4 OFFSET $5
  `;

  const params = [
    `%${userid}%`,
    organizationid,
    active_status,
    limit,
    offset,
    userid,
  ];

  const resp = await db_query.customQuery(query, "Tasks Fetched", params);

  //   console.log("response",resp)

  //  GROUPING HERE
  const groupedData = groupTasksByRecurringId(resp.data);
  //   console.log("data",{
  //     status: 0,
  //     message: "Tasks fetched",
  //     data: groupedData
  //   })

  //  console.log("data--->",groupedData[1])

  libFunc.sendResponse(res, {
    status: 0,
    message: "Tasks fetched",
    data: groupedData,
  });
}

function formatCount(count) {
  if (count < 1000) return count.toString();
  if (count < 100000) return (count / 1000).toFixed(1) + "K";
  if (count < 10000000) return (count / 100000).toFixed(1) + "L";
  return (count / 10000000).toFixed(1) + "Cr";
}

async function fetchTaskCounts(req, res) {
  try {
    const userid = req.data.userId;
    const organizationid = req.data.orgId;
    const flag = Number(req.data.flag); // 0 or 1

    // console.log("userid",userid)

    const query = `
            SELECT
                /* Tasks assigned TO me */
                COUNT(*) FILTER (
                    WHERE active_status = 0
                    AND assigned_to @> jsonb_build_array('${userid}')
                ) AS my_ongoing,

                COUNT(*) FILTER (
                    WHERE active_status = 1
                    AND assigned_to @> jsonb_build_array('${userid}')
                ) AS my_complete,

                COUNT(*) FILTER (
                    WHERE active_status = 2
                    AND assigned_to @> jsonb_build_array('${userid}')
                ) AS my_overdue,

                /* Tasks assigned BY me */
                COUNT(*) FILTER (
                    WHERE active_status = 0
                    AND assigned_by = '${userid}'
                ) AS assigned_ongoing,

                COUNT(*) FILTER (
                    WHERE active_status = 1
                    AND assigned_by = '${userid}'
                ) AS assigned_complete,

                COUNT(*) FILTER (
                    WHERE active_status = 2
                    AND assigned_by = '${userid}'
                ) AS assigned_overdue

            FROM prosys.tasks
            WHERE organizationid = '${organizationid}'
              AND activestatus = 0;
        `;

    const resp = await db_query.customQuery(query, "Task Counts");

    const row = resp.data[0];
    let data;

    //  FLAG BASED RESPONSE
    if (flag === 0) {
      data = [
        {
          // ongoing: formatCount(950),
          // complete: formatCount(12500),
          // overdue: formatCount(1500000)
          ongoing: formatCount(Number(row.my_ongoing)),
          complete: formatCount(Number(row.my_complete)),
          overdue: formatCount(Number(row.my_overdue)),
        },
      ];
    } else if (flag === 1) {
      data = [
        {
          //  ongoing: formatCount(100000000),
          //  complete: formatCount(1200),
          //  overdue: formatCount(1500000)
          ongoing: formatCount(Number(row.assigned_ongoing)),
          complete: formatCount(Number(row.assigned_complete)),
          overdue: formatCount(Number(row.assigned_overdue)),
        },
      ];
    } else {
      return libFunc.sendResponse(res, {
        status: false,
        message: "Invalid flag value",
      });
    }

    const response = {
      status: 0,
      message: "Task Counts fetched successfully",
      data,
    };

    // console.log("response--",response)
    libFunc.sendResponse(res, response);
  } catch (err) {
    console.error("Error in fetchTaskCounts:", err);
    libFunc.sendResponse(res, {
      status: false,
      message: "Internal Server Error",
    });
  }
}

async function fetchInactiveRecurringTask(req, res) {
  var userid = req.data.userId;
  var organizationid = req.data.orgId;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;
  var sqlquery = `
        SELECT 
            rt.schedule_details->>'type' AS scheduletype, 
            rt.schedule_details->>'reminder_list' AS reminder_list,
            rt.schedule_details->>'complete_till' AS complete_till,
            rt.schedule_details->>'remind_me_before' AS remind_me_before,
            rt.row_id,
            rt.taskdetails->>'title' AS title,
            rt.taskdetails->>'description' AS description,
            rt.cr_on AS created_at,
            json_agg(DISTINCT us1.name) AS assigned_to,
            us.name AS created_by,
            rt.taskdetails->>'active_status' AS active_status,
            rt.taskdetails->>'completedon' AS completedon,
            COUNT(
    DISTINCT CASE
        WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
        THEN c.id
    END
) AS unseen_comment_count,
 CASE
    WHEN COUNT(
        DISTINCT CASE
            WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
            THEN c.id
        END
    ) > 0
    THEN TRUE
    ELSE FALSE
END AS has_unseen_comments
        FROM 
            prosys.recurring_task rt 
        INNER JOIN 
            prosys.users us ON rt.taskdetails->>'assigned_by' = us.row_id
        INNER JOIN 
            LATERAL jsonb_array_elements_text(rt.taskdetails->'assigned_to') AS assigned_to_id ON TRUE
        INNER JOIN 
            prosys.users us1 ON us1.row_id = assigned_to_id::text
        LEFT JOIN ${schema}.comments c
    ON c.taskid = rt.row_id
    AND c.organizationid = rt.organizationid
    LEFT JOIN prosys.comment_reads cr
    ON cr.taskid = rt.row_id
    AND cr.userid = $1
    AND cr.organizationid = rt.organizationid
        WHERE 
            rt.taskdetails->>'assigned_by' = $1
            AND rt.organizationid = $2
            AND rt.activestatus = 1
        GROUP BY 
            rt.row_id, 
            rt.schedule_details, 
            us.name, 
            rt.taskdetails
        ORDER BY 
            rt.cr_on DESC 
        LIMIT $3 OFFSET $4;
    `;
  var params = [userid, organizationid, limit, offset];
  // var sqlquery=
  // `SELECT rt.schedule_details->>'type' as scheduletype, rt.schedule_details->>'time' as time,rt.schedule_details->>'day' as day,rt.schedule_details->>'month' as month,rt.schedule_details->>'date' as date,rt.schedule_details->>'completion_days' as completion_days,rt.row_id,rt.taskdetails->>'title' as title,rt.taskdetails->>'description' as description,rt.taskdetails->>'completion_date' as completion_date,us1.name as created_by,rt.cr_on as created_at,rt.taskdetails->>'assigned_to' as assigned_to,rt.taskdetails->>'assigned_by' as assigned_by,rt.taskdetails->>'active_status' as active_status,rt.taskdetails->>'completed_by' as completed_by,rt.taskdetails->>'completedon' as completedon,us2.name as updated_by FROM ${schema}.recurring_task rt INNER JOIN ${schema}.users us1 on rt.taskdetails->>'assigned_by'=us1.row_id LEFT JOIN ${schema}.users us2 on rt.taskdetails->>'completed_by'=us2.row_id where rt.taskdetails->>'assigned_to' LIKE '%${userid}%' and rt.organizationid='${organizationid}' ORDER BY rt.cr_on DESC LIMIT ${limit} OFFSET ${offset}`;
  // console.log("query===========");
  // console.log(sqlquery);
  var resp = await db_query.customQuery(
    sqlquery,
    "Inactive Recurring Tasks Fetched",
    params
  );
  // console.log("response-->",resp)
  libFunc.sendResponse(res, resp);
}
async function getRecurringTask(req, res) {
  var userid = req.data.userId;
  var organizationid = req.data.orgId;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;
  //     var sqlquery =
  //         `SELECT
  //     rt.schedule_details->>'type' AS scheduletype,
  //     rt.schedule_details->>'reminder_on' AS reminder_on,
  //     rt.schedule_details->>'complete_till' AS complete_till,
  //     rt.schedule_details->>'remind_me_before' AS remind_me_before,
  //     rt.row_id,
  //     rt.taskdetails->>'title' AS title,
  //     rt.taskdetails->>'description' AS description,
  //     rt.taskdetails->>'checklist' AS checklist,
  //     rt.cr_on AS created_at,
  //     json_agg(DISTINCT us1.name) AS assigned_to,
  //     us.name AS created_by,
  //     rt.taskdetails->>'active_status' AS active_status,
  //     rt.taskdetails->>'completedon' AS completedon
  // FROM
  //     prosys.recurring_task rt
  // INNER JOIN
  //     prosys.users us ON rt.taskdetails->>'assigned_by' = us.row_id
  // INNER JOIN
  //     LATERAL jsonb_array_elements_text(rt.taskdetails->'assigned_to') AS assigned_to_id ON TRUE
  // INNER JOIN
  //     prosys.users us1 ON us1.row_id = assigned_to_id::text
  // WHERE
  //     rt.taskdetails->>'assigned_by' = $1
  //     AND rt.organizationid = $2
  //     AND rt.activestatus = 0
  // GROUP BY
  //     rt.row_id,
  //     rt.schedule_details,
  //     us.name,
  //     rt.taskdetails
  // ORDER BY
  //     rt.cr_on DESC
  // LIMIT $3 OFFSET $4;
  //     `;

  var sqlquery = `SELECT 
    rt.schedule_details->>'type' AS scheduletype, 
    rt.schedule_details->>'reminder_list' AS reminder_list,
    rt.row_id,
    rt.taskdetails->>'title' AS title,
    rt.taskdetails->>'description' AS description,
     rt.taskdetails->>'task_category' AS task_category_id,
     tc.category_name AS task_category_name,  
    (rt.taskdetails->>'is_attachment')::boolean AS is_attachmentCompulsory,

    CASE
        WHEN  rt.taskdetails->>'task_priority' = '0' THEN 'Regular'
        WHEN  rt.taskdetails->>'task_priority' = '1' THEN 'Critical'                   
    END AS task_priority ,
    rt.taskdetails->>'checklist' AS checklist,
    rt.taskdetails->>'organizationid' AS organizationid,
    rt.cr_on AS created_at,
    json_agg(DISTINCT us1.name) AS assigned_to,
    us.name AS created_by,
    rt.taskdetails->>'active_status' AS active_status,
    rt.taskdetails->>'completedon' AS completedon
FROM 
    prosys.recurring_task rt 
 LEFT JOIN ${schema}.tasks_categories tc 
        ON tc.row_id = rt.taskdetails->>'task_category'
INNER JOIN 
    prosys.users us ON rt.taskdetails->>'assigned_by' = us.row_id
INNER JOIN 
    LATERAL jsonb_array_elements_text(rt.taskdetails->'assigned_to') AS assigned_to_id ON TRUE
INNER JOIN 
    prosys.users us1 ON us1.row_id = assigned_to_id::text
WHERE 
    rt.taskdetails->>'assigned_by' = $1
    AND rt.organizationid = $2
    AND rt.activestatus = 0
GROUP BY 
    rt.row_id, 
    rt.schedule_details, 
    us.name, 
    rt.taskdetails,tc.category_name
ORDER BY 
    rt.cr_on DESC 
LIMIT $3 OFFSET $4;
    `;
  var params = [userid, organizationid, limit, offset];
  // var sqlquery=
  // `SELECT rt.schedule_details->>'type' as scheduletype, rt.schedule_details->>'time' as time,rt.schedule_details->>'day' as day,rt.schedule_details->>'month' as month,rt.schedule_details->>'date' as date,rt.schedule_details->>'completion_days' as completion_days,rt.row_id,rt.taskdetails->>'title' as title,rt.taskdetails->>'description' as description,rt.taskdetails->>'completion_date' as completion_date,us1.name as created_by,rt.cr_on as created_at,rt.taskdetails->>'assigned_to' as assigned_to,rt.taskdetails->>'assigned_by' as assigned_by,rt.taskdetails->>'active_status' as active_status,rt.taskdetails->>'completed_by' as completed_by,rt.taskdetails->>'completedon' as completedon,us2.name as updated_by FROM ${schema}.recurring_task rt INNER JOIN ${schema}.users us1 on rt.taskdetails->>'assigned_by'=us1.row_id LEFT JOIN ${schema}.users us2 on rt.taskdetails->>'completed_by'=us2.row_id where rt.taskdetails->>'assigned_to' LIKE '%${userid}%' and rt.organizationid='${organizationid}' ORDER BY rt.cr_on DESC LIMIT ${limit} OFFSET ${offset}`;
  // console.log("query===========");
  // console.log(sqlquery);
  var resp = await db_query.customQuery(
    sqlquery,
    "Recurring Tasks Fetched",
    params
  );
  // console.log("recurring tasks", resp.data)
  libFunc.sendResponse(res, resp);
}

// async function updateTaskStatus(req, res) {
//     var status = req.data.status;
//     var taskid = req.data.row_id;
//     var userid = req.data.userId;
//     var organizationid = req.data.orgId;
//     var tablename = schema + '.tasks';
//     var active_status = status == 'ongoing' ? 0 : status == 'complete' ? 1 : status == 'overdue' ? 2 : undefined;

//     var columns = {
//         "active_status": active_status,
//         "completed_by": userid,
//         "completedon": new Date().toLocaleString(),

//     }
//     var resp = await db_query.addData(tablename, columns, taskid, "Task Status");
//     // console.log("resp", resp);
//     libFunc.sendResponse(res, resp);
// }

// async function fetchMyAssignedTasks(req, res) {
//     // console.log("req--->",req.data)
//     try {
//         var userid = req.data.ismember ? req.data.memberid : req.data.userId;
//         var organizationid = req.data.orgId;
//         var active_status =
//             req.data.status == 'ongoing' ? 0 :
//             req.data.status == 'complete' ? 1 :
//             req.data.status == 'overdue' ? 2 : undefined;
//         var limit = req.data.limit || 100;
//         var page = req.data.page || 1;
//         var offset = (page - 1) * limit;

//         //  Filter support (array of assigned_to row_ids)
//         var filters = req.data.filters || {};
//         var assignedToFilter = Array.isArray(filters.assigned_to) ? filters.assigned_to : [];

//         let sqlquery, params;

//         if (active_status === undefined) {
//             sqlquery = `
// SELECT
//     ta.row_id,
//     ta.title,
//     ta.description,
//     ta.checklist,
//     ta.completion_date,
//     us1.name AS created_by,
//     ta.cr_on AS created_at,
//     json_agg(us.name) AS assigned_to,
//     CASE
//         WHEN ta.active_status = '0' THEN 'ongoing'
//         WHEN ta.active_status = '1' THEN 'complete'
//         WHEN ta.active_status = '2' THEN 'overdue'
//     END AS status,
//     CASE
//         WHEN ta.task_type = '0' THEN 'Normal'
//         WHEN ta.task_type = '1' THEN 'Recurring'
//     END AS task_type_title,
//     (ta.completion_date - CURRENT_DATE) AS due_days,
//     us2.name AS updated_by,
//     ta.task_type,
//     rt.schedule_details->>'type' AS schedule_type,
//     rt.row_id as recurring_task_id,
//     rt.schedule_details->>'reminder_list' AS reminder_list,
//     rt.schedule_details->>'remind_me_before' AS remind_me_before,
//     rt.schedule_details->>'complete_till' AS complet_till
// FROM
//     prosys.tasks ta
// INNER JOIN
//     prosys.users us1 ON ta.assigned_by = us1.row_id
// INNER JOIN
//     LATERAL jsonb_array_elements_text(ta.assigned_to) AS assigned_to_id ON TRUE
// INNER JOIN
//     prosys.users us ON us.row_id = assigned_to_id::text
// LEFT JOIN
//     prosys.users us2 ON ta.completed_by = us2.row_id
// LEFT JOIN prosys.recurring_task rt
//     ON ta.recurringid = rt.row_id
//     AND rt.taskdetails->>'assigned_by' = $1
//     AND rt.taskdetails->>'assigned_to' ILIKE '%' || ta.assigned_to::text || '%'
// WHERE
//     ta.assigned_by = $1
//     AND ta.organizationid = $2
//     AND ta.activestatus = 0
//     ${assignedToFilter.length > 0 ? `AND assigned_to_id::text = ANY($5)` : ''}
// GROUP BY
//     ta.row_id, ta.checklist, us1.name, us2.name, rt.schedule_details, rt.row_id
// ORDER BY
//     ta.cr_on DESC
// LIMIT $3 OFFSET $4;
//             `;

//             if (assignedToFilter.length > 0) {
//                 params = [userid, organizationid, limit, offset, assignedToFilter];
//             } else {
//                 params = [userid, organizationid, limit, offset];
//             }

//         } else {
//             sqlquery = `
// SELECT
//     ta.row_id,
//     ta.title,
//     ta.description,
//     ta.completion_date, ta.checklist,
//     us1.name AS created_by,
//     ta.cr_on AS created_at,
//     json_agg(us.name) AS assigned_to,
//     CASE
//         WHEN ta.active_status = '0' THEN 'ongoing'
//         WHEN ta.active_status = '1' THEN 'complete'
//         WHEN ta.active_status = '2' THEN 'overdue'
//     END AS status,
//     CASE
//         WHEN ta.task_type = '0' THEN 'Normal'
//         WHEN ta.task_type = '1' THEN 'Recurring'
//     END AS task_type_title,
//     (ta.completion_date - CURRENT_DATE) AS due_days,
//     us2.name AS updated_by,
//     ta.task_type,
//     rt.row_id as recurring_task_id,
//     rt.schedule_details->>'type' AS schedule_type,
//     rt.schedule_details->>'complete_till' AS complet_till,
//     rt.schedule_details->>'reminder_list' AS reminder_list,
//     rt.schedule_details->>'remind_me_before' AS remind_me_before
// FROM
//     prosys.tasks ta
// INNER JOIN
//     prosys.users us1 ON ta.assigned_by = us1.row_id
// INNER JOIN
//     LATERAL jsonb_array_elements_text(ta.assigned_to) AS assigned_to_id ON TRUE
// INNER JOIN
//     prosys.users us ON us.row_id = assigned_to_id::text
// LEFT JOIN
//     prosys.users us2 ON ta.completed_by = us2.row_id
// LEFT JOIN prosys.recurring_task rt
//     ON ta.recurringid = rt.row_id
//     AND rt.taskdetails->>'assigned_by' = $1
//     AND rt.taskdetails->>'assigned_to' ILIKE '%' || ta.assigned_to::text || '%'
// WHERE
//     ta.assigned_by = $1
//     AND ta.organizationid = $2
//     AND ta.active_status = $3
//     AND ta.activestatus = 0
//     ${assignedToFilter.length > 0 ? `AND assigned_to_id::text = ANY($6)` : ''}
// GROUP BY
//     ta.row_id, us1.name, ta.checklist, us2.name, rt.schedule_details, rt.row_id
// ORDER BY
//     ta.cr_on DESC
// LIMIT $4 OFFSET $5;
//             `;

//             if (assignedToFilter.length > 0) {
//                 params = [userid, organizationid, active_status, limit, offset, assignedToFilter];
//             } else {
//                 params = [userid, organizationid, active_status, limit, offset];
//             }
//         }

//         var resp = await db_query.customQuery(sqlquery, "Tasks Fetched", params);
//         // console.log("response ----->",resp.data)
//         libFunc.sendResponse(res, resp);

//     } catch (err) {
//         console.error("Error in fetchMyAssignedTasks:", err);
//         libFunc.sendResponse(res, { status: false, message: "Internal Server Error" });
//     }
// }

async function fetchMyAssignedTasks(req, res) {
  // console.log("req--->",req.data)
  try {
    var userid = req.data.ismember ? req.data.memberid : req.data.userId;
    var organizationid = req.data.orgId;
    var active_status =
      req.data.status == "ongoing"
        ? 0
        : req.data.status == "complete"
        ? 1
        : req.data.status == "overdue"
        ? 2
        : undefined;
    var limit = req.data.limit || 100;
    var page = req.data.page || 1;
    var offset = (page - 1) * limit;

    //  Filter support (array of assigned_to row_ids)
    var filters = req.data.filters || {};
    var assignedToFilter = Array.isArray(filters.assigned_to)
      ? filters.assigned_to
      : [];

    //  Added optional completion date filters (NEW)
    var startDate = filters.completion_startDate || null;
    var endDate = filters.completion_endDate || null;

    let sqlquery, params;

    if (active_status === undefined) {
      sqlquery = `
SELECT
    ta.row_id,
    ta.title,
    ta.description,
    ta.task_category AS task_category_id,           
    tc.category_name AS task_category_name,         
      CASE
        WHEN  ta.task_priority = '0' THEN 'Regular'
        WHEN  ta.task_priority = '1' THEN 'Critical'                   
      END AS task_priority ,
     ta.is_attachment as is_attachmentCompulsory, 
    ta.checklist,
    ta.completion_date,
    us1.name AS created_by,
    ta.cr_on AS created_at,
    json_agg(DISTINCT us.name) AS assigned_to,
    CASE
        WHEN ta.active_status = '0' THEN 'ongoing'
        WHEN ta.active_status = '1' THEN 'complete'
        WHEN ta.active_status = '2' THEN 'overdue'
    END AS status,
    CASE
        WHEN ta.task_type = '0' THEN 'Normal'
        WHEN ta.task_type = '1' THEN 'Recurring'
    END AS task_type_title,
    (ta.completion_date - CURRENT_DATE) AS due_days,
    us2.name AS updated_by,
    ta.task_type,
    rt.schedule_details->>'type' AS schedule_type,
    rt.row_id as recurring_task_id,
    rt.schedule_details->>'reminder_list' AS reminder_list,
    rt.schedule_details->>'remind_me_before' AS remind_me_before,
    rt.schedule_details->>'complete_till' AS complet_till,
     COUNT(DISTINCT c.id) AS comment_count,
     COALESCE(
        SUM(
            CASE 
                WHEN jsonb_typeof(c.attachments) = 'array'
                THEN jsonb_array_length(c.attachments)
                ELSE 0
            END
        ), 0
    ) AS attachment_count, ta.completedon,
      COUNT(
    DISTINCT CASE
        WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
        THEN c.id
    END
) AS unseen_comment_count,
 CASE
    WHEN COUNT(
        DISTINCT CASE
            WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
            THEN c.id
        END
    ) > 0
    THEN TRUE
    ELSE FALSE
END AS has_unseen_comments,ta.recurringid

FROM
    prosys.tasks ta
LEFT JOIN ${schema}.tasks_categories tc 
    ON tc.row_id = ta.task_category 
INNER JOIN
    prosys.users us1 ON ta.assigned_by = us1.row_id
INNER JOIN
    LATERAL jsonb_array_elements_text(ta.assigned_to) AS assigned_to_id ON TRUE
INNER JOIN
    prosys.users us ON us.row_id = assigned_to_id::text
LEFT JOIN
    prosys.users us2 ON ta.completed_by = us2.row_id
LEFT JOIN prosys.recurring_task rt 
    ON ta.recurringid = rt.row_id
    AND rt.taskdetails->>'assigned_by' = $1
    AND rt.taskdetails->>'assigned_to' ILIKE '%' || ta.assigned_to::text || '%'
LEFT JOIN ${schema}.comments c
    ON c.taskid = ta.row_id
    AND c.organizationid = ta.organizationid
LEFT JOIN prosys.comment_reads cr
    ON cr.taskid = ta.row_id
    AND cr.userid = $1
    AND cr.organizationid = ta.organizationid
WHERE
    ta.assigned_by = $1
    AND ta.organizationid = $2
    AND ta.activestatus = 0
    ${assignedToFilter.length > 0 ? `AND assigned_to_id::text = ANY($5)` : ""}
    ${startDate ? `AND ta.completion_date >= '${startDate}'` : ""}
    ${endDate ? `AND ta.completion_date <= '${endDate}'` : ""}
    AND us.activestatus = 0
GROUP BY
    ta.row_id, ta.checklist, us1.name, us2.name, rt.schedule_details, rt.row_id,tc.category_name
ORDER BY
    due_days ASC
LIMIT $3 OFFSET $4;
            `;

      if (assignedToFilter.length > 0) {
        params = [userid, organizationid, limit, offset, assignedToFilter];
      } else {
        params = [userid, organizationid, limit, offset];
      }
    } else {
      sqlquery = `
SELECT
    ta.row_id,
    ta.title,
    ta.description,
    ta.task_category AS task_category_id,           
    tc.category_name AS task_category_name,         
      CASE
         WHEN  ta.task_priority = '0' THEN 'Regular'
         WHEN  ta.task_priority = '1' THEN 'Critical'                   
      END AS task_priority ,
    ta.is_attachment as is_attachmentCompulsory, 
    ta.completion_date, ta.checklist,
    us1.name AS created_by,
    ta.cr_on AS created_at,
    json_agg(DISTINCT us.name) AS assigned_to,
    CASE
        WHEN ta.active_status = '0' THEN 'ongoing'
        WHEN ta.active_status = '1' THEN 'complete'
        WHEN ta.active_status = '2' THEN 'overdue'
    END AS status,
    CASE
        WHEN ta.task_type = '0' THEN 'Normal'
        WHEN ta.task_type = '1' THEN 'Recurring'
    END AS task_type_title,
    (ta.completion_date - CURRENT_DATE) AS due_days,
    us2.name AS updated_by,
    ta.task_type,
    rt.row_id as recurring_task_id,
    rt.schedule_details->>'type' AS schedule_type,
    rt.schedule_details->>'complete_till' AS complet_till,
    rt.schedule_details->>'reminder_list' AS reminder_list,
    rt.schedule_details->>'remind_me_before' AS remind_me_before,
    COUNT(DISTINCT c.id) AS comment_count,
    COALESCE(
        SUM(
            CASE 
                WHEN jsonb_typeof(c.attachments) = 'array'
                THEN jsonb_array_length(c.attachments)
                ELSE 0
            END
        ), 0
    ) AS attachment_count,
      ta.completedon,
       COUNT(
    DISTINCT CASE
        WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
        THEN c.id
    END
) AS unseen_comment_count,
 CASE
    WHEN COUNT(
        DISTINCT CASE
            WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
            THEN c.id
        END
    ) > 0
    THEN TRUE
    ELSE FALSE
END AS has_unseen_comments,ta.recurringid
FROM
    prosys.tasks ta
LEFT JOIN ${schema}.tasks_categories tc 
    ON tc.row_id = ta.task_category
INNER JOIN
    prosys.users us1 ON ta.assigned_by = us1.row_id
INNER JOIN
    LATERAL jsonb_array_elements_text(ta.assigned_to) AS assigned_to_id ON TRUE
INNER JOIN
    prosys.users us ON us.row_id = assigned_to_id::text
LEFT JOIN
    prosys.users us2 ON ta.completed_by = us2.row_id
LEFT JOIN prosys.recurring_task rt 
    ON ta.recurringid = rt.row_id
    AND rt.taskdetails->>'assigned_by' = $1
    AND rt.taskdetails->>'assigned_to' ILIKE '%' || ta.assigned_to::text || '%'
LEFT JOIN ${schema}.comments c
    ON c.taskid = ta.row_id
    AND c.organizationid = ta.organizationid
LEFT JOIN prosys.comment_reads cr
    ON cr.taskid = ta.row_id
    AND cr.userid = $1
    AND cr.organizationid = ta.organizationid
WHERE
    ta.assigned_by = $1
    AND ta.organizationid = $2
    AND ta.active_status = $3
    AND ta.activestatus = 0
    ${assignedToFilter.length > 0 ? `AND assigned_to_id::text = ANY($6)` : ""}
    ${startDate ? `AND ta.completion_date >= '${startDate}'` : ""}
    ${endDate ? `AND ta.completion_date <= '${endDate}'` : ""}
        AND us.activestatus = 0
GROUP BY
    ta.row_id, us1.name, ta.checklist, us2.name, rt.schedule_details, rt.row_id,tc.category_name
ORDER BY
    due_days ASC
LIMIT $4 OFFSET $5;
            `;

      if (assignedToFilter.length > 0) {
        params = [
          userid,
          organizationid,
          active_status,
          limit,
          offset,
          assignedToFilter,
        ];
      } else {
        params = [userid, organizationid, active_status, limit, offset];
      }
    }

    var resp = await db_query.customQuery(sqlquery, "Tasks Fetched", params);
    // console.log("response --------->",resp.data,"lenght--->",resp.data.length)
    // console.log("task len-",resp.data)
    // libFunc.sendResponse(res, resp);
    const groupedData = groupAssignedTasksByRecurringId(resp.data);

    // console.log("grouping task --->",groupedData[0])

    libFunc.sendResponse(res, {
      status: 0,
      message: "Tasks fetched",
      data: groupedData,
    });
  } catch (err) {
    console.error("Error in fetchMyAssignedTasks:", err);
    libFunc.sendResponse(res, {
      status: false,
      message: "Internal Server Error",
    });
  }
}

async function updateTaskStatus(req, res) {
  try {
    const status = req.data.status;
    const taskid = req.data.row_id;
    const userid = req.data.userId;
    const organizationid = req.data.orgId;
    const schema = "prosys";
    const tablename = `${schema}.tasks`;

    if (status === "complete") {
      //  FETCH TASK ATTACHMENT RULE
      const taskQuery = `
        SELECT is_attachment 
        FROM prosys.tasks 
        WHERE row_id='${taskid}' AND organizationid='${organizationid}'
    `;
      const taskResult = await db_query.customQuery(
        taskQuery,
        "fetch task attachment rule"
      );
      // console.log("taskResult",taskResult)

      if (!taskResult.data || taskResult.data.length == 0) {
        return libFunc.sendResponse(res, { status: 1, msg: "Task not found" });
      }

      const isAttachmentRequired = taskResult.data[0].is_attachment === true;

      //  VALIDATE ATTACHMENT IF REQUIRED
      if (isAttachmentRequired) {
        // console.log("Attachment required for this task. Please upload a file.")
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Attachment required for this task. Please upload a file.",
        });
      }
    }

    //  FETCH CHECKLIST FOR COMPLETION VALIDATION
    const checkQuery = `SELECT checklist FROM ${tablename} 
                            WHERE row_id = '${taskid}' 
                            AND organizationid = '${organizationid}'`;

    const taskResult = await db_query.customQuery(checkQuery, "fetched tasks");

    if (taskResult.length === 0) {
      return libFunc.sendResponse(res, { status: 1, msg: "Task not found" });
    }

    const checklist = taskResult.data[0]?.checklist;

    // Default: ongoing (0)
    let active_status = 0;

    if (status === "complete") {
      let allCompleted = true;
      //  Only check if checklist has items
      if (checklist && Array.isArray(checklist) && checklist.length > 0) {
        for (const group of checklist) {
          if (group.items && Array.isArray(group.items)) {
            for (const item of group.items) {
              if (!item.completed) {
                allCompleted = false;
                break;
              }
            }
          }
          if (!allCompleted) break;
        }
      }
      //  If checklist is empty or all completed — mark complete
      if (!checklist || checklist.length === 0 || allCompleted) {
        active_status = 1;
      } else {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Please complete all checklist items before marking this task as done",
        });
      }
    } else if (status === "ongoing") {
      active_status = 0;
    } else if (status === "overdue") {
      active_status = 2;
    }

    // --------------------------------------------
    // UPDATE STATUS
    // --------------------------------------------
    const columns = {
      remarks: "Manual update",
      active_status,
      completed_by: userid,
      completedon: new Date().toISOString(),
    };

    const resp = await db_query.addData(
      tablename,
      columns,
      taskid,
      "Task Status"
    );
    libFunc.sendResponse(res, resp);
  } catch (err) {
    libFunc.sendResponse(res, {
      status: 1,
      msg: "Server error while updating task status",
    });
  }
}

// async function updateTaskStatusBulk(req, res) {
//     try {
//         const status = req.data.status;
//         const taskIds = req.data.row_ids || [];
//         const userid = req.data.userId;
//         const organizationid = req.data.orgId;
//         const schema = "prosys";
//         const tablename = `${schema}.tasks`;
//         const logTable = `${schema}.task_status_logs`;

//         if (!Array.isArray(taskIds) || taskIds.length === 0) {
//             return libFunc.sendResponse(res, { status: 1, msg: "No task IDs provided." });
//         }

//         const bulkId = libFunc.randomid();
//         let updatedCount = 0;
//         let skippedTasks = [];
//         let attachmentRequiredTaskIds = [];
//         let incompleteChecklistTaskIds = [];

//         for (const taskid of taskIds) {

//             // ------------------------------------------
//             //  Check attachments before completing
//             // ------------------------------------------
//             if (status === "complete") {
//                const attachmentQuery = `
//         SELECT is_attachment
//         FROM prosys.tasks
//         WHERE row_id='${taskid}' AND organizationid='${organizationid}'
//     `;
//     const attachmentResult = await db_query.customQuery(attachmentQuery, "fetch task attachment rule");
//     console.log("taskResult",attachmentResult)

//     if (!attachmentResult.data || attachmentResult.data.length == 0) {
//         return libFunc.sendResponse(res, { status: 1, msg: "Task not found" });
//     }

//     const isAttachmentRequired = attachmentResult.data[0].is_attachment === true;

//     // Fetch task title for dynamic message
// const titleQuery = `
//     SELECT title FROM prosys.tasks
//     WHERE row_id='${taskid}' AND organizationid='${organizationid}'
// `;
// const titleResult = await db_query.customQuery(titleQuery, "fetch title");
// const taskTitle = titleResult.data?.[0]?.title || taskid;

// // Dynamic skip message
// if (isAttachmentRequired) {
//     // const reasonMsg = `Task "${taskTitle}" requires an attachment. Please upload a file.`;
//     // const reasonMsg = `Task requires an attachment. Please upload a file.`;
//     // console.log(reasonMsg);

//     // skippedTasks.push({ taskid, reason: reasonMsg });
//     // continue;  // skip this task but continue bulk update
//        attachmentRequiredTaskIds.push(taskid);   //  IMPORTANT

//                     skippedTasks.push({
//                         row_id: taskid,
//                         reason: "Task requires an attachment",
//                         type: "ATTACHMENT_REQUIRED"
//                     });

//                     continue; // skip only this task

// }

//             }

//             // ------------------------------------------
//             // Fetch checklist
//             // ------------------------------------------
//             const checkQuery = `
//                 SELECT checklist, active_status
//                 FROM ${tablename}
//                 WHERE row_id = '${taskid}' AND organizationid = '${organizationid}'
//             `;
//             const taskResult = await db_query.customQuery(checkQuery, "fetched tasks");

//             if (!taskResult.data || taskResult.data.length === 0) {
//                 skippedTasks.push({ taskid, reason: "Task not found" });
//                 continue;
//             }

//             const taskData = taskResult.data[0];
//             const checklist = taskData.checklist || [];
//             const currentStatus = taskData.active_status;

//             // Task already complete
//             if (currentStatus === 1) {
//                 // console.log("Task already completed")
//                 skippedTasks.push({ taskid, reason: "Task already completed" });
//                 continue;
//             }

//             let active_status = 0;

//             // ------------------------------------------
//             //  Validate checklist for completion
//             // ------------------------------------------
//             if (status === 'complete') {
//                 let allCompleted = true;

//                 if (Array.isArray(checklist) && checklist.length > 0) {
//                     for (const group of checklist) {
//                         if (group.items && Array.isArray(group.items)) {
//                             for (const item of group.items) {
//                                 if (!item.completed) {
//                                     allCompleted = false;
//                                     break;
//                                 }
//                             }
//                         }
//                         if (!allCompleted) break;
//                     }
//                 }

//                 if (!checklist.length || allCompleted) {
//                     active_status = 1;
//                 } else {
//                    incompleteChecklistTaskIds.push(taskid);

//                     skippedTasks.push({
//                         row_id: taskid,
//                         reason: "Incomplete checklist items",
//                         type: "INCOMPLETE_CHECKLIST"
//                     });

//                     continue;

//                 }
//             }
//             else if (status === 'ongoing') {
//                 active_status = 0;
//             }
//             else if (status === 'overdue') {
//                 active_status = 2;
//             }

//             // ------------------------------------------
//             //  UPDATE TASK
//             // ------------------------------------------
//             const columns = {
//                 active_status,
//                 completed_by: userid,
//                 completedon: new Date().toISOString(),
//                 remarks: 'bulk update',
//                 bulk_id: bulkId
//             };

//             const resp = await db_query.addData(tablename, columns, taskid, "Task Status");
//             if (resp.status === 0) updatedCount++;
//         }

//         //  Insert log only if at least one task updated
//         if (updatedCount > 0) {
//             const query = `
//                 INSERT INTO ${logTable} (row_id, task_ids, changed_by, organizationid, change_reason)
//                 VALUES ($1, $2, $3, $4, $5)
//             `;
//             await db_query.customQuery(query, "data saved", [
//                 bulkId,
//                 JSON.stringify(taskIds),
//                 userid,
//                 organizationid,
//                 'bulk update'
//             ]);
//         }

//         // ------------------------------------------
//         //  PREPARE RESPONSE SUMMARY
//         // ------------------------------------------
//         const skippedCount = skippedTasks.length;
//         const total = taskIds.length;

//         const reasonCount = {};
//         skippedTasks.forEach(item => {
//             reasonCount[item.reason] = (reasonCount[item.reason] || 0) + 1;
//         });

//         const reasonSummary = Object.entries(reasonCount)
//             .map(([reason, count]) => `${count} ${reason.toLowerCase()}`)
//             .join(", ");

//         let msg = "";

//         if (updatedCount > 0 && skippedCount === 0) {
//             msg = `Successfully updated all ${updatedCount} task(s).`;
//             responseStatus = 0;
//         }
//         else if (
//             updatedCount === 0 &&
//             incompleteChecklistTaskIds.length > 0 &&
//             incompleteChecklistTaskIds.length === skippedCount
//         ) {
//             msg = `Cannot complete ${skippedCount} task(s). Incomplete checklist items.`;
//             responseStatus = 2;
//         }
//         else if (updatedCount > 0 && skippedCount > 0) {
//             msg = `Updated ${updatedCount} out of ${total} task(s). Skipped ${skippedCount} task(s). ${reasonSummary}`;
//              responseStatus = 1;
//         }
//         else if (updatedCount === 0 && skippedCount > 0) {
//             msg = `No tasks updated. All ${skippedCount} were skipped. ${reasonSummary}`;
//              responseStatus = 1;
//         }
//         else {
//             msg = `No tasks updated.`;
//              responseStatus = 1;
//         }

//         console.log("msg-->",msg)

//         const testd =  {
//             status: responseStatus,
//             msg,
//             updated: updatedCount,
//             skipped: skippedTasks,
//             attachment_required_task_ids: attachmentRequiredTaskIds,
//             incomplete_checklist_task_ids: incompleteChecklistTaskIds

//         }

//         console.log("testd-->>",testd)

//         return libFunc.sendResponse(res, {
//             status: responseStatus,
//             msg,
//             updated: updatedCount,
//             skipped: skippedTasks,
//             attachment_required_task_ids: attachmentRequiredTaskIds,
//             incomplete_checklist_task_ids: incompleteChecklistTaskIds

//         });

//     } catch (err) {
//         console.error("Error updating bulk task status:", err);
//         libFunc.sendResponse(res, { status: 1, msg: "Server error while updating bulk task statuses." });
//     }
// }

async function updateTaskStatusBulk(req, res) {
  try {
    const status = req.data.status;
    const taskIds = req.data.row_ids || [];
    const userid = req.data.userId;
    const organizationid = req.data.orgId;
    const schema = "prosys";
    const tablename = `${schema}.tasks`;
    const logTable = `${schema}.task_status_logs`;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "No task IDs provided.",
      });
    }

    const bulkId = libFunc.randomid();
    let updatedCount = 0;
    let skippedTasks = [];
    let attachmentRequiredTaskIds = [];
    let incompleteChecklistTaskIds = [];
    let otherSkippedTaskIds = [];

    for (const taskid of taskIds) {
      // ------------------------------------------
      //  Check attachments before completing
      // ------------------------------------------
      if (status === "complete") {
        const attachmentQuery = `
        SELECT is_attachment 
        FROM prosys.tasks 
        WHERE row_id='${taskid}' AND organizationid='${organizationid}'
    `;
        const attachmentResult = await db_query.customQuery(
          attachmentQuery,
          "fetch task attachment rule"
        );
        // console.log("taskResult",attachmentResult)

        if (!attachmentResult.data || attachmentResult.data.length == 0) {
          return libFunc.sendResponse(res, {
            status: 1,
            msg: "Task not found",
          });
        }

        const isAttachmentRequired =
          attachmentResult.data[0].is_attachment === true;

        // Fetch task title for dynamic message
        const titleQuery = `
    SELECT title FROM prosys.tasks 
    WHERE row_id='${taskid}' AND organizationid='${organizationid}'
`;
        const titleResult = await db_query.customQuery(
          titleQuery,
          "fetch title"
        );
        const taskTitle = titleResult.data?.[0]?.title || taskid;

        // Dynamic skip message
        if (isAttachmentRequired) {
          // const reasonMsg = `Task "${taskTitle}" requires an attachment. Please upload a file.`;
          // const reasonMsg = `Task requires an attachment. Please upload a file.`;
          // console.log(reasonMsg);

          // skippedTasks.push({ taskid, reason: reasonMsg });
          // continue;  // skip this task but continue bulk update
          attachmentRequiredTaskIds.push(taskid); //  IMPORTANT

          skippedTasks.push({
            row_id: taskid,
            reason: "Task requires an attachment",
            type: "ATTACHMENT_REQUIRED",
          });

          continue; // skip only this task
        }
      }

      // ------------------------------------------
      // Fetch checklist
      // ------------------------------------------
      const checkQuery = `
                SELECT checklist, active_status 
                FROM ${tablename} 
                WHERE row_id = '${taskid}' AND organizationid = '${organizationid}'
            `;
      const taskResult = await db_query.customQuery(
        checkQuery,
        "fetched tasks"
      );

      if (!taskResult.data || taskResult.data.length === 0) {
        skippedTasks.push({ taskid, reason: "Task not found" });
        continue;
      }

      const taskData = taskResult.data[0];
      const checklist = taskData.checklist || [];
      const currentStatus = taskData.active_status;

      // Task already complete
      if (currentStatus === 1) {
        // console.log("Task already completed")
        otherSkippedTaskIds.push(taskid);
        skippedTasks.push({
          row_id: taskid,
          reason: "Task already completed",
        });
        continue;
      }

      let active_status = 0;

      // ------------------------------------------
      //  Validate checklist for completion
      // ------------------------------------------
      if (status === "complete") {
        let allCompleted = true;

        if (Array.isArray(checklist) && checklist.length > 0) {
          for (const group of checklist) {
            if (group.items && Array.isArray(group.items)) {
              for (const item of group.items) {
                if (!item.completed) {
                  allCompleted = false;
                  break;
                }
              }
            }
            if (!allCompleted) break;
          }
        }

        if (!checklist.length || allCompleted) {
          active_status = 1;
        } else {
          incompleteChecklistTaskIds.push(taskid);

          skippedTasks.push({
            row_id: taskid,
            reason: "Incomplete checklist items",
            type: "INCOMPLETE_CHECKLIST",
          });

          continue;
        }
      } else if (status === "ongoing") {
        active_status = 0;
      } else if (status === "overdue") {
        active_status = 2;
      }

      // ------------------------------------------
      //  UPDATE TASK
      // ------------------------------------------
      const columns = {
        active_status,
        completed_by: userid,
        completedon: new Date().toISOString(),
        remarks: "bulk update",
        bulk_id: bulkId,
      };

      const resp = await db_query.addData(
        tablename,
        columns,
        taskid,
        "Task Status"
      );
      if (resp.status === 0) updatedCount++;
    }

    //  Insert log only if at least one task updated
    if (updatedCount > 0) {
      const query = `
                INSERT INTO ${logTable} (row_id, task_ids, changed_by, organizationid, change_reason) 
                VALUES ($1, $2, $3, $4, $5)
            `;
      await db_query.customQuery(query, "data saved", [
        bulkId,
        JSON.stringify(taskIds),
        userid,
        organizationid,
        "bulk update",
      ]);
    }

    // ------------------------------------------
    //  PREPARE RESPONSE SUMMARY
    // ------------------------------------------
    const skippedCount = skippedTasks.length;
    const total = taskIds.length;

    const reasonCount = {};
    skippedTasks.forEach((item) => {
      reasonCount[item.reason] = (reasonCount[item.reason] || 0) + 1;
    });

    const reasonSummary = Object.entries(reasonCount)
      .map(([reason, count]) => `${count} ${reason.toLowerCase()}`)
      .join(", ");

    let msg = "";

    if (updatedCount > 0 && skippedCount === 0) {
      msg = `Successfully updated all ${updatedCount} task(s).`;
      responseStatus = 0;
    } else if (
      updatedCount === 0 &&
      incompleteChecklistTaskIds.length > 0 &&
      incompleteChecklistTaskIds.length === skippedCount
    ) {
      msg = `Cannot complete ${skippedCount} task(s). Incomplete checklist items.`;
      responseStatus = 2;
    } else if (updatedCount > 0 && skippedCount > 0) {
      msg = `Updated ${updatedCount} out of ${total} task(s). Skipped ${skippedCount} task(s). ${reasonSummary}`;
      responseStatus = 1;
    } else if (updatedCount === 0 && skippedCount > 0) {
      msg = `No tasks updated. All ${skippedCount} were skipped. ${reasonSummary}`;
      responseStatus = 1;
    } else {
      msg = `No tasks updated.`;
      responseStatus = 1;
    }

    // console.log("msg-->",msg)

    const testd = {
      status: responseStatus,
      msg,
      updated: updatedCount,
      skipped: skippedTasks,
      attachment_required_task_ids: attachmentRequiredTaskIds,
      incomplete_checklist_task_ids: incompleteChecklistTaskIds,
    };

    // console.log("testd-->>",testd)

    return libFunc.sendResponse(res, {
      status: responseStatus,
      msg,
      updated: updatedCount,
      skipped: skippedTasks,
      attachment_required_task_ids: attachmentRequiredTaskIds,
      incomplete_checklist_task_ids: incompleteChecklistTaskIds,
    });
  } catch (err) {
    // console.error("Error updating bulk task status:", err);
    libFunc.sendResponse(res, {
      status: 1,
      msg: "Server error while updating bulk task statuses.",
    });
  }
}

async function getTaskDAtaById(req, res) {
  // console.log("dta",req)
  var taskid = req.data.row_id;
  var userId = req.data.userId;
  var organizationid = req.data.orgId;
  var query = `SELECT ta.row_id, ta.title, ta.description, ta.completion_date, us1.name AS created_by,
    ta.cr_on AS created_at,
    CASE
        WHEN (ta.active_status = '0') THEN 'ongoing'
        WHEN (ta.active_status = '1') THEN 'complete'
        WHEN (ta.active_status = '2') THEN 'overdue'
    END AS status,
    (ta.completion_date - CURRENT_DATE) AS due_days,
    us2.name AS updated_by,
     COUNT(
    DISTINCT CASE
        WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
        THEN c.id
    END
) AS unseen_comment_count,
 CASE
    WHEN COUNT(
        DISTINCT CASE
            WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
            THEN c.id
        END
    ) > 0
    THEN TRUE
    ELSE FALSE
END AS has_unseen_comments
    FROM ${schema}.tasks ta
    INNER JOIN ${schema}.users us1 ON ta.assigned_by = us1.row_id
    LEFT JOIN ${schema}.users us2 ON ta.completed_by = us2.row_id
     LEFT JOIN ${schema}.comments c
    ON c.taskid = ta.row_id
    AND c.organizationid = ta.organizationid
    LEFT JOIN prosys.comment_reads cr
    ON cr.taskid = ta.row_id
    AND cr.userid = $2
    AND cr.organizationid = ta.organizationid
    WHERE ta.row_id = $1
    GROUP BY 
    ta.row_id, us1.name, us2.name
    `;

  // console.log("query===========");
  // console.log(query);
  var resp = await db_query.customQuery(query, "Tasks Fetched", [
    taskid,
    userId,
  ]);
  // console.log("task-->",resp)
  libFunc.sendResponse(res, resp);
}

/**
 * Commenting on Task
 */
async function checkIsRecurringTasks(taskid) {
  return new Promise(async (resolve, reject) => {
    var query = `SELECT row_id FROM ${schema}.recurring_task WHERE row_id = $1`;
    // console.log("query===========");
    // console.log(query);
    connect_db.query(query, [taskid], (err, result) => {
      if (err) {
        // console.log(err);
        resolve(false);
      } else {
        if (result.rows.length > 0) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    });
  });
}

// async function createComment(req, res) {
//     var taskid = req.data.task_id;
//     var comment = req.data.comment;
//     var userid = req.data.userId;
//     var organizationid = req.data.orgId;
//     var tablename = schema + '.comments';

//     var attachments = req.data.file_path;
//     if (!taskid || !comment || !userid || comment == ' ') {
//         const resp = { status: 1, msg: "Missing required fields" };
//         // console.log("response of validation ", resp);
//         libFunc.sendResponse(res, resp);
//     }
//     else {

//         // var checkTaskidisrecurring = await checkIsRecurringTasks(taskid);
//         // console.log("checkTaskidisrecurring", checkTaskidisrecurring);
//         // if (checkTaskidisrecurring) {
//         //     var cpmmentdata = {
//         //         "comment": comment,
//         //         "userid": userid,
//         //         "attachments":(attachments),
//         //         "organizationid": organizationid
//         //     }
//         //     var columns={
//         //         "commentdetails":JSON.stringify(cpmmentdata)
//         //     }
//         //     var tablename = schema + '.recurring_task';
//         //     var resp = await db_query.addData(tablename, columns, taskid, "Recurring Comment");
//         //     libFunc.sendResponse(res, resp);
//         // } else {
//         var columns = {
//             "taskid": taskid,
//             "comment": comment,
//             "userid": userid,
//             "attachments": JSON.stringify(attachments),
//             "organizationid": organizationid,
//             "is_attachment":false

//         }
//         var resp = await db_query.addData(tablename, columns, req.data.row_id, "Comment");
//         libFunc.sendResponse(res, resp);
//         // }

//     }

// }

async function createComment(req, res) {
  try {
    var taskid = req.data.task_id;
    var comment = req.data.comment;
    var userid = req.data.userId;
    var organizationid = req.data.orgId;
    var tablename = schema + ".comments";

    var attachments = req.data.file_path;
    //  VALIDATION
    if (!taskid || !comment || !userid || comment.trim() == "") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Missing required fields",
      });
    }

    var columns = {
      taskid: taskid,
      comment: comment,
      userid: userid,
      attachments: JSON.stringify(attachments),
      organizationid: organizationid,
      // "is_attachment":isAttachmentRequired
    };
    var resp = await db_query.addData(
      tablename,
      columns,
      req.data.row_id,
      "Comment"
    );

    const taskTable = schema + ".tasks";

    const updateTaskColumns = {
      is_attachment: false,
    };

    if (attachments.length == 1) {
      await db_query.addData(
        taskTable,
        updateTaskColumns,
        taskid,
        "Update task attachment status"
      );
    }

    const taskQuery = `
        SELECT title, assigned_to, assigned_by
        FROM ${schema}.tasks
        WHERE row_id = '${taskid}'
        `;

    const taskResult = await db_query.customQuery(taskQuery);
    // console.log("task results ", taskResult)

    if (taskResult.data.length === 0) {
      return libFunc.sendResponse(res, resp);
    }

    const task = taskResult.data[0];
    const taskTitle = task.title;
    const assignedBy = task.assigned_by;

    let assignedUsers = Array.isArray(task.assigned_to) ? task.assigned_to : [];

    // skip commenter
    assignedUsers = assignedUsers.filter((u) => u !== userid);

    // console.log("assignedUsers==>", assignedUsers)

    // add assignedBy
    if (
      assignedBy &&
      assignedBy !== userid &&
      !assignedUsers.includes(assignedBy)
    ) {
      assignedUsers.push(assignedBy);
    }

    if (assignedUsers.length === 0) {
      return libFunc.sendResponse(res, resp);
    }
    /* SEND NOTIFICATION */

    await notifyUserForComments(
      assignedUsers, // receiver
      userid, // commenter
      taskTitle,
      taskid // Task id
    );

    libFunc.sendResponse(res, resp);
  } catch (error) {
    console.error("createComment error:", error);
    libFunc.sendResponse(res, { status: 1, msg: "Something went wrong" });
  }
}

async function updateChecklist(req, res) {
  var taskid = req.data.taskid;
  var checklist = req.data.checklist;

  var sqlquery = `UPDATE ${schema}.tasks SET checklist='${JSON.stringify(
    checklist
  )}' WHERE row_id='${taskid}'`;
  // var resp = await db_query.customQuery(sqlquery, "Checklist Updated");
  // console.log("resp", resp);
  //   resp['status'] = 0;
  // resp['data'] = resp['data'] ?? [];
  // libFunc.sendResponse(res, resp);
  const result = await connect_db.query(sqlquery);
  // console.log("rsult", result.rows)
  if (result.rowCount > 0) {
    const resp = {
      status: 0,
      msg: "Checklist updated successfully",
      data: result.rows, // Return updated task details
    };
    // console.log("response", resp);
    libFunc.sendResponse(res, resp);
  } else {
    const resp = {
      status: 1,
      msg: "No Data found",
    };
    // console.log("response", resp);
    libFunc.sendResponse(res, resp);
  }
}

async function fetchCheckListData(req, res) {
  var checklistids = req.data.checklistids;
  var checklistIds = checklistids.map((item) => `'${item}'`).join(",");
  // Convert checklistIds to array of values for parameterized query
  var sqlquery = `SELECT * FROM ${schema}.checklist WHERE row_id = ANY($1)`;
  var resp = await db_query.customQuery(sqlquery, "Checklist Fetched", [
    checklistids,
  ]);
  resp["status"] = 0;
  resp["data"] = resp["data"] ?? [];
  libFunc.sendResponse(res, resp);
}

async function fetchComments(req, res) {
  // console.log("req", req.data);
  var taskid = req.data.row_id;
  var organizationid = req.data.orgId;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;
  var query = `SELECT cm.row_id, cm.comment, us.name as user_name, cm.cr_on as created_at, cm.attachments as file_path, cm.taskid as task_id
        FROM ${schema}.comments cm
        INNER JOIN ${schema}.users us ON cm.userid = us.row_id
        WHERE cm.taskid = $1 AND us.organizationid = $2
        ORDER BY cm.cr_on DESC
        LIMIT $3 OFFSET $4`;
  //  console.log("query====fetch comments=======");
  //  console.log(query);
  var resp = await db_query.customQuery(query, "Comments Fetched", [
    taskid,
    organizationid,
    limit,
    offset,
  ]);
  resp["status"] = 0;
  resp["data"] = resp["data"] ?? [];

  // console.log("response-->",resp)
  libFunc.sendResponse(res, resp);
}

async function replyOncomments(req, res) {
  var commentid = req.data.comment_id;
  var reply_text = req.data.replycomment;
  var userid = req.data.userId;
  var taskid = req.data.task_id;
  var organizationid = req.data.orgId;
  var tablename = schema + ".comments_replies";

  if (!commentid || !reply_text || !userid || !taskid) {
    const resp = { status: 1, msg: "Missing required fields" };
    // console.log("response of validation ", resp);
    libFunc.sendResponse(res, resp);
  } else {
    var columns = {
      commentid: commentid,
      reply_text: reply_text,
      userid: userid,
      taskid: taskid,
    };
    var resp = await db_query.addData(
      tablename,
      columns,
      req.data.row_id,
      "Comment Reply"
    );
    libFunc.sendResponse(res, resp);
  }
}

async function fetchCommentReplies(req, res) {
  var commentid = req.data.comment_id;
  var organizationid = req.data.orgId;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;
  var userid = req.data.userId;
  var query = `SELECT cr.row_id, cr.reply_text, us.name, cr.cr_on as created_at
        FROM ${schema}.comments_replies cr
        INNER JOIN ${schema}.users us ON cr.userid = us.row_id
        WHERE cr.commentid = $1 AND cr.organizationid = $2
        ORDER BY cr.cr_on DESC
        LIMIT $3 OFFSET $4`;

  var resp = await db_query.customQuery(query, "Comment Replies Fetched", [
    commentid,
    organizationid,
    limit,
    offset,
  ]);
  libFunc.sendResponse(res, resp);
}

/**
 * Task Reports
 */

async function taskReports(req, res) {
  var organizationid = req.data.orgId;
  var userid = req.data.ismember ? req.data.memberid : req.data.userId;
  var month = req.data.month;

  var query = `SELECT 
    COUNT(*) AS receivedtaskscount FROM ${schema}.tasks WHERE assigned_to::text LIKE $1 AND organizationid = $2;`;
  // console.log("query===========");
  // console.log(query);
  var resp2 = await db_query.customQuery(query, "Total Received Tasks", [
    `%${userid}%`,
    organizationid,
  ]);
  var receivedTasksCount = resp2.data[0].receivedtaskscount;
  var query1 = `SELECT count(*) as assignedtaskscount from ${schema}.tasks WHERE assigned_by=$1 AND organizationid=$2 ;`;
  // console.log("query===========");
  // console.log(query1);
  var resp1 = await db_query.customQuery(query1, "Total Assigned Tasks", [
    userid,
    organizationid,
  ]);
  var assignedTasksCount = resp1.data[0].assignedtaskscount;
  var resp = {
    status: 0,
    msg: "Total Tasks Fetched",
    data: {
      receivedTasksCount: receivedTasksCount,
      assignedTasksCount: assignedTasksCount,
    },
  };
  var queryMonth = `SELECT
    count(*) as total_tasks,
    count(*) filter (where active_status='1') as completed_tasks,
    count(*) filter (where active_status='0') as ongoing_tasks,
    count(*) filter (where active_status='2') as overduetasks,
    to_char(cr_on, 'YYYY-MM') as month
FROM ${schema}.tasks
WHERE assigned_by=$1 AND organizationid=$2 AND Date_Trunc('month', cr_on::date) = $3
GROUP BY month
ORDER BY month DESC;`;
  // console.log("query===========");
  // console.log(queryMonth);
  var respMon = await db_query.customQuery(
    queryMonth,
    "Task Completion Rate Monthly",
    [userid, organizationid, month]
  );
  // console.log("response", respMon);
  if (respMon["status"] == 0) {
    var data = respMon.data;
    respMon["data"][0]["completion_rate"] = (
      (parseInt(data[0]["completed_tasks"]) /
        parseInt(data[0]["total_tasks"])) *
      100
    ).toFixed(2);
    // resp['data']['completed_tasks']=data[0]['completed_tasks'];
    // resp['data']['total_tasks']=data[0]['total_tasks'];
    // resp['data']['month']=data[0]['month'];
    resp["data"]["monthlyreport"] = respMon.data;
  }

  // console.log("response", resp);
  libFunc.sendResponse(res, resp);
}

async function totalReceivedAssignedTasks(req, res) {
  var organizationid = req.data.orgId;
  var userid = req.data.userId;
  var query = `SELECT 
    COUNT(*) AS receivedtaskscount FROM ${schema}.tasks WHERE assigned_to::text LIKE $1 AND organizationid = $2 ;`;
  // console.log("query===========");
  // console.log(query);
  var resp2 = await db_query.customQuery(query, "Total Received Tasks", [
    `%${userid}%`,
    organizationid,
  ]);
  var receivedTasksCount = resp2.data[0].receivedtaskscount;
  var query1 = `SELECT count(*) as assignedtaskscount from ${schema}.tasks WHERE assigned_by=$1 AND organizationid=$2 ;`;
  // console.log("query===========");
  // console.log(query1);
  var resp1 = await db_query.customQuery(query1, "Total Assigned Tasks", [
    userid,
    organizationid,
  ]);
  var assignedTasksCount = resp1.data[0].assignedtaskscount;
  var resp = {
    status: 0,
    msg: "Total Tasks Fetched",
    data: {
      receivedTasksCount: receivedTasksCount,
      assignedTasksCount: assignedTasksCount,
    },
  };
  // console.log("response", resp);
  libFunc.sendResponse(res, resp);
}

async function taskCompletionRateMonthly(req, res) {
  var organizationid = req.data.orgId;
  var userid = req.data.userId;
  var query = `SELECT
    count(*) as total_tasks,
    count(*) filter (where active_status='1') as completed_tasks,
    count(*) filter (where active_status='0') as ongoing_tasks,
    count(*) filter (where active_status='2') as overduetasks,
    to_char(cr_on, 'YYYY-MM') as month
FROM ${schema}.tasks
WHERE assigned_by = $1 AND organizationid = $2 AND Date_Trunc('month', cr_on::date) = $3
GROUP BY month
ORDER BY month DESC;`;
  // console.log("query===========");
  // console.log(query);
  var resp = await db_query.customQuery(query, "Task Completion Rate Monthly", [
    userid,
    organizationid,
    req.data.month,
  ]);
  // console.log("response", resp);
  if (resp["status"] == 0) {
    var data = resp.data;
    resp["data"][0]["completion_rate"] = (
      (parseInt(data[0]["completed_tasks"]) /
        parseInt(data[0]["total_tasks"])) *
      100
    ).toFixed(2);
    // resp['data']['completed_tasks']=data[0]['completed_tasks'];
    // resp['data']['total_tasks']=data[0]['total_tasks'];
    // resp['data']['month']=data[0]['month'];
  }

  // console.log("response", resp);
  libFunc.sendResponse(res, resp);
}

/**
 * WorkFlow
 */

async function createWorkflow(req, res) {
  var workflow_name =
    req.data.workFlow_name != undefined
      ? req.data.workFlow_name.trim().replaceAll("'", "`")
      : undefined;
  var description =
    req.data.workFlow_description != undefined
      ? req.data.workFlow_description.trim().replaceAll("'", "`")
      : undefined;
  var userid = req.data.userId;
  var organizationid = req.data.orgId;
  var deptid = req.data.department_id;
  if (
    !workflow_name ||
    !description ||
    !req.data.tasks ||
    req.data.tasks.length == 0
  ) {
    const resp = { status: 1, msg: "Missing required fields" };
    // console.log("response of validation ", resp);
    libFunc.sendResponse(res, resp);
  } else {
    var tasks = JSON.stringify(req.data.tasks).replaceAll("'", "`");
    var taskColumns = {
      organizationid: organizationid,
      workflow_name: workflow_name,
      description: description,
      tasks: tasks,
      userid: userid,
    };
    var tablename = schema + ".workflow";
    var resp = await db_query.addData(
      tablename,
      taskColumns,
      req.data.row_id,
      "Workflow"
    );
    libFunc.sendResponse(res, resp);
  }
}

async function fetchWorkflow(req, res) {
  var organizationid = req.data.orgId;
  var userid = req.data.userId;
  var query = `SELECT * FROM ${schema}.workflow WHERE userid = $1 AND organizationid = $2;`;
  // console.log("query===========");
  // console.log(query);
  var resp = await db_query.customQuery(query, "Workflows Fetched", [
    userid,
    organizationid,
  ]);
  libFunc.sendResponse(res, resp);
}

/**
 * Add Recurring task to tasks table
 */

async function createRecurringAtCreationTime(recurringId) {
  // console.log("createRecurringAtCreationTime --------------", recurringId);
  try {
    const today = new Date();
    const todayStr = today.toDateString();
    const dayOfWeek = today.toLocaleString("default", { weekday: "long" });
    const currentDay = String(today.getDate()).padStart(2, "0");
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
    const todayKey = `${currentDay}-${currentMonth}`; // e.g. "19-09"

    const sqlquery = `
            SELECT *
            FROM ${schema}.recurring_task
            WHERE row_id = $1 AND activestatus = 0;
        `;
    const result = await connect_db.query(sqlquery, [recurringId]);
    if (result.rows.length === 0) return;

    const task = result.rows[0];
    const taskDetails = task.taskdetails;
    const commentdetails = task.commentdetails;
    const schedule = task.schedule_details;
    const reminderSets = schedule.reminder_list ?? [];

    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    for (let set of reminderSets) {
      if (!set || !set.reminder_on) continue;

      let shouldCreate = false;

      if (schedule.type === "Daily") {
        shouldCreate = true;
      } else if (
        schedule.type === "Weekly" &&
        set.reminder_on.includes(dayOfWeek)
      ) {
        shouldCreate = true;
      } else if (
        schedule.type === "Monthly" &&
        set.reminder_on.includes(todayKey)
      ) {
        shouldCreate = true;
      } else if (
        schedule.type === "Yearly" &&
        set.reminder_on.includes(todayKey)
      ) {
        shouldCreate = true;
      }

      if (!shouldCreate) continue;

      // ===== Calculate completion date =====
      let completiondate = new Date();

      if (schedule.type === "Weekly" && set.complete_till) {
        let targetDay = set.complete_till.trim();
        let todayIndex = completiondate.getDay();
        let targetIndex = daysOfWeek.indexOf(targetDay);
        if (targetIndex !== -1) {
          let diff = targetIndex - todayIndex;
          if (diff < 0) diff += 7; // next week
          completiondate.setDate(completiondate.getDate() + diff);
        }
      } else if (schedule.type === "Monthly" && set.complete_till) {
        let targetDate = parseInt(set.complete_till);
        if (!isNaN(targetDate)) {
          let currentMonth = completiondate.getMonth();
          let currentYear = completiondate.getFullYear();
          completiondate = new Date(currentYear, currentMonth, targetDate);
          if (completiondate < today) {
            completiondate = new Date(
              currentYear,
              currentMonth + 1,
              targetDate
            );
          }
        }
      } else if (schedule.type === "Yearly" && set.complete_till) {
        let [day, month] = set.complete_till.split("-").map(Number);
        if (!isNaN(day) && !isNaN(month)) {
          let currentYear = completiondate.getFullYear();
          completiondate = new Date(currentYear, month - 1, day);
          if (completiondate < today) {
            completiondate = new Date(currentYear + 1, month - 1, day);
          }
        }
      } else {
        // fallback to remind_me_before
        const remind_me_before =
          set.remind_me_before?.length > 0
            ? parseInt(set.remind_me_before[0])
            : 1;
        completiondate.setDate(completiondate.getDate() + remind_me_before);
      }

      // console.log("createRecurringAtCreationTime",taskDetails)

      //  Prepare task columns
      let taskColumns = {
        organizationid: taskDetails.organizationid ?? task.organizationid,
        title: taskDetails.title,
        description: taskDetails.description,
        assigned_to: JSON.stringify(taskDetails.assigned_to),
        assigned_by: taskDetails.assigned_by ?? task.created_by,
        checklist: JSON.stringify(taskDetails.checklist),
        completion_date: completiondate.toDateString(),
        task_type: 1,
        recurringid: task.row_id,
        task_category: taskDetails.task_category, // default 0
        task_priority: taskDetails.task_priority, // default Regular
        is_attachment: taskDetails.is_attachment,
      };

      // console.log("taskColumns--------", taskColumns);

      if (!taskColumns.organizationid || !taskColumns.assigned_by) {
        console.warn(
          `Skipping first task creation for ${task.row_id}: Missing organizationid or assigned_by`
        );
        continue;
      }

      const resp = await addTask(
        taskColumns,
        taskDetails.assigned_to,
        taskDetails.assigned_by
      );

      if (
        completiondate.toDateString() !== todayStr &&
        taskDetails.organizationid != "1739861234068_66iA"
      ) {
        await notifyOnWA(
          {
            title: taskDetails.title,
            description: taskDetails.description,
            assignedby: taskDetails.assigned_by,
            completion_date: completiondate.toDateString(),
            organizationid: taskDetails.organizationid,
          },
          taskDetails.assigned_to
        );
      }

      if (commentdetails) {
        const commentColumns = {
          taskid: resp.data.row_id,
          comment: commentdetails.comment,
          userid: commentdetails.userid,
          attachments: JSON.stringify(commentdetails.attachments),
          organizationid: commentdetails.organizationid,
        };
        await db_query.addData(
          schema + ".comments",
          commentColumns,
          commentdetails.row_id,
          "Comment"
        );
      }

      await notifyUser(
        taskDetails.assigned_to,
        taskDetails.assigned_by,
        taskDetails.title,
        resp.data.row_id
      );
    }
  } catch (err) {
    console.error("Error creating first recurring task instance:", err);
  }
}

async function createRecurringAtCreationTimeBulk(recurring_taskids) {
  //  console.log("recurring_taskids", recurring_taskids);
  const today = new Date();
  const dayOfWeek = today.toLocaleString("default", { weekday: "long" }); // e.g. "Monday"
  const customDateSel = `${today.getDate().toString().padStart(2, "0")}-${(
    today.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}`;

  const sqlquery = `
        SELECT * 
        FROM ${schema}.recurring_task
        WHERE row_id = ANY($1) AND activestatus = 0
    `;

  try {
    const result = await connect_db.query(sqlquery, [recurring_taskids]);
    //  console.log("Recurring tasks found:", result.rows);

    if (result.rows.length > 0) {
      for (const task of result.rows) {
        const schedule = task.schedule_details;
        const reminderOnArray = schedule.reminder_list || [];

        //  Find matching reminder object for today
        const matchingReminders = reminderOnArray.filter((rObj) => {
          if (schedule.type === "Weekly") {
            return rObj.reminder_on.includes(dayOfWeek);
          } else if (
            schedule.type === "Monthly" ||
            schedule.type === "Yearly"
          ) {
            return rObj.reminder_on.includes(customDateSel);
          } else if (schedule.type === "Daily") {
            return true; // always create daily tasks
          }
          return false;
        });

        if (matchingReminders.length === 0) continue; // no match, skip task

        for (const reminder of matchingReminders) {
          // Calculate completion date based on remind_me_before
          const remindDays = Array.isArray(reminder.remind_me_before)
            ? reminder.remind_me_before.map((d) => parseInt(d))
            : [1];

          for (const rmb of remindDays) {
            const CURRENT_DATE = new Date();
            const completionDate = new Date(
              CURRENT_DATE.setDate(CURRENT_DATE.getDate() + rmb)
            );

            const taskDetails = task.taskdetails;
            const commentdetails = task.commentdetails;

            const taskColumns = {
              organizationid: taskDetails.organizationid,
              title: taskDetails.title,
              description: taskDetails.description,
              checklist: JSON.stringify(taskDetails.checklist),
              task_type: 1,
              assigned_to: JSON.stringify(taskDetails.assigned_to),
              assigned_by: taskDetails.assigned_by,
              completion_date: completionDate.toDateString(),
              recurringid: task.row_id,
              task_category: taskDetails.task_category, // default 0
              task_priority: taskDetails.task_priority, // default Regular
              is_attachment: taskDetails.is_attachment,
            };

            const resp = await addTask(
              taskColumns,
              taskDetails.assigned_to,
              taskDetails.assigned_by
            );

            if (commentdetails) {
              const commentColumns = {
                taskid: resp.data.row_id,
                comment: commentdetails.comment,
                userid: commentdetails.userid,
                attachments: JSON.stringify(commentdetails.attachments),
                organizationid: commentdetails.organizationid,
              };
              await db_query.addData(
                schema + ".comments",
                commentColumns,
                commentdetails.row_id,
                "Comment"
              );
            }

            await notifyUser(
              taskDetails.assigned_to,
              taskDetails.assigned_by,
              taskDetails.title,
              resp.data.row_id
            );
          }
        }
      }
    }
  } catch (err) {
    console.error("Error during recurring task check:", err);
  }
}

async function checkRecurringTasks() {
  const sqlquery = `WITH today AS (
    SELECT 
        CURRENT_DATE AS dt,
        trim(to_char(CURRENT_DATE, 'Day')) AS day_name,  
        to_char(CURRENT_DATE, 'DD-MM') AS dd_mm          
)
SELECT t.*, rl
FROM prosys.recurring_task t

CROSS JOIN today
CROSS JOIN LATERAL jsonb_array_elements(t.schedule_details->'reminder_list') rl
WHERE t.activestatus = 0 AND  (
    (t.schedule_details->>'type' = 'Daily')

    OR (
        t.schedule_details->>'type' = 'Weekly'
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(rl->'reminder_on') d
            WHERE d = today.day_name
        )
    )
    OR (
        t.schedule_details->>'type' = 'Monthly'
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(rl->'reminder_on') d
            WHERE d = today.dd_mm
        )
    )

    OR (
        t.schedule_details->>'type' = 'Yearly'
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(rl->'reminder_on') d
            WHERE d = today.dd_mm
        )
    )
);
`;
  // const sqlquery = `SELECT * FROM ${schema}.recurring_task WHERE activestatus = 0;`;
  console.log("sqlQuery===============", sqlquery);
  connect_db.query(sqlquery, [], async (err, result) => {
    if (err) {
      console.error("Error fetching recurring tasks:", err);
      return;
    }

    
    await processTaskInBatches(result);
  });
}

async function processTaskInBatches(result) {
  // const today = new Date("2025-11-12"); // For testing
  const today = new Date();
  const dayOfWeek = today.toLocaleString("default", { weekday: "long" });
  const todayDate = today.getDate().toString().padStart(2, "0");
  const todayMonth = (today.getMonth() + 1).toString().padStart(2, "0");
  const todayDM = `${todayDate}-${todayMonth}`; // DD-MM
  const todayStr = today.toDateString();

  console.log("Total tasks process:", result.rows.length);
  const batches = chunkArray(result.rows, 200);
  let totalProcessed = 0;
  for (let j = 0; j < batches.length; j++) {
    async function loop(batchIndex) {
      const batch = batches[batchIndex];
      for (const res of batch) {
        totalProcessed++;
        console.log(
          "Processing task ",
          totalProcessed,
          " of ",
          result.rows.length
        );
        const task = res;
        console.log("task data=====", task);

        const taskDetails = task.taskdetails;
        const type = task.schedule_details?.type ?? "Daily";
        const reminderSets = task.schedule_details?.reminder_list ?? [];
        const commentdetails = task.commentdetails;
        console.log("task===", taskDetails);
        // console.log("reminders======",reminderSets);
        console.log("type=====", type);

        // for (let set of reminderSets) {
        let set = task.rl;
        console.log("rl=============", set);
        if (!set) continue; // skip null/undefined sets

        // SAFETY CHECKS for missing arrays
        const reminders = Array.isArray(set.reminder_on) ? set.reminder_on : [];
        const remindBefore = Array.isArray(set.remind_me_before)
          ? set.remind_me_before
          : [];

        if (reminders.length === 0 && type !== "Daily") {
          // If no reminder dates and not a daily task → skip
          continue;
        }

        let isToday = false;
        let completionDate = new Date(today);
        let remindIndex = 0;

        try {
          switch (type) {
            case "Daily":
              isToday = true;
              remindIndex = 0;
              completionDate = new Date(today);
              break;

            case "Weekly":
              remindIndex = reminders.findIndex((d) => d === dayOfWeek);
              isToday = remindIndex !== -1;
              if (isToday) {
                const remindDays = parseInt(
                  remindBefore[remindIndex] ?? remindBefore[0] ?? 0
                );
                completionDate.setDate(today.getDate() + remindDays);
              }
              break;

            case "Monthly":
              remindIndex = reminders.findIndex((d) => d === todayDM);
              isToday = remindIndex !== -1;
              if (isToday) {
                if (set.complete_till) {
                  const day = parseInt(set.complete_till);
                  const month = today.getMonth();
                  const year = today.getFullYear();
                  completionDate = new Date(year, month, day);
                } else {
                  const remindDays = parseInt(
                    remindBefore[remindIndex] ?? remindBefore[0] ?? 0
                  );
                  completionDate.setDate(today.getDate() + remindDays);
                }
              }
              break;

            case "Yearly":
              remindIndex = reminders.findIndex((d) => d === todayDM);
              isToday = remindIndex !== -1;
              if (isToday) {
                if (set.complete_till) {
                  const [day, month] = set.complete_till.split("-");
                  const year = today.getFullYear();
                  completionDate = new Date(
                    year,
                    parseInt(month) - 1,
                    parseInt(day)
                  );
                } else {
                  const remindDays = parseInt(
                    remindBefore[remindIndex] ?? remindBefore[0] ?? 0
                  );
                  completionDate.setDate(today.getDate() + remindDays);
                }
              }
              break;

            default:
              continue;
          }
        } catch (e) {
          console.error(`Error processing task ${task.row_id}:`, e);
          continue;
        }

        if (!isToday) continue;

        const completionDateStr = completionDate.toISOString().split("T")[0];
        console.log("completiondate=========", completionDateStr);

        try {
          // Check if task already exists
          const existingTaskQuery = `SELECT * FROM ${schema}.tasks WHERE recurringid = $1 AND completion_date = $2`;
          const existingTaskRes = await connect_db.query(existingTaskQuery, [
            task.row_id,
            completionDateStr,
          ]);
          // WhatsApp Notification
          const whatsappTAskDetails = {
            title: taskDetails.title,
            description: taskDetails.description,
            assignedby: taskDetails.assigned_by,
            completion_date: completionDate.toDateString(),
            organizationid: taskDetails.organizationid,
          };

          if (existingTaskRes.rows.length > 0) {
            const existingTask = existingTaskRes.rows[0];
            if (existingTask.active_status === 0) {
              console.log(
                `Reminder: Task already exists for ${taskDetails.title}`
              );
              await notifyUser(
                taskDetails.assigned_to,
                taskDetails.assigned_by,
                taskDetails.title,
                existingTask.row_id
              );
              if (
                completionDate.toDateString() !== todayStr &&
                taskDetails.organizationid != "1739861234068_66iA"
              ) {
                console.log("due date is not today=============");
                await notifyOnWA(whatsappTAskDetails, taskDetails.assigned_to);
              }
            }
            continue;
          }

          // Prepare new task
          const taskColumns = {
            row_id: libFunc.randomid(),
            organizationid: taskDetails.organizationid ?? task.organizationid,
            title: taskDetails.title,
            description: taskDetails.description,
            assigned_to: JSON.stringify(taskDetails.assigned_to),
            assigned_by: taskDetails.assigned_by ?? task.created_by,
            checklist: JSON.stringify(taskDetails.checklist),
            completion_date: completionDateStr,
            task_type: 1,
            recurringid: task.row_id,
            task_category: taskDetails.task_category, // default 0
            task_priority: taskDetails.task_priority, // default Regular
            is_attachment: taskDetails.is_attachment,
          };
          // console.log("taskColumns--------->",taskColumns)

          if (!taskColumns.organizationid || !taskColumns.assigned_by) {
            console.warn(
              `Skipping recurring task ${task.row_id}: Missing organizationid or assigned_by`
            );
            continue;
          }

          const resp = await addTask(
            taskColumns,
            taskDetails.assigned_to,
            taskDetails.assigned_by
          );

          console.log(
            `Created recurring task for ${taskDetails.title} on ${completionDateStr}`
          );

         
          if (
            completionDate.toDateString() !== todayStr &&
            taskDetails.organizationid != "1739861234068_66iA"
          ) {
            console.log("due date is not today======creation=======");
            await notifyOnWA(whatsappTAskDetails, taskDetails.assigned_to);
          }

          // Comment Details Handling
          if (commentdetails) {
            try {
              const commentColumns = {
                taskid: resp.data.row_id,
                comment: commentdetails.comment,
                userid: commentdetails.userid,
                attachments: JSON.stringify(commentdetails.attachments),
                organizationid: commentdetails.organizationid,
              };
              await db_query.addData(
                schema + ".comments",
                commentColumns,
                commentdetails.row_id,
                "Comment"
              );
            } catch (e) {
              console.error("Error inserting comment:", e);
            }
          }

          await notifyUser(
            taskDetails.assigned_to,
            taskDetails.assigned_by,
            taskDetails.title,
            resp.data.row_id
          );
        } catch (e) {
          console.error(`Error creating task for recurring ${task.row_id}:`, e);
        }
        // }
      }
      if (batchIndex < batches.length - 1) {
        //  console.log("Waiting 1 minute before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 60000));
      }
    }
    loop(j);
  }
}
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function checkComplaincesForToday() {
  const today = new Date();
  const dayOfWeek = today.toLocaleString("default", { weekday: "long" }); // e.g., "Monday"
  const month = today.toLocaleString("default", { month: "long" }); // e.g., "October"
  const date = today.getDate(); // e.g., 7
  const formattedTime = today.toTimeString().split(" ")[0]; // Get current time in HH:MM:SS format
  // console.log("Today:", today, "Day of Week:", dayOfWeek, "Month:", month, "Date:", date, "Formatted Time:", formattedTime);
  // // Check if any recurring tasks are due today
  const customDAteSel = `${
    date.toString().length < 2 ? "0" + date.toString() : date.toString()
  }-${
    (today.getMonth() + 1).toString().length < 2
      ? "0" + (today.getMonth() + 1).toString()
      : (today.getMonth() + 1).toString()
  }`;
  // console.log("customDAteSel", customDAteSel);
  const sqlquery = `
SELECT * 
    FROM ${schema}.complaince
    WHERE active_status=0 AND (
        (scheduletype = '0') OR             
        (scheduletype = '1' AND scheduledetails->'reminder_list' @> $1) OR
        (scheduletype = '2' AND scheduledetails->'reminder_list' @> $2) OR
        (scheduletype = '3' AND scheduledetails->'reminder_list' @> $3)
    );
    `;
  const params = [
    JSON.stringify([dayOfWeek]),
    JSON.stringify([customDAteSel]),
    JSON.stringify([customDAteSel]),
  ];
  // console.log("Query:", sqlquery);
  connect_db.query(sqlquery, params, async (err, result) => {
    if (err) {
      console.error("Error during recurring task check:", err);
    } else {
      // console.log("Recurring tasks due today:", result.rows);
      for (var j = 0; j < result.rows.length; j++) {
        // for (const task of result.rows) {
        async function loop(i) {
          var task = result.rows[i];
          const complaincedetails = task.complaincedetails;
          const scheduledetails = task.scheduledetails;
          if (task["organizationid"] != "1739861234068_66iA") {
            await notifyForComplainceonWA(
              complaincedetails,
              task.assignedto,
              task.othernumbers,
              complaincedetails.createdBy
            );
          }
        }
        loop(j);
      }
    }
  });
}
function checkComplaincesAtCreationTime(complainceid) {
  const today = new Date();
  const dayOfWeek = today.toLocaleString("default", { weekday: "long" }); // e.g., "Monday"
  const month = today.toLocaleString("default", { month: "long" }); // e.g., "October"
  const date = today.getDate(); // e.g., 7
  const formattedTime = today.toTimeString().split(" ")[0]; // Get current time in HH:MM:SS format
  // console.log("Today:", today, "Day of Week:", dayOfWeek, "Month:", month, "Date:", date, "Formatted Time:", formattedTime);
  // // Check if any recurring tasks are due today
  const customDAteSel = `${
    date.toString().length < 2 ? "0" + date.toString() : date.toString()
  }-${
    (today.getMonth() + 1).toString().length < 2
      ? "0" + (today.getMonth() + 1).toString()
      : (today.getMonth() + 1).toString()
  }`;
  // console.log("customDAteSel", customDAteSel);
  const sqlquery = `
SELECT * 
    FROM ${schema}.complaince
    WHERE active_status = 0
    AND row_id = $1
    AND (
        (scheduletype = '0') OR
        (scheduletype = '1' AND scheduledetails->'reminder_list' @> $2) OR
        (scheduletype = '2' AND scheduledetails->'reminder_list' @> $3) OR
        (scheduletype = '3' AND scheduledetails->'reminder_list' @> $4)
    );
    `;
  const params = [
    complainceid,
    JSON.stringify([dayOfWeek]),
    JSON.stringify([customDAteSel]),
    JSON.stringify([customDAteSel]),
  ];
  // console.log("Query:", sqlquery);
  connect_db.query(sqlquery, params, async (err, result) => {
    if (err) {
      console.error("Error during recurring task check:", err);
    } else {
      // console.log("Recurring tasks due today:", result.rows);
      for (var j = 0; j < result.rows.length; j++) {
        // for (const task of result.rows) {
        async function loop(i) {
          var task = result.rows[i];
          const complaincedetails = task.complaincedetails;
          const scheduledetails = task.scheduledetails;
          if (task["organizationid"] != "1739861234068_66iA") {
            await notifyForComplainceonWA(
              complaincedetails,
              task.assignedto,
              task.othernumbers,
              complaincedetails.createdBy
            );
          }
        }
        loop(j);
      }
    }
  });
}

async function notifyTaskDueToday(taskdetails, assignedto) {
  var assignedtoNumbers = await getAssignedToNumbers(assignedto);
  var assignedby = await getUserData(taskdetails.assignedby);
  var organizationName = await getOrganizationName(
    taskdetails["organizationid"]
  );
  var othNum;
  // var othNum = ["7878038514"];

  const organizationid = taskdetails.organizationid;

  var allNumbers = [];
  if (othNum != undefined && othNum.length > 0) {
    allNumbers = [...assignedtoNumbers, ...othNum];
  } else {
    allNumbers = assignedtoNumbers;
  }
  //////  console.log("allNumbers", allNumbers);
  for (var j = 0; j < allNumbers.length; j++) {
    async function loop(i) {
      var reNu = allNumbers[i].mobilenumber;
      var reNa = allNumbers[i].name;
      var templateData = {
        templateName: process.env.notifyTaskDueToday,
        // "templateName": "task_due_today_with_mac",
        // "templateName": "task_due_today",
        languageCode: "en",
        variable: [
          taskdetails.title,
          taskdetails.completion_date.toDateString() || "Today",
          taskdetails.description,
          assignedby["name"],
          reNa,
          organizationName,
        ],
      };
      //////  console.log("templateData------------", templateData);
      //////  console.log("reNu------------", reNu);
      var wa_se_ms = await connect_acube24.sendTemplate(reNu, templateData);

      var row_id = libFunc.randomid();

      var others_details = {
        taskdetails: taskdetails,
        assignedto: assignedto,
      };

      var query = `INSERT INTO prosys.whatsapp_log (row_id,mobilenumber, receiver_user, template_name, request_data, response_data, status,others_details,organizationid) 
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
      var resp = await db_query.customQuery(query, "data saved", [
        row_id,
        reNu,
        reNa,
        templateData.templateName,
        JSON.stringify(templateData),
        JSON.stringify(wa_se_ms),
        wa_se_ms?.status || "UNKNOWN",
        JSON.stringify(others_details),
        organizationid,
      ]);

      // var AdreNu = "7878038514";
      // var wa_se_ms = await connect_acube24.sendTemplate(AdreNu, templateData);

      // var id = libFunc.randomid();

      // var query = `INSERT INTO prosys.whatsapp_log (row_id,mobilenumber, receiver_user, template_name, request_data, response_data, status,others_details,organizationid)
      //      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`
      // var resp = await db_query.customQuery(query, "data saved", [id, AdreNu, reNa, templateData.templateName, JSON.stringify(templateData), JSON.stringify(wa_se_ms), wa_se_ms?.status || "UNKNOWN", JSON.stringify(others_details), organizationid]);
    }
    loop(j);
  }
}
// checkRecurringTasks();
async function checkOverdueTasks() {
  try {
    // SQL query to update tasks with negative due_days to "overdue"
    const updateQuery = `
            UPDATE ${schema}.tasks 
            SET active_status = 2
            WHERE (completion_date - CURRENT_DATE) < 0 AND active_status = 0
            RETURNING row_id; -- Return updated rows for confirmation
        `;

    const result = await connect_db.query(updateQuery);
    // console.log("rsult", result.rows)
    // await notifyOverdueTasks(result.rows);
    if (result.rowCount > 0) {
      const resp = {
        status: 0,
        msg: "Overdue tasks updated successfully",
        data: result.rows, // Return updated task details
      };
      // console.log("response", resp);
      // return libFunc.sendResponse(res, resp);
    } else {
      const resp = {
        status: 1,
        msg: "No overdue tasks found",
      };
      // console.log("response", resp);
    }
  } catch (err) {
    console.error("Error updating overdue tasks:", err);
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "An error occurred while updating overdue tasks",
      error: err.message, // Optionally include the error message for debugging
    });
  }
}

function checkDueDateForToday() {
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0]; // Format date as YYYY-MM-DD
  // console.log("Formatted Date:", formattedDate);
  const sqlquery = `
        SELECT *
        FROM ${schema}.tasks
        WHERE completion_date = CURRENT_DATE AND active_status = '0' ;
    `;
  // console.log("Query:", sqlquery);
  connect_db.query(sqlquery, async (err, result) => {
    if (err) {
      console.error("Error during due date check:", err);
    } else {
      // console.log("Tasks due today:", result.rows);
      // for (var j = 0; j < result.rows.length; j++) {
      //     // for (const task of result.rows) {
      //     async function loop(i) {
      //         // var task = result.rows[i];
      //         const taskDetails = result.rows[i];
      //         //////  console.log("Task Details:", taskDetails);
      //         var assignedTo = taskDetails.assigned_to;
      //         var whatsappTAskDetails = {
      //             title: taskDetails.title,
      //             description: taskDetails.description,
      //             assignedby: taskDetails.assigned_by,
      //             completion_date: taskDetails.completion_date,
      //             organizationid: taskDetails.organizationid
      //         }
      //         if (taskDetails["organizationid"] != '1739861234068_66iA') {
      //             await notifyTaskDueToday(whatsappTAskDetails, assignedTo);
      //         }
      //     }
      //     loop(j);
      // }

      await processDueTaskInBatches(result);
    }
  });
}

async function processDueTaskInBatches(result) {
  //  console.log("Total tasks due today to process:", result.rows.length);
  const batches = chunkArray(result.rows, 200);
  let totalProcessed = 0;
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    for (const res of batch) {
      totalProcessed++;
      //  console.log("Processing task ", totalProcessed, " of ", result.rows.length);
      const taskDetails = res;
      //////  console.log("Task Details:", taskDetails);
      var assignedTo = taskDetails.assigned_to;
      var whatsappTAskDetails = {
        title: taskDetails.title,
        description: taskDetails.description,
        assignedby: taskDetails.assigned_by,
        completion_date: taskDetails.completion_date,
        organizationid: taskDetails.organizationid,
      };
      if (taskDetails["organizationid"] != "1739861234068_66iA") {
        await notifyTaskDueToday(whatsappTAskDetails, assignedTo);
      }
    }
    if (batchIndex < batches.length - 1) {
      //  console.log("Waiting 1 minute before next batch...");
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }
}

// checkRecurringTasks();
runCron.runCron(checkRecurringTasks);
// runCron.runCron(checkComplaincesForToday);
runCron.runAt11(checkOverdueTasks);
runCron.runAt11(checkDueDateForToday);

// checkOverdueTasks();
// checkRecurringTasks()

// ------------------------

/**
 * fetch week-days
 */

function fetchalldays(req, res) {
  const organization_id = req.OrganizationId;

  // console.log("OrganizationsId:", organization_id);

  // Use parameterized queries to prevent SQL injection
  const query = `SELECT * FROM ${schema}.days_of_week`;

  // console.log("Query:", query);

  connect_db.query(query, (err, result) => {
    // console.log("result",result.rows)
    if (err) {
      console.error("Error fetching days_name:", err);
      const resp = {
        status: 1,
        msg: "days_name not fetched",
      };
      libFunc.sendResponse(res, resp);
    } else {
      const resp = {
        status: 0,
        msg: "All days_name fetched successfully",
        data: result.rows, // Return all user rows
      };
      // console.log("response ", resp);
      // console.log("response 2",resp.data);
      // console.log("response 3 ",result.rows)
      libFunc.sendResponse(res, resp);
    }
  });
}

/**
 * fetch months name
 */

function fetchallmonths(req, res) {
  const organization_id = req.OrganizationId;

  // console.log("OrganizationsId:", organization_id);

  // Use parameterized queries to prevent SQL injection
  const query = `SELECT * FROM ${schema}.months`;

  // console.log("Query:", query);

  connect_db.query(query, (err, result) => {
    // console.log("result",result.rows)
    if (err) {
      console.error("Error fetching month_name:", err);
      const resp = {
        status: 1,
        msg: "month_name not fetched",
      };
      libFunc.sendResponse(res, resp);
    } else {
      const resp = {
        status: 0,
        msg: "All month_name fetched successfully",
        data: result.rows, // Return all user rows
      };
      // console.log("response ", resp);
      // console.log("response 2",resp.data);
      // console.log("response 3 ",result.rows)
      libFunc.sendResponse(res, resp);
    }
  });
}

/**
 * fetch date
 */

function fetchalldate(req, res) {
  const organization_id = req.OrganizationId;

  // console.log("OrganizationsId:", organization_id);

  // Use parameterized queries to prevent SQL injection
  const query = `SELECT row_id,date_no FROM ${schema}.dates`;

  // console.log("Query:", query);

  connect_db.query(query, (err, result) => {
    // console.log("result",result.rows)
    if (err) {
      console.error("Error fetching dates:", err);
      const resp = {
        status: 1,
        msg: "dates not fetched",
      };
      libFunc.sendResponse(res, resp);
    } else {
      const resp = {
        status: 0,
        msg: "All dates fetched successfully",
        data: result.rows, // Return all user rows
      };
      // console.log("response ", resp);
      // console.log("response 2",resp.data);
      // console.log("response 3 ",result.rows)
      libFunc.sendResponse(res, resp);
    }
  });
}

/**
 * fetch schedule
 */

function fetchallrepeat_schedule(req, res) {
  const organization_id = req.OrganizationId;

  // console.log("OrganizationsId:", organization_id);

  // Use parameterized queries to prevent SQL injection
  const query = `SELECT * FROM ${schema}.repeat_schedule`;

  //////  console.log("Query:", query);

  connect_db.query(query, (err, result) => {
    //////  console.log("result", result.rows)
    if (err) {
      console.error("Error fetching schedule:", err);
      const resp = {
        status: 1,
        msg: "schedule not fetched",
      };
      libFunc.sendResponse(res, resp);
    } else {
      const resp = {
        status: 0,
        msg: "All schedule fetched successfully",
        data: result.rows, // Return all user rows
      };
      // console.log("response ", resp);
      // console.log("response 2",resp.data);
      // console.log("response 3 ",result.rows)
      libFunc.sendResponse(res, resp);
    }
  });
}

/**
 *  download and show file
 */
var fs = require("fs");
const { Console, groupEnd } = require("console");
const { off, title } = require("process");
const { get } = require("http");
const { create } = require("domain");
const { version } = require("os");
const { head } = require("request");

function downloadAndShowbyfilename(req, res) {
  const fpath = "./public/uploads/";
  const filename = req.data.filename; // Assuming filename is passed in req.data

  // Construct the full file path
  const filePath = path.join(fpath, filename);
  // console.log("File path:", filePath);

  // Check if the file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const resp = {
        status: 1,
        msg: "File not found",
        error: err ? err.message : "File does not exist",
      };
      // console.log("Response:", resp);
      return libFunc.sendResponse(res, resp);
    }

    // Instead of downloading, send a success message with file info
    const resp = {
      status: 0,
      msg: "File is ready for download.",
      filePath: filePath, // Provide the path for future use or display
    };
    // console.log("Response:", resp);
    return libFunc.sendResponse(res, resp);
  });
}

// function getTotalCountofTaskCreatedByMe(req, res) {
//     //  console.log("req--", req)
//     var userid = req.data.userId;
//     //As per status - 0 for ongoing, 1 for completed , 2 for overdue, 3 for all
//     var status = req.data.status;

//     // var orgid = '1756191731327_jiOU'
//     var orgid = req.data.orgId;

//     //     var sqlquery = `
//     // SELECT
//     //     SUM(CASE WHEN active_status = 0 THEN 1 ELSE 0 END) AS ongoing_count,
//     //     SUM(CASE WHEN active_status = 1 THEN 1 ELSE 0 END) AS completed_count,
//     //     SUM(CASE WHEN active_status = 2 THEN 1 ELSE 0 END) AS overdue_count,
//     //     COUNT(*) AS total_count,
//     //     SUM(CASE WHEN task_type = '1' THEN 1 ELSE 0 END) AS recurring_count
//     // FROM prosys.tasks
//     // WHERE assigned_by = '${userid}';
//     // `;

//     var sqlquery = `
// SELECT
//     SUM(CASE WHEN active_status = 0 THEN 1 ELSE 0 END) AS ongoing_count,
//     SUM(CASE WHEN active_status = 1 THEN 1 ELSE 0 END) AS completed_count,
//     SUM(CASE WHEN active_status = 2 THEN 1 ELSE 0 END) AS overdue_count,
//     COUNT(*) AS total_count,
//     SUM(CASE WHEN task_type = '1' THEN 1 ELSE 0 END) AS recurring_count
// FROM prosys.tasks
// WHERE organizationid = '${orgid}' and activestatus = 0
// `;

//     //  console.log("sqlquery============");
//     //  console.log(sqlquery);

//     connect_db.query(sqlquery, (err, result) => {
//         if (err) {
//             // console.log(err);
//             return libFunc.sendResponse(res, { status: 1, msg: "Error fetching task count" });
//         }
//         //  console.log("data: result.rows[0]", result.rows[0])
//         return libFunc.sendResponse(res, { status: 0, msg: "Task count fetched successfully", data: result.rows[0] });
//     });
// }

function getTotalCountofTaskCreatedByMe(req, res) {
  // console.log("req----->",req)
  const orgid = req.data.orgId;
  const completion_startDate = req.data.completion_startDate;
  const completion_endDate = req.data.completion_endDate;
  const userDeptId = req.data.depId;
  const role = req.data.user_role;
  const filters = req.data.filters || {};
  const statusFilter = req.data.status;

  //   console.log("statusfilter",statusFilter)

  let params = [orgid];
  let whereClauses = ["ta.organizationid = $1"];

  // ------------------------------
  // STATUS FILTER (Same as fetchTasks)
  // ------------------------------
  let active_status;
  if (!statusFilter) {
    console.log("active_status-------->", statusFilter);
    whereClauses.push("ta.active_status = 0");
  } else {
    const map = { ongoing: 0, complete: 1, overdue: 2 };
    active_status = map[statusFilter.toLowerCase()];
    // console.log("acactive_status------>",active_status)
    if (active_status !== undefined) {
      params.push(active_status);
      whereClauses.push(`ta.active_status = $${params.length}`);
    }
  }

  // ------------------------------
  // COMPLETION DATE
  // ------------------------------
  if (completion_startDate) {
    params.push(completion_startDate);
    whereClauses.push(`ta.completion_date >= $${params.length}`);
  }
  if (completion_endDate) {
    params.push(completion_endDate);
    whereClauses.push(`ta.completion_date <= $${params.length}`);
  }

  if (filters.completion_startDate) {
    params.push(filters.completion_startDate);
    whereClauses.push(`ta.completion_date >= $${params.length}`);
  }

  if (filters.completion_endDate) {
    params.push(filters.completion_endDate);
    whereClauses.push(`ta.completion_date <= $${params.length}`);
  }

  //  TASK PRIORITY FILTER
  if (filters.task_priority) {
    const priorityMap = {
      regular: "0",
      critical: "1",
    };

    const mappedPriority = priorityMap[filters.task_priority.toLowerCase()];

    if (mappedPriority !== undefined) {
      params.push(mappedPriority);
      whereClauses.push(`ta.task_priority = $${params.length}`);
    }
  }

  // TASK CATEGORY (row_id)
  if (filters.task_category?.length) {
    params.push(filters.task_category);
    whereClauses.push(`ta.task_category = ANY($${params.length})`);
  }

  // completed_on filter only when status = completed
  if (active_status === 1) {
    if (filters.task_completed_on_startDate) {
      params.push(filters.task_completed_on_startDate);
      whereClauses.push(`ta.completedon >= $${params.length}`);
    }
    if (filters.task_completed_on_endDate) {
      params.push(filters.task_completed_on_endDate);
      whereClauses.push(`ta.completedon <= $${params.length}`);
    }
  }

  // DEPT PARAM (Push Once)
  let deptIdx = null;
  if (userDeptId !== undefined && userDeptId !== null && userDeptId !== "") {
    params.push(userDeptId);
    deptIdx = params.length;
  }

  // ------------------------------
  // DEPARTMENT FILTER
  // ------------------------------
  if (filters.department_id?.length) {
    params.push(filters.department_id);
    whereClauses.push(`created_by.deptid = ANY($${params.length})`);
  }

  // ------------------------------
  // ASSIGNED TO
  // ------------------------------
  if (filters.assigned_to?.length) {
    params.push(filters.assigned_to);
    whereClauses.push(`
      EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(ta.assigned_to) t(aid)
        WHERE t.aid::text = ANY($${params.length})
      )
    `);
  }

  // ------------------------------
  // ASSIGNED BY
  // ------------------------------
  if (filters.assigned_by?.length) {
    params.push(filters.assigned_by);
    whereClauses.push(`ta.assigned_by = ANY($${params.length})`);
  }

  // ------------------------------
  // TASK TYPE
  // ------------------------------
  if (filters.type) {
    params.push(filters.type.toLowerCase() === "normal" ? "0" : "1");
    whereClauses.push(`ta.task_type = $${params.length}`);
  }

  // ------------------------------
  // FREQUENCY FILTER
  // ------------------------------
  if (filters.frequency) {
    params.push(filters.frequency);
    whereClauses.push(`rt.schedule_details->>'type' = $${params.length}`);
  }

  // ROLE = 2 (Department Admin)
  if (role === 2 && deptIdx) {
    whereClauses.push(`
            (
                created_by.deptid = $${deptIdx}
                OR EXISTS (
                    SELECT 1 
                    FROM jsonb_array_elements_text(ta.assigned_to) t(aid)
                    JOIN ${schema}.users u ON u.row_id = t.aid::text
                    WHERE u.deptid = $${deptIdx}
                )
            )
        `);
  }

  // OUTGOING / INCOMING / INTERNAL LOGIC (ADMIN SAFE)

  if (deptIdx) {
    if (filters.outgoing === true) {
      whereClauses.push(`
                (
                  
                    created_by.deptid IS NULL
                    OR
                    EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements_text(ta.assigned_to) t(aid)
                        JOIN ${schema}.users au ON au.row_id = t.aid::text
                        WHERE au.deptid IS NULL
                    )

                    OR                   
                    (
                        created_by.deptid = $${deptIdx}
                        AND EXISTS (
                            SELECT 1
                            FROM jsonb_array_elements_text(ta.assigned_to) t(aid)
                            JOIN ${schema}.users au ON au.row_id = t.aid::text
                            WHERE au.deptid <> $${deptIdx} AND au.deptid IS NOT NULL
                        )
                    )

                    OR
                   
                    (
                        created_by.deptid <> $${deptIdx} AND created_by.deptid IS NOT NULL
                        AND EXISTS (
                            SELECT 1
                            FROM jsonb_array_elements_text(ta.assigned_to) t(aid)
                            JOIN ${schema}.users au ON au.row_id = t.aid::text
                            WHERE au.deptid = $${deptIdx}
                        )
                    )

                    OR
               
                    (
                        created_by.deptid = $${deptIdx}
                        AND EXISTS (
                            SELECT 1
                            FROM jsonb_array_elements_text(ta.assigned_to) t(aid)
                            JOIN ${schema}.users au ON au.row_id = t.aid::text
                            WHERE au.deptid = $${deptIdx}
                        )
                    )
                )
            `);
    }

    if (filters.outgoing === false && deptIdx) {
      whereClauses.push(`
            (
                -- Admin assigned tasks
                created_by.deptid IS NULL
    
                OR
    
               
                (
                    created_by.deptid <> $${deptIdx} AND created_by.deptid IS NOT NULL
                    AND EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements_text(ta.assigned_to) t(aid)
                        JOIN ${schema}.users au ON au.row_id = t.aid::text
                        WHERE au.deptid = $${deptIdx}
                    )
                )
    
                OR
    
               
                (
                    created_by.deptid = $${deptIdx}
                    AND EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements_text(ta.assigned_to) t(aid)
                        JOIN ${schema}.users au ON au.row_id = t.aid::text
                        WHERE au.deptid = $${deptIdx}
                    )
                )
            )
        `);
    }
  }

  const sqlquery = `
    SELECT 
     SUM(CASE WHEN ta.active_status = 0 THEN 1 ELSE 0 END) AS ongoing_count,
           SUM(CASE WHEN ta.active_status = 1 THEN 1 ELSE 0 END) AS completed_count,
             SUM(CASE WHEN ta.active_status = 2 THEN 1 ELSE 0 END) AS overdue_count,
             COUNT(*) AS total_count,
             SUM(CASE WHEN ta.task_type = '1' THEN 1 ELSE 0 END) AS recurring_count
    FROM ${schema}.tasks ta
    INNER JOIN ${schema}.users created_by ON ta.assigned_by = created_by.row_id
    LEFT JOIN ${schema}.recurring_task rt ON ta.recurringid = rt.row_id
    WHERE ${whereClauses.join(" AND ")}
      AND created_by.activestatus = 0
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(ta.assigned_to) t(aid)
        JOIN ${schema}.users u ON u.row_id = t.aid::text
        WHERE u.activestatus = 0
      )
  `;

  connect_db.query(sqlquery, params, (err, result) => {
    // console.log("result",result.rows)
    if (err) {
      console.error("Error fetching task count:", err);
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Error fetching task count",
      });
    }

    // console.log("count", result.rows[0]);
    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Task count fetched successfully",
      data: result.rows[0],
    });
  });
}

/**
 * ACUBE 24 Webhook REplies
 */
function getAssignedToUsers(mobileno) {
  return new Promise(function (resolve, reject) {
    var sqlquery = `SELECT row_id as userid, organizationid, name FROM prosys.users WHERE mobilenumber = $1;`;
    connect_db.query(sqlquery, [mobileno], (err, result) => {
      if (err) {
        // console.log(err);
        resolve(false);
      } else {
        // console.log(result.rows);
        if (result.rows.length > 0) {
          resolve(result.rows[0]);
        } else {
          resolve(false);
        }
      }
    });
  });
}
function getAssignedByData(name, organizationid) {
  return new Promise(function (resolve, reject) {
    var sqlquery = `SELECT row_id as userid, name FROM prosys.users WHERE name = $1 AND organizationid = $2;`;
    connect_db.query(sqlquery, [name, organizationid], (err, result) => {
      if (err) {
        // console.log(err);
        resolve(false);
      } else {
        // console.log(result.rows);
        if (result.rows.length > 0) {
          resolve(result.rows[0]);
        } else {
          resolve(false);
        }
      }
    });
  });
}

function updateTaskStatusThroughTemplate(
  userid,
  assignedbyid,
  duedate,
  tasktitle,
  taskdescription,
  organizationid
) {
  return new Promise(function (resolve, reject) {
    var sqlquery = `UPDATE prosys.tasks SET active_status = 1
    WHERE title = $1 AND description = $2 AND completion_date = $3
    AND assigned_to::text LIKE $4 AND organizationid = $5 AND assigned_by = $6;`;

    const params = [
      tasktitle,
      taskdescription,
      duedate,
      `%${userid}%`,
      organizationid,
      assignedbyid,
    ];

    connect_db.query(sqlquery, params, (err, result) => {
      if (err) {
        // console.log(err);
        resolve(false);
      } else {
        ////  console.log(result);
        resolve(result.rowCount > 0);
      }
    });
  });
}

async function markAsDone(tasktemplateData, mobileno, res) {
  var tasktitle = tasktemplateData[0]["parameters"][0]["text"];
  const dateStr = tasktemplateData[0]["parameters"][1]["text"];
  var taskdescription = tasktemplateData[0]["parameters"][2]["text"];
  var assignedby = tasktemplateData[0]["parameters"][3]["text"];
  var assignedtoUser = await getAssignedToUsers(mobileno);
  var organizationid = assignedtoUser["organizationid"];
  var userid = assignedtoUser["userid"];
  var username = assignedtoUser["name"];
  const dateObj = new Date(dateStr);

  const formattedDate =
    dateObj.getFullYear() +
    "-" +
    String(dateObj.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(dateObj.getDate()).padStart(2, "0");

  var assignedbyid;
  if (username == assignedby) {
    assignedbyid = userid;
  } else {
    var assignedTOid = await getAssignedByData(assignedby, organizationid);
    assignedbyid = assignedTOid["userid"];
  }

  var taskdetails = await updateTaskStatusThroughTemplate(
    userid,
    assignedbyid,
    formattedDate,
    tasktitle,
    taskdescription,
    organizationid
  );
  // console.log("Taskdetails=======pm2 start

  res.status(200).json({
    message: "Done",
    status: taskdetails,
  });
}
var tempData = [
  {
    type: "body",
    parameters: [
      {
        type: "text",
        text: "Testing on sending whatsapp",
      },
      {
        type: "text",
        text: "Tue Jul 29 2025",
      },
      {
        type: "text",
        text: "recurring task send on whatsapp",
      },
      {
        type: "text",
        text: "Aafreen Ali",
      },
    ],
  },
];

// markAsDone(tempData,'7742529160');

/**
 * Task Updation By Admin
 */

function getUserRole(userid) {
  return new Promise((resolve, reject) => {
    var sqlquery = `SELECT role FROM prosys.users WHERE row_id='${userid}';`;
    connect_db.query(sqlquery, (err, result) => {
      if (err) {
        // console.log(err);
        resolve(false);
      } else {
        // console.log(result.rows);
        if (result.rows.length > 0) {
          resolve(result.rows[0].role);
        } else {
          resolve(false);
        }
      }
    });
  });
}

async function updateTask(req, res) {
  // console.log(req.data);
  var userid = req.data.userId;
  var organizationid = req.data.orgId;
  var userRole = await getUserRole(userid);
  if (userRole != 0) {
    //User is admin/dept admin
    var taskRowid = req.data.row_id;
    var title =
      req.data.title != undefined
        ? req.data.title.trim().replaceAll("'", "`")
        : undefined;
    var description =
      req.data.description != undefined
        ? req.data.description.trim().replaceAll("'", "`")
        : undefined;
    var completion_date = req.data.completion_date;
    var checklistid = req.data.checklist;
    var assigned_to = req.data.assigned_to;
    var assigned_by =
      req.data.assignedby != null ? req.data.assignedby : userid;

    var task_category = req.data.task_category ?? 0; // Non-mandatory, allows custom
    var task_priority = req.data.task_priority ?? 0; // Default = Regular
    var is_attachmentCompulsory = req.data.is_attachmentCompulsory ?? false;

    if (
      !title ||
      !description ||
      !completion_date ||
      !userid ||
      !assigned_to ||
      !assigned_by
    ) {
      var resp = {
        status: 1,
        msg: "Missing Required fields",
      };
      libFunc.sendResponse(res, resp);
    } else {
      var taskColumns = {
        title: title,
        description: description,
        completion_date: completion_date,
        checklist: JSON.stringify(checklistid),
        assigned_to: JSON.stringify(assigned_to),
        assigned_by: assigned_by,
        task_category: task_category, // default 0
        task_priority: task_priority, // default Regular
        is_attachment: is_attachmentCompulsory,
      };

      if (req.data.commentdetails != undefined) {
        var commentdetails = req.data.commentdetails;
        var commentColumns = {
          comment: commentdetails.comment,
          userid: userid,
          attachments: commentdetails.file_path,
          organizationid: organizationid,
        };
      }
      if (!req.data.is_recurring) {
        var tablename = schema + ".tasks";
        var resp = await db_query.addData(
          tablename,
          taskColumns,
          taskRowid,
          "Task"
        );
        if (req.data.commentdetails != undefined) {
          commentColumns.taskid = taskRowid;
          var commentRowid;
          if (req.data.commentdetails.row_id != undefined) {
            commentRowid = req.data.commentdetails.row_id;
          }
          commentColumns.attachments = JSON.stringify(
            commentColumns.attachments
          );
          var tablename1 = schema + ".comments";
          var resp11 = await db_query.addData(
            tablename1,
            commentColumns,
            commentRowid,
            "Comment"
          );
        }
        var resptobesend = {
          status: 0,
          msg: "Task updated successfully",
        };
        var whatsappTAskDetails = {
          title: title,
          description: description,
          completion_date: completion_date,
          organizationid: organizationid,
          assignedby: userid,
        };
        if (organizationid != "1739861234068_66iA") {
          await notifyOnWA(whatsappTAskDetails, req.data.assigned_to);
        }
        // console.log("response of task updation ", resptobesend);
        libFunc.sendResponse(res, resptobesend);
      } else {
        if (req.data.repeat_schedule == undefined) {
          const resp = { status: 1, msg: "Missing required fields" };
          // console.log("response of validation ", resp);
          libFunc.sendResponse(res, resp);
        } else {
          // var repeat_schedule = req.data.repeat_schedule;
          // var repeat_time = req.data.repeat_time;
          // var reminder_on = req.data.reminder_on;
          // var months = req.data.months;
          // var customdates = req.data.customdates;
          // var date = req.data.date;
          // var remind_me_before = req.data.remind_me_before;
          // var complete_till = req.data.complete_till;
          // var schedule_type = repeat_schedule == 'Daily' ? 0 : repeat_schedule == 'Weekly' ? 1 : repeat_schedule == 'Monthly' ? 2 : repeat_schedule == 'Yearly' ? 3 : undefined;
          // var schedule_details = {
          //     "type": repeat_schedule,

          //     "reminder_on": reminder_on,//previously it was days
          //     "complete_till": complete_till,
          //     "remind_me_before": remind_me_before ?? "1"

          // }
          // taskColumns.assigned_to = (req.data.assigned_to);
          // taskColumns.checklist = checklistid;
          // var recurringColumns = {

          //     "organizationid": organizationid,
          //     taskdetails: JSON.stringify(taskColumns),
          //     schedule_details: JSON.stringify(schedule_details),
          //     schedule_type: schedule_type,
          //     commentdetails: JSON.stringify(commentColumns),
          // }
          // var tablename = schema + '.recurring_task';
          // var resp = await db_query.addData(tablename, recurringColumns, req.data.row_id, "Recurring Task");
          // await createRecurringAtCreationTime(resp.data.row_id);
          // libFunc.sendResponse(res, resp);

          var repeat_schedule = req.data.repeat_schedule;
          var repeat_time = req.data.repeat_time;
          var reminder_list = req.data.reminder_list;
          var months = req.data.months;
          var customdates = req.data.customdates;
          var date = req.data.date;
          var remind_me_before = req.data.remind_me_before;
          var complete_till = req.data.complete_till;

          //  Convert reminder_on to object-array format
          let reminderObjects = [];

          if (repeat_schedule === "Daily") {
            reminderObjects = (reminder_list || [{}]).map(() => ({
              reminder_on: [],
            }));
          } else if (repeat_schedule === "Weekly") {
            reminderObjects = (reminder_list || []).map((reminder) => ({
              reminder_on: reminder.reminder_on || [],
              complete_till: reminder.complete_till || null,
              remind_me_before: reminder.remind_me_before || [],
            }));
          } else if (
            repeat_schedule === "Monthly" ||
            repeat_schedule === "Yearly"
          ) {
            reminderObjects = (reminder_list || []).map((reminder) => ({
              reminder_on: reminder.reminder_on || [],
              complete_till: reminder.complete_till || null,
              remind_me_before: reminder.remind_me_before || [],
            }));
          }

          var schedule_type =
            repeat_schedule == "Daily"
              ? 0
              : repeat_schedule == "Weekly"
              ? 1
              : repeat_schedule == "Monthly"
              ? 2
              : repeat_schedule == "Yearly"
              ? 3
              : undefined;

          var schedule_details = {
            type: repeat_schedule,
            reminder_list: reminderObjects,
          };

          taskColumns.assigned_to = req.data.assigned_to;
          taskColumns.checklist = checklistid;

          var recurringColumns = {
            organizationid: organizationid,
            taskdetails: JSON.stringify(taskColumns),
            schedule_details: JSON.stringify(schedule_details),
            schedule_type: schedule_type,
            commentdetails: JSON.stringify(commentColumns),
          };

          var tablename = schema + ".recurring_task";
          var resp = await db_query.addData(
            tablename,
            recurringColumns,
            req.data.row_id,
            "Recurring Task"
          );

          //  Re-create occurrences after update
          await createRecurringAtCreationTime(resp.data.row_id);

          libFunc.sendResponse(res, resp);
        }
      }
    }
  } else {
    //User is normal user
    var resp = {
      status: 1,
      msg: "Don't have permission to update this task",
    };

    libFunc.sendResponse(res, resp);
  }
}

async function updateRecurringTaskTemplate(req, res) {
  // console.log("reqesting---", req.data)

  var userid = req.data.userId;
  var organizationid = req.data.orgId;
  var userRole = await getUserRole(userid);
  if (userRole != 0) {
    //User is admin/dept admin
    var taskRowid = req.data.row_id;
    var title =
      req.data.title != undefined
        ? req.data.title.trim().replaceAll("'", "`")
        : undefined;
    var description =
      req.data.description != undefined
        ? req.data.description.trim().replaceAll("'", "`")
        : undefined;
    var completion_date = req.data.completion_date;
    var checklistid = req.data.checklist;
    var assigned_to = req.data.assigned_to;
    var orgId = req.data.orgId;
    var assigned_by =
      req.data.assignedby != null ? req.data.assignedby : userid;

    var task_category = req.data.task_category ?? 0; // Non-mandatory, allows custom
    var task_priority = req.data.task_priority ?? 0; // Default = Regular
    var is_attachmentCompulsory = req.data.is_attachmentCompulsory ?? false;

    if (
      !title ||
      !description ||
      !userid ||
      !assigned_to ||
      !assigned_by ||
      !req.data.repeat_schedule
    ) {
      var resp = {
        status: 1,
        msg: "Missing Required fields",
      };
      libFunc.sendResponse(res, resp);
    } else {
      var taskColumns = {
        title: title,
        description: description,
        completion_date: completion_date,
        checklist: JSON.stringify(checklistid),
        assigned_to: JSON.stringify(assigned_to),
        assigned_by: assigned_by,
        organizationid: orgId,
        task_category: task_category, // default 0
        task_priority: task_priority, // default Regular
        is_attachment: is_attachmentCompulsory,
      };

      if (req.data.commentdetails != undefined) {
        var commentdetails = req.data.commentdetails;
        var commentColumns = {
          comment: commentdetails.comment,
          userid: userid,
          attachments: commentdetails.file_path,
          organizationid: organizationid,
        };
      }

      // var repeat_schedule = req.data.repeat_schedule;
      // var reminder_on = req.data.reminder_on;
      // var remind_me_before = req.data.remind_me_before;
      // var complete_till = req.data.complete_till;
      // var schedule_type = repeat_schedule == 'Daily' ? 0 : repeat_schedule == 'Weekly' ? 1 : repeat_schedule == 'Monthly' ? 2 : repeat_schedule == 'Yearly' ? 3 : undefined;
      // var schedule_details = {
      //     "type": repeat_schedule,

      //     "reminder_on": reminder_on,//previously it was days
      //     "complete_till": complete_till,
      //     "remind_me_before": remind_me_before ?? "1"

      // }
      // taskColumns.assigned_to = (req.data.assigned_to);
      // taskColumns.checklist = checklistid;
      // var recurringColumns = {

      //     taskdetails: JSON.stringify(taskColumns),
      //     schedule_details: JSON.stringify(schedule_details),
      //     schedule_type: schedule_type,
      //     commentdetails: JSON.stringify(commentColumns),
      // }
      // var tablename = schema + '.recurring_task';
      // var resp = await db_query.addData(tablename, recurringColumns, taskRowid, "Recurring Task");
      // console.log("resp---",resp)
      // await createRecurringAtCreationTime(resp.data.row_id);
      // libFunc.sendResponse(res, resp);

      var repeat_schedule = req.data.repeat_schedule;
      var reminder_list = req.data.reminder_list;
      var remind_me_before = req.data.remind_me_before;
      var complete_till = req.data.complete_till;

      //  Convert reminder_on to object-array format
      let reminderObjects = [];
      if (repeat_schedule === "Daily") {
        reminderObjects = (reminder_list || [{}]).map(() => ({
          reminder_on: [],
          complete_till: null,
          remind_me_before: ["0"],
        }));
      } else if (repeat_schedule === "Weekly") {
        reminderObjects = (reminder_list || []).map((reminder) => ({
          reminder_on: reminder.reminder_on || [],
          complete_till: reminder.complete_till || null,
          remind_me_before: reminder.remind_me_before || [],
        }));
      } else if (
        repeat_schedule === "Monthly" ||
        repeat_schedule === "Yearly"
      ) {
        reminderObjects = (reminder_list || []).map((reminder) => ({
          reminder_on: reminder.reminder_on || [],
          complete_till: reminder.complete_till || null,
          remind_me_before: reminder.remind_me_before || [],
        }));
      }

      var schedule_type =
        repeat_schedule == "Daily"
          ? 0
          : repeat_schedule == "Weekly"
          ? 1
          : repeat_schedule == "Monthly"
          ? 2
          : repeat_schedule == "Yearly"
          ? 3
          : undefined;

      var schedule_details = {
        type: repeat_schedule,
        reminder_list: reminderObjects,
      };

      taskColumns.assigned_to = req.data.assigned_to;
      taskColumns.checklist = checklistid;

      var recurringColumns = {
        taskdetails: JSON.stringify(taskColumns),
        schedule_details: JSON.stringify(schedule_details),
        schedule_type: schedule_type,
        commentdetails: JSON.stringify(commentColumns),
      };

      var tablename = schema + ".recurring_task";
      var resp = await db_query.addData(
        tablename,
        recurringColumns,
        taskRowid,
        "Recurring Task"
      );
      // console.log("taskRowid",resp.data.row_id)

      await createRecurringAtCreationTime(resp.data.row_id);
      libFunc.sendResponse(res, resp);
    }
  } else {
    //User is normal user
    var resp = {
      status: 1,
      msg: "Don't have permission to update this task",
    };

    libFunc.sendResponse(res, resp);
  }
}

/**
 * Bulk Task Import
 * 
 * 

 */

// ================= REMINDER VALIDATION HELPERS =================
// const VALID_SCHEDULES = ["Daily", "Weekly", "Monthly", "Yearly"];

// const WEEK_DAYS = [
//   "monday",
//   "tuesday",
//   "wednesday",
//   "thursday",
//   "friday",
//   "saturday",
//   "sunday",
// ];

// ================= VALID CONSTANTS =================
const VALID_SCHEDULES = ["Daily", "Weekly", "Monthly", "Yearly"];
const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// ------------------- UTILITY FUNCTIONS -------------------

// Normalize repeat_schedule: "weekly" or "WEEKLY" -> "Weekly"
function normalizeSchedule(schedule) {
  if (!schedule) return "";
  const lower = schedule.toString().trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// Normalize weekday: "monday" or "MONDAY" -> "Monday"
function normalizeWeekday(day) {
  if (!day) return "";
  const lower = day.toString().trim().toLowerCase();
  if (!WEEK_DAYS.includes(lower)) return null;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// Validate phone number
function isValidNumber(num) {
  if (!num) return false;
  const trimmed = num.toString().trim();
  return /^\d{10}$/.test(trimmed);
}

// Validate date in DD-MM format
function isValidDDMM(dateStr) {
  if (!dateStr) return false;
  const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])$/;
  return dateRegex.test(dateStr);
}

// ------------------- SINGLE TASK VALIDATION -------------------
function validateSingleTask(task) {
  // --- TITLE ---
  if (typeof task.title !== "string" || task.title.trim().length < 3) {
    return { valid: false, reason: "Invalid title" };
  }

  // --- REPEAT SCHEDULE ---
  const schedule = normalizeSchedule(task.repeat_schedule);
  if (!VALID_SCHEDULES.includes(schedule) && task.is_recurring) {
    return { valid: false, reason: "Invalid repeat_schedule" };
  }
  task.repeat_schedule = schedule; // normalize

  // --- RECURRING TASK CHECK ---
  if (task.is_recurring === true) {
    if (!Array.isArray(task.reminderList) || task.reminderList.length === 0) {
      return {
        valid: false,
        reason: "reminderList required for recurring task",
      };
    }

    for (const r of task.reminderList) {
      // remind_me_before validation
      if (
        !Array.isArray(r.remind_me_before) ||
        r.remind_me_before.length === 0
      ) {
        return { valid: false, reason: "Invalid remind_me_before" };
      }
      for (const num of r.remind_me_before) {
        const n = Number(num);
        if (isNaN(n) || n < 0) {
          return {
            valid: false,
            reason: "remind_me_before must be positive number",
          };
        }
      }

      // --- COMPLETE_TILL VALIDATION ---
      if (schedule === "Weekly") {
        const day = normalizeWeekday(r.complete_till);
        if (!day) {
          return {
            valid: false,
            reason:
              "For Weekly tasks, complete_till must be a weekday (Monday-Sunday)",
          };
        }
        r.complete_till = day;

        // Normalize reminder_on array for weekly
        if (!Array.isArray(r.reminder_on) || r.reminder_on.length === 0) {
          return {
            valid: false,
            reason: "reminder_on required for Weekly task",
          };
        }
        const normalizedReminders = [];
        for (let wd of r.reminder_on) {
          const nd = normalizeWeekday(wd);
          if (!nd)
            return {
              valid: false,
              reason: "reminder_on contains invalid weekday",
            };
          normalizedReminders.push(nd);
        }
        r.reminder_on = normalizedReminders;
      }

      if (schedule === "Monthly") {
        const day = Number(r.complete_till);
        if (isNaN(day) || day < 1 || day > 31) {
          return {
            valid: false,
            reason: "For Monthly tasks, complete_till must be between 1 to 31",
          };
        }
        r.complete_till = day;

        // reminder_on: normalize DD-MM strings
        if (!Array.isArray(r.reminder_on)) r.reminder_on = [];
        const normalizedReminders = [];
        for (let d of r.reminder_on) {
          const str = d.toString().padStart(5, "0"); // e.g., 6-1 -> "06-01"
          if (!isValidDDMM(str))
            return {
              valid: false,
              reason: "reminder_on contains invalid date for Monthly task",
            };
          normalizedReminders.push(str);
        }
        r.reminder_on = normalizedReminders;
      }

      if (schedule === "Yearly") {
        if (!isValidDDMM(r.complete_till)) {
          return {
            valid: false,
            reason: "For Yearly tasks, complete_till must be in DD-MM format",
          };
        }

        // Normalize reminder_on for Yearly
        if (!Array.isArray(r.reminder_on)) r.reminder_on = [];
        const normalizedReminders = [];
        for (let d of r.reminder_on) {
          const str = d.toString().padStart(5, "0"); // e.g., 1-2 -> 01-02
          if (!isValidDDMM(str))
            return {
              valid: false,
              reason: "reminder_on contains invalid date for Yearly task",
            };
          normalizedReminders.push(str);
        }
        r.reminder_on = normalizedReminders;
      }
    }
  } else {
    // Non-recurring task must have completion_date
    if (!task.completion_date) {
      return {
        valid: false,
        reason: "completion_date is required for non-recurring task",
      };
    }
  }

  return { valid: true };
}

// ------------------- BULK TASK VALIDATION -------------------
async function validateUsers(importedTasks, organizationid) {
  const validTasks = [];
  const invalidTasks = [];

  // -----------------------------
  // Example: category map fetch
  // -----------------------------
  const categoryMap = await getAllTaskCategoriesMap(organizationid);

  const allNumbers = new Set();
  for (const task of importedTasks) {
    if (task.assignedby) allNumbers.add(task.assignedby.trim());
    if (Array.isArray(task.assigned_to))
      task.assigned_to.forEach((num) => {
        if (num) allNumbers.add(num.trim());
      });
  }

  // Query DB for existing numbers
  let existingNumbers = [];
  if (allNumbers.size > 0) {
    const numberList = [...allNumbers].map((n) => `'${n}'`).join(",");
    const query = `SELECT mobilenumber FROM ${schema}.users WHERE mobilenumber IN (${numberList}) AND organizationid = '${organizationid}'`;
    const result = await connect_db.query(query);
    existingNumbers = result.rows.map((r) => r.mobilenumber);
  }

  for (const task of importedTasks) {
    // --- CATEGORY VALIDATION ---
    if (task.task_category) {
      const key = task.task_category.trim().toLowerCase();
      if (!categoryMap[key]) {
        invalidTasks.push({ ...task, reason: "Invalid task category" });
        continue;
      }
    }

    // --- ASSIGNED BY VALIDATION ---
    if (!isValidNumber(task.assignedby)) {
      invalidTasks.push({ ...task, reason: "Invalid assignedby phone number" });
      continue;
    }
    if (!existingNumbers.includes(task.assignedby)) {
      invalidTasks.push({ ...task, reason: "assignedby not found in DB" });
      continue;
    }

    // --- ASSIGNED TO VALIDATION ---
    if (!Array.isArray(task.assigned_to) || task.assigned_to.length === 0) {
      invalidTasks.push({ ...task, reason: "assigned_to is required" });
      continue;
    }

    let assignedToInvalid = false;
    for (let num of task.assigned_to) {
      if (!isValidNumber(num) || !existingNumbers.includes(num)) {
        invalidTasks.push({
          ...task,
          reason: `assigned_to ${num} invalid or not found in DB`,
        });
        assignedToInvalid = true;
        break;
      }
    }
    if (assignedToInvalid) continue;

    // --- SINGLE TASK VALIDATION ---
    const result = validateSingleTask(task);
    if (!result.valid) {
      invalidTasks.push({ ...task, reason: result.reason });
      continue;
    }

    // Task is valid
    validTasks.push(task);
  }

  return { validTasks, invalidTasks };
}

// ------------------- BULK IMPORT HANDLING -------------------
async function bulkTaskImport(req, res) {
  const importedTasks = req.data.importedTasks;
  const userid = req.data.userId;
  const organizationid = req.data.orgId;

  if (!importedTasks || importedTasks.length === 0) {
    return libFunc.sendResponse(res, { status: 1, msg: "No tasks to import" });
  }

  const { validTasks, invalidTasks } = await validateUsers(
    importedTasks,
    organizationid
  );

  // Insert valid tasks into DB
  let importSuccess = false;
  if (validTasks.length > 0) {
    importSuccess = await bulkImportPreperation(validTasks, organizationid);
  }

  // Save import history
  const rowId = libFunc.randomid();
  const historyQuery = `
        INSERT INTO prosys.imported_task_history
        (row_id, organizationid, validTasks, invalidTasks, validcount, invalidcount)
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
    `;
  await db_query.customQuery(historyQuery, "insert import history", [
    rowId,
    organizationid,
    JSON.stringify(validTasks),
    JSON.stringify(invalidTasks),
    validTasks.length,
    invalidTasks.length,
  ]);

  // --- RESPONSE ---
  if (invalidTasks.length > 0 || !importSuccess) {
    const reasons = [...new Set(invalidTasks.map((t) => t.reason))];
    let msg = importSuccess ? "" : "Failed to insert valid tasks into DB";
    if (reasons.length === 1) msg = reasons[0];
    else if (reasons.length > 1)
      msg = "Some tasks could not be imported (" + reasons.join(", ") + ")";

    let a = {
      status: 1,
      msg,
      invalidTasks,
      validTasks,
      validTasksCount: validTasks.length,
      invalidTasksCount: invalidTasks.length,
    };

    console.log("a---->", a);
    return libFunc.sendResponse(res, a);
  }

  let b = {
    status: 0,
    msg: "Bulk import successful",
    validTasks,
    validTasksCount: validTasks.length,
  };
  console.log("b----->", b);
  return libFunc.sendResponse(res);
}

// async function bulkTaskImport(req, res) {
//   // console.log("requesting bulk task---",req.data.importedTasks)
//   var userid = req.data.userId;
//   var organizationid = req.data.orgId;
//   var importedTasks = req.data.importedTasks;
//   // console.log("importedTasks=============");
//   // console.log(JSON.stringify(importedTasks));
//   if (importedTasks.length === 0) {
//     libFunc.sendResponse(res, { status: 1, msg: "No tasks to import" });
//     return;
//   } else {
//     const { validTasks, invalidTasks } = await validateUsers(
//       importedTasks,
//       organizationid
//     );

//     //  Insert valid tasks if any
//     if (validTasks.length > 0) {
//       await bulkImportPreperation(validTasks, organizationid);
//     }

//     const rowId = libFunc.randomid();
//     const historyQuery = `
//             INSERT INTO prosys.imported_task_history
//             (row_id, organizationid,validTasks,invalidTasks, validcount, invalidcount)
//             VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
//         `;
//     await db_query.customQuery(historyQuery, "insert import history", [
//       rowId,
//       organizationid,
//       JSON.stringify(validTasks),
//       JSON.stringify(invalidTasks),
//       validTasks.length,
//       invalidTasks.length,
//     ]);

//     //  If some invalid tasks
//     if (invalidTasks.length > 0) {
//       // Collect unique reasons
//       const reasons = [...new Set(invalidTasks.map((t) => t.reason))];

//       // Build dynamic message
//       let msg = "";
//       if (reasons.length === 1) {
//         msg = reasons[0]; // e.g. "Invalid phone number format"
//       } else {
//         msg = "Some tasks could not be imported (" + reasons.join(", ") + ")";
//       }

//       let data_msg = {
//         status: 1,
//         msg,
//         invalidTasks,
//         validTasks,
//         validTasksCount: validTasks.length,
//         invalidTasksCount: invalidTasks.length,
//       };
//       console.log("data msg-", data_msg);
//       return libFunc.sendResponse(res, data_msg);
//     }

//     //  All good
//     let msg_show = {
//       status: 0,
//       msg: "Bulk import successful",
//       validTasks,
//       validTasksCount: validTasks.length,
//     };
//     console.log("data ", msg_show);
//     return libFunc.sendResponse(res, msg_show);
//   }

// }

// async function validateUsers(importedTasks, organizationid) {
//   // -----------------------------
//   // Fetch all categories once
//   // -----------------------------
//   const categoryMap = await getAllTaskCategoriesMap(organizationid);

//   const allNumbers = new Set();

//   for (const task of importedTasks) {
//     if (task.assignedby) allNumbers.add(task.assignedby.trim());
//     if (Array.isArray(task.assigned_to)) {
//       task.assigned_to.forEach((num) => {
//         if (num) allNumbers.add(num.trim());
//       });
//     }
//   }

//   // -----------------------------
//   // Fetch all existing users once
//   // -----------------------------
//   let existingNumbers = [];
//   if (allNumbers.size > 0) {
//     const numberList = [...allNumbers].map((n) => `'${n}'`).join(",");
//     const query = `
//             SELECT mobilenumber
//             FROM ${schema}.users
//             WHERE mobilenumber IN (${numberList})
//               AND organizationid = '${organizationid}'
//         `;
//     const result = await connect_db.query(query);
//     existingNumbers = result.rows.map((r) => r.mobilenumber);
//   }

//   const validTasks = [];
//   const invalidTasks = [];

//   // -----------------------------
//   // Phone number validator
//   // -----------------------------
//   const isValidNumber = (num) => {
//     if (!num) return false;
//     const trimmed = num.trim();
//     return /^\d{10}$/.test(trimmed);
//   };

//   for (const task of importedTasks) {
//     // -----------------------------
//     // TASK CATEGORY VALIDATION
//     // -----------------------------
//     let categoryRowId = null;
//     if (task.task_category) {
//       const key = task.task_category.trim().toLowerCase();
//       categoryRowId = categoryMap[key];

//       if (!categoryRowId) {
//         invalidTasks.push({
//           title: task.title,
//           description: task.description,
//           assignedby: task.assignedby,
//           assigned_to: task.assigned_to,
//           task_category: task.task_category,
//           reason: "Invalid task category",
//         });
//         continue;
//       }
//     }

//     const invalidNumber = [];
//     const missing = [];

//     let assignedByValid = true;
//     let assignedByReason = "";

//     // -----------------------------
//     // ASSIGNED BY VALIDATION
//     // -----------------------------
//     if (task.assignedby) {
//       const ab = task.assignedby.trim();
//       if (!isValidNumber(ab)) {
//         invalidNumber.push(task.assignedby);
//         assignedByValid = false;
//         assignedByReason = "Invalid phone number format";
//       } else if (!existingNumbers.includes(ab)) {
//         missing.push(task.assignedby);
//         assignedByValid = false;
//         assignedByReason = "User not found in database";
//       }
//     }

//     // -----------------------------
//     // ASSIGNED TO VALIDATION
//     // -----------------------------
//     const validAssignedTo = [];
//     let assignedToReason = "";

//     if (Array.isArray(task.assigned_to)) {
//       for (const num of task.assigned_to) {
//         const tnum = num ? num.trim() : "";
//         if (!isValidNumber(tnum)) {
//           invalidNumber.push(num);
//           assignedToReason = "Invalid phone number format";
//         } else if (!existingNumbers.includes(tnum)) {
//           missing.push(num);
//           assignedToReason = "User not found in database";
//         } else {
//           validAssignedTo.push(tnum);
//         }
//       }
//     }

//     // -----------------------------
//     // ASSIGNED BY FAILED
//     // -----------------------------
//     if (!assignedByValid) {
//       invalidTasks.push({
//         title: task.title,
//         description: task.description,
//         assignedby: task.assignedby,
//         assigned_to: task.assigned_to,
//         reason: assignedByReason,
//         invalidNumber,
//         notExistNumbers: missing,
//       });
//       continue;
//     }

//     // -----------------------------
//     // NO VALID ASSIGNED_TO
//     // -----------------------------
//     if (validAssignedTo.length === 0) {
//       invalidTasks.push({
//         title: task.title,
//         description: task.description,
//         assignedby: task.assignedby,
//         assigned_to: task.assigned_to,
//         reason: assignedToReason || "No valid assigned_to users",
//         invalidNumber,
//         notExistNumbers: missing,
//       });
//       continue;
//     }

//     // =================================================
//     // 🔥 NEW: REMINDER + REPEAT SCHEDULE VALIDATION
//     // =================================================
//     const reminderCheck = validateReminderAndSchedule(task);

//     if (!reminderCheck.valid) {
//       invalidTasks.push({
//         title: task.title,
//         description: task.description,
//         assignedby: task.assignedby,
//         assigned_to: task.assigned_to,
//         repeat_schedule: task.repeat_schedule,
//         reminder_list: task.reminder_list,
//         reason: reminderCheck.reason,
//       });
//       continue;
//     }

//     // -----------------------------
//     // VALID TASK
//     // -----------------------------
//     validTasks.push({
//       ...task,
//       assigned_to: validAssignedTo,
//       task_category_row_id: categoryRowId,
//     });
//   }

//   return { validTasks, invalidTasks };
// }

function normalizePriority(priority) {
  if (!priority) return 0;
  return priority.toLowerCase() === "critical" ? 1 : 0;
}

function normalizeAttachment(val) {
  if (!val) return false;
  return ["yes", "true", "1"].includes(val.toString().toLowerCase());
}

async function getAllTaskCategoriesMap(organizationid) {
  const query = `
        SELECT LOWER(category_name) AS name, row_id
        FROM prosys.tasks_categories
        WHERE organizationid = $1
    `;

  const result = await connect_db.query(query, [organizationid]);

  const map = {};
  for (const row of result.rows) {
    map[row.name] = row.row_id;
  }
  return map;
}

async function getTaskCategoryRowId(categoryName, organizationid) {
  if (!categoryName) return null;

  const query = `
        SELECT row_id
        FROM prosys.tasks_categories
        WHERE LOWER(category_name) = LOWER($1)
          AND organizationid = $2
        LIMIT 1
    `;

  const result = await connect_db.query(query, [
    categoryName.trim(),
    organizationid,
  ]);

  // console.log("result ----",result.rows[0].row_id)

  return result.rows.length ? result.rows[0].row_id : 0;
}

async function bulkImportPreperation(importedTasks, organizationid) {
  // console.log("imported tasks",importedTasks)
  var sqlquery = "";
  const nonRecurring = [];
  const recurring = [];
  const createdAtCreationTime = [];
  for (const task of importedTasks) {
    const taskPriority = normalizePriority(task.task_priority);
    const isAttachment = normalizeAttachment(task.is_attachmentCompulsory);
    const taskCategory =
      (await getTaskCategoryRowId(task.task_category, organizationid)) || 0;

    // console.log("taskCategory",taskCategory)

    // normalize assigned_to numbers
    const assignedTo = [];
    for (const at of task.assigned_to) {
      const assignedToUser = await getAssignedToUsers(at);
      assignedTo.push(assignedToUser.userid);
    }
    // console.log(task);
    const assignedByUser = await getAssignedToUsers(task.assignedby);
    // console.log(assignedByUser);

    var row_id = libFunc.randomid();
    if (!task.is_recurring) {
      nonRecurring.push([
        row_id,
        organizationid,
        task.title,
        task.description,
        JSON.stringify(assignedTo),
        assignedByUser.userid,
        JSON.stringify(task.checklist || []),
        task.completion_date,
        taskPriority,
        taskCategory,
        isAttachment,
      ]);
      // console.log("nonRecurring",nonRecurring)
    } else {
      // const schedule_type =
      //     task.repeat_schedule === "Daily" ? 0 :
      //         task.repeat_schedule === "Weekly" ? 1 :
      //             task.repeat_schedule === "Monthly" ? 2 :
      //                 task.repeat_schedule === "Yearly" ? 3 : null;

      // const schedule_details = {
      //     type: task.repeat_schedule,
      //     reminder_on: task.reminder_on,
      //     complete_till: task.complete_till,
      //     remind_me_before: task.remind_me_before ?? ["1"]
      // };
      // createdAtCreationTime.push(row_id);
      // recurring.push([
      //     row_id,
      //     JSON.stringify({
      //         organizationid,
      //         title: task.title,
      //         description: task.description,
      //         assigned_to: assignedTo,
      //         assigned_by: assignedByUser.userid,
      //         checklist: task.checklist || [],
      //         completion_date: task.completion_date
      //     }),
      //     JSON.stringify(schedule_details),
      //     schedule_type,
      //     organizationid
      // ]);

      //  NEW: Convert to structured reminder_on format
      let reminderObjects = [];

      if (task.repeat_schedule === "Daily") {
        // Daily doesn't need reminders — just push empty objects
        reminderObjects = (task.reminderList || [{}]).map(() => ({
          reminder_on: [],
          complete_till: null,
          remind_me_before: ["0"],
        }));
      } else if (task.repeat_schedule === "Weekly") {
        reminderObjects = (task.reminderList || []).map((reminder) => ({
          reminder_on: reminder.reminder_on || [],
          complete_till: reminder.complete_till || null,
          remind_me_before: reminder.remind_me_before || [],
        }));
      } else if (
        task.repeat_schedule === "Monthly" ||
        task.repeat_schedule === "Yearly"
      ) {
        reminderObjects = (task.reminderList || []).map((reminder) => ({
          reminder_on: reminder.reminder_on || [],
          complete_till: reminder.complete_till || null,
          remind_me_before: reminder.remind_me_before || [],
        }));
      }

      const schedule_type =
        task.repeat_schedule === "Daily"
          ? 0
          : task.repeat_schedule === "Weekly"
          ? 1
          : task.repeat_schedule === "Monthly"
          ? 2
          : task.repeat_schedule === "Yearly"
          ? 3
          : null;

      const schedule_details = {
        type: task.repeat_schedule,
        reminder_list: reminderObjects,
      };

      createdAtCreationTime.push(row_id);
      recurring.push([
        row_id,
        JSON.stringify({
          organizationid,
          title: task.title,
          description: task.description,
          assigned_to: assignedTo,
          assigned_by: assignedByUser.userid,
          checklist: task.checklist || [],
          completion_date: task.completion_date,
          task_priority: taskPriority,
          task_category: taskCategory,
          is_attachment: isAttachment,
        }),
        JSON.stringify(schedule_details),
        schedule_type,
        organizationid,
      ]);
    }
  }

  if (nonRecurring.length > 0) {
    // console.log("nonRecurring-->",nonRecurring)
    await bulkInsert(
      "tasks",
      [
        "row_id",
        "organizationid",
        "title",
        "description",
        "assigned_to",
        "assigned_by",
        "checklist",
        "completion_date",
        "task_priority",
        "task_category",
        "is_attachment",
      ],
      nonRecurring
    );
  }

  if (recurring.length > 0) {
    var rsp = await bulkInsert(
      "recurring_task",
      [
        "row_id",
        "taskdetails",
        "schedule_details",
        "schedule_type",
        "organizationid",
      ],
      recurring
    );
    if (rsp != false) {
      await createRecurringAtCreationTimeBulk(createdAtCreationTime);
    }
  }
}
async function bulkInsert(table, columns, rows) {
  return new Promise((resolve, reject) => {
    if (rows.length === 0) return;

    const values = [];
    const placeholders = rows.map((row, i) => {
      const offset = i * row.length;
      values.push(...row);
      return `(${row.map((_, j) => `$${offset + j + 1}`).join(",")})`;
    });

    const query = `
    INSERT INTO ${schema}.${table} (${columns.join(",")})
    VALUES ${placeholders.join(",")}
    RETURNING row_id;
  `;

    // const result = await pool.query(query, values);
    // console.log(`Inserted into ${table}:`, result.rows.map(r => r.row_id));
    connect_db.query(query, values, async (err, result) => {
      if (err) {
        //  console.log(err);
        resolve(false);
      } else {
        // console.log(result.rows);
        //  console.log(`Inserted into ${table}:`, result.rows.map(r => r.row_id));
        resolve(result.rows);
      }
    });
  });
}

async function bulkUserImport(req, res) {
  // console.log("cons--->", req.data.importedUsers);
  try {
    const userid = req.data.userId;
    const organizationid = req.data.orgId;
    const importedUsers = req.data.importedUsers || [];

    if (importedUsers.length === 0) {
      return libFunc.sendResponse(res, {
        status: 2,
        msg: "No users to import",
      });
    }

    let skipped = {
      duplicateInFile: [],
      invalidNumbers: [],
      existingInDB: [],
    };

    //  Step 0: Fetch all department names for the incoming users
    const deptIds = [
      ...new Set(importedUsers.map((u) => `'${u.department_id}'`)),
    ];
    let departmentMap = {};

    if (deptIds.length > 0) {
      const deptQuery = `
                SELECT row_id AS department_id, department_name 
                FROM ${schema}.departments
                WHERE row_id IN (${deptIds.join(",")})
            `;
      const deptResult = await connect_db.query(deptQuery);
      for (const row of deptResult.rows) {
        departmentMap[row.department_id] = row.department_name;
      }
    }

    //  Step 1: Remove duplicate mobile numbers within the import file
    const seen = new Set();
    const uniqueUsers = [];
    for (const u of importedUsers) {
      const deptName = departmentMap[u.department_id] || null;
      if (seen.has(u.mobilenumber)) {
        skipped.duplicateInFile.push({
          name: u.user_name,
          mobilenumber: u.mobilenumber,
          department_name: deptName,
          department_id: u.department_id,
        });
      } else {
        seen.add(u.mobilenumber);
        uniqueUsers.push(u);
      }
    }

    //  Step 2: Validate phone numbers (must be exactly 10 digits)
    const validUsers = [];
    for (const u of uniqueUsers) {
      const deptName = departmentMap[u.department_id] || null;
      if (!/^\d{10}$/.test(u.mobilenumber)) {
        skipped.invalidNumbers.push({
          name: u.user_name,
          mobilenumber: u.mobilenumber,
          department_name: deptName,
          department_id: u.department_id,
        });
      } else {
        validUsers.push(u);
      }
    }

    //  Step 3: Check for existing users in DB (by mobile number)
    const existingUsers = await checkExistingUsers(validUsers);
    const existingNumbers = existingUsers.map((u) => u.mobilenumber);

    const finalUsers = validUsers.filter(
      (u) => !existingNumbers.includes(u.mobilenumber)
    );

    //  Step 4: Mark already existing users
    skipped.existingInDB = existingUsers.map((u) => ({
      name: u.name,
      mobilenumber: u.mobilenumber,
      department_name:
        u.department_name || departmentMap[u.department_id] || null,
      department_id: u.department_id || null,
    }));

    //  Step 5: Import only valid + unique + not existing users
    if (finalUsers.length > 0) {
      await bulkImportUsersPreparation(finalUsers, organizationid);
    }

    //  Step 6: Summary Counts
    const counts = {
      imported: finalUsers.length,
      duplicate: skipped.duplicateInFile.length,
      invalid: skipped.invalidNumbers.length,
      exist: skipped.existingInDB.length,
    };

    //  Step 7: Generate Dynamic Message
    let msgParts = [];
    if (counts.imported > 0) msgParts.push(`${counts.imported} users imported`);
    if (counts.duplicate > 0)
      msgParts.push(`${counts.duplicate} duplicate mobile numbers`);
    if (counts.invalid > 0)
      msgParts.push(`${counts.invalid} invalid mobile numbers`);
    if (counts.exist > 0)
      msgParts.push(`${counts.exist} users already existed`);

    const finalMsg =
      msgParts.length > 0 ? msgParts.join(", ") : "No users imported";

    //  Step 8: Final Response
    const msg = {
      status: counts.imported === importedUsers.length ? 0 : 1,
      msg: finalMsg,
      counts,
      imported: finalUsers.map((u) => ({
        name: u.user_name,
        mobilenumber: u.mobilenumber,
        department_name: departmentMap[u.department_id] || null,
        department_id: u.department_id,
      })),
      skipped,
    };

    // console.log("data", msg.skipped);
    return libFunc.sendResponse(res, msg);
  } catch (err) {
    console.error("Error in bulkUserImport:", err);
    return libFunc.sendResponse(res, {
      status: 500,
      msg: "Internal server error",
    });
  }
}

//  Check existing users in DB
async function checkExistingUsers(importedUsers) {
  if (!importedUsers || importedUsers.length === 0) return [];

  const phoneNumbers = importedUsers
    .map((u) => `'${u.mobilenumber}'`)
    .join(",");

  const query = `
        SELECT 
            u.name, 
            u.mobilenumber, 
            u.deptid AS department_id, 
            d.department_name
        FROM ${schema}.users u
        LEFT JOIN ${schema}.departments d ON u.deptid = d.row_id
        WHERE u.mobilenumber IN (${phoneNumbers})
    `;

  const result = await connect_db.query(query);
  return result.rows || [];
}

async function bulkImportUsersPreparation(importedUsers, organizationid) {
  const users = [];

  for (const user of importedUsers) {
    var row_id = libFunc.randomid();
    users.push([
      row_id,
      user.user_name,
      user.department_id,
      user.password,
      user.mobilenumber,
      JSON.stringify(user.Top_duties),
      user.email,
      organizationid,
    ]);
  }

  if (users.length > 0) {
    await bulkInsert(
      "users",
      [
        "row_id",
        "name",
        "deptid",
        "password",
        "mobilenumber",
        "duties",
        "email",
        "organizationid",
      ],
      users
    );
  }
}

/**
 * Testing Import
 */
var organizationid = "1739861234068_66iA";
var importedTasks = [
  {
    title: "Vendor QC Report Review",
    description:
      "Review Quality Control reports submitted by vendors for accuracy and action.",
    repeat_schedule: "Weekly",
    reminder_on: [],
    is_recurring: true,
    complete_till: ["Saturday"],
    remind_me_before: [],
    assignedby: "7742529160",
    assigned_to: ["8890354610"],
    status: "ongoing",
  },

  {
    title: " Hardware Requirement Sheet - Unit 4",
    description: " Share List of Material needed to be Purchased",
    repeat_schedule: "Weekly",
    reminder_on: ["Friday"],
    is_recurring: true,
    complete_till: ["Sunday"],
    remind_me_before: [2],
    assignedby: "8890354610",
    assigned_to: ["7742529160"],
    status: "ongoing",
  },
  {
    title: "TDS Return Filing",
    description: "Tds Return (Quarterly) Sep",
    repeat_schedule: "Yearly",
    reminder_on: [
      "20-07",
      "20-10",
      "20-01",
      "20-05",
      "15-07",
      "15-10",
      "15-01",
      "15-05",
    ],
    is_recurring: true,
    complete_till: ["25-07", "25-10", "25-01", "25-05"],
    remind_me_before: [5, 10],
    assignedby: "7742529160",
    assigned_to: ["9929667143"],
    status: "ongoing",
  },
  {
    title: "BOM Purchasing",
    description: "Purchase material according to BOM",
    repeat_schedule: "Monthly",
    reminder_on: [
      "06-01",
      "06-02",
      "06-03",
      "06-04",
      "06-05",
      "06-06",
      "06-07",
      "06-08",
      "06-09",
      "06-10",
      "06-11",
      "06-12",
      "16-01",
      "16-02",
      "16-03",
      "16-04",
      "16-05",
      "16-06",
      "16-07",
      "16-08",
      "16-09",
      "16-10",
      "16-11",
      "16-12",
      "24-01",
      "24-02",
      "24-03",
      "24-04",
      "24-05",
      "24-06",
      "24-07",
      "24-08",
      "24-09",
      "24-10",
      "24-11",
      "24-12",
    ],
    is_recurring: true,
    complete_till: [10, 20, 28],
    remind_me_before: [4],
    assignedby: "8890354610",
    assigned_to: ["7742529160"],
    status: "ongoing",
  },
  {
    title: "Sampling Checking Report",
    description: "Sampling Checking Report",
    repeat_schedule: "Daily",
    reminder_on: [],
    is_recurring: true,
    complete_till: [],
    remind_me_before: [0],
    assignedby: "7742529160",
    assigned_to: ["8890354610"],
    status: "ongoing",
  },
];
//  bulkImportPreperation(importedTasks, organizationid);

var importedUsers = [
  {
    department_id: "1739880609970_KRCv",
    user_name: "Arvind Salecha",
    email: "",
    password: "Arvind@123",
    mobilenumber: "9414140000",
    Top_duties: [],
  },

  {
    department_id: "1739880609970_KRCv",
    user_name: "Benigopal",
    email: "",
    password: "Benigopal@123",
    mobilenumber: "9819710181",
    Top_duties: [],
  },

  {
    department_id: "1739880609970_KRCv",
    user_name: "Uttam Salecha",
    email: "",
    password: "Uttam@1974",
    mobilenumber: "9414130685",
    Top_duties: [],
  },

  {
    department_id: "1739880609970_KRCv",
    user_name: "Uttam Salecha",
    email: "",
    password: "Uttam@1974",
    mobilenumber: "9414130685",
    Top_duties: ["Owner/Registered"],
  },
];
// bulkImportUsersPreparation(importedUsers, organizationid);

// async function fetchTasks(req, res) {
//     try {
//         const userid = req.data.userId;
//         const organizationid = req.data.orgId;
//         const role = req.data.user_role; // 0 = admin
//         const active_status =
//             req.data.status === "ongoing" ? 0 :
//             req.data.status === "complete" ? 1 :
//             req.data.status === "overdue" ? 2 : undefined;

//         const limit = req.data.limit || 100;
//         const page = req.data.page || 1;
//         const offset = (page - 1) * limit;

//         let params = [organizationid]; // common param
//         let whereClauses = ["ta.organizationid = $1", "ta.activestatus = 0"];

//       //  console.log("role",role,role === 1)

//         //  only apply user filter if not admin
//         // if (role !== 1) {
//         //     params.push(`%${userid}%`);
//         //     whereClauses.push(`ta.assigned_to::text LIKE $${params.length}`);
//         // }

//         //  active_status filter
//         if (active_status !== undefined) {
//             params.push(active_status);
//             whereClauses.push(`ta.active_status = $${params.length}`);
//         }

//         //  pagination
//         params.push(limit);
//         params.push(offset);

//         let query = `
//             SELECT ta.row_id, ta.title, ta.description, ta.completion_date, us1.name AS created_by,
//                    ta.cr_on AS created_at, ta.checklist, ta.assigned_to,ta.task_type,
//                    CASE
//                        WHEN ta.active_status = 0 THEN 'ongoing'
//                        WHEN ta.active_status = 1 THEN 'complete'
//                        WHEN ta.active_status = 2 THEN 'overdue'
//                    END AS status,
//                    (ta.completion_date - CURRENT_DATE) AS due_days,
//                    us2.name AS updated_by
//             FROM ${schema}.tasks ta
//             INNER JOIN ${schema}.users us1 ON ta.assigned_by = us1.row_id
//             LEFT JOIN ${schema}.users us2 ON ta.completed_by = us2.row_id
//             WHERE ${whereClauses.join(" AND ")}
//             ORDER BY ta.cr_on DESC
//             LIMIT $${params.length - 1} OFFSET $${params.length}
//         `;

//         if (role === 1) {
//             const resp = await db_query.customQuery(query, "Tasks Fetched", params);
//            //  console.log("resp--->", resp);
//            libFunc.sendResponse(res, resp);

//         }else{

//             let msg = {
//                status: 1,
//                 msg: "you are not admin",
//             }

//             //  console.log("resp--->", msg);
//         libFunc.sendResponse(res, msg);
//         }

//     } catch (err) {
//         console.error("Error in fetchTasks:", err);
//         libFunc.sendResponse(res, { status: 0, msg: "Error fetching tasks" });
//     }
// }

// async function fetchTasks(req, res) {
//     try {
//         const userid = req.data.userId;
//         const organizationid = req.data.orgId;
//         const role = req.data.user_role; // 0 = normal, 1 = admin
//         const statusFilter = req.data.status; // ongoing, complete, overdue
//         const filters = req.data.filters || {}; // optional filters object

//         const completion_startDate = req.data.completion_startDate;
//         const completion_endDate = req.data.completion_endDate;
//         const task_completed_on_startDate = req.data.task_completed_on_startDate;
//         const task_completed_on_endDate = req.data.task_completed_on_endDate;

//         const limit = req.data.limit || 100;
//         const page = req.data.page || 1;
//         const offset = (page - 1) * limit;

//         let params = [organizationid];
//         let whereClauses = ["ta.organizationid = $1"];

//         // Default active_status only if no status filter sent
//         if (!statusFilter) {
//             whereClauses.push("ta.active_status = 0");
//         }

//         // Status Filter
//         let active_status;
//         if (statusFilter) {
//             const active_status_map = { ongoing: 0, complete: 1, overdue: 2 };
//             active_status = active_status_map[statusFilter.toLowerCase()];
//             if (active_status !== undefined) {
//                 params.push(active_status);
//                 whereClauses.push(`ta.active_status = $${params.length}`);
//             }
//         }

//         // Completion Date Filters (Outside)
//         if (completion_startDate) {
//             params.push(completion_startDate);
//             whereClauses.push(`ta.completion_date >= $${params.length}`);
//         }
//         if (completion_endDate) {
//             params.push(completion_endDate);
//             whereClauses.push(`ta.completion_date <= $${params.length}`);
//         }

//         // Completion Date Filters (Inside filters object)
//         if (filters.completion_startDate) {
//             params.push(filters.completion_startDate);
//             whereClauses.push(`ta.completion_date >= $${params.length}`);
//         }
//         if (filters.completion_endDate) {
//             params.push(filters.completion_endDate);
//             whereClauses.push(`ta.completion_date <= $${params.length}`);
//         }

//         // CompletedOn Date Filters — apply only for completed tasks
//         if (active_status === 1 || statusFilter?.toLowerCase() === "complete") {
//             // Outside CompletedOn Filters
//             // if (task_completed_on_startDate) {
//             //     params.push(task_completed_on_startDate);
//             //     whereClauses.push(`ta.completedon >= $${params.length}`);
//             // }
//             // if (task_completed_on_endDate) {
//             //     params.push(task_completed_on_endDate);
//             //     whereClauses.push(`ta.completedon <= $${params.length}`);
//             // }

//             // Inside CompletedOn Filters
//             if (filters.task_completed_on_startDate) {
//                 params.push(filters.task_completed_on_startDate);
//                 whereClauses.push(`ta.completedon >= $${params.length}`);
//             }
//             if (filters.task_completed_on_endDate) {
//                 params.push(filters.task_completed_on_endDate);
//                 whereClauses.push(`ta.completedon <= $${params.length}`);
//             }
//         }

//         // Department Filter
//         if (filters.department_id?.length) {
//             params.push(filters.department_id);
//             whereClauses.push(`us1.deptid = ANY($${params.length})`);
//         }

//         // Assigned To Filter
//         if (filters.assigned_to?.length) {
//             params.push(filters.assigned_to);
//             whereClauses.push(`assigned_to_id::text = ANY($${params.length})`);
//         }

//         // Assigned By Filter
//         if (filters.assigned_by?.length) {
//             params.push(filters.assigned_by);
//             whereClauses.push(`ta.assigned_by = ANY($${params.length})`);
//         }

//         // Task Type (Normal / Recurring)
//         if (filters.type) {
//             params.push(filters.type.toLowerCase() === "normal" ? '0' : '1');
//             whereClauses.push(`ta.task_type = $${params.length}`);
//         }

//         // Frequency Filter
//         if (filters.frequency) {
//             params.push(filters.frequency);
//             whereClauses.push(`rt.schedule_details->>'type' = $${params.length}`);
//         }

//         // Pagination
//         params.push(limit);
//         params.push(offset);

//         const query = `
//             SELECT
//                 ta.row_id,
//                 ta.title,
//                 ta.description,
//                 ta.checklist,
//                 ta.completion_date,
//                 ta.completedon,
//                 us1.name AS created_by,
//                 COALESCE(dept.department_name, 'Owner') AS created_by_department,
//                 ta.cr_on AS created_at,
//                 json_agg(us.name) AS assigned_to,
//                 CASE
//                     WHEN ta.active_status = 0 THEN 'ongoing'
//                     WHEN ta.active_status = 1 THEN 'complete'
//                     WHEN ta.active_status = 2 THEN 'overdue'
//                 END AS status,
//                 CASE
//                     WHEN ta.task_type = '0' THEN 'Normal'
//                     WHEN ta.task_type = '1' THEN 'Recurring'
//                 END AS task_type_title,
//                 CASE
//                     WHEN ta.active_status = 1 AND ta.completion_date < CURRENT_DATE
//                         THEN ABS(ta.up_on::date - ta.completion_date)
//                     WHEN ta.completion_date >= CURRENT_DATE
//                         THEN (ta.completion_date - CURRENT_DATE)
//                     ELSE ABS(ta.completion_date - CURRENT_DATE)
//                 END AS due_days,
//                 CASE
//                     WHEN ta.completion_date >= CURRENT_DATE
//                         THEN 'due_in'
//                     ELSE 'overdue_by'
//                 END AS due_label,
//                 us2.name AS updated_by,
//                 ta.task_type,
//                 rt.row_id as recurring_task_id,
//                 rt.schedule_details->>'type' AS schedule_type,
//                 rt.schedule_details->>'reminder_list' AS reminder_list
//             FROM ${schema}.tasks ta
//             INNER JOIN ${schema}.users us1 ON ta.assigned_by = us1.row_id
//             LEFT JOIN ${schema}.departments dept ON us1.deptid = dept.row_id
//             INNER JOIN LATERAL jsonb_array_elements_text(ta.assigned_to) AS assigned_to_id ON TRUE
//             INNER JOIN ${schema}.users us ON us.row_id = assigned_to_id::text
//             LEFT JOIN ${schema}.users us2 ON ta.completed_by = us2.row_id
//             LEFT JOIN ${schema}.recurring_task rt ON ta.recurringid = rt.row_id
//             WHERE ${whereClauses.join(" AND ")}
//             AND us.activestatus = 0
//             GROUP BY ta.row_id, ta.checklist, us1.name, dept.department_name, us2.name, rt.schedule_details, rt.row_id
//             ORDER BY ta.cr_on DESC
//             LIMIT $${params.length - 1} OFFSET $${params.length};
//         `;

//         // console.log("WHERE CLAUSES =>", whereClauses);
//         // console.log("PARAMS =>", params);

//         if (role === 1) {
//             const resp = await db_query.customQuery(query, "Tasks Fetched", params);
//             console.log("fetch all tasks in dhashboard------>",resp)
//             libFunc.sendResponse(res, resp);
//         } else {
//             libFunc.sendResponse(res, { status: 1, msg: "You are not admin" });
//         }

//     } catch (err) {
//         console.error("Error in fetchTasks:", err);
//         libFunc.sendResponse(res, { status: 0, msg: "Error fetching tasks" });
//     }
// }

async function fetchTasks(req, res) {
  // console.log("request fetchTasks---",req.data.filters)
  try {
    const userid = req.data.userId;
    const organizationid = req.data.orgId;
    const role = req.data.user_role;
    const statusFilter = req.data.status;
    const filters = req.data.filters || {};
    const userDeptId = req.data.depId;

    const completion_startDate = req.data.completion_startDate;
    const completion_endDate = req.data.completion_endDate;

    const limit = req.data.limit || 100;
    const page = req.data.page || 1;
    const offset = (page - 1) * limit;

    let params = [organizationid];
    let whereClauses = ["ta.organizationid = $1"];

    // STATUS FILTER
    if (!statusFilter) whereClauses.push("ta.active_status = 0");

    let active_status;
    if (statusFilter) {
      const map = { ongoing: 0, complete: 1, overdue: 2 };
      active_status = map[statusFilter.toLowerCase()];
      if (active_status !== undefined) {
        params.push(active_status);
        whereClauses.push(`ta.active_status = $${params.length}`);
      }
    }

    // COMPLETION DATE RANGE
    if (completion_startDate) {
      params.push(completion_startDate);
      whereClauses.push(`ta.completion_date >= $${params.length}`);
    }
    if (completion_endDate) {
      params.push(completion_endDate);
      whereClauses.push(`ta.completion_date <= $${params.length}`);
    }

    if (filters.completion_startDate) {
      params.push(filters.completion_startDate);
      whereClauses.push(`ta.completion_date >= $${params.length}`);
    }
    if (filters.completion_endDate) {
      params.push(filters.completion_endDate);
      whereClauses.push(`ta.completion_date <= $${params.length}`);
    }

    // COMPLETED ON (for completed tasks only)
    if (active_status === 1) {
      if (filters.task_completed_on_startDate) {
        params.push(filters.task_completed_on_startDate);
        whereClauses.push(`ta.completedon >= $${params.length}`);
      }
      if (filters.task_completed_on_endDate) {
        params.push(filters.task_completed_on_endDate);
        whereClauses.push(`ta.completedon <= $${params.length}`);
      }
    }

    // DEFAULT: PUSH userDeptId ONCE
    let userDeptIdx = null;
    if (userDeptId) {
      params.push(userDeptId);
      userDeptIdx = params.length; // <-- IMPORTANT
    }

    // DEPARTMENT FILTER
    if (filters.department_id?.length) {
      params.push(filters.department_id);
      whereClauses.push(`us1.deptid = ANY($${params.length})`);
    }

    // ASSIGNED TO
    if (filters.assigned_to?.length) {
      params.push(filters.assigned_to);
      whereClauses.push(`assigned_to_id::text = ANY($${params.length})`);
    }

    // ASSIGNED BY
    if (filters.assigned_by?.length) {
      params.push(filters.assigned_by);
      whereClauses.push(`ta.assigned_by = ANY($${params.length})`);
    }

    // TASK TYPE
    if (filters.type) {
      params.push(filters.type.toLowerCase() === "normal" ? "0" : "1");
      whereClauses.push(`ta.task_type = $${params.length}`);
    }

    // FREQUENCY
    if (filters.frequency) {
      params.push(filters.frequency);
      whereClauses.push(`rt.schedule_details->>'type' = $${params.length}`);
    }

    // TASK CATEGORY (row_id)
    if (filters.task_category?.length) {
      params.push(filters.task_category);
      whereClauses.push(`ta.task_category = ANY($${params.length})`);
    }

    //  TASK PRIORITY FILTER

    if (filters.task_priority) {
      const priorityMap = {
        regular: "0",
        critical: "1",
      };

      const mappedPriority = priorityMap[filters.task_priority.toLowerCase()];

      if (mappedPriority !== undefined) {
        params.push(mappedPriority);
        whereClauses.push(`ta.task_priority = $${params.length}`);
      }
    }

    // ADMIN (role=2) FILTER -> USE SAME PARAM INDEX
    if (role === 2 && userDeptIdx) {
      whereClauses.push(`
                (
                    us1.deptid = $${userDeptIdx}
                    OR assigned_to_id IN (
                        SELECT row_id 
                        FROM ${schema}.users 
                        WHERE deptid = $${userDeptIdx}
                    )
                )
            `);
    }

    // OUTGOING FILTER (frontend toggle)
    if (filters.outgoing === true) {
      if (!userDeptId) {
        whereClauses.push(`1=1`);
      } else {
        whereClauses.push(`
                    (
                        us1.deptid = $${userDeptIdx}  
                        OR us.deptid = $${userDeptIdx} 
                        OR us1.deptid = $${userDeptIdx} 
                    )
                `);
      }
    }

    if (filters.outgoing === false && userDeptIdx) {
      whereClauses.push(`
                NOT (
                    us1.deptid = $${userDeptIdx}
                    AND us.deptid <> $${userDeptIdx}
                )
            `);
    }

    // PAGINATION PARAMS
    params.push(limit);
    params.push(offset);

    // FINAL QUERY
    const query = `
            SELECT
                ta.row_id,
                ta.title,
                ta.description,
                 ta.task_category AS task_category_id,           
            tc.category_name AS task_category_name,         
           CASE
                    WHEN  ta.task_priority = '0' THEN 'Regular'
                    WHEN  ta.task_priority = '1' THEN 'Critical'                   
                END AS task_priority ,                               
                ta.checklist,
                ta.completion_date,
                ta.completedon,
                us1.name AS created_by,

                CASE 
                    WHEN dept.department_name IS NULL THEN 
                        CASE us1.role WHEN 3 THEN 'Top Management'
                                      WHEN 1 THEN 'Admin'
                                      ELSE 'Unknown'
                        END
                    ELSE dept.department_name
                END AS created_by_department,

                ta.cr_on AS created_at,

                json_agg(DISTINCT us.name) AS assigned_to,

                json_agg(DISTINCT jsonb_build_object(
                    'user_id', us.row_id,
                    'name', us.name,
                    'department',
                        CASE 
                            WHEN dept2.department_name IS NULL THEN 
                                CASE us.role 
                                    WHEN 3 THEN 'Top Management'
                                    WHEN 1 THEN 'Admin'
                                    ELSE 'Owner'
                                END
                            ELSE dept2.department_name
                        END
                )) AS assigned_to_details,

                CASE
                    WHEN ta.active_status = 0 THEN 'ongoing'
                    WHEN ta.active_status = 1 THEN 'complete'
                    WHEN ta.active_status = 2 THEN 'overdue'
                END AS status,

                CASE WHEN ta.task_type = '0' THEN 'Normal' ELSE 'Recurring' END AS task_type_title,

                CASE
                    WHEN ta.completion_date >= CURRENT_DATE THEN (ta.completion_date - CURRENT_DATE)
                    ELSE ABS(ta.completion_date - CURRENT_DATE)
                END AS due_days,

                CASE 
                    WHEN ta.completion_date >= CURRENT_DATE THEN 'due_in'
                    ELSE 'overdue_by'
                END AS due_label,

                us2.name AS updated_by,

          CASE
    WHEN ${userDeptIdx ? `COALESCE(us1.deptid,'') = $${userDeptIdx}` : `FALSE`}
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(ta.assigned_to) x
            JOIN ${schema}.users u ON u.row_id = x::text
            WHERE ${
              userDeptIdx ? `COALESCE(u.deptid,'') <> $${userDeptIdx}` : `FALSE`
            }
        )
    THEN TRUE

    WHEN ${userDeptIdx ? `COALESCE(us1.deptid,'') = $${userDeptIdx}` : `FALSE`}
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(ta.assigned_to) x
            JOIN ${schema}.users u ON u.row_id = x::text
            WHERE u.role = 1
        )
    THEN TRUE

    WHEN ${
      userDeptIdx
        ? `EXISTS (
                    SELECT 1
                    FROM ${schema}.users cb
                    WHERE cb.row_id = ta.assigned_by
                      AND COALESCE(cb.deptid,'') <> $${userDeptIdx}
                )
                AND EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements_text(ta.assigned_to) x
                    JOIN ${schema}.users au ON au.row_id = x::text
                    WHERE COALESCE(au.deptid,'') = $${userDeptIdx}
                )`
        : `FALSE`
    }
    THEN TRUE

    ELSE FALSE
END AS is_outgoing,

                ta.task_type,
                rt.row_id AS recurring_task_id,
                rt.schedule_details->>'type' AS schedule_type,
                rt.schedule_details->>'reminder_list' AS reminder_list

            FROM ${schema}.tasks ta
            LEFT JOIN ${schema}.tasks_categories tc 
        ON tc.row_id = ta.task_category  
            INNER JOIN ${schema}.users us1 ON ta.assigned_by = us1.row_id
            LEFT JOIN ${schema}.departments dept ON us1.deptid = dept.row_id
            INNER JOIN LATERAL jsonb_array_elements_text(ta.assigned_to) AS assigned_to_id ON TRUE
            INNER JOIN ${schema}.users us ON us.row_id = assigned_to_id::text
            LEFT JOIN ${schema}.departments dept2 ON us.deptid = dept2.row_id
            LEFT JOIN ${schema}.users us2 ON ta.completed_by = us2.row_id
            LEFT JOIN ${schema}.recurring_task rt ON ta.recurringid = rt.row_id
            WHERE ${whereClauses.join(" AND ")}
              AND us.activestatus = 0
            GROUP BY 
                ta.row_id,
                ta.checklist,
                us1.name,
                dept.department_name,
                us2.name,
                rt.schedule_details,
                rt.row_id,
                us1.role,
                us1.deptid, tc.category_name
            ORDER BY ta.cr_on DESC
            LIMIT $${params.length - 1} OFFSET $${params.length};
        `;

    if (role === 1 || role === 3 || role === 2) {
      const resp = await db_query.customQuery(query, "Tasks Fetched", params);
      //   console.log("resposne--", resp.data);
      libFunc.sendResponse(res, resp);
    } else {
      libFunc.sendResponse(res, { status: 1, msg: "You are not admin" });
    }
  } catch (err) {
    console.error("Error in fetchTasks:", err);
    libFunc.sendResponse(res, { status: 0, msg: "Error fetching tasks" });
  }
}

function Dateformatechange(d) {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-indexed
  const day = date.getDate().toString().padStart(2, "0");

  const customFormattedDate = `${day}/${month}/${year}`;

  // console.log(customFormattedDate);
  return customFormattedDate;
}

async function exportTasksToExcel(req, res) {
  // console.log("coomon url")
  try {
    const organizationid = req.data.orgId;
    const role = req.data.user_role;
    const statusFilter = req.data.status;
    const filters = req.data.filters || {};
    const completion_startDate = req.data.completion_startDate;
    const completion_endDate = req.data.completion_endDate;
    const task_completed_on_startDate = req.data.task_completed_on_startDate;
    const task_completed_on_endDate = req.data.task_completed_on_endDate;
    const userDeptId = req.data.depId;

    let params = [organizationid];
    let whereClauses = ["ta.organizationid = $1"];

    //  Status filter
    if (!statusFilter) whereClauses.push("ta.active_status = 0");
    let active_status;
    if (statusFilter) {
      const active_status_map = { ongoing: 0, complete: 1, overdue: 2 };
      active_status = active_status_map[statusFilter.toLowerCase()];
      if (active_status !== undefined) {
        params.push(active_status);
        whereClauses.push(`ta.active_status = $${params.length}`);
      }
    }

    //  Outside date range
    if (completion_startDate) {
      params.push(completion_startDate);
      whereClauses.push(`ta.completion_date >= $${params.length}`);
    }
    if (completion_endDate) {
      params.push(completion_endDate);
      whereClauses.push(`ta.completion_date <= $${params.length}`);
    }

    //  Inside date range
    if (filters.completion_startDate) {
      params.push(filters.completion_startDate);
      whereClauses.push(`ta.completion_date >= $${params.length}`);
    }
    if (filters.completion_endDate) {
      params.push(filters.completion_endDate);
      whereClauses.push(`ta.completion_date <= $${params.length}`);
    }

    // CompletedOn Date Filters — apply only for completed tasks
    if (active_status === 1 || statusFilter?.toLowerCase() === "complete") {
      if (filters.task_completed_on_startDate) {
        params.push(filters.task_completed_on_startDate);
        whereClauses.push(`ta.completedon >= $${params.length}`);
      }
      if (filters.task_completed_on_endDate) {
        params.push(filters.task_completed_on_endDate);
        whereClauses.push(`ta.completedon <= $${params.length}`);
      }
    }

    let userDeptIdx = null;
    if (userDeptId) {
      params.push(userDeptId);
      userDeptIdx = params.length; // <-- IMPORTANT
    }

    //  Department
    if (filters.department_id?.length) {
      params.push(filters.department_id);
      whereClauses.push(`us1.deptid = ANY($${params.length})`);
    }

    //  Assigned To
    if (filters.assigned_to?.length) {
      params.push(filters.assigned_to);
      whereClauses.push(`assigned_to_id::text = ANY($${params.length})`);
    }

    //  Assigned By
    if (filters.assigned_by?.length) {
      params.push(filters.assigned_by);
      whereClauses.push(`ta.assigned_by = ANY($${params.length})`);
    }

    //  Task type
    if (filters.type) {
      params.push(filters.type.toLowerCase() === "normal" ? "0" : "1");
      whereClauses.push(`ta.task_type = $${params.length}`);
    }

    //  Frequency (Recurring)
    if (filters.frequency) {
      params.push(filters.frequency);
      whereClauses.push(`rt.schedule_details->>'type' = $${params.length}`);
    }

    // TASK CATEGORY (row_id)
    if (filters.task_category?.length) {
      params.push(filters.task_category);
      whereClauses.push(`ta.task_category = ANY($${params.length})`);
    }

    //  TASK PRIORITY FILTER
    if (filters.task_priority) {
      const priorityMap = {
        regular: "0",
        critical: "1",
      };

      const mappedPriority = priorityMap[filters.task_priority.toLowerCase()];

      if (mappedPriority !== undefined) {
        params.push(mappedPriority);
        whereClauses.push(`ta.task_priority = $${params.length}`);
      }
    }

    if (role === 2 && userDeptIdx) {
      whereClauses.push(`
                (
                    us1.deptid = $${userDeptIdx}
                    OR assigned_to_id IN (
                        SELECT row_id 
                        FROM ${schema}.users 
                        WHERE deptid = $${userDeptIdx}
                    )
                )
            `);
    }

    if (filters.outgoing === true) {
      if (!userDeptId) {
        whereClauses.push(`1=1`);
      } else {
        whereClauses.push(`
                    (
                        us1.deptid = $${userDeptIdx}   -- Outgoing A→B
                        OR us.deptid = $${userDeptIdx} -- Incoming B→A
                        OR us1.deptid = $${userDeptIdx} -- Internal A→A
                    )
                `);
      }
    }

    if (filters.outgoing === false && userDeptIdx) {
      whereClauses.push(`
                NOT (
                    us1.deptid = $${userDeptIdx}
                    AND us.deptid <> $${userDeptIdx}
                )
            `);
    }

    const query = `
           SELECT
                ta.row_id,
                ta.title,
                ta.description,

                ta.task_category AS task_category_id,           
            tc.category_name AS task_category_name,         
           CASE
                    WHEN  ta.task_priority = '0' THEN 'Regular'
                    WHEN  ta.task_priority = '1' THEN 'Critical'                   
                END AS task_priority , 

                ta.checklist,
                ta.completion_date,
                ta.completedon,
                us1.name AS created_by,

                CASE 
                    WHEN dept.department_name IS NULL THEN 
                        CASE us1.role WHEN 3 THEN 'Top Management'
                                      WHEN 1 THEN 'Admin'
                                      ELSE 'Unknown'
                        END
                    ELSE dept.department_name
                END AS created_by_department,

                ta.cr_on AS created_at,

                json_agg(DISTINCT us.name) AS assigned_to,

                json_agg(DISTINCT jsonb_build_object(
                    'user_id', us.row_id,
                    'name', us.name,
                    'department',
                        CASE 
                            WHEN dept2.department_name IS NULL THEN 
                                CASE us.role 
                                    WHEN 3 THEN 'Top Management'
                                    WHEN 1 THEN 'Admin'
                                    ELSE 'Owner'
                                END
                            ELSE dept2.department_name
                        END
                )) AS assigned_to_details,

                CASE
                    WHEN ta.active_status = 0 THEN 'ongoing'
                    WHEN ta.active_status = 1 THEN 'complete'
                    WHEN ta.active_status = 2 THEN 'overdue'
                END AS status,

                CASE WHEN ta.task_type = '0' THEN 'Normal' ELSE 'Recurring' END AS task_type_title,

                CASE
                    WHEN ta.completion_date >= CURRENT_DATE THEN (ta.completion_date - CURRENT_DATE)
                    ELSE ABS(ta.completion_date - CURRENT_DATE)
                END AS due_days,

                CASE 
                    WHEN ta.completion_date >= CURRENT_DATE THEN 'due_in'
                    ELSE 'overdue_by'
                END AS due_label,

                us2.name AS updated_by,

                CASE
                    WHEN ${
                      userDeptIdx ? `us1.deptid = $${userDeptIdx}` : `FALSE`
                    }
                        AND EXISTS (
                            SELECT 1
                            FROM jsonb_array_elements_text(ta.assigned_to) AS x
                            JOIN ${schema}.users u ON u.row_id = x::text
                            WHERE u.deptid IS NOT NULL
                              AND u.deptid <> ${
                                userDeptIdx ? `$${userDeptIdx}` : `NULL`
                              }
                        )
                    THEN TRUE

                    WHEN ${
                      userDeptIdx ? `us1.deptid = $${userDeptIdx}` : `FALSE`
                    }
                        AND EXISTS (
                            SELECT 1
                            FROM jsonb_array_elements_text(ta.assigned_to) AS x
                            JOIN ${schema}.users u ON u.row_id = x::text
                            WHERE u.role = 1
                        )
                    THEN TRUE

                    ELSE FALSE
                END AS is_outgoing,

                ta.task_type,
                rt.row_id AS recurring_task_id,
                rt.schedule_details->>'type' AS schedule_type,
                rt.schedule_details->>'reminder_list' AS reminder_list

            FROM ${schema}.tasks ta
             LEFT JOIN ${schema}.tasks_categories tc 
        ON tc.row_id = ta.task_category 
            INNER JOIN ${schema}.users us1 ON ta.assigned_by = us1.row_id
            LEFT JOIN ${schema}.departments dept ON us1.deptid = dept.row_id
            INNER JOIN LATERAL jsonb_array_elements_text(ta.assigned_to) AS assigned_to_id ON TRUE
            INNER JOIN ${schema}.users us ON us.row_id = assigned_to_id::text
            LEFT JOIN ${schema}.departments dept2 ON us.deptid = dept2.row_id
            LEFT JOIN ${schema}.users us2 ON ta.completed_by = us2.row_id
            LEFT JOIN ${schema}.recurring_task rt ON ta.recurringid = rt.row_id
            WHERE ${whereClauses.join(" AND ")}
              AND us.activestatus = 0
            GROUP BY 
                ta.row_id,
                ta.checklist,
                us1.name,
                dept.department_name,
                us2.name,
                rt.schedule_details,
                rt.row_id,
                us1.role,
                us1.deptid,tc.category_name
            ORDER BY ta.cr_on DESC;
        `;

    //  Check role
    // if (role !== 1) {
    //     return { status: 1, msg: "You are not admin" };
    // }

    const resp = await db_query.customQuery(
      query,
      "Tasks Fetched for Excel",
      params
    );
    // return resp;
    // console.log("resp--------->",resp)

    if (!resp || !resp.data || resp.data.length === 0) {
      console.log(" No data to export");
      // return res.status(404).send({ status: 1, msg: "No data to export" });
      return libFunc.sendResponse(res, { status: 1, msg: "No data to export" });
    }

    //  Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tasks");

    worksheet.columns = [
      { header: "Title", key: "title", width: 30 },
      { header: "Description", key: "description", width: 50 },
      //  { header: 'Completion Date', key: 'completion_date', width: 20,style: { numFmt: 'dd-mm-yyyy' } },
      { header: "Due Date", key: "completion_date", width: 20 },
      { header: "Completion Date", key: "completedon", width: 20 },
      { header: "Department By", key: "department", width: 25 },
      { header: "Assigned By", key: "created_by", width: 25 },
      { header: "Assigned To", key: "assigned_to", width: 40 },
      { header: "Type", key: "task_type", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Frequency ", key: "schedule_type", width: 15 },
      { header: "Due days", key: "due_days", width: 15 },
      { header: "Complete Till", key: "reminder_list", width: 15 },
      { header: "Task Category", key: "task_category_name", width: 15 },
      { header: "Priority", key: "task_priority", width: 15 },
    ];

    //  Add data
    resp.data.forEach((task) => {
      let completeTill = null;

      // Parse reminder_list safely
      if (task.reminder_list) {
        try {
          const parsed = JSON.parse(task.reminder_list);
          completeTill = parsed[0]?.complete_till ?? null;
        } catch (e) {
          console.error(
            "Error parsing reminder_list for task:",
            task.row_id,
            e
          );
        }
      }

      worksheet.addRow({
        title: task.title,
        description: task.description,
        completion_date: Dateformatechange(task.completion_date),
        //    completion_date:task.completion_date,
        created_by: task.created_by,
        department: task.created_by_department,
        assigned_to: (task.assigned_to || []).join(", "),
        task_type: task.task_type_title,
        status: task.status,
        schedule_type: task.schedule_type || "-",
        due_days: task.due_days,
        reminder_list: completeTill ? completeTill : "-",
        completedon: task.completedon
          ? Dateformatechange(task.completedon)
          : "-",
        task_category_name: task.task_category_name
          ? task.task_category_name
          : "-",
        task_priority: task.task_priority,
      });
    });

    //    console.log("req",req.orgId)

    //  Prepare directory (per org)
    const orgFolder = path.join("./public/uploads", organizationid);
    if (!fs.existsSync(orgFolder)) {
      fs.mkdirSync(orgFolder, { recursive: true });
    }

    //  File name and path
    const fileName = `Tasks_${Date.now()}.xlsx`;
    const filePath = path.join(orgFolder, fileName);

    worksheet.getRow(1).font = {
      bold: true,
      size: 12,
    };

    //  Save file to org
    await workbook.xlsx.writeFile(filePath);

    //    console.log(` Excel saved at: ${filePath}`);

    //  Return file path (relative for frontend)
    const fileUrl = `uploads/${organizationid}/${fileName}`;

    //    console.log("filePath",fileUrl)

    //    serverUrl = "https://a43c862e05bd.ngrok-free.app/"
    serverUrl = "https://prosys.ftisindia.com/";

    let response = {
      status: 0,
      msg: "File exported successfully",
      filePath: serverUrl + fileUrl,
    };

    //    console.log("response---",response)

    // res.send(response);
    return libFunc.sendResponse(res, response);
  } catch (err) {
    console.error(" Error exporting Excel:", err);
    // res.status(500).send({ status: 1, msg: "Error exporting Excel" });
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Error exporting Excel",
    });
  }
}

async function createSuperAdmin(req, res) {
  var tablename = schema + ".users";
  const superAdmin_name = req.data.superAdmin_name;
  const email = req.data.email;
  const mobilenumber = req.data.mobilenumber;
  const password = req.data.password;

  if (!superAdmin_name || !email || !password || !mobilenumber) {
    const resp = { status: 1, msg: "Missing required fields" };
    // console.log("response of validation ", resp);
    libFunc.sendResponse(res, resp);
  } else {
    var columns = {
      name: superAdmin_name.trim().replaceAll("'", "`"),
      email: email.trim(),
      password: password.trim(),
      mobilenumber: mobilenumber.trim(),
      organizationid: 0,
      role: 9,
    };
    var respuser = await db_query.addData(tablename, columns, null, "Users");
    // console.log("respuser", respuser);

    libFunc.sendResponse(res, respuser);
  }
}

async function fetchOrganizations(req, res) {
  // console.log("Data")
  const role = req.data.user_role;

  // console.log("role",role)

  try {
    const query = `
            SELECT 
                o.row_id AS org_id,
                o.organization_name,
                o.owner_name,
                o.mobile_number,
                o.gstin,
                b.bill_start_date,
                b.per_month_billing,
                b.payment_status,
                o.cr_on,
                o.up_on,
                (
                    SELECT COUNT(*) FROM prosys.departments d WHERE d.organizationid = o.row_id
                ) AS department_count,
                (
                    SELECT COUNT(*) FROM prosys.users u WHERE u.organizationid = o.row_id
                ) AS user_count,
                (
                    SELECT COUNT(*) FROM prosys.tasks t WHERE t.organizationid = o.row_id
                ) AS tasks_count,
                 (
                    SELECT COUNT(*) FROM prosys.recurring_task rt WHERE rt.organizationid = o.row_id
                ) AS recurring_task_count
            FROM prosys.organizations o
            LEFT JOIN prosys.organization_payment b ON b.organizationid = o.row_id;
        `;

    // if (role === 9) {
    const rows = await db_query.customQuery(
      query,
      "All organization data fetch"
    );

    let msg_data = rows;

    // console.log("data----",msg_data)
    libFunc.sendResponse(res, msg_data);
    // // } else{
    //     let msg_data = { status: 1, msg: "You are not admin" }
    //   //  console.log("msg_data",msg_data)
    //     libFunc.sendResponse(res,msg_data );

    // }
  } catch (err) {
    console.error("Fetch Organizations Error:", err);
    libFunc.sendResponse(res, {
      status: 1,
      msg: "Error fetching organizations",
    });
  }
}

async function updateOrganizations(req, res) {
  try {
    const { row_id, bill_start_date, per_month_billing } = req.data || {};

    if (!row_id) {
      return libFunc.sendResponse(res, {
        success: false,
        message: "organization row_id is required",
      });
    }

    const tableName = `${schema}.organization_payment`;

    // const resp = await db_query.addData(tableName, columns, organizationid, "organization payment details");

    const query = `
          Update ${tableName} set bill_start_date = '${bill_start_date}',
          per_month_billing = '${per_month_billing}' where organizationid = '${row_id}'
        `;

    const resp = await db_query.customQuery(
      query,
      "Organizational billing date and monthly data updated"
    );

    // console.log("DB Response:----", resp);

    return libFunc.sendResponse(res, resp);
  } catch (error) {
    console.error("Error in updateOrganizations:", error);
    return libFunc.sendResponse(res, {
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

async function fetchReportsofwhatapps(req, res) {
  try {
    const { organizationid, from_date, to_date } = req.data;
    //  console.log("request---------", req.data);

    let baseConditions = [`organizationid = '${organizationid}'`];

    if (from_date && to_date) {
      baseConditions.push(
        `cr_on::date BETWEEN '${from_date}' AND '${to_date}'`
      );
    }

    //   add filter for only failed
    let failedConditions = [
      ...baseConditions,
      `response_data->>'result' = 'false'`,
    ];

    // Fetch only failed logs
    const logsQuery = `
            SELECT row_id, mobilenumber, receiver_user, template_name,
                   request_data, response_data, cr_on, others_details, organizationid
            FROM prosys.whatsapp_log
            WHERE ${failedConditions.join(" AND ")}
            ORDER BY cr_on DESC
        `;
    const logs = await db_query.customQuery(
      logsQuery,
      "Failed WhatsApp report data fetch"
    );

    // Fetch success & failed counts
    const countQuery = `
            SELECT 
                SUM(CASE WHEN response_data->>'result' = 'true' THEN 1 ELSE 0 END) AS success_count,
                SUM(CASE WHEN response_data->>'result' = 'false' THEN 1 ELSE 0 END) AS failed_count
            FROM prosys.whatsapp_log
            WHERE ${baseConditions.join(" AND ")}
        `;
    const counts = await db_query.customQuery(
      countQuery,
      "WhatsApp response count"
    );

    // Final response structure
    const response = {
      status: logs.status,
      msg: logs.msg,
      data: {
        counts: {
          success_count: counts.data[0]?.success_count || 0,
          failed_count: counts.data[0]?.failed_count || 0,
        },
        records: logs.data || [], //  Only failed records
      },
    };

    // console.log("final data----", response.data.records);
    // console.log("final data----", response);

    libFunc.sendResponse(res, response);
  } catch (error) {
    console.error("Error fetching WhatsApp logs:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

async function testdata(req, res) {
  // console.log("data")
  // checkRecurringTasks()
  // checkOverdueTasks()
  // checkDueDateForToday()
}

// checkOverdueTasks()

async function fetchlastImporttask(req, res) {
  try {
    const organizationid = req.data.orgId;

    const latestQuery = `
      SELECT * 
      FROM prosys.imported_task_history 
      WHERE organizationid = $1 
      ORDER BY cr_on DESC 
      LIMIT 1
    `;
    const latestResult = await db_query.customQuery(
      latestQuery,
      "fetch last import",
      [organizationid]
    );

    // console.log("latestResult:", latestResult);

    // Adjusted check depending on result shape
    const rows = latestResult.data || latestResult.rows || [];
    if (rows.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "No import history found",
      });
    }

    const lastImport = rows[0];

    const response = {
      status: 0,
      msg: "Last import fetched successfully",
      data: {
        row_id: lastImport.row_id,
        validTasks: lastImport.validtasks || [],
        invalidTasks: lastImport.invalidtasks || [],
        created_on: lastImport.cr_on,
        validTasksCount: lastImport.validcount,
        invalidTasksCount: lastImport.invalidcount,
        msg: "Last imported excel data",
      },
    };

    // console.log("res",response)
    return libFunc.sendResponse(res, response);
  } catch (err) {
    // console.error("Error fetching last import:", err);
    return libFunc.sendResponse(res, {
      status: 500,
      msg: "Internal Server Error",
      error: err.message,
    });
  }
}

async function activeUser(req, res) {
  var memberid = req.data.memberid;
  var tablename = schema + ".users";
  var sqlquery = `UPDATE ${schema}.users SET activestatus = 0 WHERE row_id = $1`;
  // console.log("sqlquery", sqlquery);
  connect_db.query(sqlquery, [memberid], (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "User Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      var resp = {
        status: 0,
        msg: "Active User Successfully",
      };
      // console.log("response", resp);
      libFunc.sendResponse(res, resp);
    }
  });
}

async function fetchInactiveUserList(req, res) {
  // console.log("fetchInactiveUserList ------->", req);
  var organizationid = req.data.orgId;
  // var isTeam = req.data.isTeam;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;
  let query, params;

  query = `SELECT us.name,us.row_id,us.image_url as photo_path,de.department_name as dep_name,
            CASE 
                WHEN us.role = 0 THEN 'User'
                WHEN us.role = 1 THEN 'Admin'
                WHEN us.role = 2 THEN 'Dept-admin'
                WHEN us.role = 3 THEN 'Top-management'
                ELSE 'unknown'
            END AS rolevalue
            FROM ${schema}.users us
            LEFT JOIN ${schema}.departments de on us.deptid=de.row_id
            WHERE us.organizationid = $1 AND us.activestatus = 1
            ORDER BY us.deptid, us.cr_on DESC LIMIT $2 OFFSET $3`;
  params = [organizationid, limit, offset];

  // console.log("query===========");
  // console.log(query, params);
  connect_db.query(query, params, (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "Users Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      if (result.rows.length > 0) {
        var resp = {
          status: 0,
          msg: "Inactive Users Fetched Successfully",
          data: result.rows,
        };
        // console.log("Inactive Users response ", resp);
        libFunc.sendResponse(res, resp);
      } else {
        var resp = {
          status: 1,
          msg: "Users Not Found",
        };
        // console.log("response", resp);
        libFunc.sendResponse(res, resp);
      }
    }
  });
}

// /**
//  *  Generate a Task Summary Report and report should be automatically shared via WhatsApp
//  */

async function fetchTaskSummary(period = "weekly", schema = "prosys") {
  // Get current datetime
  const nowIST = new Date();

  // Format helper (YYYY-MM-DD)
  const formatDate = (d) => d.toISOString().split("T")[0];
  //         const formatDate = (d) => {
  //   const day = String(d.getDate()).padStart(2, '0');
  //   const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  //   const year = d.getFullYear();

  //   return `${day}-${month}-${year}`;
  // };

  // Exclude today -> endDate = yesterday
  const endDateObj = new Date(nowIST);
  endDateObj.setDate(endDateObj.getDate() - 1);
  const endDate = formatDate(endDateObj);

  let startDateObj = new Date(nowIST);

  if (period === "weekly") {
    // Last 7 days (excluding today)
    startDateObj.setDate(startDateObj.getDate() - 7);
  } else if (period === "monthly") {
    // First day of the current month
    startDateObj.setDate(1);
  }

  const startDate = formatDate(startDateObj);
  // console.log("startDate------>",Dateformatechange(startDate))

  // const startDate = "01-01-2026";
  // const endDate = "27-01-2026";

  // console.log("startDate:", startDate);
  // console.log("endDate:", endDate);

  const query = `
  SELECT
      t.row_id AS task_id,
      t.cr_on::date,
      t.title,
      t.description,
      t.completion_date,
      t.assigned_by,
      t.assigned_to,
      t.organizationid,
      o.organization_name,
      u1.name AS assigner_name,
      u2.name AS assignee_name,
      u2.deptid AS department_id,
      COALESCE(d.department_name, 'Owner') AS department_name,
      CASE
          WHEN t.active_status = 0 THEN 'ongoing'
          WHEN t.active_status = 1 THEN 'complete'
          WHEN t.active_status = 2 THEN 'overdue'
          ELSE 'Unknown'
      END AS status,
      CASE
          WHEN t.task_type = '0' THEN 'Normal'
          WHEN t.task_type = '1' THEN 'Recurring'
      END AS task_type_title,
      CASE
          WHEN t.active_status = 1 AND t.completion_date < CURRENT_DATE 
              THEN t.up_on::date - t.completion_date
          WHEN t.completion_date >= CURRENT_DATE 
              THEN (t.completion_date - CURRENT_DATE)
          ELSE t.completion_date - CURRENT_DATE
      END AS due_days,
      CASE
                    WHEN t.active_status = 1 THEN 'completed'
                    WHEN t.completion_date >= CURRENT_DATE 
                        THEN 'due_in'
                    ELSE 'overdue_by'
                END AS due_label
  FROM ${schema}.tasks t
  LEFT JOIN ${schema}.users u1 ON t.assigned_by = u1.row_id
  LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(t.assigned_to, '[]'::jsonb)) AS at(user_id) ON TRUE
  LEFT JOIN ${schema}.users u2 ON u2.row_id::text = at.user_id
  LEFT JOIN ${schema}.departments d ON u2.deptid = d.row_id
  LEFT JOIN ${schema}.organizations o ON t.organizationid = o.row_id
  WHERE t.cr_on::date BETWEEN '${startDate}' AND '${endDate}'
  AND (u2.activestatus = 0 OR u2.activestatus IS NULL)
  ORDER BY o.organization_name, d.department_name, t.completion_date;
  `;

  const result = await queries.custom_query(query);
  //   console.log("result----",result)
  return result;
}

async function fetchDepartmentSummary(startDate, endDate, orgID) {
  const query = `
  WITH task_users AS (
    SELECT
      t.row_id AS task_id,
      d.department_name,
      t.active_status
    FROM prosys.tasks t
    LEFT JOIN LATERAL jsonb_array_elements_text(t.assigned_to) AS assignee(user_id) ON TRUE
    LEFT JOIN prosys.users u ON u.row_id::text = assignee.user_id
    LEFT JOIN prosys.departments d ON u.deptid = d.row_id
    WHERE 
      t.organizationid = '${orgID}' 
      AND t.cr_on::date BETWEEN '${startDate}' AND '${endDate}'
      AND (u.activestatus = 0 OR u.activestatus IS NULL)
  ),
  unique_tasks AS (
    SELECT DISTINCT task_id, department_name, active_status
    FROM task_users
    WHERE department_name IS NOT NULL
  )
  SELECT
    department_name,
    COUNT(*) FILTER (WHERE active_status = 0) AS ongoing_count,
    COUNT(*) FILTER (WHERE active_status = 1) AS complete_count,
    COUNT(*) FILTER (WHERE active_status = 2) AS overdue_count
  FROM unique_tasks
  GROUP BY department_name
  ORDER BY department_name;
  `;
  return await queries.custom_query(query);
}

// add pdf header
function addHeader(doc, orgName, deptName, headerImgPath, startDate, endDate) {
  try {
    if (fs.existsSync(headerImgPath)) {
      doc.image(headerImgPath, 25, 10, { width: 100 });
    }
  } catch (e) {
    console.log("Header image not found:", e.message);
  }

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text(`${orgName} - ${deptName}`, 150, 25, { align: "left" });

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Format dates
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);

  //   console.log("StartDate->",startDate ,"EndDate->",endDate)

  //   console.log("formattedStartDate->",formattedStartDate ,"formattedEndDate->",formattedEndDate)

  // Subheader: generated by + date range
  doc
    .fontSize(9)
    .font("Helvetica-Oblique")
    .fillColor("#424242")
    .text(
      `Generated by Prosys | ${formattedStartDate} to ${formattedEndDate}`,
      150,
      45,
      { align: "left" }
    );

  // Light line under header
  const lineY = 65;
  doc
    .moveTo(doc.page.margins.left, lineY)
    .lineTo(doc.page.width - doc.page.margins.right, lineY)
    .lineWidth(0.5)
    .strokeColor("#b0bec5")
    .stroke();
}

// function to add table header
function drawTableHeader(doc, headers, colWidths, x, y, headerBg = "#1a237e") {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);

  // Draw header background
  doc.rect(x, y, totalWidth, 25).fill(headerBg).stroke();

  doc.fillColor("#ffffff").fontSize(11).font("Helvetica-Bold");

  let xPos = x;
  headers.forEach((header, i) => {
    doc.text(header, xPos + 5, y + 7, { width: colWidths[i] - 10 });

    // Draw vertical border line for each column
    doc
      .moveTo(xPos, y)
      .lineTo(xPos, y + 25)
      .lineWidth(0.3)
      .strokeColor("#b0bec5")
      .stroke();

    xPos += colWidths[i];
  });

  // Draw right-most vertical border
  doc
    .moveTo(xPos, y)
    .lineTo(xPos, y + 25)
    .lineWidth(0.3)
    .strokeColor("#b0bec5")
    .stroke();

  // Draw bottom horizontal border
  doc
    .moveTo(x, y + 25)
    .lineTo(x + totalWidth, y + 25)
    .lineWidth(0.3)
    .strokeColor("#b0bec5")
    .stroke();

  return y + 25;
}

// function to add table rows
function drawTableRow(
  doc,
  row,
  colWidths,
  x,
  y,
  rowHeight,
  rowColor = "#ffffff"
) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);

  // Draw row background
  doc.rect(x, y, totalWidth, rowHeight).fill(rowColor).stroke();

  doc.fillColor("#000000").font("Helvetica").fontSize(10);

  let xPos = x;
  row.forEach((text, i) => {
    doc.text(String(text), xPos + 5, y + 7, { width: colWidths[i] - 10 });

    // Draw vertical border
    doc
      .moveTo(xPos, y)
      .lineTo(xPos, y + rowHeight)
      .lineWidth(0.3)
      .strokeColor("#b0bec5")
      .stroke();

    xPos += colWidths[i];
  });

  // Draw right-most vertical border
  doc
    .moveTo(xPos, y)
    .lineTo(xPos, y + rowHeight)
    .lineWidth(0.3)
    .strokeColor("#b0bec5")
    .stroke();

  // Draw bottom horizontal border
  doc
    .moveTo(x, y + rowHeight)
    .lineTo(x + totalWidth, y + rowHeight)
    .lineWidth(0.3)
    .strokeColor("#b0bec5")
    .stroke();

  return y + rowHeight;
}

// Main PDF generator

async function generateTaskReportPDF(tasks, period, schema) {
  const reports = [];
  const MARGIN_LEFT = 40,
    MARGIN_RIGHT = 30;

  const rootPath = path.resolve(__dirname, "../../");
  // console.log("rootpath",rootPath,"__dirname",__dirname)
  const baseUploadsDir = path.join(rootPath, "public", "uploads");
  // console.log("baseUploadsDir",baseUploadsDir)

  // Get current  datetime
  const nowIST = new Date();

  // Format helper (YYYY-MM-DD)
  const formatDate = (d) => d.toISOString().split("T")[0];

  //     const formatDate = (d) => {
  //   const day = String(d.getDate()).padStart(2, '0');
  //   const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  //   const year = d.getFullYear();

  //   return `${day}-${month}-${year}`;
  // };

  // Exclude today → endDate = yesterday
  const endDateObj = new Date(nowIST);
  endDateObj.setDate(endDateObj.getDate() - 1);
  const endDate = formatDate(endDateObj);

  let startDateObj = new Date(nowIST);

  if (period === "weekly") {
    // Last 7 days (excluding today)
    startDateObj.setDate(startDateObj.getDate() - 7);
  } else if (period === "monthly") {
    // First day of the current month
    startDateObj.setDate(1);
  }

  const startDate = formatDate(startDateObj);

  //    const startDate = "01-01-2026";
  //    const endDate = "27-01-2026";

  // console.log("startDate:", startDate);
  // console.log("endDate:", endDate);

  // Group by organization
  const orgGroups = (tasks || []).reduce((acc, task) => {
    const orgId = task.organizationid
      ? task.organizationid.toString()
      : "unknown_org";
    if (!acc[orgId]) acc[orgId] = [];
    acc[orgId].push(task);
    return acc;
  }, {});

  for (const [organizationid, orgTasks] of Object.entries(orgGroups)) {
    const orgName = orgTasks[0]?.organization_name || "Unknown Organization";

    const orgFolder = path.join(baseUploadsDir, organizationid);
    if (!fs.existsSync(orgFolder)) fs.mkdirSync(orgFolder, { recursive: true });

    // Group tasks by department
    const deptGroups = orgTasks.reduce((acc, t) => {
      const dept = t.department_name || "Owner";
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(t);
      return acc;
    }, {});

    if (!deptGroups["Owner"]) {
      deptGroups["Owner"] = [];
    }

    for (const [deptName, deptTasks] of Object.entries(deptGroups)) {
      // const sanitizedDept = deptName.replace(/\s+/g, "_");
      const departmentId =
        deptName.toLowerCase() === "owner"
          ? "owner"
          : deptTasks[0]?.department_id;

      if (!departmentId) continue;

      const deptFolder = path.join(orgFolder, departmentId);

      if (!fs.existsSync(deptFolder))
        fs.mkdirSync(deptFolder, { recursive: true });

      const fileName = `Tasks_${Date.now()}.pdf`;
      const filePath = path.join(deptFolder, fileName);

      const doc = new PDFDocument({
        margin: 10,
        size: "A4",
        layout: "landscape",
      });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const rootPath = path.dirname(__dirname);
      // console.log("__dirname", __dirname)
      // console.log("rootPath", rootPath)
      const headerImgPath = path.join(
        baseUploadsDir,
        "image",
        "prosyslogo.png"
      );

      // console.log("headerImage",headerImgPath)

      addHeader(doc, orgName, deptName, headerImgPath, startDate, endDate);
      let y = 70;
      y += 30;

      //  Step 1: Merge same tasks (multi-assignee -> one task)
      const mergedTasksMap = new Map();
      for (const t of deptTasks) {
        const key = t.task_id || t.row_id;
        if (!mergedTasksMap.has(key)) {
          mergedTasksMap.set(key, {
            ...t,
            assignee_list: new Set(t.assignee_name ? [t.assignee_name] : []),
          });
        } else {
          const existing = mergedTasksMap.get(key);
          if (t.assignee_name) existing.assignee_list.add(t.assignee_name);
        }
      }

      const mergedTasks = Array.from(mergedTasksMap.values()).map((t) => ({
        ...t,
        assignee_name: Array.from(t.assignee_list).join(", "),
      }));

      //  Step 2: Compute Summary
      let ownSummary = { ongoing: 0, complete: 0, overdue: 0 };

      if (deptName.toLowerCase() !== "owner") {
        ownSummary = {
          ongoing: mergedTasks.filter(
            (t) => t.status?.toLowerCase() === "ongoing"
          ).length,
          complete: mergedTasks.filter(
            (t) => t.status?.toLowerCase() === "complete"
          ).length,
          overdue: mergedTasks.filter(
            (t) => t.status?.toLowerCase() === "overdue"
          ).length,
        };

        doc
          .fontSize(13)
          .font("Helvetica-Bold")
          .fillColor("#000")
          .text("Task Summary Overview", 40, y);
      } else {
        const summaryData = await fetchDepartmentSummary(
          startDate,
          endDate,
          organizationid
        );
        ownSummary = {
          ongoing: summaryData.reduce(
            (sum, d) => sum + Number(d.ongoing_count || 0),
            0
          ),
          overdue: summaryData.reduce(
            (sum, d) => sum + Number(d.overdue_count || 0),
            0
          ),
          complete: summaryData.reduce(
            (sum, d) => sum + Number(d.complete_count || 0),
            0
          ),
        };
        doc
          .fontSize(13)
          .font("Helvetica-Bold")
          .fillColor("#000")
          .text("Task Summary Overview (All Departments)", 40, y);
      }
      y += 25;

      // Draw summary boxes
      const labelWidth = 100,
        labelHeight = 25,
        spacing = 20;
      let x = MARGIN_RIGHT;
      const summaryColors = {
        ongoing: "#1565c0",
        overdue: "#c62828",
        complete: "#2e7d32",
      };
      for (const key of ["ongoing", "overdue", "complete"]) {
        doc
          .rect(x, y, labelWidth, labelHeight)
          .fill(summaryColors[key])
          .stroke();
        doc
          .fillColor("#fff")
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(
            `${key.charAt(0).toUpperCase() + key.slice(1)}: ${ownSummary[key]}`,
            x + 8,
            y + 7
          );
        x += labelWidth + spacing;
      }
      y += labelHeight + 30;

      //  Step 3: User-wise Summary (based on merged tasks)
      if (deptName.toLowerCase() !== "owner") {
        const userGroups = deptTasks.reduce((acc, task) => {
          const user = task.assignee_name || "Unassigned";
          if (!acc[user]) acc[user] = [];
          acc[user].push(task);
          return acc;
        }, {});

        let userSummary = Object.entries(userGroups).map(
          ([userName, tasks]) => ({
            userName,
            department: tasks[0]?.department_name || "Owner",
            ongoing: tasks.filter((t) => t.status.toLowerCase() === "ongoing")
              .length,
            overdue: tasks.filter((t) => t.status.toLowerCase() === "overdue")
              .length,
            complete: tasks.filter((t) => t.status.toLowerCase() === "complete")
              .length,
          })
        );

        // Sort users: highest overdue first, then ongoing, then name alphabetically
        userSummary = userSummary.sort((a, b) => {
          if (b.overdue !== a.overdue) return b.overdue - a.overdue;
          if (b.ongoing !== a.ongoing) return b.ongoing - a.ongoing;
          return a.userName.localeCompare(b.userName);
        });

        if (userSummary.length > 0) {
          doc
            .fontSize(13)
            .font("Helvetica-Bold")
            .fillColor("#000")
            .text("User-wise Task Summary", 40, y);
          y += 25;

          const headers = [
            "#",
            "User",
            "Department",
            "Ongoing",
            "Overdue",
            "Complete",
          ];
          const colWidths = [30, 100, 100, 60, 60, 70];
          y = drawTableHeader(doc, headers, colWidths, MARGIN_RIGHT, y);

          userSummary.forEach((user, idx) => {
            if (y > 500) {
              doc.addPage();
              addHeader(
                doc,
                orgName,
                deptName,
                headerImgPath,
                startDate,
                endDate
              );
              y = 100;
              y = drawTableHeader(doc, headers, colWidths, MARGIN_RIGHT, y);
            }
            const rowColor = idx % 2 === 0 ? "#f5f5f5" : "#ffffff";
            const row = [
              idx + 1,
              user.userName,
              user.department,
              user.ongoing,
              user.overdue,
              user.complete,
            ];
            y = drawTableRow(
              doc,
              row,
              colWidths,
              MARGIN_RIGHT,
              y,
              25,
              rowColor
            );
          });

          y += 20;
        }
      }

      if (deptName.toLowerCase() === "owner") {
        const summaryData = await fetchDepartmentSummary(
          startDate,
          endDate,
          organizationid
        );

        doc
          .fontSize(13)
          .font("Helvetica-Bold")
          .fillColor("#000000")
          .text("All Department Summary", 40, y);
        y += 30;

        const headers = ["#", "Department", "Ongoing", "Overdue", "Complete"];
        const colWidths = [30, 100, 60, 60, 70];
        const rowHeight = 25;

        y = drawTableHeader(doc, headers, colWidths, MARGIN_RIGHT, y);

        summaryData.forEach((dept, i) => {
          if (y + rowHeight > doc.page.height - 80) {
            doc.addPage();
            addHeader(
              doc,
              orgName,
              deptName,
              headerImgPath,
              startDate,
              endDate
            );
            y = 100;
            y = drawTableHeader(doc, headers, colWidths, MARGIN_RIGHT, y);
          }

          const rowColor = i % 2 === 0 ? "#f5f5f5" : "#ffffff";
          const row = [
            i + 1,
            dept.department_name || "Owner",
            dept.ongoing_count || 0,
            dept.overdue_count || 0,
            dept.complete_count || 0,
          ];
          y = drawTableRow(
            doc,
            row,
            colWidths,
            MARGIN_RIGHT,
            y,
            rowHeight,
            rowColor
          );
        });

        y += 40;

        // Optionally, show users per department
        for (const dept of summaryData) {
          if (y > 500) {
            doc.addPage();
            addHeader(
              doc,
              orgName,
              deptName,
              headerImgPath,
              startDate,
              endDate
            );
            y = 100;
          }

          doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor("#0d47a1")
            .text(`Department: ${dept.department_name}`, 40, y);
          y += 25;

          // Fetch users for this department, same as previous logic...
          const userSummaryQuery = `
            WITH task_users AS (
                SELECT
                    t.row_id,
                    u.row_id AS user_id,
                    u.name AS user_name,
                    d.department_name,
                    t.active_status
                FROM prosys.tasks t
                LEFT JOIN LATERAL jsonb_array_elements_text(t.assigned_to) AS assignee(user_id) ON TRUE
                LEFT JOIN prosys.users u ON u.row_id::text = assignee.user_id
                LEFT JOIN prosys.departments d ON u.deptid = d.row_id
                WHERE 
                    t.organizationid = '${organizationid}'
                    AND d.department_name = '${dept.department_name}'
                    AND  t.cr_on::date BETWEEN '${startDate}' AND '${endDate}'
                    AND (u.activestatus = 0 OR u.activestatus IS NULL)
            )
            SELECT
                user_name,
                COUNT(*) FILTER (WHERE active_status = 0) AS ongoing_count,
                COUNT(*) FILTER (WHERE active_status = 1) AS complete_count,
                COUNT(*) FILTER (WHERE active_status = 2) AS overdue_count
            FROM task_users
            WHERE user_name IS NOT NULL 
            GROUP BY user_name
            ORDER BY user_name;
        `;
          const userSummary = await queries.custom_query(userSummaryQuery);

          if (userSummary.length === 0) {
            doc
              .fontSize(10)
              .fillColor("#777")
              .text("No user data found", 60, y);
            y += 20;
            continue;
          }

          const userHeaders = ["#", "User", "Ongoing", "Overdue", "Complete"];
          const userColWidths = [30, 100, 60, 60, 70];
          y = drawTableHeader(doc, userHeaders, userColWidths, MARGIN_RIGHT, y);

          userSummary.forEach((u, i) => {
            if (y > 520) {
              doc.addPage();
              addHeader(
                doc,
                orgName,
                deptName,
                headerImgPath,
                startDate,
                endDate
              );
              y = 100;
              y = drawTableHeader(
                doc,
                userHeaders,
                userColWidths,
                MARGIN_RIGHT,
                y
              );
            }

            const rowColor = i % 2 === 0 ? "#fafafa" : "#ffffff";
            const row = [
              i + 1,
              u.user_name,
              u.ongoing_count || 0,
              u.overdue_count || 0,
              u.complete_count || 0,
            ];
            y = drawTableRow(
              doc,
              row,
              userColWidths,
              MARGIN_RIGHT,
              y,
              25,
              rowColor
            );
          });

          y += 40;
        }
      }

      const headers = [
        "#",
        "Title/Description",
        "Due Day",
        "Assignee To",
        "Assigned By",
        "Due Date",
        "Frequency",
        "Created On",
      ];
      const colWidths = [30, 220, 60, 80, 80, 60, 80, 70];

      // CASE 1: Normal Department (non-owner)
      if (deptName.toLowerCase() !== "owner") {
        const statusGroups = mergedTasks.reduce((acc, t) => {
          const s = (t.status || "unknown").toLowerCase().trim();
          if (!acc[s]) acc[s] = [];
          acc[s].push(t);
          return acc;
        }, {});

        for (const [statusName, statusTasks] of Object.entries(statusGroups)) {
          if (y > 500) {
            doc.addPage();
            addHeader(
              doc,
              orgName,
              deptName,
              headerImgPath,
              startDate,
              endDate
            );
            y = 100;
          }

          const count = statusTasks.length;
          const color =
            statusName === "ongoing"
              ? "#1565c0"
              : statusName === "complete"
              ? "#2e7d32"
              : "#c62828";

          doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor(color)
            .text(`${statusName.toUpperCase()} (${count})`, 40, y);
          y += 25;

          y = drawTableHeader(doc, headers, colWidths, MARGIN_RIGHT, y);

          for (let i = 0; i < statusTasks.length; i++) {
            const t = statusTasks[i];
            const description = t.description || "";
            const descHeight = description
              ? doc.heightOfString(description, { width: colWidths[1] - 10 })
              : 0;
            const totalRowHeight = 25 + descHeight + 10;

            if (y + totalRowHeight > doc.page.height - 80) {
              doc.addPage();
              addHeader(
                doc,
                orgName,
                deptName,
                headerImgPath,
                startDate,
                endDate
              );
              y = 100;
              y = drawTableHeader(doc, headers, colWidths, MARGIN_RIGHT, y);
            }

            const rowColor = i % 2 === 0 ? "#f9f9f9" : "#ffffff";

            let dueLabel = "-";
            if (t.due_label === "completed") {
              dueLabel = `Done ${t.due_days} day(s) later`;
            } else if (t.due_label === "overdue_by") {
              dueLabel = `Overdue by ${Math.abs(t.due_days)} day(s)`;
            } else if (t.due_label === "due_in") {
              dueLabel = `Due in ${t.due_days} day(s)`;
            }

            const rowData = [
              i + 1,
              t.title + (description ? `\n${description}` : ""),
              dueLabel,
              t.assignee_name || "",
              t.assigner_name || "",
              t.completion_date
                ? new Date(t.completion_date).toLocaleDateString("en-IN")
                : "",
              t.task_type_title || "",
              Dateformatechange(t.cr_on),
            ];

            y = drawTableRow(
              doc,
              rowData,
              colWidths,
              MARGIN_RIGHT,
              y,
              totalRowHeight,
              rowColor
            );
          }
          y += 20;
        }
      }

      // CASE 2: OWNER – show Owner’s tasks + All Dept tasks separately
      else {
        // OWNER’s OWN TASKS
        const ownerTasks = deptGroups["Owner"] || [];
        const mergedOwnerMap = new Map();
        for (const t of ownerTasks) {
          const key = t.task_id || t.row_id;
          if (!mergedOwnerMap.has(key)) {
            mergedOwnerMap.set(key, {
              ...t,
              assignee_list: new Set(t.assignee_name ? [t.assignee_name] : []),
            });
          } else {
            const existing = mergedOwnerMap.get(key);
            if (t.assignee_name) existing.assignee_list.add(t.assignee_name);
          }
        }

        const mergedOwnerTasks = Array.from(mergedOwnerMap.values()).map(
          (t) => ({
            ...t,
            assignee_name: Array.from(t.assignee_list).join(", "),
          })
        );

        if (mergedOwnerTasks.length > 0) {
          doc
            .fontSize(13)
            .font("Helvetica-Bold")
            .fillColor("#000000")
            .text("OWNER'S OWN TASKS", 40, y);
          y += 25;

          const statusGroups = mergedOwnerTasks.reduce((acc, t) => {
            const s = (t.status || "unknown").toLowerCase().trim();
            if (!acc[s]) acc[s] = [];
            acc[s].push(t);
            return acc;
          }, {});

          y = drawStatusGroups(
            doc,
            statusGroups,
            headers,
            colWidths,
            MARGIN_RIGHT,
            y,
            orgName,
            deptName,
            headerImgPath
          );
        }

        y += 30;

        //  ALL DEPARTMENTS TASKS
        doc
          .fontSize(13)
          .font("Helvetica-Bold")
          .fillColor("#000000")
          .text("ALL DEPARTMENTS TASKS", 40, y);
        y += 25;

        for (const [depName, depTasks] of Object.entries(deptGroups)) {
          if (depName.toLowerCase() === "owner") continue; // skip owner, already shown
          if (depTasks.length === 0) continue;

          doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor("#0d47a1")
            .text(`Department: ${depName}`, 40, y);
          y += 20;

          const mergedDepMap = new Map();
          for (const t of depTasks) {
            const key = t.task_id || t.row_id;
            if (!mergedDepMap.has(key)) {
              mergedDepMap.set(key, {
                ...t,
                assignee_list: new Set(
                  t.assignee_name ? [t.assignee_name] : []
                ),
              });
            } else {
              const existing = mergedDepMap.get(key);
              if (t.assignee_name) existing.assignee_list.add(t.assignee_name);
            }
          }

          const mergedDepTasks = Array.from(mergedDepMap.values()).map((t) => ({
            ...t,
            assignee_name: Array.from(t.assignee_list).join(", "),
          }));

          const statusGroups = mergedDepTasks.reduce((acc, t) => {
            const s = (t.status || "unknown").toLowerCase().trim();
            if (!acc[s]) acc[s] = [];
            acc[s].push(t);
            return acc;
          }, {});

          y = drawStatusGroups(
            doc,
            statusGroups,
            headers,
            colWidths,
            MARGIN_RIGHT,
            y,
            orgName,
            deptName,
            headerImgPath
          );
          y += 30;
        }
      }

      // drawing grouped status tables
      function drawStatusGroups(
        doc,
        statusGroups,
        headers,
        colWidths,
        MARGIN_RIGHT,
        y,
        orgName,
        deptName,
        headerImgPath
      ) {
        for (const [statusName, statusTasks] of Object.entries(statusGroups)) {
          if (y > 500) {
            doc.addPage();
            addHeader(
              doc,
              orgName,
              deptName,
              headerImgPath,
              startDate,
              endDate
            );
            y = 100;
          }

          const count = statusTasks.length;
          const color =
            statusName === "ongoing"
              ? "#1565c0"
              : statusName === "complete"
              ? "#2e7d32"
              : "#c62828";
          doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor(color)
            .text(`${statusName.toUpperCase()} (${count})`, 40, y);
          y += 25;

          y = drawTableHeader(doc, headers, colWidths, MARGIN_RIGHT, y);

          for (let i = 0; i < statusTasks.length; i++) {
            const t = statusTasks[i];
            const description = t.description || "";
            const descHeight = description
              ? doc.heightOfString(description, { width: colWidths[1] - 10 })
              : 0;
            const totalRowHeight = 25 + descHeight + 10;

            if (y + totalRowHeight > doc.page.height - 80) {
              doc.addPage();
              addHeader(
                doc,
                orgName,
                deptName,
                headerImgPath,
                startDate,
                endDate
              );
              y = 100;
              y = drawTableHeader(doc, headers, colWidths, MARGIN_RIGHT, y);
            }

            const rowColor = i % 2 === 0 ? "#f9f9f9" : "#ffffff";
            let dueLabel = "-";
            if (t.due_label === "completed") {
              dueLabel = `Done ${t.due_days} day(s) later`;
            } else if (t.due_label === "overdue_by") {
              dueLabel = `Overdue by ${Math.abs(t.due_days)} day(s)`;
            } else if (t.due_label === "due_in") {
              dueLabel = `Due in ${t.due_days} day(s)`;
            }

            const rowData = [
              i + 1,
              t.title + (description ? `\n${description}` : ""),
              dueLabel,
              t.assignee_name || "",
              t.assigner_name || "",
              t.completion_date
                ? new Date(t.completion_date).toLocaleDateString("en-IN")
                : "",
              t.task_type_title || "",
              Dateformatechange(t.cr_on),
            ];

            y = drawTableRow(
              doc,
              rowData,
              colWidths,
              MARGIN_RIGHT,
              y,
              totalRowHeight,
              rowColor
            );
          }
          y += 20;
        }

        return y;
      }

      doc.end();

      const serverUrl = "https://prosys.ftisindia.com/";
      // const serverUrl = "https://3953cf73502c.ngrok-free.app/";
      const fileUrl = `${serverUrl}uploads/${organizationid}/${departmentId}/${fileName}`;

      await new Promise((resolve, reject) => {
        writeStream.on("finish", () => {
          reports.push({
            organizationid,
            department: deptName,
            departmentid: deptTasks[0]?.department_id || null,
            fileUrl,
            isOwnerReport: deptName.toLowerCase() === "owner",
            summary: ownSummary,
            startDate,
            endDate,
          });
          resolve();
        });
        writeStream.on("error", (err) => {
          console.error(`File Save Error: ${fileName}`, err);
          reject(err);
        });
      });

      // const serverUrl = "https://prosys.ftisindia.com/";
      // // const serverUrl = "https://830c69112651.ngrok-free.app/";
      // const fileUrl = `${serverUrl}uploads/${organizationid}/${sanitizedDept}/${fileName}`;
      // reports.push({
      //     organizationid,
      //     department: deptName,
      //     departmentid: deptTasks[0]?.department_id || null,
      //     fileUrl,
      //     isOwnerReport: deptName.toLowerCase() === "owner",
      //     summary:ownSummary,
      //     startDate,endDate
      // });
    }
  }

  // console.log("org----->",orgGroups)
  return reports;
}

async function getDepartmentAdminEmail(orgId, department) {
  const q = `
      SELECT email 
      FROM prosys.users 
      WHERE role = 2 
        AND organizationid = '${orgId}'
        AND deptid = '${department}'
      LIMIT 1
    `;
  const r = await queries.custom_query(q, "OK");
  return r?.[0]?.email || null;
}

async function getOwnerEmail(orgId) {
  const q = `
      SELECT email 
      FROM prosys.users 
      WHERE role = 1 
        AND organizationid = '${orgId}'
      LIMIT 1
    `;
  const r = await queries.custom_query(q, "OK");
  return r?.[0]?.email || null;
}

async function sendReportsToEmail(reports, period) {
  let successCount = 0;
  let failCount = 0;

  for (const report of reports) {
    try {
      const ownerEmail = await getOwnerEmail(report.organizationid);
      const deptAdminEmail = await getDepartmentAdminEmail(
        report.organizationid,
        report.departmentid
      );

      const emailPayload = {
        period,
        department: report.department,
        pdfUrl: report.fileUrl,
        summary: report.summary,
        startDate: Dateformatechange(report.startDate),
        endDate: Dateformatechange(report.endDate),
      };

      // console.log("ownerEmail",ownerEmail)
      // console.log("deptAdminEmail",deptAdminEmail)
      // console.log("what is emailpayload",emailPayload)
      // console.log("reports",report)

      if (report.isOwnerReport && ownerEmail) {
        await auth.sendReportEmail({
          email: ownerEmail,
          ...emailPayload,
        });
        successCount++;
        // console.log("Email sent to owner:", ownerEmail);
      }

      if (!report.isOwnerReport && deptAdminEmail) {
        await auth.sendReportEmail({
          email: deptAdminEmail,
          ...emailPayload,
        });
        successCount++;
        // console.log("Email sent to dept:", deptAdminEmail);
      }
    } catch (err) {
      failCount++;
      console.error("Email send failed:", err);
    }
  }
  console.log(`Email summary: Success=${successCount}, Failed=${failCount}`);
}

async function getOwnerNumber(orgId) {
  const q = `SELECT mobilenumber FROM prosys.users 
             WHERE role=1 AND organizationid='${orgId}' LIMIT 1`;
  const r = await queries.custom_query(q, "OK");
  //   console.log("r- getOwnerNumber", r);
  return r?.[0]?.mobilenumber || null;
}

async function getDepartmentAdmin(orgId, department) {
  // console.log("orgId",orgId,"departments",department)
  const q = `SELECT mobilenumber FROM prosys.users 
             WHERE role=2 AND organizationid='${orgId}' AND deptid='${department}' LIMIT 1`;
  const r = await queries.custom_query(q, "OK");
  //   console.log("r - getDepartmentAdmin", r);
  return r?.[0]?.mobilenumber || null;
}

async function sendReportsToWA(reports) {
  let success = 0;
  let failed = 0;

  for (const report of reports) {
    try {
      const ownerNumber = await getOwnerNumber(report.organizationid);
      // console.log("ownerNumber--->", ownerNumber);
      // console.log("report",report)
      const deptAdminNumber = await getDepartmentAdmin(
        report.organizationid,
        report.departmentid
      );

      // console.log("deptAdminNumber--->", deptAdminNumber);

      const templateData = {
        templateName: process.env.sendReportsToWA,
        languageCode: "en",
        filename: `${report.department}_report.pdf`,
        variable: [],
      };

      // const baseUrlPrefix = 'https://830c69112651.ngrok-free.app/';
      const baseUrlPrefix = "https://prosys.ftisindia.com/";

      if (report.isOwnerReport && ownerNumber) {
        // Send only to owner
        let logdataowner = await connect_acube24.sendTemplateDocument(
          ownerNumber,
          templateData,
          // report.fileUrl.slice(36, 200)
          // report.fileUrl.slice(29, 200)
          report.fileUrl.replace(baseUrlPrefix, "")
        );
        // console.log("logdataowner-->",logdataowner)
        success++;
        console.log(` Sent Owner Report to ${ownerNumber}`);
      } else if (!report.isOwnerReport && deptAdminNumber) {
        // Send only to department admin
        let logdatadepartment = await connect_acube24.sendTemplateDocument(
          deptAdminNumber,
          templateData,
          // report.fileUrl.slice(36, 200)
          // report.fileUrl.slice(29, 200)
          report.fileUrl.replace(baseUrlPrefix, "")
        );
        // console.log("logdatadepartment-->",logdatadepartment)
        success++;
        console.log(` Sent Department Report to ${deptAdminNumber}`);
      } else {
        console.log("No valid WA number");
        failed++;
      }
    } catch (err) {
      failed++;
      console.error("WhatsApp send failed for report:", err);
    }
  }

  console.log(`Whatsapp Summary: Success=${success}, Failed=${failed}`);

  return true;
}

async function processTaskReport(period) {
  console.log("Generating", period, "reports...");

  const tasks = await fetchTaskSummary(period);
  const reports = await generateTaskReportPDF(tasks, period);
  // console.log(reports);

  //     try {
  //     console.log("Sending WhatsApp messages...");
  //     await sendReportsToWA(reports);
  //     } catch (e) {
  //     console.error("WA failed but continuing to email", e);
  //    }

  //    try{
  //     console.log("Sending Email reports...");
  //     await sendReportsToEmail(reports, period);
  //    }catch(e){
  //      console.error("error failed email", e);
  //    }

  // console.log("Finished sending", period, "reports");

  console.log("Starting WA & Email in parallel");

  const results = await Promise.allSettled([
    sendReportsToWA(reports),
    sendReportsToEmail(reports, period),
  ]);

  console.log("Final Results:", results);
}

async function processWeeklytasks() {
  await processTaskReport("weekly");
}

async function processMonthlytasks() {
  await processTaskReport("monthly");
}

// cron for weekly and monthly
// runCron.runWeeklyAt9(processWeeklytasks);
// runCron.runMonthlyAt9(processMonthlytasks)

// testing
// async function runCronfun1() {
//   await processTaskReport("weekly");
// //   await processTaskReport("monthly");
// }

// runCronfun1();

// Add and update task category
async function createTaskCategory(req, res) {
  try {
    // console.log("req", req);
    var organizationid = req.data.orgId;
    var category_name = req.data.category_name;
    if (category_name == undefined || category_name == "") {
      const resp = { status: 1, msg: "Missing required fields" };
      // console.log("response of validation ", resp);
      libFunc.sendResponse(res, resp);
    } else {
      var tablename = schema + ".tasks_categories";

      const checkQuery = `
            SELECT 1 FROM ${tablename}
            WHERE organizationid = '${organizationid}'
            AND LOWER(category_name) = LOWER('${category_name
              .trim()
              .replaceAll("'", "`")}')
            LIMIT 1
        `;
      const checkResult = await db_query.customQuery(checkQuery, "fetched");

      // console.log("checkResult---",checkResult)

      if (checkResult.status === 0) {
        // console.log("Category name already exists")
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Category name already exists",
        });
      }

      var columns = {
        organizationid: organizationid,
        category_name: category_name.trim().replaceAll("'", "`"),
      };
      var resp = await db_query.addData(
        tablename,
        columns,
        req.data.row_id,
        "Category"
      );
      // console.log("resp", resp);
      libFunc.sendResponse(res, resp);
    }
  } catch (err) {
    // console.error("Error in Create Category:", err);
    libFunc.sendResponse(res, {
      status: 0,
      msg: "Server error",
      error: err.message,
    });
  }
}

// Fetch Task category
async function fetchTaskCategory(req, res) {
  var organizationid = req.data.orgId;
  var limit = req.data.limit || 100;
  var page = req.data.page || 1;
  var offset = (page - 1) * limit;
  var query = `SELECT * FROM ${schema}.tasks_categories WHERE organizationid = $1 ORDER BY category_name, cr_on DESC LIMIT $2 OFFSET $3`;
  // console.log("query===========");
  // console.log(query);
  connect_db.query(query, [organizationid, limit, offset], (err, result) => {
    if (err) {
      // console.log(err);
      var resp = {
        status: 1,
        msg: "Category Not Found",
      };
      libFunc.sendResponse(res, resp);
    } else {
      if (result.rows.length > 0) {
        var resp = {
          status: 0,
          msg: "Category Fetched Successfully",
          data: result.rows,
        };
        // console.log("response", resp);
        libFunc.sendResponse(res, resp);
      } else {
        var resp = {
          status: 1,
          msg: "Category Not Found",
        };
        // console.log("response", resp);
        libFunc.sendResponse(res, resp);
      }
    }
  });
}

async function createdefaultComment(req, res) {
  // console.log("requesting",req)
  try {
    const taskIds = req.data.task_ids || [];
    const attachments = req.data.file_path || [];
    const userid = req.data.userId;
    const organizationid = req.data.orgId;

    const commentTable = schema + ".comments";
    const taskTable = schema + ".tasks";

    // -------------------------------
    //  VALIDATION
    // -------------------------------
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      // console.log("No task IDs provided")
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "No task IDs provided",
      });
    }

    if (!attachments || attachments.length === 0) {
      // console.log("Attachment is required")
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Attachment is required",
      });
    }

    let insertedCount = 0;

    // -------------------------------
    //  LOOP THROUGH TASKS
    // -------------------------------
    for (const taskid of taskIds) {
      //  Insert comment for each task
      const commentColumns = {
        taskid: taskid,
        comment: "Default comment",
        userid: userid,
        attachments: JSON.stringify(attachments),
        organizationid: organizationid,
      };

      const resp = await db_query.addData(
        commentTable,
        commentColumns,
        req.data.row_id,
        "Comment"
      );

      if (resp.status === 0) {
        insertedCount++;

        //  Update task attachment status
        await db_query.addData(
          taskTable,
          { is_attachment: false },
          taskid,
          "Update task attachment status"
        );
      }
    }

    // -------------------------------
    //  FINAL RESPONSE
    // -------------------------------
    // console.log("Attachment added to task(s) successfully")
    return libFunc.sendResponse(res, {
      status: 0,
      msg: `Attachment added to ${insertedCount} task(s) successfully`,
      updated_tasks: taskIds,
    });
  } catch (err) {
    // console.error("createComment multi-task error:", err);
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Server error while uploading attachments",
    });
  }
}

/**
 * When comments opens marks as read comments
 */

async function markCommentsSeen(req, res) {
  // console.log("requesting-->",req)
  try {
    const { taskid } = req.data;
    const userid = req.data.userId;
    const organizationid = req.data.orgId;

    const latestCommentQuery = `
        SELECT MAX(id) AS last_comment_id
        FROM prosys.comments
        WHERE taskid = $1 AND organizationid = $2
    `;

    const latest = await db_query.customQuery(
      latestCommentQuery,
      "Latest Comment",
      [taskid, organizationid]
    );

    // console.log("latest commnet",latest)

    if (!latest.data[0].last_comment_id) {
      return libFunc.sendResponse(res, { status: 0 });
    }

    let row_id = libFunc.randomid();

    const upsertQuery = `
       INSERT INTO prosys.comment_reads 
        (row_id, taskid, userid, last_seen_comment_id, organizationid)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (taskid, userid)
    DO UPDATE SET 
        last_seen_comment_id = EXCLUDED.last_seen_comment_id,
        seen_on = now(),
        up_on = now()

    `;

    await db_query.customQuery(upsertQuery, "Marked Seen", [
      row_id,
      taskid,
      userid,
      latest.data[0].last_comment_id,
      organizationid,
    ]);

    libFunc.sendResponse(res, { status: 0, msg: "Comment Marked Seen" });
  } catch (error) {
    console.error("markCommentsSeen error:", error);
    libFunc.sendResponse(res, { status: 1, msg: "Something went wrong" });
  }
}

async function fetchMyTasksSearch(req, res) {
  const userid = req.data.userId;
  const organizationid = req.data.orgId;
  const search = req.data.search || "";

  const active_status =
    req.data.status === "ongoing"
      ? 0
      : req.data.status === "complete"
      ? 1
      : req.data.status === "overdue"
      ? 2
      : undefined;

  const query = `
    SELECT 
        ta.row_id,
        ta.title,
        ta.description,
        ta.completion_date,
        us1.name AS created_by,

        CASE 
            WHEN COUNT(DISTINCT assigned_to_id) = 1
                 AND MAX(assigned_to_id) = $5
            THEN NULL
            ELSE json_agg(DISTINCT us.name)
        END AS assigned_to,

        ta.cr_on AS created_at,
        ta.checklist,

        ta.task_category AS task_category_id,
        tc.category_name AS task_category_name,

        CASE
            WHEN ta.task_priority = '0' THEN 'Regular'
            WHEN ta.task_priority = '1' THEN 'Critical'
        END AS task_priority,

        CASE
            WHEN ta.active_status = '0' THEN 'ongoing'
            WHEN ta.active_status = '1' THEN 'complete'
            WHEN ta.active_status = '2' THEN 'overdue'
        END AS status,

        (ta.completion_date - CURRENT_DATE) AS due_days,

        COUNT(DISTINCT c.id) AS comment_count,

        COALESCE(
            SUM(
                CASE 
                    WHEN jsonb_typeof(c.attachments) = 'array'
                    THEN jsonb_array_length(c.attachments)
                    ELSE 0
                END
            ), 0
        ) AS attachment_count,

        us2.name AS updated_by,
        ta.completedon,
         COUNT(
    DISTINCT CASE
        WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
        THEN c.id
    END
) AS unseen_comment_count,
 CASE
    WHEN COUNT(
        DISTINCT CASE
            WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
            THEN c.id
        END
    ) > 0
    THEN TRUE
    ELSE FALSE
END AS has_unseen_comments, ta.recurringid


    FROM ${schema}.tasks ta

    LEFT JOIN ${schema}.tasks_categories tc 
        ON tc.row_id = ta.task_category 

    INNER JOIN ${schema}.users us1 
        ON ta.assigned_by = us1.row_id

    LEFT JOIN ${schema}.users us2 
        ON ta.completed_by = us2.row_id

    INNER JOIN LATERAL jsonb_array_elements_text(ta.assigned_to) AS assigned_to_id ON TRUE
    INNER JOIN prosys.users us ON us.row_id = assigned_to_id::text

    LEFT JOIN ${schema}.comments c
        ON c.taskid = ta.row_id
        AND c.organizationid = ta.organizationid
    LEFT JOIN prosys.comment_reads cr
    ON cr.taskid = ta.row_id
    AND cr.userid = $5
    AND cr.organizationid = ta.organizationid


    WHERE ta.assigned_to::text LIKE $1
        AND ta.organizationid = $2
        AND ta.active_status = $3
        AND ta.activestatus = 0

        AND (
            ta.title ILIKE $4
            OR ta.description ILIKE $4
            OR us1.name ILIKE $4
            OR us.name ILIKE $4          

        )

    GROUP BY 
        ta.row_id, us1.name, us2.name, tc.category_name
    

    ORDER BY due_days ASC
    `;

  const params = [
    `%${userid}%`,
    organizationid,
    active_status,
    `%${search}%`,
    userid,
  ];

  const resp = await db_query.customQuery(query, "Tasks Fetched", params);

  // console.log("response of searching -->",resp.data)
  // res.send(resp)
  // libFunc.sendResponse(res, resp);

  const groupedData = groupTasksByRecurringId(resp.data);

  //   console.log("seraching-->",groupedData)

  libFunc.sendResponse(res, {
    status: 0,
    message: "Tasks fetched",
    data: groupedData,
  });
}

async function fetchMyAssignedTasksSearch(req, res) {
  // console.log("req",req)
  try {
    const userid = req.data.ismember ? req.data.memberid : req.data.userId;
    const organizationid = req.data.orgId;
    const search = req.data.search || "";

    const active_status =
      req.data.status === "ongoing"
        ? 0
        : req.data.status === "complete"
        ? 1
        : req.data.status === "overdue"
        ? 2
        : undefined;

    const limit = req.data.limit || 100;
    const page = req.data.page || 1;
    const offset = (page - 1) * limit;

    const filters = req.data.filters || {};
    const assignedToFilter = Array.isArray(filters.assigned_to)
      ? filters.assigned_to
      : [];

    const startDate = filters.completion_startDate || null;
    const endDate = filters.completion_endDate || null;

    let params = [userid, organizationid];
    let paramIndex = 3;

    const searchBlock = buildAssignedTaskSearch(search, paramIndex);
    if (searchBlock.sql) {
      params.push(...searchBlock.params);
      paramIndex++;
    }

    let sql = `
SELECT
    ta.row_id,
    ta.title,
    ta.description,
    ta.task_category AS task_category_id,
    tc.category_name AS task_category_name,
    CASE
        WHEN ta.task_priority = '0' THEN 'Regular'
        WHEN ta.task_priority = '1' THEN 'Critical'
    END AS task_priority,
    ta.checklist,
    ta.completion_date,
    us1.name AS created_by,
    ta.cr_on AS created_at,
    json_agg(DISTINCT us.name) AS assigned_to,
    CASE
        WHEN ta.active_status = '0' THEN 'ongoing'
        WHEN ta.active_status = '1' THEN 'complete'
        WHEN ta.active_status = '2' THEN 'overdue'
    END AS status,
    (ta.completion_date - CURRENT_DATE) AS due_days,
    COUNT(DISTINCT c.id) AS comment_count,
    COALESCE(
        SUM(
            CASE 
                WHEN jsonb_typeof(c.attachments) = 'array'
                THEN jsonb_array_length(c.attachments)
                ELSE 0
            END
        ), 0
    ) AS attachment_count,
      COUNT(
    DISTINCT CASE
        WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
        THEN c.id
    END
) AS unseen_comment_count,
 CASE
    WHEN COUNT(
        DISTINCT CASE
            WHEN c.id > COALESCE(cr.last_seen_comment_id, 0)
            THEN c.id
        END
    ) > 0
    THEN TRUE
    ELSE FALSE
END AS has_unseen_comments,ta.recurringid
FROM prosys.tasks ta
LEFT JOIN ${schema}.tasks_categories tc ON tc.row_id = ta.task_category
INNER JOIN prosys.users us1 ON ta.assigned_by = us1.row_id
INNER JOIN LATERAL jsonb_array_elements_text(ta.assigned_to) AS assigned_to_id ON TRUE
INNER JOIN prosys.users us ON us.row_id = assigned_to_id::text
LEFT JOIN ${schema}.comments c
    ON c.taskid = ta.row_id
    AND c.organizationid = ta.organizationid
LEFT JOIN prosys.comment_reads cr
    ON cr.taskid = ta.row_id
    AND cr.userid = $1
    AND cr.organizationid = ta.organizationid
WHERE
    ta.assigned_by = $1
    AND ta.organizationid = $2
    AND ta.activestatus = 0
    ${
      active_status !== undefined
        ? `AND ta.active_status = ${active_status}`
        : ""
    }
    ${
      assignedToFilter.length
        ? `AND assigned_to_id::text = ANY($${paramIndex++})`
        : ""
    }
    ${startDate ? `AND ta.completion_date >= '${startDate}'` : ""}
    ${endDate ? `AND ta.completion_date <= '${endDate}'` : ""}
    ${searchBlock.sql}
GROUP BY
    ta.row_id, us1.name, tc.category_name
ORDER BY
    due_days ASC
LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
        `;

    if (assignedToFilter.length) params.push(assignedToFilter);
    params.push(limit, offset);

    const resp = await db_query.customQuery(
      sql,
      "Assigned Tasks Search",
      params
    );
    // console.log("resp--->",resp.data)
    // res.send(resp.data)
    // libFunc.sendResponse(res, resp);

    const groupedData = groupAssignedTasksByRecurringId(resp.data);

    //   console.log("groupAssignedTasksByRecurringId--",groupedData)
    libFunc.sendResponse(res, {
      status: 0,
      message: "Tasks fetched",
      data: groupedData,
    });
  } catch (err) {
    console.error("fetchMyAssignedTasksSearch error:", err);
    libFunc.sendResponse(res, {
      status: false,
      message: "Internal Server Error",
    });
  }
}

function buildAssignedTaskSearch(search, paramIndex) {
  if (!search) return { sql: "", params: [] };

  return {
    sql: `
        AND (
            ta.title ILIKE $${paramIndex}
            OR ta.description ILIKE $${paramIndex}
            OR us1.name ILIKE $${paramIndex}       -- assigned_by name
            OR us.name ILIKE $${paramIndex}        -- assigned_to name
           
        )
        `,
    params: [`%${search}%`],
  };
}

async function SaveTempateDataInto(webhookPayload, mobileno) {
  // console.log("webhookPayload")

  try {
    const data = webhookPayload?.data;
    const message = data?.message;
    const customer = data?.customer;

    const rawTemplate =
      typeof message.raw_template === "string"
        ? JSON.parse(message.raw_template)
        : message.raw_template;

    const parsedMessage =
      typeof message.message === "string"
        ? JSON.parse(message.message)
        : message.message;

    const assignedtoUser = await getAssignedToUsers(mobileno);
    const organizationid = assignedtoUser?.organizationid || null;
    const username = assignedtoUser?.name || "Unknown";

    var row_id = libFunc.randomid();

    const paramMap = {};
    const messageParams = parsedMessage[0]?.parameters || [];

    // Mapping placholder to value
    messageParams.forEach((p, index) => {
      paramMap[index + 1] = p.text;
    });

    let finalMessage = rawTemplate.body || "";
    Object.entries(paramMap).forEach(([key, value]) => {
      finalMessage = finalMessage.replaceAll(`{{${key}}}`, value);
    });

    const messageData = {
      template_name: rawTemplate.name,
      language: rawTemplate.language,
      body_template: rawTemplate.body,
      parameters: paramMap,
      final_message: finalMessage,
    };

    const query = `
            INSERT INTO prosys.whatsapp_log_template (
                row_id, 
                mobilenumber, 
                receiver_user, 
                template_name, 
                request_data, 
                response_data, 
                status, 
                organizationid, 
                template_msg_data,
                message_data
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10)
        `;

    const values = [
      row_id,
      customer.phone_number,
      username,
      rawTemplate.name,
      JSON.stringify(webhookPayload),
      JSON.stringify({ type: data.type }),
      (message.message_status || "UNKNOWN").toUpperCase(),
      organizationid,
      JSON.stringify(rawTemplate),
      JSON.stringify(messageData),
    ];

    await db_query.customQuery(query, "Log Saved", values);

    //    return res.status(200).json({ message: 'Log saved successfully' });
    return true;
  } catch (error) {
    console.error("Error saving log:", error);
    //    return res.status(500).json({ error: "Failed to save log" });
    return false;
  }
}

// test data for store whatsapp_log_template
const realPayload = {
  version: "1.0",
  type: "message_api_sent",
  data: {
    customer: { phone_number: "9782412828" },
    message: {
      id: "14f11402-2fb6-40d0-bac3-56c7d7ad8e9a",
      message_status: "Sent",
      raw_template:
        '{"id": "80b3e397-2482-40a1-b9a7-44498c43017f", "created_at_utc": "2025-09-10T11:22:07.429000", "modified_at_utc": "2025-09-10T11:22:36.423000", "created_by_user_id": "505bf05f-2525-4ccb-acae-c9376cb45140", "is_deleted": false, "name": "task_reminder_mac", "language": "en", "category": "UTILITY", "sub_category": null, "template_category_label": null, "header_format": null, "header": null, "header_handle": null, "header_handle_file_url": null, "header_handle_file_name": null, "header_text": null, "body": "*\\ud83d\\udd14 Task Reminder*\\n*{{6}}*\\n\\nBelow are the details of your assigned task:\\n\\n\\ud83d\\udccc *Task:* {{1}}\\n\\ud83d\\udcdd *Note:* {{3}}\\n\\ud83d\\udcc5 *Due Date:* {{2}}\\n\\n*Assigned by:* {{4}}\\n*Assigned to:* {{5}}\\n\\nThis is a reminder. Ensure the task is completed before the due date.", "body_text": "[\\n   \\"Task Name\\",\\n   \\"Task Short Description\\",\\n   \\"31-07-2025\\",\\n   \\"User Name of Giver\\",\\n   \\"User Name of Reciver\\",\\n   \\"Company Name\\"\\n]", "footer": "This is a system generated message.", "buttons": "[{\\"type\\": \\"QUICK_REPLY\\", \\"text\\": \\"Mark as Completed\\"}]", "button_text": null, "allow_category_change": true, "limited_time_offer": null, "carousel_cards": "[]", "message_send_ttl_seconds": null, "wa_template_ad_id": null, "wa_template_ad_account_id": null, "autosubmitted_for": null, "display_name": "Task_Reminder_mac", "organization_id": "93af6d4b-46a5-41ae-bd00-9983acea36d0", "approval_status": "APPROVED", "wa_template_id": "1278938873555522", "is_archived": false, "channel_type": "Whatsapp", "is_click_tracking_enabled": false, "is_conversion_tracking_enabled": false, "allow_delete": true, "rejection_reason": null, "is_mpm": false, "is_carousel": false, "add_security_recommendation": false, "code_expiration_minutes": null, "is_ai_recommended": false, "order_details": null, "is_whatsapp_pay_template": false, "sample_template_id": null}',
      message:
        '[{"type": "body", "parameters": [{"type": "text", "text": "Hardware Requirement Sheet - Unit 5"}, {"type": "text", "text": "Sun Sep 28 2025"}, {"type": "text", "text": "Share List of Material needed to be Purchased"}, {"type": "text", "text": "Hardik Gulecha"}, {"type": "text", "text": "Hemraj"}, {"type": "text", "text": "Neelkanth Art and Craft Private Limited"}]}]',
    },
  },
};

// SaveTempateDataInto(realPayload, '9782412828');
