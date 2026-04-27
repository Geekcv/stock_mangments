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
  fe_dep_by_admin: fetchDepartmentsByShop,
  fe_cat_con_by_admin: fetchCountersAndCategoriesByShop,
  verfiy_challan: verifyChalan,
  fetch_order_challan: getShopChalanFullDetails,

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
  up_or_items: updateOrderItemsBySupplier,
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
  dow_ord_req: downloadOrderRequestPDF,

  // dhasboard
  fe_dash: getDashboardData,
  fe_dash_role: getDashboardDatarole,

  // profile
  fe_pro: getProfile,
  up_profile: updateProfile,

  // notificatiosn
  fe_notif: getNotifications,
  read_notify: markNotificationRead,

  // expaire
  fe_expairy_items: fetchExpiryLogs,

  // admin side
  // back_data: backupAPI,
  // restore_data: restoreAPI, // delete table and restore
  // de_data: deleteAPI, // hard reset and backup
  // de_ness_data: deleteAPIforcleandata,
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
      row_id, // ✅ NEW (for update)
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
    if (!shop_name || !owner_name || !email || !phone) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Shop + Owner details required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // ================================
    // ✅ START TRANSACTION
    // ================================
    await connect_db.query("BEGIN");

    // 🔵 UPDATE FLOW (ONLY THIS CHANGED)
    // =====================================
    if (row_id) {
      // check shop exist
      const shopCheck = await db_query.customQuery(`
    SELECT * FROM ${shopTable}
    WHERE row_id = '${row_id}'
  `);

      if (!shopCheck.data?.length) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop not found",
        });
      }

      // ✅ CUSTOM UPDATE QUERY (no addData)
      await db_query.customQuery(`
    UPDATE ${shopTable}
    SET 
      shop_name = '${shop_name.trim().replaceAll("'", "`")}',
      address = '${address.trim()}',
      city = '${city.trim()}',
      state = '${state.trim()}',
      pincode = '${pincode.trim()}',
      phone = '${cleanPhone}',
      email = '${cleanEmail}',
      gst_number = '${gst_number.trim()}',
      owner_name = '${owner_name.trim()}',
      logo_url = '${logo_url.trim()}'
    WHERE row_id = '${row_id}'
  `);

      // update shop admin user
      await db_query.customQuery(`
    UPDATE ${userTable}
    SET 
      name = '${owner_name}',
      email = '${cleanEmail}',
      phone = '${cleanPhone}',
      ${password ? `password = '${password}',` : ""}
      up_on = now()
    WHERE shop_id = '${row_id}'
    AND role = 'SHOP_ADMIN'
  `);

      await connect_db.query("COMMIT");

      return libFunc.sendResponse(res, {
        status: 0,
        msg: "Shop updated successfully",
      });
    }

    // =====================================
    // 🟢 EXISTING CREATE FLOW (UNCHANGED)
    // =====================================

    // Duplicate user check
    const existingUser = await db_query.customQuery(`
      SELECT phone, email FROM ${userTable}
      WHERE phone = '${cleanPhone}'
      OR email = '${cleanEmail}'
    `);

    if (existingUser.data?.length > 0) {
      const u = existingUser.data[0];

      if (u.phone === cleanPhone) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Phone already exists",
        });
      }

      if (u.email === cleanEmail) {
        await connect_db.query("ROLLBACK");
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
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Shop already exists",
      });
    }

    const shopRowId = libFunc.randomid();

    // Create Shop
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

    // Create SHOP_ADMIN
    const userResp = await db_query.addData(userTable, {
      row_id: libFunc.randomid(),
      name: owner_name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password: password.trim(),
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
      row_id, // ✅ NEW (for update)
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
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // Resolve Shop ID
    let finalShopId;

    if (loggedInUser.user_role === "ADMIN") {
      if (!shop_id) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "shop_id is required for admin",
        });
      }
      finalShopId = shop_id.trim();
    }

    if (loggedInUser.user_role === "SHOP_ADMIN") {
      if (shop_id && shop_id !== loggedInUser.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "You can only create counter in your shop",
        });
      }
      finalShopId = loggedInUser.shopId;
    }

    // Validation
    if (!finalShopId || !counter_name || !name || !email || !phone) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Required fields missing",
      });
    }

    // ================================
    // BEGIN TRANSACTION
    // ================================
    await connect_db.query("BEGIN");

    // =====================================
    // 🔵 UPDATE FLOW (CUSTOM QUERY ONLY)
    // =====================================
    if (row_id) {
      // check counter exists
      const counterCheck = await db_query.customQuery(`
    SELECT * FROM ${counterTable}
    WHERE row_id = '${row_id}'
  `);

      if (!counterCheck.data?.length) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Counter not found",
        });
      }

      // ✅ CUSTOM UPDATE QUERY (no addData)
      await db_query.customQuery(`
    UPDATE ${counterTable}
    SET 
      shop_id = '${finalShopId}',
      counter_name = '${counter_name.trim().replaceAll("'", "`")}',
      location = '${location.trim()}',
      up_on = now()
    WHERE row_id = '${row_id}'
  `);

      // update counter user
      await db_query.customQuery(`
    UPDATE ${userTable}
    SET 
      name = '${name}',
      email = '${email}',
      phone = '${phone}',
      ${password ? `password = '${password}',` : ""}
      up_on = now()
    WHERE counter_id = '${row_id}'
    AND role = 'COUNTER_USER'
  `);

      await connect_db.query("COMMIT");

      return libFunc.sendResponse(res, {
        status: 0,
        msg: "Counter updated successfully",
      });
    }

    // =====================================
    // 🟢 EXISTING CREATE FLOW (UNCHANGED)
    // =====================================

    // Duplicate check
    const existingUser = await db_query.customQuery(
      `SELECT phone, email FROM ${userTable}
       WHERE phone = '${phone.trim()}' OR email = '${email.trim()}'`,
    );

    if (existingUser.data && existingUser.data.length > 0) {
      const user = existingUser.data[0];

      if (user.phone === phone.trim()) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Phone already exists",
        });
      }

      if (user.email === email.trim()) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Email already exists",
        });
      }
    }

    const counterRowId = libFunc.randomid();

    // Insert Counter
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

    // Insert Counter User
    const userColumns = {
      row_id: libFunc.randomid(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password: password.trim(),
      role: "COUNTER_USER",
      counter_id: counterRowId,
      shop_id: finalShopId,
    };

    const userResp = await db_query.addData(userTable, userColumns);

    if (userResp.status !== 0) {
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, userResp);
    }

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
      row_id, // ✅ NEW
      supplier_name,
      phone,
      email,
      address = "",
      password,
    } = req.data || {};

    // Validation
    if (!supplier_name || !email || !phone) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Required fields missing",
      });
    }

    // ================================
    // BEGIN TRANSACTION
    // ================================
    await connect_db.query("BEGIN TRANSACTION");

    // =====================================
    // 🔵 UPDATE FLOW (CUSTOM QUERY ONLY)
    // =====================================
    if (row_id) {
      // check supplier exists
      const supplierCheck = await db_query.customQuery(`
    SELECT row_id FROM ${supplierTable}
    WHERE row_id = '${row_id}'
  `);

      if (!supplierCheck.data?.length) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Supplier not found",
        });
      }

      // ✅ CUSTOM UPDATE QUERY (no addData)
      await db_query.customQuery(`
    UPDATE ${supplierTable}
    SET 
      supplier_name = '${supplier_name.trim().replaceAll("'", "`")}',
      phone = '${phone.trim()}',
      email = '${email.trim()}',
      address = '${address.trim()}',
      up_on = now()
    WHERE row_id = '${row_id}'
  `);

      // update supplier user
      await db_query.customQuery(`
    UPDATE ${userTable}
    SET 
      name = '${supplier_name}',
      email = '${email}',
      phone = '${phone}',
      ${password ? `password = '${password}',` : ""}
      up_on = now()
    WHERE supplier_id = '${row_id}'
    AND role = 'SUPPLIER'
  `);

      await connect_db.query("COMMIT");

      return libFunc.sendResponse(res, {
        status: 0,
        msg: "Supplier updated successfully",
      });
    }

    // =====================================
    // 🟢 EXISTING CREATE FLOW (UNCHANGED)
    // =====================================

    if (!password) {
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Password is required",
      });
    }

    // Duplicate check
    const existingUser = await db_query.customQuery(`
      SELECT phone, email FROM ${userTable}
      WHERE phone = '${phone.trim()}'
      OR email = '${email.trim()}'
    `);

    if (existingUser.data && existingUser.data.length > 0) {
      const user = existingUser.data[0];

      if (user.phone === phone.trim()) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Phone already exists",
        });
      }

      if (user.email === email.trim()) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Email already exists",
        });
      }
    }

    const supplierRowId = libFunc.randomid();

    // Insert Supplier
    const supplierColumns = {
      row_id: supplierRowId,
      supplier_name: supplier_name.trim().replaceAll("'", "`"),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
    };

    const supplierResp = await db_query.addData(supplierTable, supplierColumns);

    if (supplierResp.status === 0) {
      // Insert User
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
        await connect_db.query("COMMIT");

        return libFunc.sendResponse(res, {
          status: 0,
          msg: "Supplier and supplier login created successfully",
          data: {
            supplier_id: supplierRowId,
          },
        });
      } else {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, userResp);
      }
    } else {
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, supplierResp);
    }
  } catch (error) {
    console.log("createSupplier error:", error);

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

    const {
      row_id, // ✅ NEW
      department_name,
      description = "",
      shop_id,
    } = req.data || {};

    const user = req.data;

    // Role validation
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // Validation
    if (!department_name) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Department name is required",
      });
    }

    // Resolve shop_id
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

    if (user.user_role === "SHOP_ADMIN") {
      if (shop_id && shop_id !== user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "You can only create department in your shop",
        });
      }
      finalShopId = user.shopId;
    }

    // =====================================
    // 🔵 UPDATE FLOW (CUSTOM QUERY ONLY)
    // =====================================
    if (row_id) {
      // check exist
      const existingDept = await db_query.customQuery(`
    SELECT row_id FROM ${tablename}
    WHERE row_id = '${row_id}'
  `);

      if (!existingDept.data?.length) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Department not found",
        });
      }

      // duplicate check (exclude same row)
      const duplicate = await db_query.customQuery(`
    SELECT row_id FROM ${tablename}
    WHERE department_name = '${department_name.trim()}'
    AND shop_id = '${finalShopId}'
    AND row_id != '${row_id}'
  `);

      if (duplicate.data?.length > 0) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Department already exists in this shop",
        });
      }

      // ✅ CUSTOM UPDATE QUERY (no addData)
      await db_query.customQuery(`
    UPDATE ${tablename}
    SET 
      department_name = '${department_name.trim().replaceAll("'", "`")}',
      description = '${description.trim()}',
      shop_id = '${finalShopId}',
      up_on = now()
    WHERE row_id = '${row_id}'
  `);

      return libFunc.sendResponse(res, {
        status: 0,
        msg: "Department updated successfully",
      });
    }

    // =====================================
    // 🟢 EXISTING CREATE FLOW (UNCHANGED)
    // =====================================

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

    const {
      row_id, // ✅ NEW
      department_id,
      category_name,
      shop_id,
    } = req.data || {};

    const user = req.data;

    // Role validation
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // Basic validation
    if (!department_id || !category_name) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Department and Category name required",
      });
    }

    // Check department exists + get shop_id
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

    // SHOP_ADMIN access control
    if (user.user_role === "SHOP_ADMIN") {
      if (department.shop_id !== user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "You cannot add category to another shop's department",
        });
      }
      finalShopId = user.shopId;
    }

    // =====================================
    // 🔵 UPDATE FLOW (CUSTOM QUERY ONLY)
    // =====================================
    if (row_id) {
      // check category exists
      const catCheck = await db_query.customQuery(`
    SELECT row_id FROM ${tablename}
    WHERE row_id = '${row_id}'
  `);

      if (!catCheck.data?.length) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Category not found",
        });
      }

      // duplicate check (exclude same row)
      const duplicate = await db_query.customQuery(`
    SELECT row_id FROM ${tablename}
    WHERE category_name = '${category_name.trim()}'
    AND department_id = '${department_id}'
    AND row_id != '${row_id}'
  `);

      if (duplicate.data?.length > 0) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Category already exists in this department",
        });
      }

      // ✅ CUSTOM UPDATE QUERY (no addData)
      await db_query.customQuery(`
    UPDATE ${tablename}
    SET 
      department_id = '${department_id.trim()}',
      category_name = '${category_name.trim().replaceAll("'", "`")}',
      shop_id = '${finalShopId}',
      up_on = now()
    WHERE row_id = '${row_id}'
  `);

      return libFunc.sendResponse(res, {
        status: 0,
        msg: "Category updated successfully",
      });
    }

    // =====================================
    // 🟢 EXISTING CREATE FLOW (UNCHANGED)
    // =====================================

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
        TO_CHAR(st.cr_on, 'YYYY-MM-DD HH24:MI:SS') AS cr_on,

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

    // 🟠 SHOP ADMIN → only own shop counters
    if (user.user_role === "SHOP_ADMIN") {
      whereConditions.push(`c.shop_id = '${user.shopId}'`);
    }

    // 🟡 COUNTER USER → only own counter
    if (user.user_role === "COUNTER_USER") {
      whereConditions.push(`i.counter_id = '${user.counterId}'`);
    }

    // 🟢 SUPPLIER → access deny
    if (user.user_role === "SUPPLIER") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const result = await db_query.customQuery(`
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

    console.log("inventory result:", result);

    // ==============================
    // ✅ SAFE DATA HANDLING
    // ==============================
    let inventoryData = [];

    if (result.status === 0 && result.data) {
      inventoryData = result.data;
    }

    // ==============================
    // ⚠️ NO DATA CASE
    // ==============================
    if (inventoryData.length === 0) {
      return libFunc.sendResponse(res, {
        status: 0,
        msg: "No inventory found",
        data: [],
      });
    }

    // ==============================
    // ✅ SUCCESS
    // ==============================
    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Inventory fetched successfully",
      data: inventoryData,
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

    console.log("reuestings", req.data);

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

    if (!supplierCheck.data?.length) {
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
    // 🧮 Combine sweets WITH COUNTER
    const itemMap = {};

    for (let r of requests.data) {
      const key = `${r.sweet_id}_${r.counter_id}`;

      if (!itemMap[key]) {
        itemMap[key] = {
          sweet_id: r.sweet_id,
          counter_id: r.counter_id,
          quantity: 0,
        };
      }

      itemMap[key].quantity += Number(r.quantity);
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

    // 📦 Order Items WITH COUNTER
    for (let key in itemMap) {
      const item = itemMap[key];

      await db_query.addData(
        itemTable,
        {
          row_id: libFunc.randomid(),
          order_id: orderRowId,
          sweet_id: item.sweet_id,
          counter_id: item.counter_id, // ✅ IMPORTANT
          quantity: item.quantity,
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
          message: `New order created with ${Object.keys(itemMap).length} item(s)`,
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
        TO_CHAR(r.cr_on, 'YYYY-MM-DD HH24:MI:SS') AS cr_on,

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
    const chalanTable = schema + ".chalans"; // for checking chalan

    const { order_id, status } = req.data || {};
    const user = req.data;

    const validStatuses = [
      "PENDING",
      "ACCEPTED",
      "PARTIAL", // 🔥 ADD THIS
      "REJECTED",
      "DISPATCHED",
      "DELIVERED",
    ];
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

    // 🔎 SPECIAL CASE: DISPATCHED
    if (status === "DISPATCHED") {
      const existingChalan = await db_query.customQuery(`
        SELECT 1 FROM ${chalanTable}
        WHERE order_id = '${order_id.trim()}'
      `);

      if (!existingChalan.data?.length) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Chalan not created yet. Please create chalan first.",
        });
      }
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

// async function createChalan(req, res) {
//   const client = connect_db;

//   try {
//     const chalanTable = schema + ".chalans";
//     const orderTable = schema + ".orders";
//     const userTable = schema + ".users";
//     const requestTable = schema + ".counter_requests";
//     const itemTable = schema + ".order_items";
//     const chalanItemTable = schema + ".chalan_items";

//     const { order_id, dispatch_date, transport_details = "" } = req.data || {};
//     const user = req.data;

//     // 🔐 Role validation
//     if (user.user_role !== "SUPPLIER") {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Only supplier can dispatch order",
//       });
//     }

//     if (!order_id) {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Order ID required",
//       });
//     }

//     // 📥 Get Order
//     const orderCheck = await db_query.customQuery(`
//       SELECT supplier_id, order_status, shop_id
//       FROM ${orderTable}
//       WHERE row_id = '${order_id.trim()}'
//     `);

//     if (!orderCheck.data?.length) {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Invalid order",
//       });
//     }

//     const order = orderCheck.data[0];

//     // 🔐 Supplier ownership check
//     if (order.supplier_id !== user.supplierId) {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Unauthorized order access",
//       });
//     }

//     // 🚦 Status validation
//     if (order.order_status === "DISPATCHED") {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Order already dispatched",
//       });
//     }

//     if (order.order_status !== "ACCEPTED") {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Order must be ACCEPTED before dispatch",
//       });
//     }

//     // 🔄 TRANSACTION START
//     await client.query("BEGIN");

//     // 🔁 Check existing chalan
//     const existingChalan = await db_query.customQuery(`
//       SELECT 1 FROM ${chalanTable}
//       WHERE order_id = '${order_id.trim()}'
//     `);

//     if (existingChalan.data?.length) {
//       await client.query("ROLLBACK");
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Chalan already exists",
//       });
//     }

//     // 📦 Create Chalan
//     const chalanRowId = libFunc.randomid();

//     await db_query.addData(chalanTable, {
//       row_id: chalanRowId,
//       order_id: order_id.trim(),
//       supplier_id: user.supplierId,
//       dispatch_date,
//       transport_details: transport_details.trim(),
//     });

//     // ===========================
//     // 🔥 MAIN LOGIC START
//     // ===========================

//     // 📥 Get order items + shelf life
//     const items = await db_query.customQuery(`
//       SELECT oi.sweet_id, oi.supplied_quantity, s.shelf_life_days
//       FROM ${itemTable} oi
//       LEFT JOIN ${schema}.sweets s ON s.row_id = oi.sweet_id
//       WHERE oi.order_id = '${order_id.trim()}'
//     `);

//     if (!items.data?.length) {
//       throw new Error("No items found in order");
//     }

//     // 📥 Get counter mapping
//     const counters = await db_query.customQuery(`
//       SELECT DISTINCT sweet_id, counter_id
//       FROM ${requestTable}
//       WHERE status = 'APPROVED'
//     `);

//     // ✅ Create counter map (FIX)
//     const counterMap = {};
//     for (let c of counters.data) {
//       if (!counterMap[c.sweet_id]) {
//         counterMap[c.sweet_id] = c.counter_id;
//       }
//     }

//     // 🔁 Loop items
//     for (let item of items.data) {
//       const sweet_id = item.sweet_id;
//       const qty = Number(item.supplied_quantity || 0);

//       if (qty <= 0) continue;

//       const counter_id = counterMap[sweet_id];

//       // 🔥 EXPIRY CALCULATION
//       const shelfLife = Number(item.shelf_life_days || 0);
//       const dispatchDateObj = new Date(dispatch_date);
//       dispatchDateObj.setDate(dispatchDateObj.getDate() + shelfLife);
//       const expiry_date = dispatchDateObj.toISOString().split("T")[0];

//       // 1️⃣ Insert chalan_items
//       await db_query.addData(chalanItemTable, {
//         row_id: libFunc.randomid(),
//         chalan_id: chalanRowId,
//         sweet_id,
//         dispatched_quantity: qty,
//       });

//       if (!counter_id) {
//         console.log("No counter found for sweet:", sweet_id);
//         continue;
//       }

//       // 🔍 Check inventory
//       const invCheck = await db_query.customQuery(`
//         SELECT quantity FROM ${schema}.inventory
//         WHERE counter_id='${counter_id}' AND sweet_id='${sweet_id}'
//       `);

//       if (invCheck.data?.length > 0) {
//         const existingQty = Number(invCheck.data[0].quantity || 0);
//         const newQty = existingQty + qty;

//         await client.query(`
//           UPDATE ${schema}.inventory
//           SET quantity = ${newQty},
//               expiry_date = '${expiry_date}'
//           WHERE counter_id='${counter_id}' AND sweet_id='${sweet_id}'
//         `);
//       } else {
//         await db_query.addData(schema + ".inventory", {
//           row_id: libFunc.randomid(),
//           counter_id,
//           sweet_id,
//           quantity: qty,
//           expiry_date: expiry_date,
//         });
//       }

//       // 🧾 Stock transaction log
//       await db_query.addData(schema + ".stock_transactions", {
//         row_id: libFunc.randomid(),
//         counter_id,
//         sweet_id,
//         transaction_type: "IN",
//         quantity: qty,
//         reference_id: chalanRowId,
//         notes: "Stock added via chalan",
//       });
//     }

//     // ===========================
//     // 🔥 MAIN LOGIC END
//     // ===========================

//     // 📊 Update Order
//     await db_query.addData(
//       orderTable,
//       { order_status: "DISPATCHED" },
//       order_id.trim(),
//       "Order",
//     );

//     // ✅ COMMIT
//     await client.query("COMMIT");

//     // ==============================
//     // 🔔 NOTIFICATIONS (same)
//     // ==============================

//     const shopAdmins = await db_query.customQuery(`
//       SELECT row_id FROM ${userTable}
//       WHERE role = 'SHOP_ADMIN'
//       AND shop_id = '${order.shop_id}'
//     `);

//     if (shopAdmins.data?.length) {
//       for (let admin of shopAdmins.data) {
//         await createNotification({
//           user_id: admin.row_id,
//           title: "Order Dispatched",
//           message: "Order has been dispatched by supplier",
//           type: "CHALLAN",
//           reference_id: chalanRowId,
//         });
//       }
//     }

//     const counterUsers = await db_query.customQuery(`
//       SELECT DISTINCT u.row_id
//       FROM ${requestTable} r
//       LEFT JOIN ${userTable} u ON u.counter_id = r.counter_id
//       WHERE r.status = 'APPROVED'
//       AND r.sweet_id IN (
//         SELECT sweet_id FROM ${itemTable}
//         WHERE order_id = '${order_id}'
//       )
//     `);

//     if (counterUsers.data?.length) {
//       for (let u of counterUsers.data) {
//         await createNotification({
//           user_id: u.row_id,
//           title: "Order Dispatched",
//           message: "Your requested items have been dispatched",
//           type: "CHALLAN",
//           reference_id: chalanRowId,
//         });
//       }
//     }

//     return libFunc.sendResponse(res, {
//       status: 0,
//       msg: "Chalan created + inventory updated",
//       data: { chalan_id: chalanRowId },
//     });
//   } catch (error) {
//     console.log("createChalan error:", error);

//     try {
//       await connect_db.query("ROLLBACK");
//     } catch (e) {}

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Something went wrong",
//       error: error.message,
//     });
//   }
// }

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

    const result = await db_query.customQuery(`
      SELECT
        ch.row_id AS chalan_id,
        ch.dispatch_date AT TIME ZONE 'Asia/Kolkata' AS dispatch_date,     
        ch.transport_details,
        ch.is_verified,
        ch.verification_code,

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

          is_verified: row.is_verified,
          verification_code: row.verification_code, // optional (hide if needed)

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
// async function downloadChalanPDF(req, res) {
//   try {
//     const { chalan_id } = req.data;

//     const chalanTable = schema + ".chalans";
//     const orderTable = schema + ".orders";
//     const supplierTable = schema + ".suppliers";
//     const shopTable = schema + ".shops";
//     const itemTable = schema + ".order_items";
//     const sweetTable = schema + ".sweets";

//     // ================= QUERY =================
//     const result = await db_query.customQuery(`
//       SELECT
//         ch.row_id AS chalan_id,
//         ch.dispatch_date,
//         ch.transport_details,

//         o.row_id AS order_id,

//         s.supplier_name,
//         s.phone AS supplier_phone,
//         s.address AS supplier_address,

//         sh.shop_name,
//         sh.city,
//         sh.state,
//         sh.address AS shop_address,
//         sh.phone AS shop_phone,

//         oi.supplied_quantity,
//         sw.sweet_name,
//         sw.unit,

//         COALESCE(c.counter_name, 'Default Counter') AS counter_name,
//         COALESCE(cat.category_name, 'Others') AS category_name

//       FROM ${chalanTable} ch
//       LEFT JOIN ${orderTable} o ON o.row_id = ch.order_id
//       LEFT JOIN ${supplierTable} s ON s.row_id = ch.supplier_id
//       LEFT JOIN ${shopTable} sh ON sh.row_id = o.shop_id

//       LEFT JOIN ${itemTable} oi
//         ON oi.order_id = o.row_id
//         AND oi.item_status = 'ACCEPTED'

//       LEFT JOIN ${sweetTable} sw ON sw.row_id = oi.sweet_id
//       LEFT JOIN ${schema}.categories cat ON cat.row_id = sw.category_id
//       LEFT JOIN ${schema}.counters c ON c.row_id = oi.counter_id

//       WHERE ch.row_id = '${chalan_id}'
//       AND oi.sweet_id IS NOT NULL
//     `);

//     if (!result.data?.length) {
//       return res.status(404).send("No accepted items found");
//     }

//     const data = result.data;

//     // ================= GROUPING =================
//     const groupedData = {};

//     data.forEach((item) => {
//       const counter = item.counter_name || "Default Counter";
//       const category = item.category_name || "Others";

//       if (!groupedData[counter]) groupedData[counter] = {};
//       if (!groupedData[counter][category]) groupedData[counter][category] = [];

//       groupedData[counter][category].push(item);
//     });

//     // ================= FILE SETUP =================
//     const BASE_UPLOAD_PATH = "./public/uploads";
//     const folder = path.join(BASE_UPLOAD_PATH, "ShopMedia");

//     if (!fs.existsSync(folder)) {
//       fs.mkdirSync(folder, { recursive: true });
//     }

//     const fileName = `Chalan_${Date.now()}.pdf`;
//     const filePath = path.join(folder, fileName);

//     const doc = new PDFDocument({ margin: 40 });
//     doc.pipe(fs.createWriteStream(filePath));

//     // ================= HEADER =================
//     doc
//       .fontSize(18)
//       .fillColor("#2c3e50")
//       .text("DISPATCH CHALAN", { align: "center" });

//     doc.moveDown(0.5);
//     doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
//     doc.moveDown();

//     // ================= BASIC INFO =================
//     doc.fontSize(11).fillColor("#000");

//     doc.text(`Chalan ID: ${data[0].chalan_id}`);
//     doc.text(`Order ID: ${data[0].order_id}`);
//     doc.text(
//       `Dispatch Date: ${
//         data[0].dispatch_date
//           ? new Date(data[0].dispatch_date).toLocaleDateString()
//           : "-"
//       }`,
//     );

//     doc.moveDown();

//     // ================= SUPPLIER =================
//     doc
//       .fontSize(12)
//       .fillColor("#34495e")
//       .text("Supplier Details", { underline: true });
//     doc.moveDown(0.3).fontSize(10);

//     doc.text(`Name: ${data[0].supplier_name || "-"}`);
//     doc.text(`Phone: ${data[0].supplier_phone || "-"}`);
//     doc.text(`Address: ${data[0].supplier_address || "-"}`);

//     doc.moveDown();

//     // ================= SHOP =================
//     doc
//       .fontSize(12)
//       .fillColor("#34495e")
//       .text("Shop Details", { underline: true });
//     doc.moveDown(0.3).fontSize(10);

//     doc.text(`Shop Name: ${data[0].shop_name || "-"}`);
//     doc.text(`Phone: ${data[0].shop_phone || "-"}`);
//     doc.text(`Address: ${data[0].shop_address || "-"}`);
//     doc.text(`City: ${data[0].city || "-"}, ${data[0].state || "-"}`);

//     doc.moveDown();

//     // ================= TRANSPORT =================
//     doc
//       .fontSize(12)
//       .fillColor("#34495e")
//       .text("Transport Details", { underline: true });
//     doc.moveDown(0.3).fontSize(10);

//     doc.text(`${data[0].transport_details || "-"}`);

//     doc.moveDown();

//     // ================= ITEMS =================
//     doc.fontSize(12).fillColor("#000").text("Items", { underline: true });
//     doc.moveDown();

//     const startX = 40;
//     const colWidths = { name: 260, qty: 100, unit: 80 };
//     const rowHeight = 20;

//     for (let counter in groupedData) {
//       doc
//         .fontSize(11)
//         .fillColor("#2980b9")
//         .font("Helvetica-Bold")
//         .text(`Counter: ${counter}`);
//       doc.moveDown(0.3);

//       for (let category in groupedData[counter]) {
//         doc
//           .fontSize(10)
//           .fillColor("#8e44ad")
//           .font("Helvetica-Bold")
//           .text(`Category: ${category}`);
//         doc.moveDown(0.3);

//         let y = doc.y;

//         // Header Row
//         doc.rect(startX, y, 500, rowHeight).fill("#f2f2f2");

//         doc.fillColor("#000").fontSize(9).font("Helvetica-Bold");

//         doc.text("Sweet Name", startX + 5, y + 5, {
//           width: colWidths.name,
//         });

//         doc.text("Qty", startX + colWidths.name, y + 5, {
//           width: colWidths.qty,
//           align: "center",
//         });

//         doc.text("Unit", startX + colWidths.name + colWidths.qty, y + 5, {
//           width: colWidths.unit,
//           align: "center",
//         });

//         y += rowHeight;
//         let total = 0;

//         // Items
//         groupedData[counter][category].forEach((item, index) => {
//           const qty = Number(item.supplied_quantity || 0);
//           total += qty;

//           if (index % 2 === 0) {
//             doc.rect(startX, y, 500, rowHeight).fill("#fafafa");
//           }

//           doc.fillColor("#000").fontSize(9).font("Helvetica");

//           doc.text(item.sweet_name || "-", startX + 5, y + 5, {
//             width: colWidths.name,
//           });

//           doc.text(qty.toString(), startX + colWidths.name, y + 5, {
//             width: colWidths.qty,
//             align: "center",
//           });

//           doc.text(
//             item.unit || "-",
//             startX + colWidths.name + colWidths.qty,
//             y + 5,
//             {
//               width: colWidths.unit,
//               align: "center",
//             },
//           );

//           y += rowHeight;
//         });

//         // Total Row
//         doc.rect(startX, y, 500, rowHeight).fill("#e8f8f5");

//         doc.fillColor("#000").fontSize(10).font("Helvetica-Bold");

//         doc.text("Total", startX + 5, y + 5, {
//           width: colWidths.name,
//         });

//         doc.text(total.toString(), startX + colWidths.name, y + 5, {
//           width: colWidths.qty,
//           align: "center",
//         });

//         doc.moveDown(2);
//       }

//       doc.moveDown();
//     }

//     // ================= FOOTER =================
//     doc.moveDown(2);
//     doc
//       .fontSize(9)
//       .fillColor("gray")
//       .text("This is a system generated document.", { align: "center" });

//     doc.end();

//     // ================= RESPONSE =================
//     const fileUrl = `/uploads/ShopMedia/${fileName}`;
//     const serverUrl = "https://stock.abhishekcv.in";

//     return libFunc.sendResponse(res, {
//       status: 0,
//       msg: "PDF generated successfully",
//       filePath: serverUrl + fileUrl,
//     });
//   } catch (error) {
//     console.log("downloadChalanPDF error:", error);
//     return res.status(500).send("Error generating PDF");
//   }
// }

async function downloadChalanPDF(req, res) {
  try {
    const { chalan_id } = req.data;

    const chalanTable = schema + ".chalans";
    const orderTable = schema + ".orders";
    const supplierTable = schema + ".suppliers";
    const shopTable = schema + ".shops";
    const itemTable = schema + ".order_items";
    const sweetTable = schema + ".sweets";

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

        oi.supplied_quantity,
        sw.sweet_name,
        sw.unit,

        COALESCE(c.counter_name, 'Default Counter') AS counter_name,
        COALESCE(cat.category_name, 'Others') AS category_name

      FROM ${chalanTable} ch
      LEFT JOIN ${orderTable} o ON o.row_id = ch.order_id
      LEFT JOIN ${supplierTable} s ON s.row_id = ch.supplier_id
      LEFT JOIN ${shopTable} sh ON sh.row_id = o.shop_id

      LEFT JOIN ${itemTable} oi 
        ON oi.order_id = o.row_id 
        AND oi.item_status = 'ACCEPTED'

      LEFT JOIN ${sweetTable} sw ON sw.row_id = oi.sweet_id
      LEFT JOIN ${schema}.categories cat ON cat.row_id = sw.category_id
      LEFT JOIN ${schema}.counters c ON c.row_id = oi.counter_id

      WHERE ch.row_id = '${chalan_id}'
      AND oi.sweet_id IS NOT NULL
    `);

    if (!result.data?.length) {
      return res.status(404).send("No accepted items found");
    }

    const data = result.data;

    // ================= GROUPING =================
    const groupedData = {};

    data.forEach((item) => {
      const counter = item.counter_name || "Default Counter";
      const category = item.category_name || "Others";

      if (!groupedData[counter]) groupedData[counter] = {};
      if (!groupedData[counter][category]) groupedData[counter][category] = [];

      groupedData[counter][category].push(item);
    });

    // ================= FILE SETUP =================
    // const BASE_UPLOAD_PATH = "./public/uploads";
    const BASE_UPLOAD_PATH = "/home/uploads";
    const folder = path.join(BASE_UPLOAD_PATH, "ShopMedia");

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const fileName = `Chalan_${Date.now()}.pdf`;
    const filePath = path.join(folder, fileName);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(fs.createWriteStream(filePath));

    const startX = 40;
    const colWidths = { name: 260, qty: 100, unit: 80 };
    const rowHeight = 20;

    let isFirstPage = true;

    // ================= LOOP COUNTERS =================
    for (let counter in groupedData) {
      // 👉 New page except first
      if (!isFirstPage) {
        doc.addPage();
      }
      isFirstPage = false;

      // ================= HEADER =================
      doc
        .fontSize(16)
        .fillColor("#2c3e50")
        .font("Helvetica-Bold")
        .text("DISPATCH CHALAN", { align: "center" });

      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // ================= BASIC INFO =================
      doc.fontSize(10).fillColor("#000").font("Helvetica");

      doc.text(`Chalan ID: ${data[0].chalan_id}`);
      doc.text(`Order ID: ${data[0].order_id}`);
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
        .fontSize(11)
        .fillColor("#34495e")
        .font("Helvetica-Bold")
        .text("Supplier Details", { underline: true });

      doc.moveDown(0.3).fontSize(10).font("Helvetica");

      doc.text(`Name: ${data[0].supplier_name || "-"}`);
      doc.text(`Phone: ${data[0].supplier_phone || "-"}`);
      doc.text(`Address: ${data[0].supplier_address || "-"}`);

      doc.moveDown();

      // ================= SHOP =================
      doc
        .fontSize(11)
        .fillColor("#34495e")
        .font("Helvetica-Bold")
        .text("Shop Details", { underline: true });

      doc.moveDown(0.3).fontSize(10).font("Helvetica");

      doc.text(`Shop Name: ${data[0].shop_name || "-"}`);
      doc.text(`Phone: ${data[0].shop_phone || "-"}`);
      doc.text(`Address: ${data[0].shop_address || "-"}`);
      doc.text(`City: ${data[0].city || "-"}, ${data[0].state || "-"}`);

      doc.moveDown();

      // ================= TRANSPORT =================
      doc
        .fontSize(11)
        .fillColor("#34495e")
        .font("Helvetica-Bold")
        .text("Transport Details", { underline: true });

      doc.moveDown(0.3).fontSize(10).font("Helvetica");

      doc.text(`${data[0].transport_details || "-"}`);

      doc.moveDown();

      // ================= COUNTER =================
      doc
        .fontSize(13)
        .fillColor("#2980b9")
        .font("Helvetica-Bold")
        .text(`Counter: ${counter}`);

      doc.moveDown(0.5);

      // ================= CATEGORY LOOP =================
      for (let category in groupedData[counter]) {
        doc
          .fontSize(11)
          .fillColor("#8e44ad")
          .font("Helvetica-Bold")
          .text(`Category: ${category}`);

        doc.moveDown(0.3);

        let y = doc.y;

        // Header Row
        doc.rect(startX, y, 500, rowHeight).fill("#f2f2f2");

        doc.fillColor("#000").fontSize(9).font("Helvetica-Bold");

        doc.text("Sweet Name", startX + 5, y + 5, { width: colWidths.name });

        doc.text("Qty", startX + colWidths.name, y + 5, {
          width: colWidths.qty,
          align: "center",
        });

        doc.text("Unit", startX + colWidths.name + colWidths.qty, y + 5, {
          width: colWidths.unit,
          align: "center",
        });

        y += rowHeight;
        let total = 0;

        // ================= ITEMS =================
        groupedData[counter][category].forEach((item, index) => {
          const qty = Number(item.supplied_quantity || 0);
          total += qty;

          if (index % 2 === 0) {
            doc.rect(startX, y, 500, rowHeight).fill("#fafafa");
          }

          doc.fillColor("#000").fontSize(9).font("Helvetica");

          doc.text(item.sweet_name || "-", startX + 5, y + 5, {
            width: colWidths.name,
          });

          doc.text(qty.toString(), startX + colWidths.name, y + 5, {
            width: colWidths.qty,
            align: "center",
          });

          doc.text(
            item.unit || "-",
            startX + colWidths.name + colWidths.qty,
            y + 5,
            {
              width: colWidths.unit,
              align: "center",
            },
          );

          y += rowHeight;
        });

        // ================= TOTAL =================
        doc.rect(startX, y, 500, rowHeight).fill("#e8f8f5");

        doc.fillColor("#000").fontSize(10).font("Helvetica-Bold");

        doc.text("Total", startX + 5, y + 5, { width: colWidths.name });

        doc.text(total.toString(), startX + colWidths.name, y + 5, {
          width: colWidths.qty,
          align: "center",
        });

        doc.moveDown(2);
      }

      // ================= FOOTER =================
      doc.moveDown(2);
      doc
        .fontSize(9)
        .fillColor("gray")
        .text("This is a system generated document.", { align: "center" });
    }

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

async function downloadOrderRequestPDF(req, res) {
  try {
    const { order_id } = req.data;

    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";
    const shopTable = schema + ".shops";
    const sweetTable = schema + ".sweets";

    // ================= QUERY =================
    const result = await db_query.customQuery(`
      SELECT
        o.row_id AS order_id,
        o.order_status,
        o.order_date,

        sh.shop_name,
        sh.address AS shop_address,
        sh.city,
        sh.state,
        sh.phone AS shop_phone,

        oi.quantity,
        oi.item_status,

        COALESCE(sw.sweet_name, 'Unknown Sweet') AS sweet_name,
        COALESCE(sw.unit, '-') AS unit,

        COALESCE(c.counter_name, 'Default Counter') AS counter_name,
        COALESCE(cat.category_name, 'Others') AS category_name

      FROM ${orderTable} o
      LEFT JOIN ${shopTable} sh ON sh.row_id = o.shop_id
      LEFT JOIN ${itemTable} oi ON oi.order_id = o.row_id
      LEFT JOIN ${sweetTable} sw ON sw.row_id = oi.sweet_id
      LEFT JOIN ${schema}.counters c ON c.row_id = oi.counter_id
      LEFT JOIN ${schema}.categories cat ON cat.row_id = sw.category_id

      WHERE o.row_id = '${order_id}'
    `);

    const data = result.data;

    if (!data || data.length === 0) {
      return res.status(404).send("No order found");
    }

    // ================= GROUPING =================
    const groupedData = {};

    data.forEach((item) => {
      const counter = item.counter_name || "Default Counter";
      const category = item.category_name || "Others";

      if (!groupedData[counter]) groupedData[counter] = {};
      if (!groupedData[counter][category]) groupedData[counter][category] = [];

      groupedData[counter][category].push(item);
    });

    // ================= FILE SETUP =================
    // const BASE_UPLOAD_PATH = "./public/uploads";
    const BASE_UPLOAD_PATH = "/home/uploads";
    const folder = path.join(BASE_UPLOAD_PATH, "OrderRequests");

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const fileName = `OrderRequest_${Date.now()}.pdf`;
    const filePath = path.join(folder, fileName);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(fs.createWriteStream(filePath));

    let isFirstPage = true;

    // ================= LOOP =================
    for (let counter in groupedData) {
      for (let category in groupedData[counter]) {
        // NEW PAGE FOR EACH CATEGORY
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        // ================= HEADER =================
        doc.fontSize(16).font("Helvetica-Bold").text("ORDER REQUEST", {
          align: "center",
        });

        doc.moveDown();
        doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // ================= ORDER INFO =================
        doc.fontSize(10).font("Helvetica");

        doc.text(`Order ID: ${data[0].order_id}`);
        doc.text(`Status: ${data[0].order_status}`);
        doc.text(
          `Order Date: ${
            data[0].order_date
              ? new Date(data[0].order_date).toLocaleDateString()
              : "-"
          }`,
        );

        doc.moveDown();

        // ================= SHOP =================
        doc.fontSize(11).font("Helvetica-Bold").text("Shop Details", {
          underline: true,
        });

        doc.moveDown(0.3).fontSize(10).font("Helvetica");

        doc.text(`Shop Name: ${data[0].shop_name || "-"}`);
        doc.text(`Phone: ${data[0].shop_phone || "-"}`);
        doc.text(`Address: ${data[0].shop_address || "-"}`);
        doc.text(`City: ${data[0].city || "-"}, ${data[0].state || "-"}`);

        doc.moveDown();

        // ================= COUNTER + CATEGORY =================
        doc.fontSize(13).font("Helvetica-Bold").text(`Counter: ${counter}`);

        doc.fontSize(12).font("Helvetica-Bold").text(`Category: ${category}`);

        doc.moveDown(0.5);

        let y = doc.y;

        const startX = 40;
        const rowHeight = 20;
        const colWidths = { name: 260, qty: 80, unit: 60, status: 100 };

        // ================= TABLE HEADER =================
        doc.rect(startX, y, 500, rowHeight).fill("#f2f2f2");
        doc.fillColor("#000").fontSize(9).font("Helvetica-Bold");

        doc.text("Sweet Name", startX + 5, y + 5, { width: colWidths.name });
        doc.text("Qty", startX + colWidths.name, y + 5, {
          width: colWidths.qty,
          align: "center",
        });
        doc.text("Unit", startX + colWidths.name + colWidths.qty, y + 5, {
          width: colWidths.unit,
          align: "center",
        });
        doc.text(
          "Status",
          startX + colWidths.name + colWidths.qty + colWidths.unit,
          y + 5,
          { width: colWidths.status, align: "center" },
        );

        y += rowHeight;

        let total = 0;

        // ================= ITEMS =================
        groupedData[counter][category].forEach((item, index) => {
          const qty = Number(item.quantity || 0);
          total += qty;

          // PAGE BREAK INSIDE TABLE
          if (y > 750) {
            doc.addPage();
            y = 50;
          }

          if (index % 2 === 0) {
            doc.rect(startX, y, 500, rowHeight).fill("#fafafa");
            doc.fillColor("#000");
          }

          doc.fontSize(9).font("Helvetica");

          doc.text(item.sweet_name, startX + 5, y + 5, {
            width: colWidths.name,
          });

          doc.text(qty.toString(), startX + colWidths.name, y + 5, {
            width: colWidths.qty,
            align: "center",
          });

          doc.text(item.unit, startX + colWidths.name + colWidths.qty, y + 5, {
            width: colWidths.unit,
            align: "center",
          });

          doc.text(
            item.item_status,
            startX + colWidths.name + colWidths.qty + colWidths.unit,
            y + 5,
            { width: colWidths.status, align: "center" },
          );

          y += rowHeight;
        });

        // ================= TOTAL =================
        doc.rect(startX, y, 500, rowHeight).fill("#e8f8f5");
        doc.fillColor("#000").fontSize(10).font("Helvetica-Bold");

        doc.text("Total", startX + 5, y + 5, {
          width: colWidths.name,
        });

        doc.text(total.toString(), startX + colWidths.name, y + 5, {
          width: colWidths.qty,
          align: "center",
        });

        doc.moveDown(2);

        // ================= FOOTER =================
        doc
          .fontSize(9)
          .fillColor("gray")
          .text("System generated order request.", { align: "center" });
      }
    }

    doc.end();

    // ================= RESPONSE =================
    const fileUrl = `/uploads/OrderRequests/${fileName}`;
    const serverUrl = "https://stock.abhishekcv.in";

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Order request PDF generated",
      filePath: serverUrl + fileUrl,
    });
  } catch (error) {
    console.log("downloadOrderRequestPDF error:", error);
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
        TO_CHAR(r.cr_on, 'YYYY-MM-DD HH24:MI:SS') AS cr_on,

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
cron.schedule(
  "00 08 * * *",
  () => {
    console.log("🕒 Running daily expiry check via cron...");
    runExpiryCheck();
  },
  {
    timezone: "Asia/Kolkata",
  },
);

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

async function fetchDepartmentsByShop(req, res) {
  try {
    const { shop_id } = req.data || {};
    const user = req.data;
    const table = "sms.departments";

    // Role-based access
    if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, { status: 1, msg: "Access denied" });
    }

    let conditions = [];

    // ADMIN can filter by shop_id
    if (user.user_role === "ADMIN") {
      if (shop_id) conditions.push(`shop_id = '${shop_id}'`);
    } else {
      // SHOP_ADMIN / COUNTER_USER -> only their shop
      conditions.push(`shop_id = '${user.shop_id}'`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const query = `
      SELECT row_id, department_name, description
      FROM ${table}
      ${whereClause}
      ORDER BY department_name ASC
    `;

    const result = await db_query.customQuery(query);
    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Departments fetched successfully",
      data: result.data || [],
    });
  } catch (err) {
    console.error("fetchDepartmentsByShop error:", err);
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Error fetching departments",
      error: err.message,
    });
  }
}

async function fetchCountersAndCategoriesByShop(req, res) {
  try {
    const { shop_id } = req.data || {};
    const user = req.data;

    if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, { status: 1, msg: "Access denied" });
    }

    // Determine shop_id
    let finalShopId = shop_id || user.shop_id;
    if (!finalShopId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Shop ID is required",
      });
    }

    // Fetch counters
    const counterQuery = `
      SELECT row_id, counter_name, location
      FROM sms.counters
      WHERE shop_id = '${finalShopId}'
      ORDER BY counter_name ASC
    `;
    const countersResult = await db_query.customQuery(counterQuery);

    // Fetch categories
    const categoryQuery = `
      SELECT row_id, category_name, department_id
      FROM sms.categories
      WHERE shop_id = '${finalShopId}'
      ORDER BY category_name ASC
    `;
    const categoriesResult = await db_query.customQuery(categoryQuery);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Counters and categories fetched successfully",
      data: {
        counters: countersResult.data || [],
        categories: categoriesResult.data || [],
      },
    });
  } catch (err) {
    console.error("fetchCountersAndCategoriesByShop error:", err);
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Error fetching counters and categories",
      error: err.message,
    });
  }
}

async function updateOrderStatusBasedOnItems(order_id) {
  try {
    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";

    const itemsRes = await db_query.customQuery(`
      SELECT item_status 
      FROM ${itemTable}
      WHERE order_id = '${order_id}'
    `);

    const items = itemsRes.data || [];

    if (!items.length) return;

    let total = items.length;
    let accepted = 0;
    let rejected = 0;

    for (let item of items) {
      if (item.item_status === "ACCEPTED") accepted++;
      if (item.item_status === "REJECTED") rejected++;
    }

    let finalStatus = "PENDING";

    if (accepted === total) {
      finalStatus = "ACCEPTED";
    } else if (rejected === total) {
      finalStatus = "REJECTED";
    } else if (accepted > 0 && rejected > 0) {
      finalStatus = "PARTIAL";
    }

    await db_query.addData(
      orderTable,
      { order_status: finalStatus },
      order_id,
      "Order",
    );
  } catch (err) {
    console.error("updateOrderStatusBasedOnItems error:", err);
  }
}

async function updateOrderItemsBySupplier(req, res) {
  try {
    const { order_id, items } = req.data;
    console.log("req", req);
    const user = req.data;

    if (user.user_role !== "SUPPLIER") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only supplier allowed",
      });
    }

    if (!order_id || !items?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order and items required",
      });
    }

    await connect_db.query("BEGIN");

    for (let item of items) {
      const { sweet_id, supplied_quantity = 0, status, reason = "" } = item;

      if (!["ACCEPTED", "REJECTED"].includes(status)) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Invalid item status",
        });
      }

      await db_query.customQuery(`
        UPDATE ${schema}.order_items
        SET 
          item_status = '${status}',
          supplied_quantity = ${Number(supplied_quantity)},
          reject_reason = '${reason.replaceAll("'", "`")}'
        WHERE order_id = '${order_id}'
        AND sweet_id = '${sweet_id}'
      `);
    }

    // 🔥 IMPORTANT
    await updateOrderStatusBasedOnItems(order_id);

    await connect_db.query("COMMIT");

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Items updated successfully",
    });
  } catch (error) {
    await connect_db.query("ROLLBACK");

    console.log("updateOrderItemsBySupplier error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

// {
//   "order_id": "ORD123456",
//   "items": [
//     {
//       "sweet_id": "SWT001",
//       "status": "ACCEPTED",
//       "supplied_quantity": 10
//     },
//     {
//       "sweet_id": "SWT002",
//       "status": "ACCEPTED",
//       "supplied_quantity": 5
//     },
//     {
//       "sweet_id": "SWT003",
//       "status": "REJECTED",
//       "supplied_quantity": 0,
//       "reason": "Out of stock"
//     }
//   ]
// }

async function updateInventory(
  client,
  counter_id,
  sweet_id,
  qty,
  type,
  ref_id,
) {
  // Check if inventory exists
  const check = await client.query(
    `SELECT * FROM sms.inventory 
     WHERE counter_id=$1 AND sweet_id=$2`,
    [counter_id, sweet_id],
  );

  if (check.rows.length > 0) {
    if (type === "IN") {
      await client.query(
        `UPDATE sms.inventory 
         SET quantity = quantity::NUMERIC + $1 
         WHERE counter_id=$2 AND sweet_id=$3`,
        [qty, counter_id, sweet_id],
      );
    } else {
      await client.query(
        `UPDATE sms.inventory 
         SET quantity = quantity::NUMERIC - $1 
         WHERE counter_id=$2 AND sweet_id=$3`,
        [qty, counter_id, sweet_id],
      );
    }
  } else {
    await client.query(
      `INSERT INTO sms.inventory 
       (row_id, counter_id, sweet_id, quantity) 
       VALUES ($1,$2,$3,$4)`,
      [Date.now().toString(), counter_id, sweet_id, qty],
    );
  }

  // Insert stock transaction
  await client.query(
    `INSERT INTO sms.stock_transactions 
    (row_id, counter_id, sweet_id, transaction_type, quantity, reference_id) 
    VALUES ($1,$2,$3,$4,$5,$6)`,
    [Date.now().toString(), counter_id, sweet_id, type, qty, ref_id],
  );
}

async function createChalan(req, res) {
  const client = connect_db;

  try {
    const chalanTable = schema + ".chalans";
    const orderTable = schema + ".orders";

    const { order_id, dispatch_date, transport_details = "" } = req.data || {};
    const user = req.data;

    if (user.user_role !== "SUPPLIER") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only supplier allowed",
      });
    }

    await client.query("BEGIN");

    const chalanRowId = libFunc.randomid();

    // 🔥 OTP generate
    const verification_code = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    await db_query.addData(chalanTable, {
      row_id: chalanRowId,
      order_id,
      supplier_id: user.supplierId,
      dispatch_date,
      transport_details,
      verification_code,
      is_verified: false,
    });

    // update order
    await db_query.addData(
      orderTable,
      { order_status: "DISPATCHED" },
      order_id,
      "Order",
    );

    await client.query("COMMIT");

    // ==============================
    // 🔔 NOTIFICATIONS (YAHI ADD KARO)
    // ==============================

    const userTable = schema + ".users";

    // order ka shop_id nikalna
    const orderData = await db_query.customQuery(`
  SELECT shop_id FROM ${orderTable}
  WHERE row_id = '${order_id}'
`);

    const shop_id = orderData.data?.[0]?.shop_id;

    // 🏪 Shop Admins ko notify karo
    const shopAdmins = await db_query.customQuery(`
  SELECT row_id FROM ${userTable}
  WHERE role = 'SHOP_ADMIN'
  AND shop_id = '${shop_id}'
`);

    if (shopAdmins.data?.length) {
      for (let admin of shopAdmins.data) {
        await createNotification({
          user_id: admin.row_id,
          title: "Order Dispatched (OTP)",
          message: `Order dispatched. OTP: ${verification_code}`,
          type: "CHALLAN",
          reference_id: chalanRowId,
        });
      }
    }

    // ==============================
    // 🔔 END
    // ==============================

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Chalan created (waiting for verification)",
      data: {
        chalan_id: chalanRowId,
        otp: verification_code,
      },
    });
  } catch (err) {
    await connect_db.query("ROLLBACK");
    return libFunc.sendResponse(res, { status: 1, msg: err.message });
  }
}

