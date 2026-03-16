const connect_db = require("./connect_db/db_connect.js");
const libFunc = require("./functions.js");
const jwt = require("jsonwebtoken");
const query = require("./connect_db/queries.js");
const db_query = require("./connect_db/query_wrapper.js");
const path = require("path");
const runCron = require("./run_cron/crons.js");
// const auth = require('./authentication/connect.js');

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
const functions = require("./functions.js");

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
   * 
   */

  re_user: registerUser,
  lo_ap_us: loginUser,

  // shop
  cr_shop:createShop,
  fe_shop:fetchShops,


  // counter
  cr_counter:createCounter,
  fe_counter:fetchCounters,

  // supplier
  cr_supplier:createSupplier,
  fe_supplier:fetchSuppliers
};


const schema = "sms";
async function registerUser(req, res) {
  console.log("request",req)

  const tablename = schema + ".users";

  const name = req.data.name;
  const email = req.data.email;
  const phone = req.data.phone;
  const password = req.data.password;
  const role = req.data.role;
  const counter_id = req.data.counter_id || null;

  // Validation
  if (!name || !email || !phone || !password || !role) {
    const resp = { status: 1, msg: "Missing required fields" };
    return libFunc.sendResponse(res, resp);
  }

  // Check email
  const checkEmail = await checkEmailExist(email);

  if (checkEmail) {
    const resp = { status: 1, msg: "Email already exists" };
    return libFunc.sendResponse(res, resp);
  }

  // Check mobile
  const checkMobile = await checkMobileExist(phone);

  if (checkMobile) {
    const resp = { status: 1, msg: "Mobile already exists" };
    return libFunc.sendResponse(res, resp);
  }

  // Role validation
  const validRoles = ["ADMIN", "COUNTER_USER", "SUPPLIER"];

  if (!validRoles.includes(role)) {
    const resp = { status: 1, msg: "Invalid role" };
    return libFunc.sendResponse(res, resp);
  }

  // Insert Data
  const columns = {
    name: name.trim().replaceAll("'", "`"),
    email: email.trim(),
    phone: phone.trim(),
    password: password.trim(),
    role: role,
    counter_id: counter_id || 0,
  };

  const resp = await db_query.addData(
    tablename,
    columns,
    req.data.row_id,
    "Users"
  );

  return libFunc.sendResponse(res, resp);
}
async function checkEmailExist(email) {
  const query = `
    SELECT row_id
    FROM sms.users
    WHERE email = '${email}'
  `;

  const result = await queries.custom_query(query);
  console.log("res", result);

  return result.length > 0;
}

async function checkMobileExist(phone) {
  const query = `
    SELECT row_id
    FROM sms.users
    WHERE phone = '${phone}'
  `;

  const result = await queries.custom_query(query);
  console.log("res", result);

  return result.length > 0;
}

async function loginUser(req, res) {
  console.log("req", req);

  try {
    const username = req.data.email || req.data.phone;
    const password = req.data.password;

    if (!username || !password) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Email/Phone and Password required",
      });
    }

    const query = `
      SELECT row_id,name,email,phone,password,role,counter_id
      FROM sms.users
      WHERE email = '${req.data.email}' OR phone = '${req.data.phone}'
      LIMIT 1
    `;

    const result = await queries.custom_query(query);
    console.log("result", result);

    if (result.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "User not found",
      });
    }

    const user = result[0];

    // Password match
    if (user.password !== password) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid password",
      });
    }

    // JWT Payload
    const jwtData = {
      userId: user.row_id,
      role: user.role,
      counterId: user.counter_id,
    };

    const token = jwt.sign(jwtData, JWT_SECRET, { expiresIn: "3d" });

    let response = {
      status: 0,
      msg: "Login Successful",
      data: {
        token: token,
        user_id: user.row_id,
        role: user.role,
        counter_id: user.counter_id,
      },
    };
    console.log("res", response);

    return libFunc.sendResponse(res, response);
  } catch (error) {
    console.error("Login Error", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Server error",
    });
  }
}


