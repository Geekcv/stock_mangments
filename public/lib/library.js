const connect_db = require("./connect_db/db_connect.js");
const libFunc = require("./functions.js");
const jwt = require("jsonwebtoken");
const query = require("./connect_db/queries.js");
const db_query = require("./connect_db/query_wrapper.js");
const path = require("path");
const runCron = require("./run_cron/crons.js");
const cron = require("node-cron");
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
  cr_shop: createShop,
  fe_shop: fetchShops,
  fe_or_details: getShopOrders,
  // order (Purchase order)
  cr_final_order: createFinalOrder,
  fe_all_req_counter: getAllCounterRequestsByShop,

  // counter
  cr_counter: createCounter,
  fe_counter: fetchCounters,
  fe_order_req: getCounterRequests,
  cr_counter_req: createCounterRequest,

  // supplier
  cr_supplier: createSupplier,
  fe_supplier: fetchSuppliers,
  fe_my_ord: getSupplierOrders,
  up_ord_stu: updateOrderStatus,
  //Challan
  cr_challan: createChalan,
  fe_challan: getAllChalans,

  // Department
  cr_dep: createDepartment,
  fe_dep: fetchDepartments,

  //Category
  cr_cat: createCategory,
  fe_cat: fetchAllCategories,

  // Products
  cr_sweets: createSweet,
  fe_sweets: fetchAllSweets,

  //Inventory
  add_in: addStock,
  fet_inv: getInventory,
  fet_stock_his: getStockHistory,

  //pdf
  dow_pdf: downloadOrderPDF,
  dow_ch_pdf: downloadChalanPDF,

  // dhasboard
  fe_dash: getDashboardData,

  // profile
  fe_pro: getProfile,
  up_profile: updateProfile,

  // notificatiosn
  fe_notif: getNotifications,
  read_notify: markNotificationRead,

  // expaire
  fe_expairy_items: fetchExpiryLogs,
};

const schema = "sms";
async function registerUser(req, res) {
  console.log("request", req);

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
  // const validRoles = ["ADMIN", "COUNTER_USER", "SUPPLIER"];
  const validRoles = ["ADMIN", "SHOP_ADMIN", "COUNTER_USER", "SUPPLIER"];

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
    "Users",
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
      SELECT row_id,name,email,phone,password,role,counter_id,shop_id,supplier_id
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
      shopId: user.shop_id,
      supplierId: user.supplier_id,
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
        shop_id: user.shop_id,
        supplier_id: user.supplier_id,
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
  try {
    const user = req.data;

    const shopTable = schema + ".shops";
    const userTable = schema + ".users";

    const {
      shop_name,
      address = "",
      city = "",
      state = "",
      pincode = "",
      phone,
      email,
      gst_number = "",
      owner_name,
      logo_url = "",
      password,
    } = req.data || {};

    //  Role validation
    if (user.user_role !== "ADMIN") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only admin can create shop",
      });
    }

    //  Validation
    if (!shop_name || !owner_name || !email || !phone || !password) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Shop + Owner login details required",
      });
    }

    //  Normalize
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    //  Duplicate user check
    const existingUser = await db_query.customQuery(`
      SELECT phone, email FROM ${userTable}
      WHERE phone = '${cleanPhone}'
      OR email = '${cleanEmail}'
    `);

    if (existingUser.data?.length > 0) {
      const u = existingUser.data[0];

      if (u.phone === cleanPhone) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Phone already exists",
        });
      }

      if (u.email === cleanEmail) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Email already exists",
        });
      }
    }

    //  Duplicate shop check
    const existingShop = await db_query.customQuery(`
      SELECT 1 FROM ${shopTable}
      WHERE LOWER(shop_name) = LOWER('${shop_name.trim()}')
    `);

    if (existingShop.data?.length > 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Shop already exists",
      });
    }

    //  START TRANSACTION
    await connect_db.query("BEGIN");

    const shopRowId = libFunc.randomid();

    //  Create Shop
    const shopResp = await db_query.addData(shopTable, {
      row_id: shopRowId,
      shop_name: shop_name.trim().replaceAll("'", "`"),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      gst_number: gst_number.trim(),
      owner_name: owner_name.trim(),
      logo_url: logo_url.trim(),
      is_active: true,
    });

    if (shopResp.status !== 0) {
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, shopResp);
    }

    // 👤 Create SHOP_ADMIN (plain password)
    const userResp = await db_query.addData(userTable, {
      row_id: libFunc.randomid(),
      name: owner_name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password: password.trim(), //  no hashing
      role: "SHOP_ADMIN",
      shop_id: shopRowId,
    });

    if (userResp.status !== 0) {
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, userResp);
    }

    await connect_db.query("COMMIT");

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Shop and Shop Admin created successfully",
      data: { shop_id: shopRowId },
    });
  } catch (error) {
    console.log("createShop error:", error);

    try {
      await connect_db.query("ROLLBACK");
    } catch (e) {}

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

// async function createCounter(req, res) {
//   try {
//     console.log("request", req.data);

//     const counterTable = schema + ".counters";
//     const userTable = schema + ".users";

//     const {
//       shop_id,
//       counter_name,
//       location = "",
//       name,
//       email,
//       phone,
//       password,
//     } = req.data || {};

//     //  Validation
//     if (!shop_id || !counter_name || !name || !email || !phone || !password) {
//       console.log("Required fields missing");
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Required fields missing",
//       });
//     }

//     //  Duplicate check (like supplier)
//     const existingUser = await db_query.customQuery(`
//       SELECT phone, email FROM ${userTable}
//       WHERE phone = '${phone.trim()}'
//       OR email = '${email.trim()}'
//     `);

//     console.log("existingUser", existingUser);

//     if (existingUser.data && existingUser.data.length > 0) {
//       const user = existingUser.data[0];

//       if (user.phone === phone.trim()) {
//         console.log("Phone already exists");
//         return libFunc.sendResponse(res, {
//           status: 1,
//           msg: "Phone already exists",
//         });
//       }

//       if (user.email === email.trim()) {
//         console.log("Email already exists");
//         return libFunc.sendResponse(res, {
//           status: 1,
//           msg: "Email already exists",
//         });
//       }
//     }

//     //  BEGIN TRANSACTION
//     await connect_db.query("BEGIN TRANSACTION");

//     const counterRowId = libFunc.randomid();

//     //  Insert Counter
//     const counterColumns = {
//       row_id: counterRowId,
//       shop_id: shop_id.trim(),
//       counter_name: counter_name.trim().replaceAll("'", "`"),
//       location: location.trim(),
//     };

//     const counterResp = await db_query.addData(counterTable, counterColumns);

//     if (counterResp.status === 0) {
//       //  Insert User
//       const userColumns = {
//         row_id: libFunc.randomid(),
//         name: name.trim(),
//         email: email.trim(),
//         phone: phone.trim(),
//         password: password.trim(),
//         role: "COUNTER_USER",
//         counter_id: counterRowId,
//       };

//       const userResp = await db_query.addData(userTable, userColumns);

//       if (userResp.status === 0) {
//         //  SUCCESS
//         await connect_db.query("COMMIT");
//         console.log("Counter and counter user created successfully");

//         return libFunc.sendResponse(res, {
//           status: 0,
//           msg: "Counter and counter user created successfully",
//           data: {
//             counter_id: counterRowId,
//           },
//         });
//       } else {
//         //  User insert failed
//         await connect_db.query("ROLLBACK");
//         return libFunc.sendResponse(res, userResp);
//       }
//     } else {
//       //  Counter insert failed
//       await connect_db.query("ROLLBACK");
//       return libFunc.sendResponse(res, counterResp);
//     }
//   } catch (error) {
//     console.log("createCounter error:", error);

//     await connect_db.query("ROLLBACK");

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg:
//         error.code === "23505"
//           ? "Duplicate entry (phone/email already exists)"
//           : "Something went wrong",
//       error: error.message,
//     });
//   }
// }

async function createCounter(req, res) {
  try {
    console.log("request", req.data);

    const counterTable = schema + ".counters";
    const userTable = schema + ".users";

    const {
      shop_id,
      counter_name,
      location = "",
      name,
      email,
      phone,
      password,
    } = req.data || {};

    const loggedInUser = req.data;

    // Role validation
    if (!["ADMIN", "SHOP_ADMIN"].includes(loggedInUser.user_role)) {
      console.log("access denided");
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    //  Resolve Shop ID
    let finalShopId;

    if (loggedInUser.user_role === "ADMIN") {
      console.log("inside admin");
      if (!shop_id) {
        console.log("shop_id is required for admin");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: "shop_id is required for admin",
        });
      }
      finalShopId = shop_id.trim();
    }

    if (loggedInUser.user_role === "SHOP_ADMIN") {
      console.log("inside shop admin");

      if (shop_id && shop_id !== loggedInUser.shopId) {
        console.log("You can only create counter in your shop");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: "You can only create counter in your shop",
        });
      }
      finalShopId = loggedInUser.shopId;
    }

    //  Validation
    if (
      !finalShopId ||
      !counter_name ||
      !name ||
      !email ||
      !phone ||
      !password
    ) {
      console.log("Required fields missing");
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Required fields missing",
      });
    }

    //  Duplicate check (SQL Injection Safe)
    const existingUser = await db_query.customQuery(
      `SELECT phone, email FROM ${userTable}
       WHERE phone = '${phone.trim()}' OR email = '${email.trim()}'`,
    );

    console.log("exising usrs", existingUser);

    if (existingUser.data && existingUser.data.length > 0) {
      const user = existingUser.data[0];

      if (user.phone === phone.trim()) {
        console.log("phone already exists");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Phone already exists",
        });
      }

      if (user.email === email.trim()) {
        console.log("email already exists");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Email already exists",
        });
      }
    }

    //  BEGIN TRANSACTION
    await connect_db.query("BEGIN");

    const counterRowId = libFunc.randomid();

    //  Insert Counter
    const counterColumns = {
      row_id: counterRowId,
      shop_id: finalShopId,
      counter_name: counter_name.trim().replaceAll("'", "`"),
      location: location.trim(),
    };

    const counterResp = await db_query.addData(counterTable, counterColumns);

    if (counterResp.status !== 0) {
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, counterResp);
    }

    // 👤 Insert Counter User
    const userColumns = {
      row_id: libFunc.randomid(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password: password.trim(), //  (later hash karna)
      role: "COUNTER_USER",
      counter_id: counterRowId,
      shop_id: finalShopId,
    };

    const userResp = await db_query.addData(userTable, userColumns);

    if (userResp.status !== 0) {
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, userResp);
    }

    //  COMMIT
    await connect_db.query("COMMIT");

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Counter and counter user created successfully",
      data: {
        counter_id: counterRowId,
      },
    });
  } catch (error) {
    console.log("createCounter error:", error);

    await connect_db.query("ROLLBACK");

    return libFunc.sendResponse(res, {
      status: 1,
      msg:
        error.code === "23505"
          ? "Duplicate entry (phone/email already exists)"
          : error.message || "Something went wrong",
    });
  }
}

async function createSupplier(req, res) {
  try {
    console.log("request", req.data);

    const supplierTable = schema + ".suppliers";
    const userTable = schema + ".users";

    const {
      supplier_name,
      phone,
      email,
      address = "",
      password,
    } = req.data || {};

    //  Validation
    if (!supplier_name || !email || !phone || !password) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Required fields missing",
      });
    }

    //  Duplicate check
    const existingUser = await db_query.customQuery(`
      SELECT phone, email FROM ${userTable}
      WHERE phone = '${phone.trim()}'
      OR email = '${email.trim()}'
    `);

    console.log("existingUser", existingUser);

    if (existingUser.data && existingUser.data.length > 0) {
      const user = existingUser.data[0];

      if (user.phone === phone.trim()) {
        console.log("Phone already exists");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Phone already exists",
        });
      }

      if (user.email === email.trim()) {
        console.log("Email already exists");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Email already exists",
        });
      }
    }

    //  BEGIN TRANSACTION
    await connect_db.query("BEGIN TRANSACTION");

    const supplierRowId = libFunc.randomid();

    //  Insert Supplier
    const supplierColumns = {
      row_id: supplierRowId,
      supplier_name: supplier_name.trim().replaceAll("'", "`"),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
    };

    const supplierResp = await db_query.addData(supplierTable, supplierColumns);

    if (supplierResp.status === 0) {
      //  Insert User
      const userColumns = {
        row_id: libFunc.randomid(),
        name: supplier_name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        role: "SUPPLIER",
        supplier_id: supplierRowId,
      };

      const userResp = await db_query.addData(userTable, userColumns);

      if (userResp.status === 0) {
        //  SUCCESS → COMMIT
        await connect_db.query("COMMIT");

        return libFunc.sendResponse(res, {
          status: 0,
          msg: "Supplier and supplier login created successfully",
          data: {
            supplier_id: supplierRowId,
          },
        });
      } else {
        //  User insert failed
        await connect_db.query("ROLLBACK");

        return libFunc.sendResponse(res, userResp);
      }
    } else {
      //  Supplier insert failed
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, supplierResp);
    }
  } catch (error) {
    console.log("createSupplier error:", error);

    //  Any error → rollback
    await connect_db.query("ROLLBACK");

    return libFunc.sendResponse(res, {
      status: 1,
      msg:
        error.code === "23505"
          ? "Duplicate entry (phone/email already exists)"
          : "Something went wrong",
      error: error.message,
    });
  }
}