async function verifyChalan(req, res) {
  const client = connect_db;

  try {
    const { chalan_id, otp } = req.data;

    await client.query("BEGIN");

    // ==============================
    // 1. GET CHALAN
    // ==============================
    const chalanRes = await client.query(`
      SELECT * FROM ${schema}.chalans 
      WHERE row_id = '${chalan_id}'
    `);

    // console.log("chalanRes", chalanRes);

    if (chalanRes.rows.length === 0) {
      throw new Error("Invalid chalan");
    }

    const chalan = chalanRes.rows[0];

    // console.log("chalan", chalan);

    if (chalan.is_verified) {
      throw new Error("Already verified");
    }

    if (chalan.verification_code !== otp) {
      throw new Error("Invalid OTP");
    }

    // ==============================
    // 2. GET ORDER ITEMS
    // ==============================
    const itemsRes = await client.query(`
      SELECT oi.sweet_id, oi.supplied_quantity, s.shelf_life_days
      FROM ${schema}.order_items oi
      LEFT JOIN ${schema}.sweets s ON s.row_id = oi.sweet_id
      WHERE oi.order_id = '${chalan.order_id}'
    `);

    console.log("itemsRes", itemsRes);
    const items = itemsRes.rows;

    // ==============================
    // 3. GET COUNTER MAPPING
    // ==============================
    const counterRes = await client.query(`
      SELECT sweet_id, counter_id
      FROM ${schema}.counter_requests
      WHERE status = 'APPROVED'
    `);

    const counterMap = {};
    for (let c of counterRes.rows) {
      if (!counterMap[c.sweet_id]) {
        counterMap[c.sweet_id] = c.counter_id;
      }
    }

    // ==============================
    // 4. PROCESS INVENTORY
    // ==============================
    for (let item of items) {
      const sweet_id = item.sweet_id;
      const qty = Number(item.supplied_quantity || 0);

      if (qty <= 0) continue;

      const counter_id = counterMap[sweet_id];
      if (!counter_id) continue;

      // 📅 Expiry calculation
      const shelfLife = Number(item.shelf_life_days || 0);
      const d = new Date(chalan.dispatch_date);
      d.setDate(d.getDate() + shelfLife);
      const expiry_date = d.toISOString().split("T")[0];

      // ==============================
      // 🔥 UPSERT INVENTORY (TEXT FIX)
      // ==============================
      await client.query(`
        INSERT INTO ${schema}.inventory 
        (row_id, counter_id, sweet_id, quantity, expiry_date)
        VALUES (
          '${libFunc.randomid()}',
          '${counter_id}',
          '${sweet_id}',
          '${qty}',
          '${expiry_date}'
        )
        ON CONFLICT (counter_id, sweet_id)
        DO UPDATE SET 
          quantity = (
            ${schema}.inventory.quantity::NUMERIC + EXCLUDED.quantity::NUMERIC
          )::TEXT,
          expiry_date = EXCLUDED.expiry_date
      `);

      // ==============================
      // 🧾 STOCK LOG
      // ==============================
      await client.query(`
        INSERT INTO ${schema}.stock_transactions
        (row_id, counter_id, sweet_id, transaction_type, quantity, reference_id, notes)
        VALUES (
          '${libFunc.randomid()}',
          '${counter_id}',
          '${sweet_id}',
          'IN',
          '${qty}',
          '${chalan_id}',
          'Verified stock'
        )
      `);
    }

    // ==============================
    // 5. MARK VERIFIED
    // ==============================
    await client.query(`
      UPDATE ${schema}.chalans
      SET is_verified = TRUE,
          up_on = NOW()
      WHERE row_id = '${chalan_id}'
    `);

    await client.query("COMMIT");

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Chalan verified & inventory updated successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    // console.log("verifyChalan error:", err);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: err.message || "Something went wrong",
    });
  }
}