async function createShop(req, res) {

  console.log("request",req)

  const tablename = schema + ".shops";

  const shop_name = req.data.shop_name;
  const address = req.data.address || "";

  if (!shop_name) {
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Shop name is required"
    });
  }

  const columns = {
    row_id : libFunc.randomid(),
    shop_name: shop_name.trim().replaceAll("'", "`"),
    address: address.trim()
  };

  const resp = await db_query.addData(
    tablename,
    columns
  );

  return libFunc.sendResponse(res, resp);
}

async function createCounter(req, res) {
  console.log("request",req)


  const counterTable = schema + ".counters";
  const userTable = schema + ".users";

  const { shop_id, counter_name, location, name, email, phone, password } = req.data;

  if (!shop_id || !counter_name || !name || !email || !phone || !password) {
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Required fields missing"
    });
  }

  const counterRowId = libFunc.randomid();

  const counterColumns = {
    row_id: counterRowId,
    shop_id: shop_id.trim(),
    counter_name: counter_name.trim().replaceAll("'", "`"),
    location: location ? location.trim() : ""
  };

  const counterResp = await db_query.addData(counterTable, counterColumns);

  if (counterResp.status !== 0) {
    return libFunc.sendResponse(res, counterResp);
  }

  const userColumns = {
    row_id: libFunc.randomid(),
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    password: password.trim(),
    role: "COUNTER_USER",
    counter_id: counterRowId
  };

  const userResp = await db_query.addData(userTable, userColumns);

  if (userResp.status !== 0) {
    return libFunc.sendResponse(res, userResp);
  }

  return libFunc.sendResponse(res, {
    status: 0,
    msg: "Counter and counter user created successfully"
  });
}


async function createSupplier(req, res) {
  console.log("request",req)


  const supplierTable = schema + ".suppliers";
  const userTable = schema + ".users";

  const { supplier_name, phone, email, address, password } = req.data;

  if (!supplier_name || !email || !phone || !password) {
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Required fields missing"
    });
  }

  const supplierRowId = libFunc.randomid();

  const supplierColumns = {
    row_id: supplierRowId,
    supplier_name: supplier_name.trim().replaceAll("'", "`"),
    phone: phone.trim(),
    email: email.trim(),
    address: address ? address.trim() : ""
  };

  const supplierResp = await db_query.addData(supplierTable, supplierColumns);

  if (supplierResp.status !== 0) {
    return libFunc.sendResponse(res, supplierResp);
  }

  const userColumns = {
    row_id: libFunc.randomid(),
    name: supplier_name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    password: password.trim(),
    role: "SUPPLIER"
  };

  const userResp = await db_query.addData(userTable, userColumns);

  if (userResp.status !== 0) {
    return libFunc.sendResponse(res, userResp);
  }

  return libFunc.sendResponse(res, {
    status: 0,
    msg: "Supplier and supplier login created successfully"
  });
}

async function fetchShops(req, res) {
  console.log("request",req)

  const tablename = schema + ".shops";

  const query = `
    SELECT 
      row_id,
      shop_name,
      address,
      cr_on
    FROM ${tablename}
    ORDER BY shop_name ASC
  `;

  const result = await db_query.customQuery(query,"Shop Fetch");
  console.log("results-->",result)

  return libFunc.sendResponse(res, {
    status: 0,
    data: result.rows
  });
}


async function fetchCounters(req, res) {
  console.log("request",req)


  const query = `
    SELECT
      c.row_id,
      c.counter_name,
      c.location,
      c.shop_id,
      s.shop_name
    FROM ${schema}.counters c
    LEFT JOIN ${schema}.shops s
      ON s.row_id = c.shop_id
    ORDER BY c.counter_name ASC
  `;

  const result = await db_query.customQuery(query,"Counter fetch");
  console.log("results-->",result)

  return libFunc.sendResponse(res, {
    status: 0,
    data: result.rows
  });
}


async function fetchSuppliers(req, res) {
  console.log("request",req)


  const tablename = schema + ".suppliers";

  const query = `
    SELECT
      row_id,
      supplier_name,
      phone,
      email,
      address
    FROM ${tablename}
    ORDER BY supplier_name ASC
  `;

  const result = await db_query.customQuery(query,"Supplier fetch");
  console.log("results->",result)

  return libFunc.sendResponse(res, {
    status: 0,
    data: result.rows
  });
}