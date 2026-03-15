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