// Supplier → Create Chalan
//          ↓
// OTP Generated
//          ↓
// Shop Admin Enter OTP
//          ↓
// verifyChalan API
//          ↓
// Inventory Update
//          ↓
// Stock History Save

// async function getShopChalanWithOTP(req, res) {
//   try {
//     const user = req.data;
//     console.log("req", req);

//     // if (user.user_role !== "SHOP_ADMIN") {
//     //   return libFunc.sendResponse(res, {
//     //     status: 1,
//     //     msg: "Only shop admin allowed",
//     //   });
//     // }

//     const shop_id = user.shopId;

//     // 📦 Fetch chalan + order + supplier
//     const data = await db_query.customQuery(`
//       SELECT
//         c.row_id AS chalan_id,
//         c.order_id,
//         c.dispatch_date,
//         c.transport_details,
//         c.verification_code,
//         c.is_verified,

//         o.shop_id,

//         u.name AS supplier_name

//       FROM ${schema}.chalans c
//       LEFT JOIN ${schema}.orders o ON o.row_id = c.order_id
//       LEFT JOIN ${schema}.users u ON u.supplier_id = c.supplier_id

//       WHERE o.shop_id = '${shop_id}'
//       ORDER BY c.cr_on DESC
//     `);

//     console.log("dat", data);