async function fetchShops(req, res) {
  try {
    const tablename = schema + ".shops";

    const { city, state, search, shop_id } = req.data || {};
    const user = req.data;

    //  Role validation
    if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let conditions = ["is_active = true"];

    //  ADMIN
    if (user.user_role === "ADMIN") {
      if (shop_id) {
        conditions.push(`row_id = '${shop_id}'`);
      }
    }

    //  SHOP_ADMIN /  COUNTER_USER
    if (["SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      conditions.push(`row_id = '${user.shop_id}'`);
    }

    //  Filters
    if (city) {
      conditions.push(`LOWER(city) = LOWER('${city.replaceAll("'", "`")}')`);
    }

    if (state) {
      conditions.push(`LOWER(state) = LOWER('${state.replaceAll("'", "`")}')`);
    }

    if (search) {
      const safeSearch = search.replaceAll("'", "`");
      conditions.push(`
        (
          LOWER(shop_name) LIKE LOWER('%${safeSearch}%')
          OR LOWER(address) LIKE LOWER('%${safeSearch}%')
          OR LOWER(city) LIKE LOWER('%${safeSearch}%')
        )
      `);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        row_id,
        shop_name,
        address,
        city,
        state,
        pincode,
        phone,
        email,
        gst_number,
        owner_name,
        logo_url,
        is_active,
        cr_on,
        up_on
      FROM ${tablename}
      ${whereClause}
      ORDER BY shop_name ASC
    `;

    console.log("Final Query:", query);

    const result = await db_query.customQuery(query, "fetch");

    return libFunc.sendResponse(res, result);
  } catch (error) {
    console.log("fetchShops error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function fetchCounters(req, res) {
  console.log("request", req);
  try {
    const { shopId } = req.data || {};
    const user = req.data; //  FIX (req.data nahi)

    const counterTable = schema + ".counters";
    const shopTable = schema + ".shops";

    //  Role validation
    if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let whereConditions = [];

    //  ADMIN
    if (user.user_role === "ADMIN") {
      if (shopId) {
        whereConditions.push(`c.shop_id = '${shopId}'`);
      }
    }

    //  SHOP_ADMIN
    if (user.user_role === "SHOP_ADMIN") {
      //  Always use own shop_id (not request)
      whereConditions.push(`c.shop_id = '${user.shopId}'`);
    }

    //  COUNTER_USER
    if (user.user_role === "COUNTER_USER") {
      whereConditions.push(`c.row_id = '${user.counterId}'`);
    }

    //  WHERE clause
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    //  Final Query
    const query = `
      SELECT
        c.row_id,
        c.counter_name,
        c.location,
        c.shop_id,
        s.shop_name
      FROM ${counterTable} c
      LEFT JOIN ${shopTable} s
        ON s.row_id = c.shop_id
      ${whereClause}
      ORDER BY c.counter_name ASC
    `;

    console.log("Final Query:", query);

    const result = await db_query.customQuery(query, "fetch all counter");

    return libFunc.sendResponse(res, result);
  } catch (error) {
    console.log("fetchCounters error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}
async function fetchSuppliers(req, res) {
  console.log("request", req);

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

  const result = await db_query.customQuery(query, "Supplier fetch");
  console.log("results->", result);

  return libFunc.sendResponse(res, result);
}

async function createDepartment(req, res) {
  console.log("req", req);
  try {
    const tablename = schema + ".departments";

    const { department_name, description = "", shop_id } = req.data || {};
    const user = req.data;

    //  Role validation
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    //  Validation
    if (!department_name) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Department name is required",
      });
    }

    //  Resolve shop_id
    let finalShopId;

    //  ADMIN
    if (user.user_role === "ADMIN") {
      if (!shop_id) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "shop_id is required",
        });
      }
      finalShopId = shop_id.trim();
    }

    //  SHOP_ADMIN
    if (user.user_role === "SHOP_ADMIN") {
      if (shop_id && shop_id !== user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "You can only create department in your shop",
        });
      }
      finalShopId = user.shopId;
    }

    //  Duplicate check (same shop)
    const existing = await db_query.customQuery(`
      SELECT row_id FROM ${tablename}
      WHERE department_name = '${department_name.trim()}'
      AND shop_id = '${finalShopId}'
    `);

    if (existing.data && existing.data.length > 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Department already exists in this shop",
      });
    }

    //  Insert
    const columns = {
      row_id: libFunc.randomid(),
      department_name: department_name.trim().replaceAll("'", "`"),
      description: description.trim(),
      shop_id: finalShopId,
    };

    const resp = await db_query.addData(tablename, columns, null, "Department");

    return libFunc.sendResponse(res, resp);
  } catch (error) {
    console.log("createDepartment error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function fetchDepartments(req, res) {
  try {
    const deptTable = `${schema}.departments`;
    const shopTable = `${schema}.shops`;

    const user = req.data; //  FIX
    const { shop_id } = req.data || {}; // optional filter

    //  Role validation
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let whereConditions = [];

    //  ADMIN
    if (user.user_role === "ADMIN") {
      if (shop_id) {
        whereConditions.push(`d.shop_id = '${shop_id}'`);
      }
    }

    //  SHOP_ADMIN
    if (user.user_role === "SHOP_ADMIN") {
      // ❗ always force own shop
      whereConditions.push(`d.shop_id = '${user.shopId}'`);
    }

    //  Build WHERE clause
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    //  Final Query
    const sql = `
      SELECT
        d.row_id,
        d.department_name,
        d.description,
        d.shop_id,
        s.shop_name,
        d.cr_on
      FROM ${deptTable} d
      LEFT JOIN ${shopTable} s
        ON s.row_id = d.shop_id
      ${whereClause}
      ORDER BY d.department_name
    `;

    console.log("Final Query:", sql);

    const dbRes = await db_query.customQuery(sql);

    return libFunc.sendResponse(res, dbRes);
  } catch (error) {
    console.log("fetchDepartments error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function createCategory(req, res) {
  console.log("req", req);
  try {
    const tablename = schema + ".categories";
    const deptTable = schema + ".departments";

    const { department_id, category_name, shop_id } = req.data || {};
    const user = req.data;

    //  Role validation
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    //  Basic validation
    if (!department_id || !category_name) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Department and Category name required",
      });
    }

    //  Check department exists + get shop_id
    const deptCheck = await db_query.customQuery(`
      SELECT row_id, shop_id 
      FROM ${deptTable}
      WHERE row_id = '${department_id}'
    `);

    if (!deptCheck.data || deptCheck.data.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid department",
      });
    }

    const department = deptCheck.data[0];
    let finalShopId;

    if (user.user_role === "ADMIN") {
      if (!shop_id) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "shop_id is required",
        });
      }
      finalShopId = shop_id.trim();
    }

    //  SHOP ACCESS CONTROL
    if (user.user_role === "SHOP_ADMIN") {
      if (department.shop_id !== user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "You cannot add category to another shop's department",
        });
      }
      finalShopId = user.shopId;
    }

    //  Duplicate check (same department)
    const existing = await db_query.customQuery(`
      SELECT row_id FROM ${tablename}
      WHERE category_name = '${category_name.trim()}'
      AND department_id = '${department_id}'
    `);

    if (existing.data && existing.data.length > 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Category already exists in this department",
      });
    }

    //  Insert
    const columns = {
      row_id: libFunc.randomid(),
      department_id: department_id.trim(),
      category_name: category_name.trim().replaceAll("'", "`"),
      shop_id: finalShopId,
    };

    const resp = await db_query.addData(tablename, columns, null, "Category");

    return libFunc.sendResponse(res, resp);
  } catch (error) {
    console.log("createCategory error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function fetchAllCategories(req, res) {
  try {
    const user = req.data;
    const { shop_id, department_id } = req.data || {};

    const categoryTable = `${schema}.categories`;
    const deptTable = `${schema}.departments`;
    const shopTable = `${schema}.shops`;

    //  Role validation
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let whereConditions = [];

    //  ADMIN
    if (user.user_role === "ADMIN") {
      if (shop_id) {
        whereConditions.push(`d.shop_id = '${shop_id}'`);
      }

      if (department_id) {
        whereConditions.push(`c.department_id = '${department_id}'`);
      }
    }

    //  SHOP_ADMIN
    if (user.user_role === "SHOP_ADMIN") {
      whereConditions.push(`d.shop_id = '${user.shopId}'`);

      if (department_id) {
        whereConditions.push(`c.department_id = '${department_id}'`);
      }
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    //  FINAL QUERY (JOIN shop added)
    const sql = `
      SELECT
        c.row_id,
        c.category_name,
        c.department_id,
        d.department_name,
        d.shop_id,
        s.shop_name,   --  NEW
        c.cr_on
      FROM ${categoryTable} c
      LEFT JOIN ${deptTable} d
        ON d.row_id = c.department_id
      LEFT JOIN ${shopTable} s
        ON s.row_id = d.shop_id
      ${whereClause}
      ORDER BY c.category_name ASC
    `;

    console.log("Final Query:", sql);

    const result = await db_query.customQuery(sql);

    return libFunc.sendResponse(res, result);
  } catch (error) {
    console.log("fetchAllCategories error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}
async function createSweet(req, res) {
  try {
    const tablename = schema + ".sweets";
    const categoryTable = schema + ".categories";
    const deptTable = schema + ".departments";
    const counterTable = schema + ".counters";

    const {
      shop_id,
      category_id,
      counter_id,
      sweet_name,
      unit = "KG",
      price = 0,
      shelf_life_days = 0,
      description = "",
      image_url = "",
      return_type = "NONE",
    } = req.data || {};

    const user = req.data;

    //  Role validation
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    //  Basic validation
    if (!category_id || !counter_id || !sweet_name) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Category, Counter and Sweet name required",
      });
    }

    //  Get Category + Shop
    const categoryCheck = await db_query.customQuery(`
      SELECT c.row_id, d.shop_id
      FROM ${categoryTable} c
      LEFT JOIN ${deptTable} d
        ON d.row_id = c.department_id
      WHERE c.row_id = '${category_id.trim()}'
    `);

    if (!categoryCheck.data || categoryCheck.data.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid category",
      });
    }

    const category = categoryCheck.data[0];

    //  Get Counter + Shop
    const counterCheck = await db_query.customQuery(`
      SELECT row_id, shop_id
      FROM ${counterTable}
      WHERE row_id = '${counter_id.trim()}'
    `);

    if (!counterCheck.data || counterCheck.data.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid counter",
      });
    }

    const counter = counterCheck.data[0];
    let finalShopId;

    if (user.user_role === "ADMIN") {
      if (!shop_id) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "shop_id is required",
        });
      }
      finalShopId = shop_id.trim();
    }

    //  CORE VALIDATION (Hierarchy match)
    if (category.shop_id !== counter.shop_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Category and Counter must belong to same shop",
      });
    }

    //  Role-based shop restriction
    if (user.user_role === "SHOP_ADMIN") {
      if (counter.shop_id !== user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "You cannot create sweet for another shop",
        });
      }
      finalShopId = user.shopId;
    }

    //  Duplicate check
    const existingSweet = await db_query.customQuery(`
      SELECT 1 FROM ${tablename}
      WHERE counter_id = '${counter_id.trim()}'
      AND LOWER(sweet_name) = LOWER('${sweet_name.trim().replaceAll("'", "`")}')
    `);

    if (existingSweet.data && existingSweet.data.length > 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Sweet already exists for this counter",
      });
    }

    // Insert
    const columns = {
      row_id: libFunc.randomid(),
      category_id: category_id.trim(),
      counter_id: counter_id.trim(),
      sweet_name: sweet_name.trim().replaceAll("'", "`"),
      unit,
      price,
      shelf_life_days,
      description: description.trim(),
      image_url: image_url.trim(),
      return_type,
      is_active: true,
      shop_id: finalShopId,
    };

    const resp = await db_query.addData(tablename, columns);

    return libFunc.sendResponse(res, resp);
  } catch (error) {
    console.log("createSweet error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function fetchAllSweets(req, res) {
  console.log(req);
  try {
    const user = req.data;

    const { category_id, department_id, shop_id, counter_id, search } =
      req.data || {};

    //  Role validation
    if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let conditions = ["s.is_active = true"];

    //  ADMIN
    if (user.user_role === "ADMIN") {
      if (shop_id) {
        conditions.push(`d.shop_id = '${shop_id}'`);
      }
    }

    //  SHOP_ADMIN
    if (user.user_role === "SHOP_ADMIN") {
      conditions.push(`d.shop_id = '${user.shopId}'`);
    }

    //  COUNTER_USER
    if (user.user_role === "COUNTER_USER") {
      conditions.push(`ct.row_id = '${user.counterId}'`);
    }

    //  Filters
    if (category_id) {
      conditions.push(`s.category_id = '${category_id.replaceAll("'", "`")}'`);
    }

    if (department_id) {
      conditions.push(`d.row_id = '${department_id.replaceAll("'", "`")}'`);
    }

    if (counter_id) {
      conditions.push(`ct.row_id = '${counter_id.replaceAll("'", "`")}'`);
    }

    if (search) {
      const safeSearch = search.replaceAll("'", "`");

      conditions.push(`
        (
          LOWER(s.sweet_name) LIKE LOWER('%${safeSearch}%')
          OR LOWER(c.category_name) LIKE LOWER('%${safeSearch}%')
          OR LOWER(d.department_name) LIKE LOWER('%${safeSearch}%')
        )
      `);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    //  FINAL QUERY (FULL JOIN)
    const sql = `
      SELECT
        s.row_id,
        s.sweet_name,
        s.unit,
        s.price,
        s.shelf_life_days,
        s.description,
        s.image_url,
        s.category_id,

        c.category_name,

        d.row_id AS department_id,
        d.department_name,
        d.shop_id,

        sh.shop_name,        --  added

        ct.row_id AS counter_id,
        ct.counter_name,     --  added

        s.is_active,
        s.cr_on,
        s.up_on

      FROM ${schema}.sweets s

      LEFT JOIN ${schema}.categories c
        ON c.row_id = s.category_id

      LEFT JOIN ${schema}.departments d
        ON d.row_id = c.department_id

      LEFT JOIN ${schema}.shops sh
        ON sh.row_id = d.shop_id

      LEFT JOIN ${schema}.counters ct
        ON ct.row_id = s.counter_id

      ${whereClause}

      ORDER BY s.sweet_name ASC
    `;

    console.log("Final Query:", sql);

    const result = await db_query.customQuery(sql);

    return libFunc.sendResponse(res, result);
  } catch (error) {
    console.log("fetchAllSweets error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

// ✔ IN → stock add
// ✔ OUT → stock reduce
// ✔ ADJUST → overwrite quantity

// ✔ min_stock, max_stock → optional
// ✔ expiry_date → only useful in IN
async function addStock(req, res) {
  try {
    const inventoryTable = schema + ".inventory";
    const transactionTable = schema + ".stock_transactions";
    const sweetTable = schema + ".sweets";
    const categoryTable = schema + ".categories";
    const deptTable = schema + ".departments";
    const counterTable = schema + ".counters";
    const userTable = schema + ".users";

    const {
      counter_id,
      sweet_id,
      transaction_type,
      quantity,
      expiry_date = null,
      reference_id = "",
      notes = "",
      min_stock = null,
      max_stock = null,
    } = req.data || {};

    const user = req.data;

    //  Role validation
    if (!["SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    if (!sweet_id || !transaction_type || !quantity) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Missing required fields",
      });
    }

    //  Resolve counter
    let finalCounterId =
      user.user_role === "COUNTER_USER" ? user.counterId : counter_id;

    if (!finalCounterId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "counter_id is required",
      });
    }

    // Counter check
    const counterCheck = await db_query.customQuery(`
      SELECT shop_id FROM ${counterTable}
      WHERE row_id = '${finalCounterId}'
    `);

    if (!counterCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid counter",
      });
    }

    const counterShopId = counterCheck.data[0].shop_id;

    if (user.user_role === "SHOP_ADMIN" && counterShopId !== user.shopId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Unauthorized shop access",
      });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid quantity",
      });
    }

    const validTypes = ["IN", "OUT", "ADJUST"];
    if (!validTypes.includes(transaction_type)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid transaction type",
      });
    }

    // 🍬 Sweet validation
    const sweetCheck = await db_query.customQuery(`
      SELECT d.shop_id
      FROM ${sweetTable} s
      LEFT JOIN ${categoryTable} c ON c.row_id = s.category_id
      LEFT JOIN ${deptTable} d ON d.row_id = c.department_id
      WHERE s.row_id = '${sweet_id}'
    `);

    if (!sweetCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid sweet",
      });
    }

    if (sweetCheck.data[0].shop_id !== counterShopId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Sweet & counter mismatch",
      });
    }

    // 🟢 START TRANSACTION
    await connect_db.query("BEGIN");

    // 📦 Insert transaction
    await db_query.addData(
      transactionTable,
      {
        row_id: libFunc.randomid(),
        counter_id: finalCounterId,
        sweet_id,
        transaction_type,
        quantity: qty,
        reference_id,
        notes,
      },
      null,
      "Stock Transaction",
    );

    // 📥 Get existing inventory
    const existing = await db_query.customQuery(`
      SELECT * FROM ${inventoryTable}
      WHERE counter_id = '${finalCounterId}'
      AND sweet_id = '${sweet_id}'
    `);

    let newQty = qty;
    let previousQty = 0;
    let minStockValue = 0;

    if (existing.data?.length) {
      const row = existing.data[0];
      previousQty = Number(row.quantity);
      minStockValue = Number(row.min_stock || 0);

      if (transaction_type === "IN") newQty = previousQty + qty;
      else if (transaction_type === "OUT") {
        if (previousQty < qty) {
          await connect_db.query("ROLLBACK");
          return libFunc.sendResponse(res, {
            status: 1,
            msg: "Insufficient stock",
          });
        }
        newQty = previousQty - qty;
      } else newQty = qty;

      await db_query.addData(
        inventoryTable,
        {
          quantity: newQty,
          expiry_date,
          ...(min_stock !== null && { min_stock }),
          ...(max_stock !== null && { max_stock }),
        },
        row.row_id,
        "Inventory",
      );
    } else {
      if (transaction_type !== "IN") {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "No stock available",
        });
      }

      newQty = qty;
      previousQty = 0;
      minStockValue = Number(min_stock || 0);

      await db_query.addData(
        inventoryTable,
        {
          row_id: libFunc.randomid(),
          counter_id: finalCounterId,
          sweet_id,
          quantity: qty,
          expiry_date,
          min_stock: min_stock || 0,
          max_stock: max_stock || 0,
        },
        null,
        "Inventory",
      );
    }

    // ✅ COMMIT
    await connect_db.query("COMMIT");

    // ==============================
    // 🔔 NOTIFICATIONS
    // ==============================

    // 👥 Get counter users
    const counterUsers = await db_query.customQuery(`
      SELECT row_id FROM ${userTable}
      WHERE counter_id = '${finalCounterId}'
    `);

    // 🔴 Out of stock
    if (newQty === 0) {
      for (let u of counterUsers.data || []) {
        await createNotification({
          user_id: u.row_id,
          title: "Out of Stock",
          message: "Item is out of stock",
          type: "STOCK",
          reference_id: sweet_id,
          priority: "HIGH",
        });
      }
    }

    // 🟡 Low stock (only when crossing threshold)
    else if (
      minStockValue > 0 &&
      newQty <= minStockValue &&
      previousQty > minStockValue
    ) {
      for (let u of counterUsers.data || []) {
        await createNotification({
          user_id: u.row_id,
          title: "Low Stock Alert",
          message: `Only ${newQty} items left`,
          type: "STOCK",
          reference_id: sweet_id,
          priority: "HIGH",
        });
      }
    }

    // ==============================

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Stock updated successfully",
    });
  } catch (error) {
    console.log("addStock error:", error);

    try {
      await connect_db.query("ROLLBACK");
    } catch (e) {}

    return libFunc.sendResponse(res, {
      status: 1,
      msg: error.message || "Something went wrong",
    });
  }
}
// {
//   fn: 'common_fn',
//   se: 'add_in',
//   data: {
//     counter_id: '1774068978592_lPPR',
//     sweet_id: '1774066038515_Ojcp',
//     transaction_type: 'IN',
//     quantity: 50,
//     expiry_date: '2026-04-01',
//     reference_id: 'purchase_001',
//     notes: 'New stock added'
//   }
// }