//     const result = [];

//     for (let row of data.data) {
//       // 📥 Fetch items for each chalan
//       const items = await db_query.customQuery(`
//         SELECT
//           s.sweet_name,
//           oi.supplied_quantity

//         FROM ${schema}.order_items oi
//         LEFT JOIN ${schema}.sweets s ON s.row_id = oi.sweet_id

//         WHERE oi.order_id = '${row.order_id}'
//       `);

//       result.push({
//         chalan_id: row.chalan_id,
//         order_id: row.order_id,
//         supplier_name: row.supplier_name,
//         dispatch_date: row.dispatch_date,
//         transport_details: row.transport_details,
//         otp: row.verification_code,
//         is_verified: row.is_verified,
//         items: items.data || [],
//       });
//     }

//     return libFunc.sendResponse(res, {
//       status: 0,
//       msg: "Shop challans fetched",
//       data: result,
//     });
//   } catch (error) {
//     console.log("getShopChalanWithOTP error:", error);

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Something went wrong",
//       error: error.message,
//     });
//   }
// }

async function getShopChalanFullDetails(req, res) {
  try {
    const user = req.data;

    if (user.user_role !== "SHOP_ADMIN") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only shop admin allowed",
      });
    }

    const shop_id = user.shopId;

    // 🔥 SAFE WRAPPER
    function safeData(res) {
      return res && res.status === 0 && Array.isArray(res.data) ? res.data : [];
    }

    // ==============================
    // 📦 1. FETCH CHALANS
    // ==============================
    const chalansRes = await db_query.customQuery(`
      SELECT 
        c.row_id AS chalan_id,
        c.order_id,
        c.dispatch_date,
        c.transport_details,
        c.verification_code,
        c.is_verified,
        u.name AS supplier_name

      FROM ${schema}.chalans c
      LEFT JOIN ${schema}.orders o ON o.row_id = c.order_id
      LEFT JOIN ${schema}.users u ON u.supplier_id = c.supplier_id

      WHERE o.shop_id = '${shop_id}'
      ORDER BY c.cr_on DESC
    `);

    const chalans = safeData(chalansRes);

    console.log("chalans", chalans);

    const result = [];

    // ==============================
    // 🔁 LOOP EACH CHALAN
    // ==============================
    for (let ch of chalans) {
      // ==========================
      // 📦 2. CHALAN ITEMS
      // ==========================
      const chalanItemsRes = await db_query.customQuery(`
        SELECT 
          ci.sweet_id,
          s.sweet_name,
          ci.dispatched_quantity
        FROM ${schema}.chalan_items ci
        LEFT JOIN ${schema}.sweets s ON s.row_id = ci.sweet_id
        WHERE ci.chalan_id = '${ch.chalan_id}'
      `);

      const chalanItems = safeData(chalanItemsRes);

      console.log("chalanItems", chalanItems);

      // ==========================
      // 📦 3. ORDER ITEMS
      // ==========================
      const orderItemsRes = await db_query.customQuery(`
        SELECT 
          oi.sweet_id,
          s.sweet_name,
          oi.quantity AS ordered_qty,
          oi.supplied_quantity
        FROM ${schema}.order_items oi
        LEFT JOIN ${schema}.sweets s ON s.row_id = oi.sweet_id
        WHERE oi.order_id = '${ch.order_id}'
      `);

      const orderItems = safeData(orderItemsRes);

      console.log("orderItems", orderItems);

      // ==========================
      // 📦 4. REQUESTED ITEMS
      // ==========================
      const requestedItemsRes = await db_query.customQuery(`
        SELECT 
          sweet_id,
          SUM(quantity) AS requested_qty
        FROM ${schema}.counter_requests
        WHERE status = 'APPROVED'
        GROUP BY sweet_id
      `);

      const requestedItems = safeData(requestedItemsRes);
      console.log("requestedItems", requestedItems);

      // ==========================
      // 🐞 DEBUG LOG (optional)
      // ==========================
      console.log({
        chalan_id: ch.chalan_id,
        chalanItems,
        orderItems,
        requestedItems,
      });

      // ==========================
      // 🔥 MERGE DATA
      // ==========================
      const finalItems = [];

      for (let oi of orderItems) {
        const sweet_id = oi.sweet_id;

        const req = requestedItems.find((r) => r.sweet_id === sweet_id);
        const chItem = chalanItems.find((c) => c.sweet_id === sweet_id);

        const requested_qty = req ? Number(req.requested_qty) : 0;
        const ordered_qty = Number(oi.ordered_qty || 0);
        const supplied_qty = Number(oi.supplied_quantity || 0);
        const dispatched_qty = chItem ? Number(chItem.dispatched_quantity) : 0;

        finalItems.push({
          sweet_id,
          sweet_name: oi.sweet_name,

          // requested_qty,
          ordered_qty,
          supplied_qty,
          // dispatched_qty,

          // difference: supplied_qty - requested_qty,
        });
      }

      // ==========================
      // 📦 PUSH RESULT
      // ==========================
      result.push({
        chalan_id: ch.chalan_id,
        order_id: ch.order_id,
        supplier_name: ch.supplier_name,
        dispatch_date: ch.dispatch_date,
        transport_details: ch.transport_details,
        otp: ch.verification_code,
        is_verified: ch.is_verified,
        items: finalItems,
      });
    }

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Full chalan details for verification",
      data: result,
    });
  } catch (error) {
    console.log("getShopChalanFullDetails error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function getDashboardDatarole(req, res) {
  try {
    const user = req.data;
    let result = null;
    let msg = "";
    console.log("user", req);

    switch (user.user_role) {
      case "ADMIN":
        result = await getAdminDashboard();
        msg = "Admin dashboard data";
        break;

      case "SHOP_ADMIN":
        result = await getShopDashboard(user);
        msg = "Shop dashboard data";
        break;

      case "COUNTER_USER":
        result = await getCounterDashboard(user);
        msg = "Counter dashboard data";
        break;

      case "SUPPLIER":
        result = await getSupplierDashboard(user);
        msg = "Supplier dashboard data";
        break;

      default:
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Invalid role",
          data: [],
        });
    }

    return libFunc.sendResponse(res, {
      status: 0,
      msg: msg,
      data: result,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Failed to fetch dashboard",
      data: [],
    });
  }
}

async function getAdminDashboard() {
  try {
    const summaryQuery = `
      SELECT 
        (SELECT COUNT(*) FROM sms.shops) AS total_shops,
        (SELECT COUNT(*) FROM sms.shops WHERE is_active = true) AS active_shops,
        (SELECT COUNT(*) FROM sms.users) AS total_users,
        (SELECT COUNT(*) FROM sms.suppliers) AS total_suppliers,
        (SELECT COUNT(*) FROM sms.orders) AS total_orders
    `;

    const ordersTrendQuery = `
   SELECT 
  order_date::date AS date,
  COUNT(*) as count
FROM sms.orders
GROUP BY order_date::date
ORDER BY date DESC
LIMIT 7;
    `;

    const recentOrdersQuery = `
SELECT 
  o.row_id,
  o.order_status,
  o.order_date,

  s.shop_name,

  c.counter_name,

  STRING_AGG(sw.sweet_name, ', ') AS sweets

FROM sms.orders o

LEFT JOIN sms.shops s 
  ON o.shop_id = s.row_id

LEFT JOIN sms.order_items oi 
  ON oi.order_id = o.row_id

LEFT JOIN sms.sweets sw 
  ON oi.sweet_id = sw.row_id

LEFT JOIN sms.counters c 
  ON oi.counter_id = c.row_id

GROUP BY 
  o.row_id, o.order_status, o.order_date,
  s.shop_name, c.counter_name

ORDER BY o.order_date DESC
LIMIT 10;
    `;

    const [summary, trend, recent] = await Promise.all([
      db_query.customQuery(summaryQuery),
      db_query.customQuery(ordersTrendQuery),
      db_query.customQuery(recentOrdersQuery),
    ]);

    // console.log("symmary", summary, "trend", trend, "recent", recent);

    return {
      summary: summary.data,
      charts: { orders_trend: trend.data },
      recent_orders: recent.data,
    };
  } catch (err) {
    throw err;
  }
}