async function getInventoryByCounter(req, res) {
  try {
    const inventoryTable = schema + ".inventory";
    const sweetTable = schema + ".sweets";
    const categoryTable = schema + ".categories";

    const { counter_id } = req.data || {};

    // 🔹 Validation
    if (!counter_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Counter ID required",
      });
    }

    // 🔹 Fetch Inventory with Sweet Details
    const result = await db_query.customQuery(`
      SELECT
        i.row_id AS inventory_id,
        i.counter_id,
        i.sweet_id,
        i.quantity,
        i.expiry_date,

        s.sweet_name,
        s.shelf_life_days,

        c.category_name

      FROM ${inventoryTable} i
      LEFT JOIN ${sweetTable} s 
        ON s.row_id = i.sweet_id
      LEFT JOIN ${categoryTable} c 
        ON c.row_id = s.category_id

      WHERE i.counter_id = '${counter_id.trim()}'
      ORDER BY s.sweet_name ASC
    `);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Inventory fetched successfully",
      data: result.data || [],
    });
  } catch (error) {
    console.log("getInventoryByCounter error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function getStockHistory(req, res) {
  try {
    const transactionTable = schema + ".stock_transactions";
    const sweetTable = schema + ".sweets";
    const counterTable = schema + ".counters";
    const shopTable = schema + ".shops";

    const user = req.data;

    const { counter_id, sweet_id, transaction_type, from_date, to_date } =
      req.data || {};

    let conditions = ["1=1"];

    // 🔒 ================= ROLE BASE FILTER =================

    if (user.user_role === "SHOP_ADMIN") {
      conditions.push(`c.shop_id = '${user.shopId}'`);
    }

    if (user.user_role === "COUNTER_USER") {
      conditions.push(`st.counter_id = '${user.counterId}'`);
    }

    if (user.user_role === "SUPPLIER") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // 🔎 ================= FILTERS =================

    if (counter_id) {
      conditions.push(`st.counter_id = '${counter_id.trim()}'`);
    }

    if (sweet_id) {
      conditions.push(`st.sweet_id = '${sweet_id.trim()}'`);
    }

    if (transaction_type) {
      conditions.push(`st.transaction_type = '${transaction_type}'`);
    }

    if (from_date) {
      conditions.push(`st.cr_on >= '${from_date}'`);
    }

    if (to_date) {
      conditions.push(`st.cr_on <= '${to_date}'`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // 📊 QUERY (UPDATED)
    const result = await db_query.customQuery(`
      SELECT
        st.row_id AS transaction_id,
        st.counter_id,
        st.sweet_id,
        st.transaction_type,
        st.quantity,
        st.reference_id,
        st.notes,
        st.cr_on,

        s.sweet_name,
        s.unit,

        c.counter_name,

        sh.row_id AS shop_id,
        sh.shop_name,
        sh.city,
        sh.state

      FROM ${transactionTable} st
      LEFT JOIN ${sweetTable} s 
        ON s.row_id = st.sweet_id
      LEFT JOIN ${counterTable} c 
        ON c.row_id = st.counter_id
      LEFT JOIN ${shopTable} sh
        ON sh.row_id = c.shop_id

      ${whereClause}
      ORDER BY st.cr_on DESC
    `);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Stock history fetched successfully",
      data: result.data || [],
    });
  } catch (error) {
    console.log("getStockHistory error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

// {
//   "counter_id": "counter_123",
//   "sweet_id": "sweet_1",
//   "transaction_type": "IN",
//   "from_date": "2026-03-01",
//   "to_date": "2026-03-21"
// }
async function getInventory(req, res) {
  try {
    const inventoryTable = schema + ".inventory";
    const sweetTable = schema + ".sweets";
    const counterTable = schema + ".counters";

    const user = req.data;

    let whereConditions = ["i.quantity::int > 0"];

    // 🔴 ADMIN → sab dekh sakta hai (no extra filter)

    // 🟠 SHOP ADMIN → only own shop counters
    if (user.user_role === "SHOP_ADMIN") {
      whereConditions.push(`c.shop_id = '${user.shopId}'`);
    }

    // 🟡 COUNTER USER → only own counter
    if (user.user_role === "COUNTER_USER") {
      whereConditions.push(`i.counter_id = '${user.counterId}'`);
    }

    // 🟢 SUPPLIER → access deny (optional)
    if (user.user_role === "SUPPLIER") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const data = await db_query.customQuery(`
      SELECT 
        i.row_id,
        i.quantity,
        i.min_stock,
        i.max_stock,
        i.expiry_date,

        s.row_id AS sweet_id,
        s.sweet_name,
        s.unit,
        s.price,
        s.image_url,

        c.row_id AS counter_id,
        c.counter_name,
        c.location,
        c.shop_id,

        i.cr_on

      FROM ${inventoryTable} i
      LEFT JOIN ${sweetTable} s 
        ON s.row_id = i.sweet_id
      LEFT JOIN ${counterTable} c 
        ON c.row_id = i.counter_id

      ${whereClause}
      ORDER BY i.cr_on DESC
    `);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Inventory fetched successfully",
      data: data.data,
    });
  } catch (error) {
    console.log("getInventory error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function getInventoryAlerts(req, res) {
  try {
    const inventoryTable = schema + ".inventory";
    const sweetTable = schema + ".sweets";

    const lowStockLimit = 10; // you can change

    const data = await db_query.customQuery(`
      SELECT 
        i.row_id,
        i.quantity,
        i.expiry_date,
        s.sweet_name,
        s.unit

      FROM ${inventoryTable} i
      LEFT JOIN ${sweetTable} s 
        ON s.row_id = i.sweet_id

      WHERE 
        i.quantity <= ${lowStockLimit}
        OR i.expiry_date <= CURRENT_DATE + INTERVAL '2 days'

      ORDER BY i.quantity ASC
    `);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Inventory alerts fetched",
      data: data.data,
    });
  } catch (error) {
    console.log("getInventoryAlerts error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function createCounterRequest(req, res) {
  try {
    const table = schema + ".counter_requests";
    const counterTable = schema + ".counters";
    const sweetTable = schema + ".sweets";
    const categoryTable = schema + ".categories";
    const deptTable = schema + ".departments";

    const { items } = req.data || {};
    const user = req.data;

    //  Role validation
    if (user.user_role !== "COUNTER_USER") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only counter user can create request",
      });
    }

    //  Always take counter_id from token
    const finalCounterId = user.counterId;

    if (!finalCounterId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid user counter",
      });
    }

    //  Basic validation
    if (!items || items.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Items are required",
      });
    }

    //  Get Counter → Shop
    const counterCheck = await db_query.customQuery(`
      SELECT shop_id FROM ${counterTable}
      WHERE row_id = '${finalCounterId}'
    `);

    if (!counterCheck.data || counterCheck.data.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid counter",
      });
    }

    const counterShopId = counterCheck.data[0].shop_id;

    await connect_db.query("BEGIN");

    let isRequestCreated = false; // 🔥 important flag

    for (let item of items) {
      const { sweet_id, quantity } = item;

      if (!sweet_id || !quantity || Number(quantity) <= 0) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Invalid item data",
        });
      }

      //  Get Sweet → Shop
      const sweetCheck = await db_query.customQuery(`
        SELECT d.shop_id
        FROM ${sweetTable} s
        LEFT JOIN ${categoryTable} c ON c.row_id = s.category_id
        LEFT JOIN ${deptTable} d ON d.row_id = c.department_id
        WHERE s.row_id = '${sweet_id}'
      `);

      if (!sweetCheck.data || sweetCheck.data.length === 0) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Invalid sweet",
        });
      }

      const sweetShopId = sweetCheck.data[0].shop_id;

      //  Shop match validation
      if (sweetShopId !== counterShopId) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Sweet does not belong to your shop",
        });
      }

      //  Duplicate pending request check
      const existing = await db_query.customQuery(`
        SELECT 1 FROM ${table}
        WHERE counter_id = '${finalCounterId}'
        AND sweet_id = '${sweet_id}'
        AND status = 'PENDING'
      `);

      if (existing.data && existing.data.length > 0) {
        continue; // skip duplicate
      }

      //  Insert request
      await db_query.addData(
        table,
        {
          row_id: libFunc.randomid(),
          counter_id: finalCounterId,
          sweet_id,
          quantity: Number(quantity),
          status: "PENDING",
        },
        null,
        "Counter Request",
      );

      isRequestCreated = true; // 🔥 mark success
    }

    await connect_db.query("COMMIT");

    // 🔔 Notification (AFTER COMMIT ONLY)
    if (isRequestCreated) {
      const shopAdmin = await db_query.customQuery(`
        SELECT row_id FROM ${schema}.users
        WHERE role = 'SHOP_ADMIN'
        AND shop_id = (
          SELECT shop_id FROM ${schema}.counters
          WHERE row_id = '${finalCounterId}'
        )
      `);

      if (shopAdmin.data && shopAdmin.data.length > 0) {
        await createNotification({
          user_id: shopAdmin.data[0].row_id,
          title: "New Counter Request",
          message: `${items.length} item(s) requested from counter`,
          type: "REQUEST",
          reference_id: finalCounterId,
        });
      }
    }

    return libFunc.sendResponse(res, {
      status: 0,
      msg: isRequestCreated
        ? "Request sent to shop admin"
        : "All items already requested",
    });
  } catch (error) {
    console.log("createCounterRequest error:", error);

    try {
      await connect_db.query("ROLLBACK");
    } catch (e) {}

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function createFinalOrder(req, res) {
  try {
    const user = req.data;

    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";
    const requestTable = schema + ".counter_requests";
    const counterTable = schema + ".counters";
    const supplierTable = schema + ".suppliers";

    const { supplier_id, request_ids, shop_id } = req.data || {};

    // 🔐 Role validation
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // 🏪 Resolve shop_id
    let finalShopId;

    if (user.user_role === "SHOP_ADMIN") {
      finalShopId = user.shopId;
    }

    if (user.user_role === "ADMIN") {
      if (!shop_id) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "shop_id is required",
        });
      }
      finalShopId = shop_id;
    }

    // 📦 Validation
    if (!supplier_id || !request_ids || request_ids.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Supplier and request_ids required",
      });
    }

    await connect_db.query("BEGIN");

    // ✅ Supplier validation
    const supplierCheck = await db_query.customQuery(`
      SELECT 1 FROM ${supplierTable}
      WHERE row_id = '${supplier_id}'
    `);

    if (!supplierCheck.data.length) {
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid supplier",
      });
    }

    // 📥 Fetch requests
    const requests = await db_query.customQuery(`
      SELECT r.*, c.shop_id
      FROM ${requestTable} r
      LEFT JOIN ${counterTable} c
        ON c.row_id = r.counter_id
      WHERE r.row_id IN (${request_ids.map((id) => `'${id}'`).join(",")})
      AND r.status = 'PENDING'
    `);

    if (!requests.data || requests.data.length === 0) {
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "No valid pending requests found",
      });
    }

    if (requests.data.length !== request_ids.length) {
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Some request_ids are invalid or already processed",
      });
    }

    // 🏪 Shop validation
    for (let r of requests.data) {
      if (r.shop_id !== finalShopId) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "All requests must belong to your shop",
        });
      }
    }

    // 🧮 Combine sweets
    const sweetMap = {};
    for (let r of requests.data) {
      if (!sweetMap[r.sweet_id]) {
        sweetMap[r.sweet_id] = 0;
      }
      sweetMap[r.sweet_id] += Number(r.quantity);
    }

    // 🧾 Create Order
    const orderRowId = libFunc.randomid();

    await db_query.addData(
      orderTable,
      {
        row_id: orderRowId,
        shop_id: finalShopId,
        supplier_id,
        order_status: "PENDING",
      },
      null,
      "Order",
    );

    // 📦 Order Items
    for (let sweet_id in sweetMap) {
      await db_query.addData(
        itemTable,
        {
          row_id: libFunc.randomid(),
          order_id: orderRowId,
          sweet_id,
          quantity: sweetMap[sweet_id],
        },
        null,
        "Order Item",
      );
    }

    // 🔄 Update requests
    await db_query.customQuery(`
      UPDATE ${requestTable}
      SET status = 'APPROVED'
      WHERE row_id IN (${request_ids.map((id) => `'${id}'`).join(",")})
    `);

    // ✅ COMMIT
    await connect_db.query("COMMIT");

    // ==============================
    // 🔔 NOTIFICATIONS START HERE
    // ==============================

    // 🔵 1. Notify Supplier
    const supplierUsers = await db_query.customQuery(`
      SELECT row_id FROM ${schema}.users
      WHERE supplier_id = '${supplier_id}'
    `);

    if (supplierUsers.data?.length) {
      for (let u of supplierUsers.data) {
        await createNotification({
          user_id: u.row_id,
          title: "New Order Received",
          message: `New order created with ${Object.keys(sweetMap).length} item(s)`,
          type: "ORDER",
          reference_id: orderRowId,
        });
      }
    }

    // 🟢 2. Notify Counter Users (Request Approved)
    const counterUsers = await db_query.customQuery(`
      SELECT u.row_id
      FROM ${requestTable} r
      LEFT JOIN ${schema}.users u 
        ON u.counter_id = r.counter_id
      WHERE r.row_id IN (${request_ids.map((id) => `'${id}'`).join(",")})
    `);

    if (counterUsers.data?.length) {
      const uniqueUsers = [...new Set(counterUsers.data.map((u) => u.row_id))];

      for (let userId of uniqueUsers) {
        await createNotification({
          user_id: userId,
          title: "Request Approved",
          message: `${request_ids.length} request(s) approved`,
          type: "REQUEST",
          reference_id: orderRowId,
        });
      }
    }

    // ==============================

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Final order created successfully",
      data: { order_id: orderRowId },
    });
  } catch (error) {
    console.log("createFinalOrder ERROR:", error);

    try {
      await connect_db.query("ROLLBACK");
    } catch (e) {}

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function createOrder(req, res) {
  try {
    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";

    const {
      counter_id,
      supplier_id,
      items, // array [{ sweet_id, quantity }]
    } = req.data || {};

    //  Validation
    if (!counter_id || !supplier_id || !items || items.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Counter, Supplier and items required",
      });
    }

    await connect_db.query("BEGIN");

    const orderRowId = libFunc.randomid();

    //  Insert Order
    await db_query.addData(orderTable, {
      row_id: orderRowId,
      counter_id: counter_id.trim(),
      supplier_id: supplier_id.trim(),
      order_status: "PENDING",
    });

    //  Insert Items
    for (let item of items) {
      if (!item.sweet_id || !item.quantity) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Invalid item data",
        });
      }

      await db_query.addData(itemTable, {
        row_id: libFunc.randomid(),
        order_id: orderRowId,
        sweet_id: item.sweet_id.trim(),
        quantity: item.quantity,
      });
    }

    await connect_db.query("COMMIT");

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Order created successfully",
      data: {
        order_id: orderRowId,
      },
    });
  } catch (error) {
    console.log("createOrder error:", error);

    try {
      await connect_db.query("ROLLBACK");
    } catch (e) {}

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

// {
//   fn: 'common_fn',
//   se: 'cr_ord',
//   data: {
//     counter_id: '1774068978592_lPPR',
//     supplier_id: '1774069330617_59r8',
//     items: [ [Object], [Object] ]
//   }
// }

async function getShopOrders(req, res) {
  try {
    const user = req.data;

    // 🔒 Only SHOP_ADMIN
    if (user.user_role !== "SHOP_ADMIN") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    const shopId = user.shopId;

    const result = await db_query.customQuery(`
      SELECT 
        o.row_id AS order_id,
        o.order_status,
        o.order_date,

        sup.row_id AS supplier_id,
        sup.supplier_name,

        sh.shop_name,

        oi.sweet_id,
        s.sweet_name,
        s.unit,
        oi.quantity

      FROM ${schema}.orders o

      LEFT JOIN ${schema}.shops sh 
        ON sh.row_id = o.shop_id

      LEFT JOIN ${schema}.suppliers sup 
        ON sup.row_id = o.supplier_id

      LEFT JOIN ${schema}.order_items oi 
        ON oi.order_id = o.row_id

      LEFT JOIN ${schema}.sweets s 
        ON s.row_id = oi.sweet_id

      WHERE o.shop_id = '${shopId}'
      ORDER BY o.order_date DESC
    `);

    // 🔹 Group order-wise
    const ordersMap = {};

    for (let row of result.data || []) {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          order_id: row.order_id,
          order_status: row.order_status,
          order_date: row.order_date,
          shop_name: row.shop_name,
          supplier_id: row.supplier_id,
          supplier_name: row.supplier_name,
          items: [],
        };
      }

      if (row.sweet_id) {
        ordersMap[row.order_id].items.push({
          sweet_id: row.sweet_id,
          sweet_name: row.sweet_name,
          unit: row.unit,
          quantity: row.quantity,
        });
      }
    }

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Shop orders fetched successfully",
      data: Object.values(ordersMap),
    });
  } catch (error) {
    console.log("getShopOrders error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function getCounterRequests(req, res) {
  try {
    const user = req.data;

    const requestTable = schema + ".counter_requests";
    const counterTable = schema + ".counters";
    const sweetTable = schema + ".sweets";

    let conditions = ["1=1"];

    // 🟡 COUNTER USER → own requests
    if (user.user_role === "COUNTER_USER") {
      conditions.push(`r.counter_id = '${user.counterId}'`);
    }

    // 🟠 SHOP ADMIN → all counters of shop
    if (user.user_role === "SHOP_ADMIN") {
      conditions.push(`c.shop_id = '${user.shopId}'`);
    }

    // 🔴 ADMIN → all (no filter)

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const result = await db_query.customQuery(`
      SELECT
        r.row_id,
        r.quantity,
        r.status,
        r.cr_on,

        c.row_id AS counter_id,
        c.counter_name,

        s.row_id AS sweet_id,
        s.sweet_name,
        s.unit

      FROM ${requestTable} r
      LEFT JOIN ${counterTable} c 
        ON c.row_id = r.counter_id
      LEFT JOIN ${sweetTable} s 
        ON s.row_id = r.sweet_id

      ${whereClause}
      ORDER BY r.cr_on DESC
    `);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Counter requests fetched successfully",
      data: result.data || [],
    });
  } catch (error) {
    console.log("getCounterRequests error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

// {
//   "counter_id": "counter_123",
//   "order_status": "PENDING",
//   "from_date": "2026-03-01",
//   "to_date": "2026-03-21"
// }

// async function updateOrderStatus(req, res) {
//   try {
//     const orderTable = schema + ".orders";
//     const userTable = schema + ".users";

//     const { order_id, order_status } = req.data || {};

//     // 🔹 Validation
//     if (!order_id || !order_status) {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Order ID and Status required",
//       });
//     }

//     // 🔹 Check order exists + get shop_id
//     const orderCheck = await db_query.customQuery(`
//       SELECT order_status, shop_id
//       FROM ${orderTable}
//       WHERE row_id = '${order_id.trim()}'
//     `);

//     if (!orderCheck.data || orderCheck.data.length === 0) {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Invalid order",
//       });
//     }

//     const currentStatus = orderCheck.data[0].order_status;
//     const shopId = orderCheck.data[0].shop_id;

//     // 🔥 Rules
//     if (currentStatus === "COMPLETED") {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Completed order cannot be updated",
//       });
//     }

//     if (currentStatus === "PENDING" && order_status !== "DISPATCHED") {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Only DISPATCHED allowed from PENDING",
//       });
//     }

//     if (currentStatus === "DISPATCHED" && order_status !== "COMPLETED") {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Only COMPLETED allowed from DISPATCHED",
//       });
//     }

//     // 🔹 Update
//     const resp = await db_query.addData(
//       orderTable,
//       { order_status },
//       order_id.trim(),
//       "Order",
//     );

//     // 🔔 Notification (AFTER UPDATE SUCCESS)

//     // 🟠 Notify Shop Admin
//     const shopAdmins = await db_query.customQuery(`
//       SELECT row_id FROM ${userTable}
//       WHERE role = 'SHOP_ADMIN'
//       AND shop_id = '${shopId}'
//     `);

//     if (shopAdmins.data?.length) {
//       for (let admin of shopAdmins.data) {
//         await createNotification({
//           user_id: admin.row_id,
//           title: "Order Status Updated",
//           message: `Order ${order_status}`,
//           type: "ORDER",
//           reference_id: order_id,
//         });
//       }
//     }

//     // 🔵 (Optional) Notify Counter Users
//     const counterUsers = await db_query.customQuery(`
//       SELECT DISTINCT u.row_id
//       FROM ${schema}.counter_requests r
//       LEFT JOIN ${userTable} u
//         ON u.counter_id = r.counter_id
//       WHERE r.row_id IN (
//         SELECT r.row_id FROM ${schema}.counter_requests r
//         JOIN ${schema}.order_items oi
//           ON oi.sweet_id = r.sweet_id
//         WHERE oi.order_id = '${order_id}'
//       )
//     `);

//     if (counterUsers.data?.length) {
//       for (let u of counterUsers.data) {
//         await createNotification({
//           user_id: u.row_id,
//           title: "Order Update",
//           message: `Your requested items are ${order_status}`,
//           type: "ORDER",
//           reference_id: order_id,
//         });
//       }
//     }

//     return libFunc.sendResponse(res, resp);
//   } catch (error) {
//     console.log("updateOrderStatus error:", error);

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Something went wrong",
//       error: error.message,
//     });
//   }
// }

// PENDING → DISPATCHED → COMPLETED
//    ↓
// CANCELLED

async function cancelOrder(req, res) {
  try {
    const orderTable = schema + ".orders";

    const { order_id } = req.data || {};

    if (!order_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order ID required",
      });
    }

    // 🔹 Check order
    const orderCheck = await db_query.customQuery(`
      SELECT order_status FROM ${orderTable}
      WHERE row_id = '${order_id.trim()}'
    `);

    if (!orderCheck.data || orderCheck.data.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid order",
      });
    }

    const status = orderCheck.data[0].order_status;

    // 🔥 Rules
    if (status === "DISPATCHED") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Dispatched order cannot be cancelled",
      });
    }

    if (status === "COMPLETED") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Completed order cannot be cancelled",
      });
    }

    // 🔹 Cancel Order
    const resp = await db_query.addData(
      orderTable,
      { order_status: "CANCELLED" },
      order_id.trim(),
      "Order",
    );

    return libFunc.sendResponse(res, resp);
  } catch (error) {
    console.log("cancelOrder error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const orderTable = schema + ".orders";
    const userTable = schema + ".users";

    const { order_id, status } = req.data || {};
    const user = req.data;

    const validStatuses = ["ACCEPTED", "REJECTED", "DISPATCHED", "DELIVERED"];

    // ✅ Validation
    if (!order_id || !status) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order ID and status required",
      });
    }

    if (!validStatuses.includes(status)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid status",
      });
    }

    // ✅ Get order
    const orderCheck = await db_query.customQuery(`
      SELECT supplier_id, shop_id, order_status
      FROM ${orderTable}
      WHERE row_id = '${order_id.trim()}'
    `);

    if (!orderCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid order",
      });
    }

    const order = orderCheck.data[0];

    // ✅ Role validation
    if (user.user_role === "SUPPLIER") {
      if (order.supplier_id !== user.supplierId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Unauthorized order",
        });
      }

      if (!["ACCEPTED", "REJECTED", "DISPATCHED"].includes(status)) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Supplier cannot set this status",
        });
      }
    }

    if (user.user_role === "SHOP_ADMIN") {
      if (order.shop_id !== user.shop_id) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Unauthorized shop order",
        });
      }

      if (status !== "DELIVERED") {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop admin can only mark delivered",
        });
      }
    }

    if (!["ADMIN", "SHOP_ADMIN", "SUPPLIER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // ✅ Status flow validation
    const current = order.order_status;

    const validFlow = {
      PENDING: ["ACCEPTED", "REJECTED"],
      ACCEPTED: ["DISPATCHED"],
      DISPATCHED: ["DELIVERED"],
    };

    if (validFlow[current] && !validFlow[current].includes(status)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: `Invalid status transition from ${current} → ${status}`,
      });
    }

    // ✅ Update Order
    await db_query.addData(
      orderTable,
      { order_status: status },
      order_id.trim(),
      "Order",
    );

    // =====================================
    // 🔔 NOTIFICATIONS START HERE
    // =====================================

    // 🟠 1. Notify Shop Admin
    const shopAdmins = await db_query.customQuery(`
      SELECT row_id FROM ${userTable}
      WHERE role = 'SHOP_ADMIN'
      AND shop_id = '${order.shop_id}'
    `);

    if (shopAdmins.data?.length) {
      for (let admin of shopAdmins.data) {
        await createNotification({
          user_id: admin.row_id,
          title: "Order Status Updated",
          message: `Order is ${status}`,
          type: "ORDER",
          reference_id: order_id,
        });
      }
    }

    // 🔵 2. Notify Supplier Users
    const supplierUsers = await db_query.customQuery(`
      SELECT row_id FROM ${userTable}
      WHERE supplier_id = '${order.supplier_id}'
    `);

    if (supplierUsers.data?.length) {
      for (let u of supplierUsers.data) {
        await createNotification({
          user_id: u.row_id,
          title: "Order Update",
          message: `Order is ${status}`,
          type: "ORDER",
          reference_id: order_id,
        });
      }
    }

    // 🟢 3. Notify Counter Users (optional but powerful 🔥)
    const counterUsers = await db_query.customQuery(`
      SELECT DISTINCT u.row_id
      FROM ${schema}.counter_requests r
      LEFT JOIN ${userTable} u 
        ON u.counter_id = r.counter_id
      WHERE r.status = 'APPROVED'
      AND r.sweet_id IN (
        SELECT sweet_id FROM ${schema}.order_items
        WHERE order_id = '${order_id}'
      )
    `);

    if (counterUsers.data?.length) {
      for (let u of counterUsers.data) {
        await createNotification({
          user_id: u.row_id,
          title: "Order Update",
          message: `Your requested items are ${status}`,
          type: "ORDER",
          reference_id: order_id,
        });
      }
    }

    // =====================================

    return libFunc.sendResponse(res, {
      status: 0,
      msg: `Order ${status} successfully`,
    });
  } catch (error) {
    console.log("updateOrderStatus error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function createChalan(req, res) {
  try {
    const chalanTable = schema + ".chalans";
    const orderTable = schema + ".orders";
    const userTable = schema + ".users";
    const requestTable = schema + ".counter_requests";
    const itemTable = schema + ".order_items";

    const { order_id, dispatch_date, transport_details = "" } = req.data || {};
    const user = req.data;

    // 🔐 Role validation
    if (user.user_role !== "SUPPLIER") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only supplier can dispatch order",
      });
    }

    if (!order_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order ID required",
      });
    }

    // 📥 Get Order
    const orderCheck = await db_query.customQuery(`
      SELECT supplier_id, order_status, shop_id
      FROM ${orderTable}
      WHERE row_id = '${order_id.trim()}'
    `);

    if (!orderCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid order",
      });
    }

    const order = orderCheck.data[0];

    // 🔐 Supplier ownership check
    if (order.supplier_id !== user.supplierId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Unauthorized order access",
      });
    }

    // 🚦 Status validation
    if (order.order_status === "DISPATCHED") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order already dispatched",
      });
    }

    if (order.order_status !== "ACCEPTED") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order must be ACCEPTED before dispatch",
      });
    }

    // 🔄 TRANSACTION START
    await connect_db.query("BEGIN");

    // 🔁 Double check
    const existingChalan = await db_query.customQuery(`
      SELECT 1 FROM ${chalanTable}
      WHERE order_id = '${order_id.trim()}'
    `);

    if (existingChalan.data?.length) {
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Chalan already exists",
      });
    }

    // 📦 Create Chalan
    const chalanRowId = libFunc.randomid();

    await db_query.addData(chalanTable, {
      row_id: chalanRowId,
      order_id: order_id.trim(),
      supplier_id: user.supplierId,
      dispatch_date,
      transport_details: transport_details.trim(),
    });

    // 📊 Update Order
    await db_query.addData(
      orderTable,
      { order_status: "DISPATCHED" },
      order_id.trim(),
      "Order",
    );

    // ✅ COMMIT
    await connect_db.query("COMMIT");

    // ==============================
    // 🔔 NOTIFICATIONS
    // ==============================

    // 🟠 1. Notify Shop Admin
    const shopAdmins = await db_query.customQuery(`
      SELECT row_id FROM ${userTable}
      WHERE role = 'SHOP_ADMIN'
      AND shop_id = '${order.shop_id}'
    `);

    if (shopAdmins.data?.length) {
      for (let admin of shopAdmins.data) {
        await createNotification({
          user_id: admin.row_id,
          title: "Order Dispatched",
          message: "Order has been dispatched by supplier",
          type: "CHALLAN",
          reference_id: chalanRowId,
        });
      }
    }

    // 🔵 2. Notify Counter Users
    const counterUsers = await db_query.customQuery(`
      SELECT DISTINCT u.row_id
      FROM ${requestTable} r
      LEFT JOIN ${userTable} u ON u.counter_id = r.counter_id
      WHERE r.status = 'APPROVED'
      AND r.sweet_id IN (
        SELECT sweet_id FROM ${itemTable}
        WHERE order_id = '${order_id}'
      )
    `);

    if (counterUsers.data?.length) {
      for (let u of counterUsers.data) {
        await createNotification({
          user_id: u.row_id,
          title: "Order Dispatched",
          message: "Your requested items have been dispatched",
          type: "CHALLAN",
          reference_id: chalanRowId,
        });
      }
    }

    // ==============================

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Chalan created and order dispatched",
      data: {
        chalan_id: chalanRowId,
      },
    });
  } catch (error) {
    console.log("createChalan error:", error);

    try {
      await connect_db.query("ROLLBACK");
    } catch (e) {}

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function getAllChalans(req, res) {
  try {
    const user = req.data;

    const chalanTable = schema + ".chalans";
    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";
    const sweetTable = schema + ".sweets";
    const supplierTable = schema + ".suppliers";
    const shopTable = schema + ".shops";

    let where = "WHERE 1=1";

    // 🔵 SUPPLIER → only own chalans
    if (user.user_role === "SUPPLIER") {
      where += ` AND ch.supplier_id = '${user.supplierId}'`;
    }

    // 🟠 SHOP_ADMIN → only own shop
    if (user.user_role === "SHOP_ADMIN") {
      where += ` AND o.shop_id = '${user.shopId}'`;
    }

    // 🔴 ADMIN → no filter

    const result = await db_query.customQuery(`
      SELECT
        ch.row_id AS chalan_id,
        ch.dispatch_date,
        ch.transport_details,

        o.row_id AS order_id,
        o.order_status,
        o.order_date,

        sh.shop_name,
        sh.city,
        sh.state,

        sup.row_id AS supplier_id,
        sup.supplier_name,

        oi.sweet_id,
        s.sweet_name,
        s.unit,
        oi.quantity

      FROM ${chalanTable} ch

      LEFT JOIN ${orderTable} o 
        ON o.row_id = ch.order_id

      LEFT JOIN ${shopTable} sh 
        ON sh.row_id = o.shop_id

      LEFT JOIN ${supplierTable} sup 
        ON sup.row_id = ch.supplier_id

      LEFT JOIN ${itemTable} oi 
        ON oi.order_id = o.row_id

      LEFT JOIN ${sweetTable} s 
        ON s.row_id = oi.sweet_id

      ${where}
      ORDER BY ch.dispatch_date DESC
    `);

    // 🔹 Group chalan-wise
    const chalanMap = {};

    for (let row of result.data || []) {
      if (!chalanMap[row.chalan_id]) {
        chalanMap[row.chalan_id] = {
          chalan_id: row.chalan_id,
          dispatch_date: row.dispatch_date,
          transport_details: row.transport_details,

          order_id: row.order_id,
          order_status: row.order_status,
          order_date: row.order_date,

          shop_name: row.shop_name,
          city: row.city,
          state: row.state,

          supplier_id: row.supplier_id,
          supplier_name: row.supplier_name,

          items: [],
        };
      }

      if (row.sweet_id) {
        chalanMap[row.chalan_id].items.push({
          sweet_id: row.sweet_id,
          sweet_name: row.sweet_name,
          unit: row.unit,
          quantity: row.quantity,
        });
      }
    }

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Chalans fetched successfully",
      data: Object.values(chalanMap),
    });
  } catch (error) {
    console.log("getAllChalans error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

// {
//   fn: 'common_fn',
//   se: 'cr_challan',
//   data: {
//     order_id: '1774075290388_JnHQ',
//     supplier_id: '1774069330617_59r8',
//     dispatch_date: '2026-03-21',
//     transport_details: 'Truck RJ14 AB 1234'
//   }
// }

async function getSupplierOrders(req, res) {
  try {
    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";
    const sweetTable = schema + ".sweets";
    const shopTable = schema + ".shops";

    const { supplier_id } = req.data || {};
    const user = req.data;
    console.log("usrs", user);

    //  Role validation
    if (!["SUPPLIER", "ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let whereCondition = "";

    //  SUPPLIER → only own orders
    if (user.user_role === "SUPPLIER") {
      whereCondition = `o.supplier_id = '${user.supplierId}'`;
    }

    //  ADMIN → any supplier
    if (user.user_role === "ADMIN") {
      if (!supplier_id) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Supplier ID required",
        });
      }
      whereCondition = `o.supplier_id = '${supplier_id.trim()}'`;
    }

    //  SHOP_ADMIN → only own shop orders
    if (user.user_role === "SHOP_ADMIN") {
      whereCondition = `o.shop_id = '${user.shop_id}'`;
    }

    const result = await db_query.customQuery(`
      SELECT 
        o.row_id AS order_id,
        o.order_status,
        o.order_date,

        sh.row_id AS shop_id,
        sh.shop_name,
        sh.city,
        sh.state,

        oi.sweet_id,
        s.sweet_name,
        s.unit,
        oi.quantity

      FROM ${orderTable} o
      LEFT JOIN ${shopTable} sh ON sh.row_id = o.shop_id
      LEFT JOIN ${itemTable} oi ON oi.order_id = o.row_id
      LEFT JOIN ${sweetTable} s ON s.row_id = oi.sweet_id

      WHERE ${whereCondition}
      ORDER BY o.order_date DESC
    `);

    const rows = Array.isArray(result) ? result : result.data;

    if (!rows || rows.length === 0) {
      return libFunc.sendResponse(res, {
        status: 0,
        msg: "No orders found",
        data: [],
      });
    }

    const ordersMap = {};

    for (let row of rows) {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          order_id: row.order_id,
          order_status: row.order_status,
          order_date: row.order_date,
          shop: {
            shop_id: row.shop_id,
            shop_name: row.shop_name,
            city: row.city,
            state: row.state,
          },
          items: [],
        };
      }

      if (row.sweet_id) {
        ordersMap[row.order_id].items.push({
          sweet_id: row.sweet_id,
          sweet_name: row.sweet_name,
          unit: row.unit,
          quantity: row.quantity,
        });
      }
    }

    const finalData = Object.values(ordersMap);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Supplier orders fetched successfully",
      data: finalData,
    });
  } catch (error) {
    console.log("getSupplierOrders error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

// Order → DISPATCHED
//         ↓
// Receive Order API
//         ↓
// Inventory + Stock Transaction
//         ↓
// Order → COMPLETED

async function receiveOrder(req, res) {
  try {
    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";
    const inventoryTable = schema + ".inventory";
    const transactionTable = schema + ".stock_transactions";

    const { order_id, counter_id } = req.data || {};

    // 🔹 Validation
    if (!order_id || !counter_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order ID and Counter ID required",
      });
    }

    // 🔹 Check Order
    const orderCheck = await db_query.customQuery(`
      SELECT order_status FROM ${orderTable}
      WHERE row_id = '${order_id.trim()}'
    `);

    if (!orderCheck.data || orderCheck.data.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid order",
      });
    }

    const status = orderCheck.data[0].order_status;

    if (status === "COMPLETED") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order already completed",
      });
    }

    if (status !== "DISPATCHED") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order not dispatched yet",
      });
    }

    // 🔥 START TRANSACTION
    await connect_db.query("BEGIN");

    // 🔹 Get Order Items
    const items = await db_query.customQuery(`
      SELECT sweet_id, quantity
      FROM ${itemTable}
      WHERE order_id = '${order_id.trim()}'
    `);

    for (let item of items.data) {
      const sweet_id = item.sweet_id;
      const qty = Number(item.quantity);

      // 🔹 Insert stock transaction (IN)
      await db_query.addData(transactionTable, {
        row_id: libFunc.randomid(),
        counter_id: counter_id.trim(),
        sweet_id,
        transaction_type: "IN",
        quantity: qty,
        reference_id: order_id,
        notes: "Stock received from order",
      });

      // 🔹 Check inventory
      const existing = await db_query.customQuery(`
        SELECT row_id, quantity FROM ${inventoryTable}
        WHERE counter_id = '${counter_id}'
        AND sweet_id = '${sweet_id}'
      `);

      if (existing.data && existing.data.length > 0) {
        const currentQty = Number(existing.data[0].quantity);
        const newQty = currentQty + qty;

        // 🔹 Update inventory
        await query.update_data(
          inventoryTable,
          { quantity: newQty },
          {
            counter_id,
            sweet_id,
          },
        );
      } else {
        // 🔹 Insert new inventory
        await db_query.addData(inventoryTable, {
          row_id: libFunc.randomid(),
          counter_id,
          sweet_id,
          quantity: qty,
        });
      }
    }

    // 🔹 Update Order Status → COMPLETED
    await db_query.addData(
      orderTable,
      { order_status: "COMPLETED" },
      order_id.trim(),
      "Order",
    );

    // 🔥 COMMIT
    await connect_db.query("COMMIT");

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Order received and stock updated successfully",
    });
  } catch (error) {
    console.log("receiveOrder error:", error);

    try {
      await connect_db.query("ROLLBACK");
    } catch (e) {}

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function getChalansBySupplier(req, res) {
  try {
    const chalanTable = schema + ".chalans";
    const orderTable = schema + ".orders";

    const { supplier_id } = req.data || {};

    if (!supplier_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Supplier ID required",
      });
    }

    const result = await db_query.customQuery(`
      SELECT
        ch.row_id AS chalan_id,
        ch.order_id,
        ch.dispatch_date,
        ch.transport_details,

        o.order_status,
        o.order_date

      FROM ${chalanTable} ch
      LEFT JOIN ${orderTable} o
        ON o.row_id = ch.order_id

      WHERE ch.supplier_id = '${supplier_id.trim()}'
      ORDER BY ch.dispatch_date DESC
    `);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Chalans fetched successfully",
      data: result.data || [],
    });
  } catch (error) {
    console.log("getChalansBySupplier error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function getChalansByOrder(req, res) {
  try {
    const chalanTable = schema + ".chalans";

    const { order_id } = req.data || {};

    if (!order_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order ID required",
      });
    }

    const result = await db_query.customQuery(`
      SELECT
        row_id AS chalan_id,
        order_id,
        supplier_id,
        dispatch_date,
        transport_details,
        cr_on
      FROM ${chalanTable}
      WHERE order_id = '${order_id.trim()}'
    `);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Chalan fetched successfully",
      data: result.data || [],
    });
  } catch (error) {
    console.log("getChalansByOrder error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function trackDispatch(req, res) {
  try {
    const orderTable = schema + ".orders";
    const chalanTable = schema + ".chalans";
    const supplierTable = schema + ".suppliers";
    const itemTable = schema + ".order_items";
    const sweetTable = schema + ".sweets";

    const { order_id } = req.data || {};

    if (!order_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order ID required",
      });
    }

    const result = await db_query.customQuery(`
      SELECT
        o.row_id AS order_id,
        o.order_status,
        o.order_date,

        s.supplier_name,

        ch.row_id AS chalan_id,
        ch.dispatch_date,
        ch.transport_details,

        oi.sweet_id,
        sw.sweet_name,
        oi.quantity

      FROM ${orderTable} o
      LEFT JOIN ${supplierTable} s
        ON s.row_id = o.supplier_id
      LEFT JOIN ${chalanTable} ch
        ON ch.order_id = o.row_id
      LEFT JOIN ${itemTable} oi
        ON oi.order_id = o.row_id
      LEFT JOIN ${sweetTable} sw
        ON sw.row_id = oi.sweet_id

      WHERE o.row_id = '${order_id.trim()}'
    `);

    if (!result.data || result.data.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order not found",
      });
    }

    const response = {
      order_id: result.data[0].order_id,
      order_status: result.data[0].order_status,
      order_date: result.data[0].order_date,
      supplier_name: result.data[0].supplier_name,
      chalan: {
        chalan_id: result.data[0].chalan_id,
        dispatch_date: result.data[0].dispatch_date,
        transport_details: result.data[0].transport_details,
      },
      items: [],
    };

    for (let row of result.data) {
      if (row.sweet_id) {
        response.items.push({
          sweet_id: row.sweet_id,
          sweet_name: row.sweet_name,
          quantity: row.quantity,
        });
      }
    }

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Dispatch tracked successfully",
      data: response,
    });
  } catch (error) {
    console.log("trackDispatch error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

// async function createReturn(req, res) {

//   const tablename = schema + ".returns";

//   const order_id = req.data.order_id;
//   const sweet_id = req.data.sweet_id;
//   const quantity = req.data.quantity;
//   const reason = req.data.reason || "";

//   if (!order_id || !sweet_id || !quantity) {
//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Order, Sweet and Quantity required"
//     });
//   }

//   const columns = {
//     row_id: libFunc.randomid(),
//     order_id: order_id.trim(),
//     sweet_id: sweet_id.trim(),
//     quantity: quantity,
//     reason: reason.trim()
//   };

//   const resp = await db_query.addData(tablename, columns);

//   return libFunc.sendResponse(res, resp);
// }

// async function createExpiryLog(req, res) {

//   const tablename = schema + ".expiry_logs";

//   const counter_id = req.data.counter_id;
//   const sweet_id = req.data.sweet_id;
//   const quantity = req.data.quantity;
//   const reason = req.data.reason || "Expired";

//   if (!counter_id || !sweet_id || !quantity) {
//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Counter, Sweet and Quantity required"
//     });
//   }

//   const columns = {
//     row_id: libFunc.randomid(),
//     counter_id: counter_id.trim(),
//     sweet_id: sweet_id.trim(),
//     quantity: quantity,
//     reason: reason.trim()
//   };

//   const resp = await db_query.addData(tablename, columns);

//   return libFunc.sendResponse(res, resp);
// }

// async function fetchOrders(req, res) {

//   const query = `
//     SELECT
//       o.row_id,
//       o.order_status,
//       o.order_date,
//       c.counter_name,
//       s.supplier_name
//     FROM ${schema}.orders o
//     LEFT JOIN ${schema}.counters c
//       ON c.row_id = o.counter_id
//     LEFT JOIN ${schema}.suppliers s
//       ON s.row_id = o.supplier_id
//     ORDER BY o.order_date DESC
//   `;

//   const result = await db_query.runQuery(query);

//   return libFunc.sendResponse(res, {
//     status: 0,
//     data: result.rows
//   });
// }

var fs = require("fs");

async function downloadOrderPDF(req, res) {
  try {
    const { order_id } = req.data;

    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";
    const sweetTable = schema + ".sweets";
    const supplierTable = schema + ".suppliers";
    const counterTable = schema + ".counters";

    // 🔹 Fetch Data
    const result = await db_query.customQuery(`
      SELECT
        o.row_id AS order_id,
        o.order_date,
        o.order_status,

        s.supplier_name,
        s.phone,
        s.email,
        s.address,

        c.counter_name,
        c.location,

        oi.quantity,
        sw.sweet_name,
        sw.unit

      FROM ${orderTable} o
      LEFT JOIN ${supplierTable} s ON s.row_id = o.supplier_id
      LEFT JOIN ${counterTable} c ON c.row_id = o.counter_id
      LEFT JOIN ${itemTable} oi ON oi.order_id = o.row_id
      LEFT JOIN ${sweetTable} sw ON sw.row_id = oi.sweet_id

      WHERE o.row_id = '${order_id}'
    `);

    if (!result.data || result.data.length === 0) {
      return res.status(404).send("Order not found");
    }

    const data = result.data;

    const orgFolder = path.join("./public/uploads", "ShopMedia");
    if (!fs.existsSync(orgFolder)) {
      fs.mkdirSync(orgFolder, { recursive: true });
    }

    // 🔹 File name + path
    const fileName = `Report_${Date.now()}.pdf`;
    const filePath = path.join(orgFolder, fileName);

    // 🔥 Create PDF
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=order_${order_id}.pdf`,
    );

    // Stream PDF to file + you can also pipe to res if needed
    doc.pipe(fs.createWriteStream(filePath));

    // ================= HEADER =================
    doc
      .fontSize(18)
      .fillColor("#2c3e50")
      .text("PURCHASE ORDER", { align: "center" });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // ================= ORDER INFO =================
    doc.fontSize(11).fillColor("#000");
    doc
      .text(`Order ID: ${data[0].order_id}`, { continued: true })
      .text(
        `        Date: ${new Date(data[0].order_date).toLocaleDateString()}`,
        { align: "right" },
      );
    doc.text(`Status: ${data[0].order_status}`);
    doc.moveDown();

    // ================= SUPPLIER =================
    doc
      .fontSize(12)
      .fillColor("#34495e")
      .text("Supplier Details", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#000");
    doc.text(`Name: ${data[0].supplier_name}`);
    doc.text(`Phone: ${data[0].phone}`);
    doc.text(`Email: ${data[0].email}`);
    doc.text(`Address: ${data[0].address}`);
    doc.moveDown();

    // ================= COUNTER =================
    doc
      .fontSize(12)
      .fillColor("#34495e")
      .text("Counter Details", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#000");
    doc.text(`Name: ${data[0].counter_name}`);
    doc.text(`Location: ${data[0].location}`);
    doc.moveDown();

    // ================= TABLE =================
    doc.fontSize(12).fillColor("#000").text("Items", { underline: true });
    doc.moveDown(0.5);

    // Column positions
    const col1 = 50;
    const col2 = 300;
    const col3 = 400;

    let tableTop = doc.y;

    // ===== TABLE HEADER =====
    doc.rect(40, tableTop, 500, 20).fill("#f2f2f2");
    doc.fillColor("#000").fontSize(10);
    doc.text("Sweet Name", col1, tableTop + 5);
    doc.text("Qty", col2, tableTop + 5);
    doc.text("Unit", col3, tableTop + 5);

    let y = tableTop + 25;

    // ===== TABLE ROWS =====
    data.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.rect(40, y - 2, 500, 20).fill("#fafafa");
        doc.fillColor("#000");
      }

      doc.text(item.sweet_name, col1, y, { width: 200 });
      doc.text(item.quantity.toString(), col2, y);
      doc.text(item.unit, col3, y);

      y += 20;
    });

    // ================= FOOTER =================
    doc.moveDown(2);
    doc
      .fontSize(9)
      .fillColor("gray")
      .text("This is a system generated document.", {
        align: "center",
      });

    doc.end();

    const fileUrl = `uploads/${order_id}/${fileName}`;
    const serverUrl = "https://stock-mangments.onrender.com/";

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "PDF generated successfully",
      filePath: serverUrl + fileUrl,
    });
  } catch (error) {
    console.log("downloadOrderPDF error:", error);
    res.status(500).send("Error generating PDF");
  }
}
async function downloadChalanPDF(req, res) {
  try {
    const { chalan_id } = req.data;

    const chalanTable = schema + ".chalans";
    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";
    const sweetTable = schema + ".sweets";
    const supplierTable = schema + ".suppliers";
    const shopTable = schema + ".shops";

    // ================= QUERY =================
    const result = await db_query.customQuery(`
      SELECT
        ch.row_id AS chalan_id,
        ch.dispatch_date,
        ch.transport_details,

        o.row_id AS order_id,

        s.supplier_name,
        s.phone AS supplier_phone,
        s.address AS supplier_address,

        sh.shop_name,
        sh.city,
        sh.state,
        sh.address AS shop_address,
        sh.phone AS shop_phone,

        oi.quantity,
        sw.sweet_name,
        sw.unit

      FROM ${chalanTable} ch
      LEFT JOIN ${orderTable} o ON o.row_id = ch.order_id
      LEFT JOIN ${supplierTable} s ON s.row_id = ch.supplier_id
      LEFT JOIN ${shopTable} sh ON sh.row_id = o.shop_id
      LEFT JOIN ${itemTable} oi ON oi.order_id = o.row_id
      LEFT JOIN ${sweetTable} sw ON sw.row_id = oi.sweet_id

      WHERE ch.row_id = '${chalan_id}'
    `);

    if (!result.data || result.data.length === 0) {
      return res.status(404).send("Chalan not found");
    }

    const data = result.data;

    // ================= FILE PATH =================
    const BASE_UPLOAD_PATH = "/home/uploads";
    const orgFolder = path.join(BASE_UPLOAD_PATH, "ShopMedia");

    if (!fs.existsSync(orgFolder)) {
      fs.mkdirSync(orgFolder, { recursive: true });
    }

    const fileName = `Chalan_${Date.now()}.pdf`;
    const filePath = path.join(orgFolder, fileName);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(fs.createWriteStream(filePath));

    // ================= HEADER =================
    doc
      .fontSize(18)
      .fillColor("#2c3e50")
      .text("DISPATCH CHALAN", { align: "center" });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // ================= BASIC INFO =================
    doc.fontSize(11).fillColor("#000");

    doc
      .text(`Chalan ID: ${data[0].chalan_id}`, { continued: true })
      .text(`        Order ID: ${data[0].order_id}`, { align: "right" });

    doc.text(
      `Dispatch Date: ${
        data[0].dispatch_date
          ? new Date(data[0].dispatch_date).toLocaleDateString()
          : "-"
      }`,
    );

    doc.moveDown();

    // ================= SUPPLIER =================
    doc
      .fontSize(12)
      .fillColor("#34495e")
      .text("Supplier Details", { underline: true });

    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#000");

    doc.text(`Name: ${data[0].supplier_name || "-"}`);
    doc.text(`Phone: ${data[0].supplier_phone || "-"}`);
    doc.text(`Address: ${data[0].supplier_address || "-"}`);

    doc.moveDown();

    // ================= SHOP =================
    doc
      .fontSize(12)
      .fillColor("#34495e")
      .text("Shop Details", { underline: true });

    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#000");

    doc.text(`Shop Name: ${data[0].shop_name || "-"}`);
    doc.text(`Phone: ${data[0].shop_phone || "-"}`);
    doc.text(`Address: ${data[0].shop_address || "-"}`);
    doc.text(`City: ${data[0].city || "-"}, ${data[0].state || "-"}`);

    doc.moveDown();

    // ================= TRANSPORT =================
    doc
      .fontSize(12)
      .fillColor("#34495e")
      .text("Transport Details", { underline: true });

    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#000");

    doc.text(`${data[0].transport_details || "-"}`);

    doc.moveDown();

    // ================= ITEMS TABLE =================
    doc.fontSize(12).fillColor("#000").text("Items", { underline: true });
    doc.moveDown(0.5);

    const col1 = 50;
    const col2 = 300;
    const col3 = 400;

    let tableTop = doc.y;

    // Header row
    doc.rect(40, tableTop, 500, 20).fill("#f2f2f2");
    doc.fillColor("#000").fontSize(10);

    doc.text("Sweet Name", col1, tableTop + 5);
    doc.text("Qty", col2, tableTop + 5);
    doc.text("Unit", col3, tableTop + 5);

    let y = tableTop + 25;

    // Rows
    data.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.rect(40, y - 2, 500, 20).fill("#fafafa");
        doc.fillColor("#000");
      }

      doc.text(item.sweet_name || "-", col1, y, { width: 200 });
      doc.text((item.quantity || 0).toString(), col2, y);
      doc.text(item.unit || "-", col3, y);

      y += 20;
    });

    // ================= FOOTER =================
    doc.moveDown(2);
    doc
      .fontSize(9)
      .fillColor("gray")
      .text("This is a system generated document.", { align: "center" });

    doc.end();

    // ================= RESPONSE =================
    const fileUrl = `/uploads/ShopMedia/${fileName}`;
    const serverUrl = "https://stock.abhishekcv.in";

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "PDF generated successfully",
      filePath: serverUrl + fileUrl,
    });
  } catch (error) {
    console.log("downloadChalanPDF error:", error);
    return res.status(500).send("Error generating PDF");
  }
}

async function getDashboardData(req, res) {
  try {
    const user = req.data;

    const shopTable = schema + ".shops";
    const userTable = schema + ".users";
    const orderTable = schema + ".orders";
    const inventoryTable = schema + ".inventory";
    const requestTable = schema + ".counter_requests";
    const counterTable = schema + ".counters";

    let response = {};

    // 🔴 ================= ADMIN =================
    if (user.user_role === "ADMIN") {
      const [shops, users, orders, lowStock, suppliers] = await Promise.all([
        db_query.customQuery(`SELECT COUNT(*) FROM ${shopTable}`),
        db_query.customQuery(`SELECT COUNT(*) FROM ${userTable}`),
        db_query.customQuery(`SELECT COUNT(*) FROM ${orderTable}`),
        db_query.customQuery(
          `SELECT COUNT(*) FROM ${inventoryTable} WHERE quantity::int <= min_stock`,
        ),
        db_query.customQuery(`SELECT COUNT(*) FROM ${schema}.suppliers`),
      ]);

      response = {
        role: "ADMIN",
        cards: {
          total_shops: shops.data[0].count,
          total_users: users.data[0].count,
          total_orders: orders.data[0].count,
          total_suppliers: suppliers.data[0].count,
          low_stock_items: lowStock.data[0].count,
        },
      };
    }

    // 🟠 ================= SHOP ADMIN =================
    if (user.user_role === "SHOP_ADMIN") {
      const shopId = user.shopId;

      const [
        totalStock,
        lowStock,
        pendingRequests,
        orders,
        counters,
        recentOrders,
      ] = await Promise.all([
        db_query.customQuery(`
            SELECT COALESCE(SUM(quantity::int),0) AS total 
            FROM ${inventoryTable} i
            JOIN ${counterTable} c ON c.row_id = i.counter_id
            WHERE c.shop_id = '${shopId}'
          `),

        db_query.customQuery(`
            SELECT COUNT(*) FROM ${inventoryTable} i
            JOIN ${counterTable} c ON c.row_id = i.counter_id
            WHERE c.shop_id = '${shopId}'
            AND i.quantity::int <= i.min_stock
          `),

        db_query.customQuery(`
            SELECT COUNT(*) FROM ${requestTable} r
            JOIN ${counterTable} c ON c.row_id = r.counter_id
            WHERE c.shop_id = '${shopId}'
            AND r.status = 'PENDING'
          `),

        db_query.customQuery(`
            SELECT COUNT(*) FROM ${orderTable}
            WHERE shop_id = '${shopId}'
          `),

        db_query.customQuery(`
            SELECT COUNT(*) FROM ${counterTable}
            WHERE shop_id = '${shopId}'
          `),

        db_query.customQuery(`
            SELECT row_id, order_status, order_date
            FROM ${orderTable}
            WHERE shop_id = '${shopId}'
            ORDER BY order_date DESC
            LIMIT 5
          `),
      ]);

      response = {
        role: "SHOP_ADMIN",
        cards: {
          total_stock: totalStock.data[0].total,
          low_stock: lowStock.data[0].count,
          pending_requests: pendingRequests.data[0].count,
          total_orders: orders.data[0].count,
          total_counters: counters.data[0].count,
        },
        recent_orders: recentOrders.data,
      };
    }

    // 🟡 ================= COUNTER USER =================
    if (user.user_role === "COUNTER_USER") {
      const counterId = user.counterId;

      const [stock, lowStock, myRequests, pendingReq, recentTxn] =
        await Promise.all([
          db_query.customQuery(`
            SELECT COALESCE(SUM(quantity::int),0) AS total
            FROM ${inventoryTable}
            WHERE counter_id = '${counterId}'
          `),

          db_query.customQuery(`
            SELECT COUNT(*) FROM ${inventoryTable}
            WHERE counter_id = '${counterId}'
            AND quantity::int <= min_stock
          `),

          db_query.customQuery(`
            SELECT COUNT(*) FROM ${requestTable}
            WHERE counter_id = '${counterId}'
          `),

          db_query.customQuery(`
            SELECT COUNT(*) FROM ${requestTable}
            WHERE counter_id = '${counterId}'
            AND status = 'PENDING'
          `),

          db_query.customQuery(`
            SELECT sweet_id, quantity, transaction_type, cr_on
            FROM ${schema}.stock_transactions
            WHERE counter_id = '${counterId}'
            ORDER BY cr_on DESC
            LIMIT 5
          `),
        ]);

      response = {
        role: "COUNTER_USER",
        cards: {
          available_stock: stock.data[0].total,
          low_stock: lowStock.data[0].count,
          my_requests: myRequests.data[0].count,
          pending_requests: pendingReq.data[0].count,
        },
        recent_transactions: recentTxn.data,
      };
    }

    // 🟢 ================= SUPPLIER =================
    if (user.user_role === "SUPPLIER") {
      const supplierId = user.supplierId;

      const [
        totalOrders,
        pendingOrders,
        acceptedOrders,
        dispatched,
        recentOrders,
      ] = await Promise.all([
        db_query.customQuery(`
            SELECT COUNT(*) FROM ${orderTable}
            WHERE supplier_id = '${supplierId}'
          `),

        db_query.customQuery(`
            SELECT COUNT(*) FROM ${orderTable}
            WHERE supplier_id = '${supplierId}'
            AND order_status = 'PENDING'
          `),

        db_query.customQuery(`
            SELECT COUNT(*) FROM ${orderTable}
            WHERE supplier_id = '${supplierId}'
            AND order_status = 'ACCEPTED'
          `),

        db_query.customQuery(`
            SELECT COUNT(*) FROM ${orderTable}
            WHERE supplier_id = '${supplierId}'
            AND order_status = 'DISPATCHED'
          `),

        db_query.customQuery(`
            SELECT row_id, order_status, order_date
            FROM ${orderTable}
            WHERE supplier_id = '${supplierId}'
            ORDER BY order_date DESC
            LIMIT 5
          `),
      ]);

      response = {
        role: "SUPPLIER",
        cards: {
          total_orders: totalOrders.data[0].count,
          pending_orders: pendingOrders.data[0].count,
          accepted_orders: acceptedOrders.data[0].count,
          dispatched_orders: dispatched.data[0].count,
        },
        recent_orders: recentOrders.data,
      };
    }

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Dashboard data fetched successfully",
      data: response,
    });
  } catch (error) {
    console.log("getDashboardData error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function getDashboardFull(req, res) {
  try {
    const user = req.user;

    const shopTable = schema + ".shops";
    const orderTable = schema + ".orders";
    const inventoryTable = schema + ".inventory";
    const requestTable = schema + ".counter_requests";

    let data = {
      role: user.user_role,
      cards: {},
      tables: {},
      charts: {},
    };

    // ================= 🔴 ADMIN =================
    if (user.user_role === "ADMIN") {
      const totalShops = await db_query.customQuery(
        `SELECT COUNT(*) FROM ${shopTable}`,
      );
      const totalOrders = await db_query.customQuery(
        `SELECT COUNT(*) FROM ${orderTable}`,
      );

      const recentOrders = await db_query.customQuery(`
        SELECT o.row_id, o.order_status, o.order_date, s.shop_name
        FROM ${orderTable} o
        LEFT JOIN ${shopTable} s ON s.row_id = o.shop_id
        ORDER BY o.order_date DESC LIMIT 5
      `);

      const monthlyOrders = await db_query.customQuery(`
        SELECT TO_CHAR(order_date, 'Mon') AS month, COUNT(*)::int AS count
        FROM ${orderTable}
        GROUP BY month
      `);

      data.cards = {
        total_shops: totalShops.data[0].count,
        total_orders: totalOrders.data[0].count,
      };

      data.tables = {
        recent_orders: recentOrders.data,
      };

      data.charts = {
        monthly_orders: monthlyOrders.data,
      };
    }

    // ================= 🟠 SHOP ADMIN =================
    if (user.user_role === "SHOP_ADMIN") {
      const shopId = user.shop_id;

      const totalStock = await db_query.customQuery(`
        SELECT COALESCE(SUM(i.quantity::int),0) AS total
        FROM ${inventoryTable} i
        JOIN ${schema}.counters c ON c.row_id = i.counter_id
        WHERE c.shop_id = '${shopId}'
      `);

      const lowStockItems = await db_query.customQuery(`
        SELECT s.sweet_name, i.quantity, i.min_stock
        FROM ${inventoryTable} i
        JOIN ${schema}.counters c ON c.row_id = i.counter_id
        JOIN ${schema}.sweets s ON s.row_id = i.sweet_id
        WHERE c.shop_id = '${shopId}'
        AND i.quantity::int <= i.min_stock
      `);

      const requests = await db_query.customQuery(`
        SELECT r.row_id, r.quantity, r.status, s.sweet_name
        FROM ${requestTable} r
        JOIN ${schema}.sweets s ON s.row_id = r.sweet_id
        JOIN ${schema}.counters c ON c.row_id = r.counter_id
        WHERE c.shop_id = '${shopId}'
        ORDER BY r.cr_on DESC LIMIT 5
      `);

      const orders = await db_query.customQuery(`
        SELECT row_id, order_status, order_date
        FROM ${orderTable}
        WHERE shop_id = '${shopId}'
        ORDER BY order_date DESC LIMIT 5
      `);

      data.cards = {
        total_stock: totalStock.data[0].total,
        low_stock: lowStockItems.data.length,
        pending_requests: requests.data.filter((r) => r.status === "PENDING")
          .length,
      };

      data.tables = {
        low_stock_items: lowStockItems.data,
        recent_requests: requests.data,
        recent_orders: orders.data,
      };
    }

    // ================= 🟡 COUNTER USER =================
    if (user.user_role === "COUNTER_USER") {
      const counterId = user.counter_id;

      const stock = await db_query.customQuery(`
        SELECT s.sweet_name, i.quantity
        FROM ${inventoryTable} i
        JOIN ${schema}.sweets s ON s.row_id = i.sweet_id
        WHERE i.counter_id = '${counterId}'
      `);

      const requests = await db_query.customQuery(`
        SELECT r.row_id, r.quantity, r.status, s.sweet_name
        FROM ${requestTable} r
        JOIN ${schema}.sweets s ON s.row_id = r.sweet_id
        WHERE r.counter_id = '${counterId}'
        ORDER BY r.cr_on DESC LIMIT 5
      `);

      data.cards = {
        total_items: stock.data.length,
        total_requests: requests.data.length,
      };

      data.tables = {
        inventory: stock.data,
        my_requests: requests.data,
      };
    }

    // ================= 🟢 SUPPLIER =================
    if (user.user_role === "SUPPLIER") {
      const supplierId = user.supplier_id;

      const orders = await db_query.customQuery(`
        SELECT o.row_id, o.order_status, o.order_date, sh.shop_name
        FROM ${orderTable} o
        LEFT JOIN ${schema}.shops sh ON sh.row_id = o.shop_id
        WHERE o.supplier_id = '${supplierId}'
        ORDER BY o.order_date DESC LIMIT 5
      `);

      const statusChart = await db_query.customQuery(`
        SELECT order_status, COUNT(*)::int AS count
        FROM ${orderTable}
        WHERE supplier_id = '${supplierId}'
        GROUP BY order_status
      `);

      data.cards = {
        total_orders: orders.data.length,
      };

      data.tables = {
        recent_orders: orders.data,
      };

      data.charts = {
        order_status: statusChart.data,
      };
    }

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Dashboard loaded",
      data,
    });
  } catch (error) {
    console.log("Dashboard Error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function createNotification(user_id, title, message) {
  console.log("data", user_id, title, message);
  try {
    await db_query.addData(`${schema}.notifications`, {
      row_id: libFunc.randomid(),
      user_id,
      title,
      message,
    });
  } catch (err) {
    console.log("Notification error:", err);
  }
}

// async function getNotifications(req, res) {
//   try {
//     const user = req.data;

//     const result = await db_query.customQuery(`
//       SELECT row_id, title, message, is_read, cr_on
//       FROM ${schema}.notifications
//       WHERE user_id = '${user.row_id}'
//       ORDER BY cr_on DESC
//       LIMIT 20
//     `);

//     return libFunc.sendResponse(res, {
//       status: 0,
//       data: result.data,
//     });
//   } catch (error) {
//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Error fetching notifications",
//     });
//   }
// }

// async function getNotifications(req, res) {
//   try {
//     const user = req.data;

//     const result = await db_query.customQuery(`
//       SELECT row_id, title, message, is_read, cr_on
//       FROM ${schema}.notifications
//       WHERE user_id = '${user.row_id}'
//       ORDER BY cr_on DESC
//       LIMIT 20
//     `);

//     return libFunc.sendResponse(res, {
//       status: 0,
//       data: result.data,
//     });
//   } catch (error) {
//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Error fetching notifications",
//     });
//   }
// }

async function getAllCounterRequestsByShop(req, res) {
  try {
    const requestTable = schema + ".counter_requests";
    const counterTable = schema + ".counters";
    const sweetTable = schema + ".sweets";

    const user = req.data;
    const { status } = req.data || {};

    // 🔒 Role validation
    if (user.user_role !== "SHOP_ADMIN") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only shop admin allowed",
      });
    }

    const shopId = user.shopId;

    if (!shopId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid shop",
      });
    }

    // 🔹 Dynamic WHERE
    let where = `WHERE c.shop_id = '${shopId}'`;

    if (status) {
      where += ` AND r.status = '${status}'`;
    }

    // 🔹 Query
    const result = await db_query.customQuery(`
      SELECT
        r.row_id,
        r.quantity,
        r.status,
        r.cr_on,

        s.row_id AS sweet_id,
        s.sweet_name,
        s.unit,

        c.row_id AS counter_id,
        c.counter_name,
        c.location

      FROM ${requestTable} r
      LEFT JOIN ${counterTable} c 
        ON c.row_id = r.counter_id
      LEFT JOIN ${sweetTable} s 
        ON s.row_id = r.sweet_id

      ${where}
      ORDER BY r.cr_on DESC
    `);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Shop counter requests fetched successfully",
      data: result.data || [],
    });
  } catch (error) {
    console.log("getAllCounterRequestsByShop error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function getProfile(req, res) {
  try {
    const user = req.data;
    console.log("req", req);

    const userTable = schema + ".users";
    const shopTable = schema + ".shops";
    const counterTable = schema + ".counters";
    const supplierTable = schema + ".suppliers";

    let profile = {};

    // 🔴 ================= ADMIN =================
    if (user.user_role === "ADMIN") {
      const admin = await db_query.customQuery(`
        SELECT row_id, name, email, phone, role,password, cr_on
        FROM ${userTable}
        WHERE row_id = '${user.userId}'
      `);

      profile = {
        role: "ADMIN",
        ...admin.data[0],
      };
    }

    // 🟠 ================= SHOP ADMIN =================
    if (user.user_role === "SHOP_ADMIN") {
      const data = await db_query.customQuery(`
        SELECT 
          u.row_id,
          u.name,
          u.email,
          u.phone,
          u.role,
          u.password,

          s.row_id AS shop_id,
          s.shop_name,
          s.address,
          s.city,
          s.state,
          s.pincode,
          s.owner_name,
          s.logo_url

        FROM ${userTable} u
        LEFT JOIN ${shopTable} s
          ON s.row_id = u.shop_id

        WHERE u.row_id = '${user.userId}'
      `);

      profile = {
        role: "SHOP_ADMIN",
        ...data.data[0],
      };
    }

    // 🟡 ================= COUNTER USER =================
    if (user.user_role === "COUNTER_USER") {
      const data = await db_query.customQuery(`
        SELECT 
          u.row_id,
          u.name,
          u.email,
          u.phone,
          u.role,
          u.password,

          c.row_id AS counter_id,
          c.counter_name,
          c.location,

          s.row_id AS shop_id,
          s.shop_name

        FROM ${userTable} u
        LEFT JOIN ${counterTable} c
          ON c.row_id = u.counter_id
        LEFT JOIN ${shopTable} s
          ON s.row_id = c.shop_id

        WHERE u.row_id = '${user.userId}'
      `);

      profile = {
        role: "COUNTER_USER",
        ...data.data[0],
      };
    }

    // 🟢 ================= SUPPLIER =================
    if (user.user_role === "SUPPLIER") {
      const data = await db_query.customQuery(`
        SELECT 
          u.row_id,
          u.name,
          u.email,
          u.phone,
          u.role,
          u.password,
          sp.address,

          sp.row_id AS supplier_id

        FROM ${userTable} u
        LEFT JOIN ${supplierTable} sp
          ON sp.row_id = u.supplier_id

        WHERE u.row_id = '${user.userId}'
      `);

      profile = {
        role: "SUPPLIER",
        ...data.data[0],
      };
    }

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Profile fetched successfully",
      data: profile,
    });
  } catch (error) {
    console.log("getProfile error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function updateProfile(req, res) {
  console.log("req", req);
  try {
    const user = req.data;

    const userTable = schema + ".users";
    const shopTable = schema + ".shops";
    const supplierTable = schema + ".suppliers";
    const counterTable = schema + ".counters";

    const {
      name,
      email,
      phone,
      password,

      // shop fields
      shop_name,
      address,
      city,
      state,
      pincode,
      gst_number,
      logo_url,
      owner_name,

      counter_name,

      // supplier fields
      supplier_name,
    } = req.data || {};

    // 🔹 Common validation
    if (!name && !email && !phone && !shop_name && !supplier_name) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Nothing to update",
      });
    }

    // ================= 🔴 ADMIN =================
    if (user.user_role === "ADMIN") {
      await db_query.addData(
        userTable,
        {
          name,
          email,
          phone,
        },
        user.userId,
        "User",
      );
    }

    // ================= 🟠 SHOP ADMIN =================
    if (user.user_role === "SHOP_ADMIN") {
      // 🔹 Update user info
      await db_query.addData(
        userTable,
        {
          name,
          email,
          phone,
          password,
        },
        user.userId,
        "User",
      );

      // 🔹 Update shop info
      await db_query.addData(
        shopTable,
        {
          shop_name,
          address,
          city,
          state,
          pincode,
          email,
          gst_number,
          logo_url,
          owner_name,
        },
        user.shopId,
        "Shop",
      );
    }

    // ================= 🟡 COUNTER USER =================
    if (user.user_role === "COUNTER_USER") {
      await db_query.addData(
        userTable,
        {
          name,
          email,
          phone,
          password,
        },
        user.userId,
        "User",
      );

      await db_query.addData(
        counterTable,
        {
          counter_name,
        },
        user.counterId,
        "Counter",
      );
    }

    // ================= 🟢 SUPPLIER =================
    if (user.user_role === "SUPPLIER") {
      // 🔹 Update user info
      await db_query.addData(
        userTable,
        {
          name,
          email,
          phone,
          password,
        },
        user.userId,
        "User",
      );

      // 🔹 Update supplier info
      await db_query.addData(
        supplierTable,
        {
          supplier_name,
          address: address,
          email,
          phone,
          password,
        },
        user.supplierId,
        "Supplier",
      );
    }

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Profile updated successfully",
    });
  } catch (error) {
    console.log("updateProfile error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function createNotification(data) {
  await db_query.customQuery(
    `
    INSERT INTO sms.notifications
    (row_id, user_id, title, message, type, reference_id)
    VALUES ('${libFunc.randomid()}','${data.user_id}','${data.title}','${data.message}','${data.type}','${data.reference_id}')
  `,
  );
}

async function getNotifications(req, res) {
  console.log("req", req);
  try {
    const table = schema + ".notifications";
    const user = req.data;

    const { page = 1, limit = 10, type, is_read } = req.data || {};

    const offset = (page - 1) * limit;

    // 🔐 user_id always from token
    const userId = user.userId;

    let where = `WHERE user_id = '${userId}' AND is_deleted = false`;

    // 🎯 Optional filters
    if (type) {
      where += ` AND type = '${type}'`;
    }

    if (is_read !== undefined) {
      where += ` AND is_read = ${is_read}`;
    }

    // 📥 Get Notifications
    const notifications = await db_query.customQuery(`
      SELECT *
      FROM ${table}
      ${where}
      ORDER BY cr_on DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // 🔢 Total Count
    const countRes = await db_query.customQuery(`
      SELECT COUNT(*) as total
      FROM ${table}
      ${where}
    `);

    const total = countRes.data[0]?.total || 0;

    // 🔔 Unread Count (important for bell icon)
    const unreadRes = await db_query.customQuery(`
      SELECT COUNT(*) as unread
      FROM ${table}
      WHERE user_id = '${userId}'
      AND is_read = false
      AND is_deleted = false
    `);

    const unread = unreadRes.data[0]?.unread || 0;

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Notifications fetched",
      data: {
        notifications: notifications.data || [],
        total,
        unread,
        page,
        limit,
      },
    });
  } catch (error) {
    console.log("getNotifications error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function markNotificationRead(req, res) {
  try {
    const table = schema + ".notifications";
    const { notification_id } = req.data;

    if (!notification_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "notification_id required",
      });
    }

    await db_query.customQuery(`
      UPDATE ${table}
      SET is_read = true
      WHERE row_id = '${notification_id}'
    `);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Notification marked as read",
    });
  } catch (error) {
    console.log("markNotificationRead error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

function formatDateForPostgres(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split("T")[0]; // returns 'YYYY-MM-DD'
}

async function runExpiryCheck() {
  console.log("🔄 Running expiry check manually...");

  try {
    const inventoryTable = "sms.inventory";
    const expiryTable = "sms.expiry_logs";
    const sweetTable = "sms.sweets";
    const userTable = "sms.users";

    // Step 1: Get expired items
    const expiredItems = await db_query.customQuery(`
  SELECT i.*, s.price
  FROM sms.inventory i
  LEFT JOIN sms.sweets s ON s.row_id = i.sweet_id
  WHERE i.expiry_date IS NOT NULL
    AND i.expiry_date <= CURRENT_DATE
    AND i.quantity::int > 0
`);

    if (!expiredItems.data?.length) {
      console.log("✅ No expired items");
      return;
    }

    // Step 2: Loop each item
    for (let item of expiredItems.data) {
      const loss = Number(item.quantity) * Number(item.price || 0);

      await db_query.addData(expiryTable, {
        row_id: libFunc.randomid(),
        counter_id: item.counter_id,
        sweet_id: item.sweet_id,
        inventory_id: item.row_id,
        quantity: item.quantity,
        expiry_date: formatDateForPostgres(item.expiry_date),
        loss_amount: loss,
        reason: "Expired stock",
      });

      await db_query.customQuery(`
        UPDATE ${inventoryTable}
        SET quantity = 0
        WHERE row_id = '${item.row_id}'
      `);

      const users = await db_query.customQuery(`
        SELECT row_id FROM ${userTable}
        WHERE counter_id = '${item.counter_id}'
      `);

      for (let u of users.data || []) {
        await createNotification({
          user_id: u.row_id,
          title: "Stock Expired",
          message: "Some items expired and removed from inventory",
          type: "EXPIRY",
          reference_id: item.sweet_id,
          priority: "HIGH",
        });
      }
    }

    console.log("✅ Expiry check completed");
  } catch (err) {
    console.error("❌ Expiry check error:", err);
  }
}

// daily 8 o clock
cron.schedule("00 08 * * *", () => {
  console.log("🕒 Running daily expiry check via cron...");
  runExpiryCheck();
});

// Fetch Expiry Logs
async function fetchExpiryLogs(req, res) {
  try {
    const user = req.data; // token info
    const { sweet_id, start_date, end_date, counter_id } = req.data || {};
    const expiryTable = "sms.expiry_logs";
    const sweetTable = "sms.sweets";
    const counterTable = "sms.counters";

    // Base query
    let query = `
      SELECT e.*, s.sweet_name, c.counter_name
      FROM ${expiryTable} e
      LEFT JOIN ${sweetTable} s ON s.row_id = e.sweet_id
      LEFT JOIN ${counterTable} c ON c.row_id = e.counter_id
      WHERE 1=1
    `;

    // Role-based filtering
    if (user.user_role === "SHOP_ADMIN") {
      // Shop admin: must provide counter_id to fetch logs for that counter
      if (counter_id) {
        query += ` AND e.counter_id = '${counter_id}'`;
      } else {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Please provide counter_id for shop admin",
        });
      }
    } else if (user.user_role === "COUNTER_USER") {
      // Counter user: automatically use their counterId
      if (user.counterId) {
        query += ` AND e.counter_id = '${user.counterId}'`;
      } else {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Counter ID missing in user token",
        });
      }
    }

    // Additional filters
    if (sweet_id) query += ` AND e.sweet_id = '${sweet_id}'`;
    if (start_date) query += ` AND e.expiry_date >= '${start_date}'`;
    if (end_date) query += ` AND e.expiry_date <= '${end_date}'`;

    query += " ORDER BY e.expiry_date DESC";

    // Execute query
    const result = await db_query.customQuery(query);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Expiry logs fetched successfully",
      data: result.data || [],
    });
  } catch (error) {
    console.error("fetchExpiryLogs error:", error);
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong while fetching expiry logs",
      error: error.message,
    });
  }
}