async function getShopDashboard(user) {
  try {
    const shopId = user.shopId;

    const summaryQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE order_status='PENDING') as pending,
        COUNT(*) FILTER (WHERE order_status='APPROVED') as approved,
        COUNT(*) FILTER (WHERE order_status='REJECTED') as rejected
      FROM sms.orders
      WHERE shop_id = '${shopId}'
    `;

    const lowStockQuery = `
      SELECT i.*, s.sweet_name
      FROM sms.inventory i
      JOIN sms.sweets s ON s.row_id = i.sweet_id
      WHERE i.quantity::int <= i.min_stock
      AND s.shop_id = '${shopId}'
      LIMIT 10
    `;

    const outStockQuery = `
    SELECT i.*, s.sweet_name
    FROM sms.inventory i
    JOIN sms.sweets s ON s.row_id = i.sweet_id
    WHERE i.quantity::numeric = 0
    AND s.shop_id = '${shopId}'
  `;

    const expiryQuery = `
 SELECT 
  i.*,
  s.sweet_name
FROM sms.inventory i

LEFT JOIN sms.sweets s 
  ON s.row_id = i.sweet_id

WHERE i.expiry_date <= CURRENT_DATE + INTERVAL '2 days'
AND i.counter_id IN (
  SELECT row_id FROM sms.counters WHERE shop_id = '${shopId}'
)

ORDER BY i.expiry_date ASC
LIMIT 10;
    `;

    const trendQuery = `
      SELECT DATE(order_date) as date, COUNT(*) as count
      FROM sms.orders
      WHERE shop_id = '${shopId}'
      GROUP BY DATE(order_date)
      ORDER BY date DESC
      LIMIT 7
    `;

    const financialQuery = `
    SELECT COALESCE(SUM(oi.quantity::numeric * s.price),0) as total_amount
    FROM sms.order_items oi
    JOIN sms.sweets s ON s.row_id = oi.sweet_id
    JOIN sms.orders o ON o.row_id = oi.order_id
    WHERE o.shop_id = '${shopId}'
  `;

    const [summary, lowStock, expiry, trend, out, financial] =
      await Promise.all([
        db_query.customQuery(summaryQuery),
        db_query.customQuery(lowStockQuery),
        db_query.customQuery(expiryQuery),
        db_query.customQuery(trendQuery),
        db_query.customQuery(outStockQuery),
        db_query.customQuery(financialQuery),
      ]);

    return {
      summary: summary.data,
      inventory: {
        low_stock: lowStock.data,
        out_of_stock: out.data,
        // expiring: expiry.data,
      },
      financials: financial.data[0] || {},
      charts: {
        orders_trend: trend.data,
      },
      alerts: {
        expiry: expiry.data,
      },
    };
  } catch (err) {
    throw err;
  }
}

async function getCounterDashboard(user) {
  try {
    const counterId = user.counterId;

    const summaryQuery = `
      SELECT 
        COUNT(*) as total_items
      FROM sms.inventory
      WHERE counter_id = '${counterId}'
    `;

    const inventoryQuery = `
      SELECT i.*, s.sweet_name
      FROM sms.inventory i
      JOIN sms.sweets s ON s.row_id = i.sweet_id
      WHERE i.counter_id = '${counterId}'
      LIMIT 20
    `;

    const requestsQuery = `
SELECT 
  cr.*,
  s.sweet_name
FROM sms.counter_requests cr

LEFT JOIN sms.sweets s 
  ON s.row_id = cr.sweet_id

WHERE cr.counter_id = '${counterId}'
ORDER BY cr.cr_on DESC
LIMIT 10;
    `;

    const expiryQuery = `
SELECT 
  i.*,
  s.sweet_name
FROM sms.inventory i

LEFT JOIN sms.sweets s 
  ON s.row_id = i.sweet_id

WHERE i.counter_id = '${counterId}'
AND i.expiry_date <= CURRENT_DATE + INTERVAL '2 days'
ORDER BY i.expiry_date ASC;
    `;

    const movementQuery = `
    SELECT transaction_type, SUM(quantity::numeric) as total
    FROM sms.stock_transactions
    WHERE counter_id = '${counterId}'
    GROUP BY transaction_type
  `;

    const [summary, inventory, requests, expiry, movement] = await Promise.all([
      db_query.customQuery(summaryQuery),
      db_query.customQuery(inventoryQuery),
      db_query.customQuery(requestsQuery),
      db_query.customQuery(expiryQuery),
      db_query.customQuery(movementQuery),
    ]);

    return {
      summary: summary.data,
      inventory: inventory.data,
      requests: requests.data,
      charts: {
        stock_movement: movement.data,
      },
      alerts: {
        expiry: expiry.data,
      },
    };
  } catch (err) {
    throw err;
  }
}

async function getSupplierDashboard(user) {
  try {
    const supplierId = user.supplierId;

    const summaryQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE order_status='PENDING') as pending,
        COUNT(*) FILTER (WHERE order_status='APPROVED') as approved,
        COUNT(*) FILTER (WHERE order_status='REJECTED') as rejected
      FROM sms.orders
      WHERE supplier_id = '${supplierId}'
    `;

    const ordersQuery = `
SELECT 
  o.row_id,
  o.order_status,
   (o.order_date AT TIME ZONE 'Asia/Kolkata') AS order_date,

  s.shop_name,

  STRING_AGG(DISTINCT c.counter_name, ', ') AS counters

FROM sms.orders o

LEFT JOIN sms.shops s 
  ON s.row_id = o.shop_id

LEFT JOIN sms.order_items oi 
  ON oi.order_id = o.row_id

LEFT JOIN sms.counters c 
  ON c.row_id = oi.counter_id

WHERE o.supplier_id = '${supplierId}'

GROUP BY 
  o.row_id, o.order_status, o.order_date, s.shop_name

ORDER BY o.order_date DESC
LIMIT 10;
    `;

    const returnsQuery = `
      SELECT r.*
      FROM sms.returns r
      JOIN sms.orders o ON o.row_id = r.order_id
      WHERE o.supplier_id = '${supplierId}'
      LIMIT 10
    `;

    const trendQuery = `
      SELECT DATE(order_date) as date, COUNT(*) as count
      FROM sms.orders
      WHERE supplier_id = '${supplierId}'
      GROUP BY DATE(order_date)
      ORDER BY date DESC
      LIMIT 7
    `;

    const pendingItemsQuery = `
    SELECT COUNT(*) as pending_items
    FROM sms.order_items oi
    JOIN sms.orders o ON o.row_id = oi.order_id
    WHERE o.supplier_id = '${supplierId}'
    AND oi.item_status = 'PENDING'
  `;

    const chalanQuery = `
    SELECT COUNT(*) as unverified
    FROM sms.chalans
    WHERE supplier_id = '${supplierId}' AND is_verified = false
  `;

    const [summary, orders, returns, trend, pending, chalan] =
      await Promise.all([
        db_query.customQuery(summaryQuery),
        db_query.customQuery(ordersQuery),
        db_query.customQuery(returnsQuery),
        db_query.customQuery(trendQuery),
        db_query.customQuery(pendingItemsQuery),
        db_query.customQuery(chalanQuery),
      ]);

    return {
      summary: summary.data,
      orders: orders.data,
      returns: returns.data,
      charts: {
        orders_trend: trend.data,
      },
      stats: {
        pending_items: pending.data[0]?.pending_items || 0,
        unverified_chalans: chalan.data[0]?.unverified || 0,
      },
    };
  } catch (err) {
    throw err;
  }
}

const { exec } = require("child_process");

function backupDatabase() {
  return new Promise((resolve, reject) => {
    const backupDir = path.join(__dirname, "backups");

    // 📁 ensure folder exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const fileName = `backup_${Date.now()}.sql`;
    const filePath = path.join(backupDir, fileName);

    const pgDumpPath = `"E:\\PostgresSQL18\\bin\\pg_dump.exe"`;

    // ✅ clean command (no set PGPASSWORD)
    const command = `${pgDumpPath} -U postgres -h localhost -p 5432 -d stock_magement -f "${filePath}"`;

    exec(
      command,
      {
        env: {
          ...process.env,
          PGPASSWORD: "root", // 👈 yaha password do
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error("Backup Error:", error);
          return reject(error);
        }

        console.log("Backup Created:", filePath);
        resolve(filePath);
      },
    );
  });
}

async function backupAPI(req, res) {
  try {
    const file = await backupDatabase();

    res.json({
      success: true,
      message: "Backup created ✅",
      file,
    });
  } catch (err) {
    res.status(500).json({
      message: "Backup failed",
    });
  }
}

async function restoreDatabase(fileName) {
  return new Promise(async (resolve, reject) => {
    try {
      const filePath = path.join(__dirname, "backups", fileName);

      const psqlPath = `"E:\\PostgresSQL18\\bin\\psql.exe"`;

      // 🔥 STEP 1: CLEAN DB (DROP ALL TABLES)
      await db_query.customQuery(`
        DO $$ DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'sms')
          LOOP
            EXECUTE 'DROP TABLE IF EXISTS sms.' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
        END $$;
      `);

      console.log("All tables dropped ✅");

      // 🔥 STEP 2: RESTORE
      const command = `${psqlPath} -U postgres -h localhost -p 5432 -d stock_magement -f "${filePath}"`;

      exec(
        command,
        {
          env: {
            ...process.env,
            PGPASSWORD: "root",
          },
        },
        (error, stdout, stderr) => {
          if (error) {
            console.error("Restore Error:", error);
            return reject(error);
          }

          console.log("Restore Done ✅");
          resolve("Restore successful");
        },
      );
    } catch (err) {
      reject(err);
    }
  });
}

async function restoreAPI(req, res) {
  try {
    const { fileName } = req.data;

    if (!fileName) {
      return res.status(400).json({
        message: "fileName required",
      });
    }

    await restoreDatabase(fileName);

    res.json({
      success: true,
      message: "Database restored (clean + restore) ✅",
    });
  } catch (err) {
    res.status(500).json({
      message: "Restore failed",
    });
  }
}

async function deleteAllData() {
  try {
    // await db_query.customQuery(`
    //   TRUNCATE TABLE
    //   sms.audit_logs,
    //   sms.notifications,
    //   sms.counter_requests,
    //   sms.expiry_logs,
    //   sms.returns,
    //   sms.chalans,
    //   sms.order_items,
    //   sms.orders,
    //   sms.stock_transactions,
    //   sms.inventory
    //   RESTART IDENTITY CASCADE;
    // `);

    await db_query.customQuery(`
  TRUNCATE TABLE 
  sms.audit_logs,
  sms.notifications,
  sms.counter_requests,
  sms.expiry_logs,
  sms.returns,
  sms.chalans,
  sms.order_items,
  sms.orders,
  sms.stock_transactions,
  sms.inventory,
  sms.sweets,
  sms.categories,
  sms.departments,
  sms.suppliers,
  sms.users,
  sms.counters,
  sms.shops
  RESTART IDENTITY CASCADE;
`);

    return "All transactional data deleted ✅";
  } catch (error) {
    console.error("Delete Error:", error);
    throw error;
  }
}

async function insertDefaultAdmin() {
  try {
    await db_query.customQuery(`
      INSERT INTO sms.users (
        row_id,
        name,
        email,
        phone,
        password,
        role
      ) VALUES (
        '1773576248141_czEK',
        'test 1owner',
        't2estshop@gmail.com',
        '9999999999',
        '123456',
        'ADMIN'
      );
    `);

    console.log("Default admin created ✅");
  } catch (error) {
    console.error("Admin Insert Error:", error);
    throw error;
  }
}

async function deleteAPI(req, res) {
  try {
    // const user = req.user;

    // // 🔐 Role check
    // if (user.role !== "SUPER_ADMIN") {
    //   return res.status(403).json({
    //     message: "Unauthorized"
    //   });
    // }

    // // ⚠️ Confirmation check
    // if (req.body.confirm !== "DELETE") {
    //   return res.status(400).json({
    //     message: "Type DELETE to confirm"
    //   });
    // }

    // 🔥 STEP 1: AUTO BACKUP BEFORE DELETE
    const backupFile = await backupDatabase();

    console.log("Backup created before delete:", backupFile);

    await deleteAllData();

    // 🔥 STEP 3: Insert default admin
    await insertDefaultAdmin();

    res.json({
      success: true,
      message: "Data deleted successfully 🚀",
    });
  } catch (err) {
    res.status(500).json({
      message: "Delete failed",
    });
  }
}

// 👉 Delete karo:

// orders, stock, logs, etc.

// 👉 ❌ Delete mat karo:

// shops
// users
// suppliers
// categories
// sweets
// departments

async function deleteNecessaryData() {
  try {
    await db_query.customQuery(`
      TRUNCATE TABLE 
      sms.audit_logs,
      sms.notifications,
      sms.counter_requests,
      sms.expiry_logs,
      sms.returns,
      sms.chalans,
      sms.order_items,
      sms.orders,
      sms.stock_transactions,
      sms.inventory
      RESTART IDENTITY CASCADE;
    `);

    return "Only transactional data deleted ✅";
  } catch (error) {
    console.error("Delete Error:", error);
    throw error;
  }
}

async function deleteAPIforcleandata(req, res) {
  try {
    // 🔥 Backup first
    const backupFile = await backupDatabase();

    console.log("Backup created:", backupFile);

    // 🔥 Only necessary delete
    await deleteNecessaryData();

    res.json({
      success: true,
      message: "Transactional data deleted ✅",
      backupFile,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Delete failed",
    });
  }
}

// const { exec } = require("child_process");
// const path = require("path");
// const fs = require("fs");

// function backupDatabase() {
//   return new Promise((resolve, reject) => {
//     // 📁 Use process.cwd() (VPS safe)
//     const backupDir = path.join(process.cwd(), "backups");

//     // 📁 Ensure folder exists
//     if (!fs.existsSync(backupDir)) {
//       fs.mkdirSync(backupDir, { recursive: true });
//     }

//     const fileName = `backup_${Date.now()}.sql`;
//     const filePath = path.join(backupDir, fileName);

//     // 🔥 VPS command (NO .exe, NO windows path)
//     const command = `pg_dump -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -d ${process.env.DB_NAME} -f "${filePath}"`;

//     exec(
//       command,
//       {
//         env: {
//           ...process.env,
//           PGPASSWORD: process.env.DB_PASSWORD, // 🔐 secure
//         },
//       },
//       (error, stdout, stderr) => {
//         if (error) {
//           console.error("Backup Error:", error);
//           console.error("stderr:", stderr);
//           return reject(error);
//         }

//         console.log("Backup Created:", filePath);
//         resolve(fileName); // sirf fileName return karo
//       }
//     );
//   });
// }

// // API
// async function backupAPI(req, res) {
//   try {
//     const fileName = await backupDatabase();

//     res.json({
//       success: true,
//       message: "Backup created ✅",
//       fileName,
//       downloadUrl: `/backups/${fileName}`, // 👈 optional
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       message: "Backup failed",
//     });
//   }
// }

// const { exec } = require("child_process");
// const path = require("path");
// const fs = require("fs");

// async function restoreDatabase(fileName) {
//   return new Promise(async (resolve, reject) => {
//     try {
//       // 📁 VPS safe path
//       const backupDir = path.join(process.cwd(), "backups");
//       const filePath = path.join(backupDir, fileName);

//       // 🔒 Check file exists
//       if (!fs.existsSync(filePath)) {
//         return reject(new Error("Backup file not found"));
//       }

//       // 🔥 STEP 1: DROP ALL TABLES (clean DB)
//       await db_query.customQuery(`
//         DO $$ DECLARE
//           r RECORD;
//         BEGIN
//           FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'sms')
//           LOOP
//             EXECUTE 'DROP TABLE IF EXISTS sms.' || quote_ident(r.tablename) || ' CASCADE';
//           END LOOP;
//         END $$;
//       `);

//       console.log("All tables dropped ✅");

//       // 🔥 STEP 2: RESTORE (Linux command)
//       const command = `psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -d ${process.env.DB_NAME} -f "${filePath}"`;

//       exec(
//         command,
//         {
//           env: {
//             ...process.env,
//             PGPASSWORD: process.env.DB_PASSWORD,
//           },
//         },
//         (error, stdout, stderr) => {
//           if (error) {
//             console.error("Restore Error:", error);
//             console.error("stderr:", stderr);
//             return reject(error);
//           }

//           console.log("Restore Done ✅");
//           resolve("Restore successful");
//         }
//       );

//     } catch (err) {
//       reject(err);
//     }
//   });
// }

// async function restoreAPI(req, res) {
//   try {
//     const { fileName } = req.data;

//     if (!fileName) {
//       return res.status(400).json({
//         message: "fileName required",
//       });
//     }

//     await restoreDatabase(fileName);

//     res.json({
//       success: true,
//       message: "Database restored (clean + restore) ✅",
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       message: "Restore failed",
//     });
//   }
// }

// async function deleteAllData() {
//   const client = await db_query.getClient(); // assuming pool

//   try {
//     await client.query("BEGIN");

//     await client.query(`
//       TRUNCATE TABLE
//       sms.audit_logs,
//       sms.notifications,
//       sms.counter_requests,
//       sms.expiry_logs,
//       sms.returns,
//       sms.chalans,
//       sms.order_items,
//       sms.orders,
//       sms.stock_transactions,
//       sms.inventory,
//       sms.sweets,
//       sms.categories,
//       sms.departments,
//       sms.suppliers,
//       sms.users,
//       sms.counters,
//       sms.shops
//       RESTART IDENTITY CASCADE;
//     `);

//     await client.query("COMMIT");

//     return "All data deleted ✅";

//   } catch (error) {
//     await client.query("ROLLBACK");
//     console.error("Delete Error:", error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// async function insertDefaultData() {
//   try {
//     // 🔐 Password hash (recommended)
//     const bcrypt = require("bcrypt");
//     const hashedPassword = await bcrypt.hash("123456", 10);

//     // ✅ Default Shop
//     await db_query.customQuery(`
//       INSERT INTO sms.shops (row_id, shop_name, cr_on, up_on)
//       VALUES ('SHOP_1', 'Default Shop', now(), now());
//     `);

//     // ✅ Default Counter
//     await db_query.customQuery(`
//       INSERT INTO sms.counters (row_id, shop_id, counter_name, cr_on, up_on)
//       VALUES ('COUNTER_1', 'SHOP_1', 'Main Counter', now(), now());
//     `);

//     // ✅ Default Admin
//     await db_query.customQuery(`
//       INSERT INTO sms.users (
//         row_id,
//         name,
//         email,
//         phone,
//         password,
//         role,
//         shop_id,
//         counter_id,
//         cr_on,
//         up_on
//       ) VALUES (
//         'ADMIN_1',
//         'Admin',
//         'admin@gmail.com',
//         '9999999999',
//         '${hashedPassword}',
//         'ADMIN',
//         'SHOP_1',
//         'COUNTER_1',
//         now(),
//         now()
//       );
//     `);

//     console.log("Default system recreated ✅");

//   } catch (error) {
//     console.error("Default Insert Error:", error);
//     throw error;
//   }
// }

// async function deleteAPI(req, res) {
//   try {
//     // 🔐 PRODUCTION SAFETY
//     if (req.body.confirm !== "DELETE") {
//       return res.status(400).json({
//         message: "Type DELETE to confirm ⚠️",
//       });
//     }

//     // 🔐 Role check (optional but recommended)
//     // if (req.user.role !== "SUPER_ADMIN") {
//     //   return res.status(403).json({ message: "Unauthorized" });
//     // }

//     // 🔥 STEP 1: Backup
//     const backupFile = await backupDatabase();
//     console.log("Backup created:", backupFile);

//     // 🔥 STEP 2: Delete
//     await deleteAllData();

//     // 🔥 STEP 3: Recreate system
//     await insertDefaultData();

//     res.json({
//       success: true,
//       message: "System reset successfully 🚀",
//       backupFile
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       message: "Delete failed",
//     });
//   }
// }

// async function deleteNecessaryData() {
//   const client = await db_query.getClient();

//   try {
//     await client.query("BEGIN");

//     await client.query(`
//       TRUNCATE TABLE
//       sms.audit_logs,
//       sms.notifications,
//       sms.counter_requests,
//       sms.expiry_logs,
//       sms.returns,
//       sms.chalans,
//       sms.order_items,
//       sms.orders,
//       sms.stock_transactions,
//       sms.inventory
//       RESTART IDENTITY CASCADE;
//     `);

//     await client.query("COMMIT");

//     return "Transactional data deleted ✅";

//   } catch (error) {
//     await client.query("ROLLBACK");
//     console.error("Delete Error:", error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// async function deleteAPIforcleandata(req, res) {
//   try {
//     // 🔐 Confirmation required
//     if (req.body.confirm !== "CLEAN") {
//       return res.status(400).json({
//         message: "Type CLEAN to confirm ⚠️",
//       });
//     }

//     // 🔐 Role check (recommended)
//     // if (req.user.role !== "SUPER_ADMIN") {
//     //   return res.status(403).json({
//     //     message: "Unauthorized",
//     //   });
//     // }

//     // 🔥 STEP 1: Backup
//     const backupFile = await backupDatabase();
//     console.log("Backup created:", backupFile);

//     // 🔥 STEP 2: Delete transactional data
//     await deleteNecessaryData();

//     res.json({
//       success: true,
//       message: "Transactional data cleaned successfully ✅",
//       backupFile,
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       message: "Clean failed",
//     });
//   }
// }
