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
  ass_sweets_con: assignSweetToCounter,

  // counter
  cr_counter: createCounter,
  fe_counter: fetchCounters,
  fe_order_req: getCounterRequests,
  cr_counter_req: createCounterRequest,
  fe_all_my_sweets: fetchCounterSweets,

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
  de_department_slip: downloadDepartmentSlipPDF,

  // dhasboard
  fe_dash: getDashboardData,
  fe_dash_role: getDashboardDatarole,
  fe_counter_dash: getCounterDashboardRequests,

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
  de_ness_data: deleteAPIforcleandata,

  reorder_remaining: reorderRemaining,
  cancel_remaining: cancelRemaining,
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

// async function fetchShops(req, res) {
//   try {
//     const tablename = schema + ".shops";

//     const { city, state, search, shop_id } = req.data || {};
//     const user = req.data;

//     //  Role validation
//     if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Access denied",
//       });
//     }

//     let conditions = ["is_active = true"];

//     //  ADMIN
//     if (user.user_role === "ADMIN") {
//       if (shop_id) {
//         conditions.push(`row_id = '${shop_id}'`);
//       }
//     }

//     //  SHOP_ADMIN /  COUNTER_USER
//     if (["SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
//       conditions.push(`row_id = '${user.shop_id}'`);
//     }

//     //  Filters
//     if (city) {
//       conditions.push(`LOWER(city) = LOWER('${city.replaceAll("'", "`")}')`);
//     }

//     if (state) {
//       conditions.push(`LOWER(state) = LOWER('${state.replaceAll("'", "`")}')`);
//     }

//     if (search) {
//       const safeSearch = search.replaceAll("'", "`");
//       conditions.push(`
//         (
//           LOWER(shop_name) LIKE LOWER('%${safeSearch}%')
//           OR LOWER(address) LIKE LOWER('%${safeSearch}%')
//           OR LOWER(city) LIKE LOWER('%${safeSearch}%')
//         )
//       `);
//     }

//     const whereClause =
//       conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

//     const query = `
//       SELECT
//         row_id,
//         shop_name,
//         address,
//         city,
//         state,
//         pincode,
//         phone,
//         email,
//         gst_number,
//         owner_name,
//         logo_url,
//         is_active,
//         cr_on,
//         up_on
//       FROM ${tablename}
//       ${whereClause}
//       ORDER BY shop_name ASC
//     `;

//     console.log("Final Query:", query);

//     const result = await db_query.customQuery(query, "fetch");

//     return libFunc.sendResponse(res, result);
//   } catch (error) {
//     console.log("fetchShops error:", error);

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Something went wrong",
//       error: error.message,
//     });
//   }
// }

async function fetchShops(req, res) {
  try {
    const tablename = schema + ".shops";
    const userTable = schema + ".users";

    const { city, state, search, shop_id } = req.data || {};
    const user = req.data;

    // Role validation
    if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let conditions = ["s.is_active = true"];

    // ADMIN
    if (user.user_role === "ADMIN") {
      if (shop_id) {
        conditions.push(`s.row_id = '${shop_id}'`);
      }
    }

    // SHOP_ADMIN / COUNTER_USER
    if (["SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      conditions.push(`s.row_id = '${user.shop_id}'`);
    }

    // Filters
    if (city) {
      conditions.push(`LOWER(s.city) = LOWER('${city.replaceAll("'", "`")}')`);
    }

    if (state) {
      conditions.push(
        `LOWER(s.state) = LOWER('${state.replaceAll("'", "`")}')`,
      );
    }

    if (search) {
      const safeSearch = search.replaceAll("'", "`");

      conditions.push(`
        (
          LOWER(s.shop_name) LIKE LOWER('%${safeSearch}%')
          OR LOWER(s.address) LIKE LOWER('%${safeSearch}%')
          OR LOWER(s.city) LIKE LOWER('%${safeSearch}%')
        )
      `);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        s.row_id,
        s.shop_name,
        s.address,
        s.city,
        s.state,
        s.pincode,
        s.phone,
        s.email,
        s.gst_number,
        s.owner_name,
        s.logo_url,
        s.is_active,
        s.cr_on,
        s.up_on,

        u.password AS password
        
      FROM ${tablename} s

      LEFT JOIN ${userTable} u
        ON u.shop_id = s.row_id
        AND u.role = 'SHOP_ADMIN'

      ${whereClause}

      ORDER BY s.shop_name ASC
    `;

    console.log("Final Query:", query);

    const result = await db_query.customQuery(query, "fetch");

    console.log("result :", result);

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

// async function fetchCounters(req, res) {
//   console.log("request", req);
//   try {
//     const { shopId } = req.data || {};
//     const user = req.data; //  FIX (req.data nahi)

//     const counterTable = schema + ".counters";
//     const shopTable = schema + ".shops";

//     //  Role validation
//     if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Access denied",
//       });
//     }

//     let whereConditions = [];

//     //  ADMIN
//     if (user.user_role === "ADMIN") {
//       if (shopId) {
//         whereConditions.push(`c.shop_id = '${shopId}'`);
//       }
//     }

//     //  SHOP_ADMIN
//     if (user.user_role === "SHOP_ADMIN") {
//       //  Always use own shop_id (not request)
//       whereConditions.push(`c.shop_id = '${user.shopId}'`);
//     }

//     //  COUNTER_USER
//     if (user.user_role === "COUNTER_USER") {
//       whereConditions.push(`c.row_id = '${user.counterId}'`);
//     }

//     //  WHERE clause
//     const whereClause =
//       whereConditions.length > 0
//         ? `WHERE ${whereConditions.join(" AND ")}`
//         : "";

//     //  Final Query
//     const query = `
//       SELECT
//         c.row_id,
//         c.counter_name,
//         c.location,
//         c.shop_id,
//         s.shop_name
//       FROM ${counterTable} c
//       LEFT JOIN ${shopTable} s
//         ON s.row_id = c.shop_id
//       ${whereClause}
//       ORDER BY c.counter_name ASC
//     `;

//     console.log("Final Query:", query);

//     const result = await db_query.customQuery(query, "fetch all counter");

//     return libFunc.sendResponse(res, result);
//   } catch (error) {
//     console.log("fetchCounters error:", error);

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Something went wrong",
//       error: error.message,
//     });
//   }
// }

async function fetchCounters(req, res) {
  console.log("request", req);

  try {
    const { shopId } = req.data || {};
    const user = req.data;

    const counterTable = schema + ".counters";
    const shopTable = schema + ".shops";
    const userTable = schema + ".users";

    // Role validation
    if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let whereConditions = [];

    // ADMIN
    if (user.user_role === "ADMIN") {
      if (shopId) {
        whereConditions.push(`c.shop_id = '${shopId}'`);
      }
    }

    // SHOP_ADMIN
    if (user.user_role === "SHOP_ADMIN") {
      whereConditions.push(`c.shop_id = '${user.shopId}'`);
    }

    // COUNTER_USER
    if (user.user_role === "COUNTER_USER") {
      whereConditions.push(`c.row_id = '${user.counterId}'`);
    }

    // WHERE clause
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Final Query
    const query = `
      SELECT
        c.row_id,
        c.counter_name,
        c.location,
        c.shop_id,
        s.shop_name,

        u.phone AS user_phone,
        u.password AS password

      FROM ${counterTable} c

      LEFT JOIN ${shopTable} s
        ON s.row_id = c.shop_id

      LEFT JOIN ${userTable} u
        ON u.counter_id = c.row_id
        AND u.role = 'COUNTER_USER'

      ${whereClause}

      ORDER BY c.counter_name ASC
    `;

    const result = await db_query.customQuery(query, "fetch all counter");

    console.log("result Query:", result);

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

// async function fetchSuppliers(req, res) {
//   console.log("request", req);

//   const tablename = schema + ".suppliers";

//   const query = `
//     SELECT
//       row_id,
//       supplier_name,
//       phone,
//       email,
//       address
//     FROM ${tablename}
//     ORDER BY supplier_name ASC
//   `;

//   const result = await db_query.customQuery(query, "Supplier fetch");
//   console.log("results->", result);

//   return libFunc.sendResponse(res, result);
// }

async function fetchSuppliers(req, res) {
  console.log("request", req);

  const supplierTable = schema + ".suppliers";
  const userTable = schema + ".users";

  const query = `
    SELECT 
      s.row_id,
      s.supplier_name,
      s.phone,
      s.email,
      s.address,

      u.password AS password

    FROM ${supplierTable} s

    LEFT JOIN ${userTable} u
      ON u.supplier_id = s.row_id
      AND u.role = 'SUPPLIER'

    ORDER BY s.supplier_name ASC
  `;

  const result = await db_query.customQuery(query, "Supplier fetch");

  console.log("results->", result);

  return libFunc.sendResponse(res, result);
}

async function createDepartment(req, res) {
  console.log("req", req);

  try {
    const tablename = schema + ".departments";

    const { row_id, department_name, description = "" } = req.data || {};

    const user = req.data;

    // =====================================
    // Role validation
    // =====================================
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // =====================================
    // Validation
    // =====================================
    if (!department_name || !department_name.trim()) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Department name is required",
      });
    }

    const departmentName = department_name.trim().replaceAll("'", "`");

    const departmentDescription = description
      ? description.trim().replaceAll("'", "`")
      : "";

    // =====================================
    // UPDATE FLOW
    // =====================================
    if (row_id) {
      // Check department exists
      const existingDept = await db_query.customQuery(`
        SELECT row_id
        FROM ${tablename}
        WHERE row_id = '${row_id}'
      `);

      if (!existingDept.data?.length) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Department not found",
        });
      }

      // Global duplicate check
      const duplicate = await db_query.customQuery(`
        SELECT row_id
        FROM ${tablename}
        WHERE LOWER(department_name) = LOWER('${departmentName}')
        AND row_id != '${row_id}'
      `);

      if (duplicate.data?.length > 0) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Department already exists",
        });
      }

      // Update department
      await db_query.customQuery(`
        UPDATE ${tablename}
        SET
          department_name = '${departmentName}',
          description = '${departmentDescription}',
          up_on = now()
        WHERE row_id = '${row_id}'
      `);

      return libFunc.sendResponse(res, {
        status: 0,
        msg: "Department updated successfully",
      });
    }

    // =====================================
    // CREATE FLOW
    // =====================================

    // Global duplicate check
    const existing = await db_query.customQuery(`
      SELECT row_id
      FROM ${tablename}
      WHERE LOWER(department_name) = LOWER('${departmentName}')
    `);

    if (existing.data?.length > 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Department already exists",
      });
    }

    // Insert common department
    const columns = {
      row_id: libFunc.randomid(),
      department_name: departmentName,
      description: departmentDescription,
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

    const user = req.data;
    console.log("re1", req);

    // =====================================
    // Role validation
    // =====================================
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // =====================================
    // Fetch COMMON departments
    // =====================================
    const sql = `
      SELECT
        d.row_id,
        d.department_name,
        d.description,
        d.cr_on,
        d.up_on
      FROM ${deptTable} d
      ORDER BY d.department_name ASC
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

    const { row_id, department_id, category_name } = req.data || {};

    const user = req.data;

    // =====================================
    // Role validation
    // =====================================
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // =====================================
    // Basic validation
    // =====================================
    if (!department_id || !category_name || !category_name.trim()) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Department and Category name required",
      });
    }

    const departmentId = department_id.trim();
    const categoryName = category_name.trim().replaceAll("'", "`");

    // =====================================
    // Check department exists
    // =====================================
    const deptCheck = await db_query.customQuery(`
      SELECT row_id
      FROM ${deptTable}
      WHERE row_id = '${departmentId}'
    `);

    if (!deptCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid department",
      });
    }

    // =====================================
    // UPDATE FLOW
    // =====================================
    if (row_id) {
      // Check category exists
      const catCheck = await db_query.customQuery(`
        SELECT row_id
        FROM ${tablename}
        WHERE row_id = '${row_id}'
      `);

      if (!catCheck.data?.length) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Category not found",
        });
      }

      // Duplicate check
      // Same category name cannot exist
      // under the same department
      const duplicate = await db_query.customQuery(`
        SELECT row_id
        FROM ${tablename}
        WHERE LOWER(category_name) = LOWER('${categoryName}')
        AND department_id = '${departmentId}'
        AND row_id != '${row_id}'
      `);

      if (duplicate.data?.length > 0) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Category already exists in this department",
        });
      }

      // Update category
      await db_query.customQuery(`
        UPDATE ${tablename}
        SET
          department_id = '${departmentId}',
          category_name = '${categoryName}',
          up_on = now()
        WHERE row_id = '${row_id}'
      `);

      return libFunc.sendResponse(res, {
        status: 0,
        msg: "Category updated successfully",
      });
    }

    // =====================================
    // CREATE FLOW
    // =====================================

    // Duplicate check
    const existing = await db_query.customQuery(`
      SELECT row_id
      FROM ${tablename}
      WHERE LOWER(category_name) = LOWER('${categoryName}')
      AND department_id = '${departmentId}'
    `);

    if (existing.data?.length > 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Category already exists in this department",
      });
    }

    // =====================================
    // Create common category
    // =====================================
    const columns = {
      row_id: libFunc.randomid(),
      department_id: departmentId,
      category_name: categoryName,
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
    const { department_id } = req.data || {};

    const categoryTable = `${schema}.categories`;
    const deptTable = `${schema}.departments`;

    // =====================================
    // Role validation
    // =====================================
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // =====================================
    // Build WHERE condition
    // =====================================
    let whereConditions = [];

    if (department_id) {
      whereConditions.push(`c.department_id = '${department_id.trim()}'`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // =====================================
    // Fetch COMMON categories
    // =====================================
    const sql = `
      SELECT
        c.row_id,
        c.category_name,
        c.department_id,
        d.department_name,
        c.cr_on,
        c.up_on
      FROM ${categoryTable} c
      LEFT JOIN ${deptTable} d
        ON d.row_id = c.department_id
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
    const supplierTable = schema + ".suppliers";

    const {
      row_id,
      department_id,
      category_id,
      supplier_id,
      sweet_name,
      unit = "KG",
      price = 0,
      shelf_life_days = 0,
      description = "",
      image_url = "",
      return_type = "NONE",
    } = req.data || {};

    const user = req.data;

    // =====================================
    // Role validation
    // =====================================
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // =====================================
    // Basic validation
    // =====================================
    if (
      !department_id ||
      !category_id ||
      !supplier_id ||
      !sweet_name ||
      !sweet_name.trim()
    ) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Department, Category, Supplier and Sweet name required",
      });
    }

    const departmentId = department_id.trim();
    const categoryId = category_id.trim();
    const supplierId = supplier_id.trim();

    const sweetName = sweet_name.trim().replaceAll("'", "`");

    // =====================================
    // Check Department exists
    // =====================================
    const deptCheck = await db_query.customQuery(`
      SELECT row_id
      FROM ${deptTable}
      WHERE row_id = '${departmentId}'
    `);

    if (!deptCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid department",
      });
    }

    // =====================================
    // Check Category exists
    // AND belongs to selected Department
    // =====================================
    const categoryCheck = await db_query.customQuery(`
      SELECT
        row_id,
        department_id,
        category_name
      FROM ${categoryTable}
      WHERE row_id = '${categoryId}'
      AND department_id = '${departmentId}'
    `);

    if (!categoryCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid category for selected department",
      });
    }

    // =====================================
    // Check Supplier exists
    // =====================================
    const supplierCheck = await db_query.customQuery(`
      SELECT row_id
      FROM ${supplierTable}
      WHERE row_id = '${supplierId}'
    `);

    if (!supplierCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid supplier",
      });
    }

    // =====================================
    // UPDATE FLOW
    // =====================================
    if (row_id) {
      // Check sweet exists
      const sweetCheck = await db_query.customQuery(`
        SELECT row_id
        FROM ${tablename}
        WHERE row_id = '${row_id}'
      `);

      if (!sweetCheck.data?.length) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Sweet not found",
        });
      }

      // =====================================
      // Duplicate check
      // Same sweet cannot exist under
      // same department + category + supplier
      // =====================================
      const duplicate = await db_query.customQuery(`
        SELECT row_id
        FROM ${tablename}
        WHERE LOWER(sweet_name) = LOWER('${sweetName}')
        AND category_id = '${categoryId}'
        AND supplier_id = '${supplierId}'
        AND row_id != '${row_id}'
      `);

      if (duplicate.data?.length > 0) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Sweet already exists for this category and supplier",
        });
      }

      // =====================================
      // Update sweet
      // =====================================
      await db_query.customQuery(`
        UPDATE ${tablename}
        SET
          category_id = '${categoryId}',
          supplier_id = '${supplierId}',
          sweet_name = '${sweetName}',
          unit = '${unit}',
          price = ${Number(price) || 0},
          shelf_life_days = '${shelf_life_days}',
          description = '${description.trim().replaceAll("'", "`")}',
          image_url = '${image_url.trim().replaceAll("'", "`")}',
          return_type = '${return_type}',
          up_on = now()
        WHERE row_id = '${row_id}'
      `);

      return libFunc.sendResponse(res, {
        status: 0,
        msg: "Sweet updated successfully",
      });
    }

    // =====================================
    // CREATE FLOW
    // =====================================

    const existingSweet = await db_query.customQuery(`
      SELECT row_id
      FROM ${tablename}
      WHERE LOWER(sweet_name) = LOWER('${sweetName}')
      AND category_id = '${categoryId}'
      AND supplier_id = '${supplierId}'
    `);

    if (existingSweet.data?.length > 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Sweet already exists for this category and supplier",
      });
    }

    // =====================================
    // Create Common Sweet
    // =====================================
    const columns = {
      row_id: libFunc.randomid(),
      category_id: categoryId,
      supplier_id: supplierId,
      sweet_name: sweetName,
      unit,
      price,
      shelf_life_days,
      description: description.trim(),
      image_url: image_url.trim(),
      return_type,
      is_active: true,
    };

    const resp = await db_query.addData(tablename, columns, null, "Sweet");

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

    const { category_id, department_id, supplier_id, search } = req.data || {};

    // =====================================
    // Role validation
    // =====================================
    if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let conditions = ["s.is_active = true"];

    // =====================================
    // Filters
    // =====================================

    // Category filter
    if (category_id) {
      conditions.push(
        `s.category_id = '${category_id.trim().replaceAll("'", "`")}'`,
      );
    }

    // Department filter
    if (department_id) {
      conditions.push(
        `d.row_id = '${department_id.trim().replaceAll("'", "`")}'`,
      );
    }

    // Supplier filter
    if (supplier_id) {
      conditions.push(
        `s.supplier_id = '${supplier_id.trim().replaceAll("'", "`")}'`,
      );
    }

    // =====================================
    // COUNTER_USER
    // =====================================
    // Counter user should only see sweets
    // assigned to his counter.
    //
    // counter_sweets is the mapping table:
    // counter_id <-> sweet_id
    // =====================================

    let counterSweetJoin = "";

    if (user.user_role === "COUNTER_USER") {
      counterSweetJoin = `
        INNER JOIN ${schema}.counter_sweets cs
          ON cs.sweet_id = s.row_id
          AND cs.counter_id = '${user.counterId}'
          AND cs.is_active = true
      `;
    }

    // =====================================
    // Search
    // =====================================
    if (search) {
      const safeSearch = search.trim().replaceAll("'", "`");

      conditions.push(`
        (
          LOWER(s.sweet_name) LIKE LOWER('%${safeSearch}%')
          OR LOWER(c.category_name) LIKE LOWER('%${safeSearch}%')
          OR LOWER(d.department_name) LIKE LOWER('%${safeSearch}%')
          OR LOWER(sup.supplier_name) LIKE LOWER('%${safeSearch}%')
        )
      `);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // =====================================
    // FINAL QUERY
    // =====================================
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

        s.supplier_id,
        sup.supplier_name,

        s.return_type,
        s.is_active,

        s.cr_on,
        s.up_on

      FROM ${schema}.sweets s

      LEFT JOIN ${schema}.categories c
        ON c.row_id = s.category_id

      LEFT JOIN ${schema}.departments d
        ON d.row_id = c.department_id

      LEFT JOIN ${schema}.suppliers sup
        ON sup.row_id = s.supplier_id

      ${counterSweetJoin}

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

    const {
      counter_id,
      sweet_id,
      transaction_type,
      from_date,
      to_date,
      shop_id,
    } = req.data || {};

    // ==============================
    // ROLE VALIDATION
    // ==============================

    if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let conditions = [];

    // ==============================
    // SHOP ADMIN
    // ==============================

    if (user.user_role === "SHOP_ADMIN") {
      if (!user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop ID not found in token",
        });
      }

      // Only transactions from own shop
      conditions.push(
        `c.shop_id = '${user.shopId.trim().replaceAll("'", "`")}'`,
      );

      // Optional counter filter
      if (counter_id) {
        conditions.push(
          `st.counter_id = '${counter_id.trim().replaceAll("'", "`")}'`,
        );
      }
    }

    // ==============================
    // COUNTER USER
    // ==============================

    if (user.user_role === "COUNTER_USER") {
      if (!user.counterId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Counter ID not found in token",
        });
      }

      // Counter user can only see own counter
      conditions.push(
        `st.counter_id = '${user.counterId.trim().replaceAll("'", "`")}'`,
      );
    }

    // ==============================
    // ADMIN
    // ==============================

    if (user.user_role === "ADMIN") {
      // Optional shop filter
      if (shop_id) {
        conditions.push(`c.shop_id = '${shop_id.trim().replaceAll("'", "`")}'`);
      }

      // Optional counter filter
      if (counter_id) {
        conditions.push(
          `st.counter_id = '${counter_id.trim().replaceAll("'", "`")}'`,
        );
      }
    }

    // ==============================
    // SWEET FILTER
    // ==============================

    if (sweet_id) {
      conditions.push(
        `st.sweet_id = '${sweet_id.trim().replaceAll("'", "`")}'`,
      );
    }

    // ==============================
    // TRANSACTION TYPE
    // ==============================

    if (transaction_type) {
      conditions.push(
        `st.transaction_type = '${transaction_type
          .trim()
          .replaceAll("'", "`")
          .toUpperCase()}'`,
      );
    }

    // ==============================
    // DATE FILTER
    // ==============================

    if (from_date) {
      conditions.push(`st.cr_on >= '${from_date.trim().replaceAll("'", "`")}'`);
    }

    if (to_date) {
      conditions.push(`st.cr_on <= '${to_date.trim().replaceAll("'", "`")}'`);
    }

    // ==============================
    // WHERE
    // ==============================

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // ==============================
    // QUERY
    // ==============================

    const result = await db_query.customQuery(`
      SELECT

        st.row_id AS transaction_id,

        st.counter_id,
        c.counter_name,
        c.location,

        c.shop_id,
        sh.shop_name,
        sh.city,
        sh.state,

        st.sweet_id,
        s.sweet_name,
        s.unit,
        s.price,

        st.transaction_type,
        st.quantity,

        st.reference_id,
        st.notes,

        TO_CHAR(
          st.cr_on,
          'YYYY-MM-DD HH24:MI:SS'
        ) AS cr_on,

        st.up_on

      FROM ${transactionTable} st

      LEFT JOIN ${sweetTable} s
        ON s.row_id = st.sweet_id

      LEFT JOIN ${counterTable} c
        ON c.row_id = st.counter_id

      LEFT JOIN ${shopTable} sh
        ON sh.row_id = c.shop_id

      ${whereClause}

      ORDER BY
        st.cr_on DESC
    `);

    const stockHistory =
      result.status === 0 && Array.isArray(result.data) ? result.data : [];

    // ==============================
    // NO DATA
    // ==============================

    if (stockHistory.length === 0) {
      return libFunc.sendResponse(res, {
        status: 0,
        msg: "No stock history found",
        data: [],
      });
    }

    // ==============================
    // SUCCESS
    // ==============================

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Stock history fetched successfully",
      data: stockHistory,
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
    const shopTable = schema + ".shops";

    const user = req.data;

    // ==============================
    // ROLE VALIDATION
    // ==============================

    if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let whereConditions = ["i.quantity::NUMERIC > 0"];

    // ==============================
    // SHOP ADMIN
    // ==============================

    if (user.user_role === "SHOP_ADMIN") {
      if (!user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop ID not found in token",
        });
      }

      // Only counters belonging to this shop
      whereConditions.push(
        `c.shop_id = '${user.shopId.trim().replaceAll("'", "`")}'`,
      );
    }

    // ==============================
    // COUNTER USER
    // ==============================

    if (user.user_role === "COUNTER_USER") {
      if (!user.counterId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Counter ID not found in token",
        });
      }

      // Only own counter inventory
      whereConditions.push(
        `i.counter_id = '${user.counterId.trim().replaceAll("'", "`")}'`,
      );
    }

    // ==============================
    // ADMIN
    // ==============================

    // ADMIN can see all inventory.
    // No additional filter required.

    const whereClause = `
      WHERE ${whereConditions.join(" AND ")}
    `;

    // ==============================
    // FETCH INVENTORY
    // ==============================

    const result = await db_query.customQuery(`
      SELECT

        i.row_id AS inventory_id,

        i.counter_id,
        c.counter_name,
        c.location,

        c.shop_id,
        sh.shop_name,

        i.sweet_id,
        s.sweet_name,
        s.unit,
        s.price,
        s.image_url,

        i.quantity,
        i.min_stock,
        i.max_stock,
        i.expiry_date,

        CASE
          WHEN i.quantity::NUMERIC <= i.min_stock
          THEN true
          ELSE false
        END AS low_stock,

        CASE
          WHEN i.max_stock > 0
          AND i.quantity::NUMERIC >= i.max_stock
          THEN true
          ELSE false
        END AS max_stock_reached,

        CASE
          WHEN i.expiry_date < CURRENT_DATE
          THEN true
          ELSE false
        END AS is_expired,

        i.cr_on,
        i.up_on

      FROM ${inventoryTable} i

      LEFT JOIN ${sweetTable} s
        ON s.row_id = i.sweet_id

      LEFT JOIN ${counterTable} c
        ON c.row_id = i.counter_id

      LEFT JOIN ${shopTable} sh
        ON sh.row_id = c.shop_id

      ${whereClause}

      ORDER BY
        i.cr_on DESC
    `);

    console.log("getInventory result:", result);

    const inventoryData =
      result.status === 0 && Array.isArray(result.data) ? result.data : [];

    // ==============================
    // NO DATA
    // ==============================

    if (inventoryData.length === 0) {
      return libFunc.sendResponse(res, {
        status: 0,
        msg: "No inventory found",
        data: [],
      });
    }

    // ==============================
    // SUCCESS
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
    console.log("========== createCounterRequest START ==========");

    const table = schema + ".counter_requests";
    const counterTable = schema + ".counters";
    const mappingTable = schema + ".counter_sweets";
    const sweetTable = schema + ".sweets";

    const { items } = req.data || {};
    const user = req.data;

    console.log("User:", user);
    console.log("Items:", items);

    // =====================================
    // Role validation
    // =====================================
    if (user.user_role !== "COUNTER_USER") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only counter user can create request",
      });
    }

    // =====================================
    // Counter ID from token
    // =====================================
    const finalCounterId = user.counterId;

    if (!finalCounterId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Counter ID not found in token",
      });
    }

    console.log("Counter ID:", finalCounterId);

    // =====================================
    // Basic validation
    // =====================================
    if (!Array.isArray(items) || items.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Items are required",
      });
    }

    // =====================================
    // Check Counter
    // =====================================
    const counterCheck = await db_query.customQuery(`
      SELECT
        row_id,
        shop_id,
        counter_name
      FROM ${counterTable}
      WHERE row_id = '${finalCounterId}'
    `);

    if (!counterCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid counter",
      });
    }

    const counterShopId = counterCheck.data[0].shop_id;

    console.log("Counter Shop ID:", counterShopId);

    // =====================================
    // BEGIN TRANSACTION
    // =====================================
    await connect_db.query("BEGIN");

    let isRequestCreated = false;
    let createdItems = [];
    let skippedItems = [];

    // =====================================
    // Process Items
    // =====================================
    for (const item of items) {
      console.log("--------------------------------");
      console.log("Processing item:", item);

      const { sweet_id, quantity } = item;

      // =====================================
      // Item validation
      // =====================================
      if (
        !sweet_id ||
        quantity === undefined ||
        quantity === null ||
        Number(quantity) <= 0
      ) {
        await connect_db.query("ROLLBACK");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Invalid item data",
        });
      }

      const sweetId = sweet_id.trim();
      const requestQuantity = Number(quantity);

      // =====================================
      // Check Sweet
      // =====================================
      const sweetCheck = await db_query.customQuery(`
        SELECT
          row_id,
          sweet_name,
          is_active
        FROM ${sweetTable}
        WHERE row_id = '${sweetId}'
        AND is_active = true
      `);

      if (!sweetCheck.data?.length) {
        await connect_db.query("ROLLBACK");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: `Invalid or inactive sweet: ${sweetId}`,
        });
      }

      // =====================================
      // IMPORTANT:
      // Check Sweet assigned to this Counter
      // =====================================
      const mappingCheck = await db_query.customQuery(`
        SELECT
          row_id,
          shop_id,
          counter_id,
          sweet_id,
          is_active
        FROM ${mappingTable}
        WHERE counter_id = '${finalCounterId}'
        AND sweet_id = '${sweetId}'
        AND is_active = true
      `);

      if (!mappingCheck.data?.length) {
        await connect_db.query("ROLLBACK");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: `Sweet "${sweetCheck.data[0].sweet_name}" is not assigned to this counter`,
        });
      }

      // =====================================
      // Optional safety:
      // Mapping shop must match counter shop
      // =====================================
      const mappingShopId = mappingCheck.data[0].shop_id;

      if (mappingShopId && counterShopId && mappingShopId !== counterShopId) {
        await connect_db.query("ROLLBACK");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Sweet assignment does not belong to this shop",
        });
      }

      // =====================================
      // Duplicate Pending Request Check
      // =====================================
      const existing = await db_query.customQuery(`
        SELECT
          row_id,
          quantity
        FROM ${table}
        WHERE counter_id = '${finalCounterId}'
        AND sweet_id = '${sweetId}'
        AND status = 'PENDING'
      `);

      if (existing.data?.length > 0) {
        console.log("Pending request already exists:", sweetId);

        skippedItems.push({
          sweet_id: sweetId,
          reason: "Already requested",
        });

        continue;
      }

      // =====================================
      // Insert Counter Request
      // =====================================
      await db_query.addData(
        table,
        {
          row_id: libFunc.randomid(),
          counter_id: finalCounterId,
          sweet_id: sweetId,
          quantity: requestQuantity,
          status: "PENDING",
        },
        null,
        "Counter Request",
      );

      createdItems.push({
        sweet_id: sweetId,
        quantity: requestQuantity,
      });

      isRequestCreated = true;

      console.log("Counter request created:", sweetId);
    }

    // =====================================
    // COMMIT
    // =====================================
    await connect_db.query("COMMIT");

    console.log("Transaction COMMIT");

    // =====================================
    // Notification
    // =====================================
    if (isRequestCreated) {
      const shopAdmin = await db_query.customQuery(`
        SELECT
          row_id
        FROM ${schema}.users
        WHERE role = 'SHOP_ADMIN'
        AND shop_id = '${counterShopId}'
      `);

      if (shopAdmin.data?.length > 0) {
        await createNotification({
          user_id: shopAdmin.data[0].row_id,
          title: "New Counter Request",
          message: `${createdItems.length} item(s) requested from counter`,
          type: "REQUEST",
          reference_id: finalCounterId,
        });

        console.log("Notification created");
      } else {
        console.log("Shop Admin not found");
      }
    }

    // =====================================
    // Final Response
    // =====================================
    console.log("Created Items:", createdItems);

    console.log("Skipped Items:", skippedItems);

    // Some items created + some already pending
    if (createdItems.length > 0 && skippedItems.length > 0) {
      return libFunc.sendResponse(res, {
        status: 0,
        msg: `${createdItems.length} request(s) created successfully, ${skippedItems.length} already pending`,
        data: {
          counter_id: finalCounterId,
          created_items: createdItems,
          skipped_items: skippedItems,
        },
      });
    }

    // All items already pending
    if (createdItems.length === 0 && skippedItems.length > 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "All selected sweets already have pending requests",
        data: {
          counter_id: finalCounterId,
          created_items: [],
          skipped_items: skippedItems,
        },
      });
    }

    // All items created
    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Request sent to shop admin",
      data: {
        counter_id: finalCounterId,
        created_items: createdItems,
        skipped_items: [],
      },
    });
  } catch (error) {
    console.log("createCounterRequest error:", error);

    console.log("Error message:", error.message);

    try {
      await connect_db.query("ROLLBACK");
    } catch (rollbackError) {
      console.log("Rollback error:", rollbackError);
    }

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
    const sweetTable = schema + ".sweets";

    const { supplier_id, request_ids, shop_id } = req.data || {};

    console.log("createFinalOrder request:", req.data);

    // =====================================
    // ROLE VALIDATION
    // =====================================

    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // =====================================
    // SHOP VALIDATION
    // =====================================

    let finalShopId;

    if (user.user_role === "SHOP_ADMIN") {
      if (!user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop ID not found in token",
        });
      }

      finalShopId = user.shopId;
    }

    if (user.user_role === "ADMIN") {
      if (!shop_id) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "shop_id is required",
        });
      }

      finalShopId = shop_id.trim();
    }

    // =====================================
    // BASIC VALIDATION
    // =====================================

    if (!supplier_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "supplier_id is required",
      });
    }

    if (!Array.isArray(request_ids) || request_ids.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "request_ids are required",
      });
    }

    const supplierId = supplier_id.trim();

    // =====================================
    // UNIQUE REQUEST IDS
    // =====================================

    const uniqueRequestIds = [
      ...new Set(request_ids.filter(Boolean).map((id) => id.trim())),
    ];

    if (uniqueRequestIds.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Valid request_ids are required",
      });
    }

    const requestIdsSql = uniqueRequestIds
      .map((id) => `'${id.replaceAll("'", "`")}'`)
      .join(",");

    // =====================================
    // BEGIN TRANSACTION
    // =====================================

    await connect_db.query("BEGIN");

    // =====================================
    // SUPPLIER VALIDATION
    // =====================================

    const supplierCheck = await db_query.customQuery(`
      SELECT
        row_id,
        supplier_name
      FROM ${supplierTable}
      WHERE row_id = '${supplierId.replaceAll("'", "`")}'
    `);

    if (!supplierCheck.data?.length) {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid supplier",
      });
    }

    // =====================================
    // FETCH REQUESTS
    // =====================================

    const requests = await db_query.customQuery(`
      SELECT
        r.row_id,
        r.counter_id,
        r.sweet_id,
        r.quantity,
        r.status,

        c.shop_id,
        c.counter_name,

        s.sweet_name,
        s.supplier_id AS sweet_supplier_id

      FROM ${requestTable} r

      LEFT JOIN ${counterTable} c
        ON c.row_id = r.counter_id

      LEFT JOIN ${sweetTable} s
        ON s.row_id = r.sweet_id

      WHERE r.row_id IN (${requestIdsSql})
      AND r.status = 'PENDING'
    `);

    // =====================================
    // REQUEST VALIDATION
    // =====================================

    if (!requests.data || requests.data.length === 0) {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "No valid pending requests found",
      });
    }

    if (requests.data.length !== uniqueRequestIds.length) {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Some request_ids are invalid or already processed",
      });
    }

    // =====================================
    // SHOP + SUPPLIER VALIDATION
    // =====================================

    for (const request of requests.data) {
      // -------------------------------------
      // Shop validation
      // -------------------------------------

      if (request.shop_id !== finalShopId) {
        await connect_db.query("ROLLBACK");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: "All requests must belong to your shop",
        });
      }

      // -------------------------------------
      // Supplier validation
      // -------------------------------------

      if (request.sweet_supplier_id !== supplierId) {
        await connect_db.query("ROLLBACK");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: `Sweet "${request.sweet_name}" does not belong to selected supplier`,
        });
      }

      // -------------------------------------
      // Quantity validation
      // -------------------------------------

      if (
        request.quantity === null ||
        request.quantity === undefined ||
        Number(request.quantity) <= 0
      ) {
        await connect_db.query("ROLLBACK");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: `Invalid quantity for sweet "${request.sweet_name}"`,
        });
      }
    }

    // =====================================
    // CREATE NORMAL ORDER
    // =====================================

    const orderRowId = libFunc.randomid();

    await db_query.addData(
      orderTable,
      {
        row_id: orderRowId,

        shop_id: finalShopId,

        supplier_id: supplierId,

        order_status: "PENDING",

        // ================================
        // REORDER FIELDS
        // ================================

        order_type: "NORMAL",

        // parent_order_id intentionally omitted
        // because this is a root/original order

        resolution_status: "OPEN",
      },
      null,
      "Order",
    );

    // =====================================
    // CREATE ORDER ITEMS
    //
    // ONE REQUEST = ONE ORDER ITEM
    // =====================================

    for (const request of requests.data) {
      await db_query.addData(
        itemTable,
        {
          row_id: libFunc.randomid(),

          order_id: orderRowId,

          // Exact counter request reference
          request_id: request.row_id,

          sweet_id: request.sweet_id,

          // Counter remains attached to item
          counter_id: request.counter_id,

          // Original requested quantity
          quantity: Number(request.quantity),

          // Supplier has not processed yet
          item_status: "PENDING",

          // Supplier supplied quantity
          supplied_quantity: 0,

          // ================================
          // REORDER FIELDS
          // ================================

          // parent_order_item_id intentionally omitted
          // because this is a root/original item

          // Nothing cancelled initially
          cancelled_quantity: 0,

          // No reorder/cancel action yet
          remaining_action: "PENDING",

          // remaining_action_on intentionally omitted
        },
        null,
        "Order Item",
      );
    }

    // =====================================
    // UPDATE REQUEST STATUS
    // =====================================

    await db_query.customQuery(`
      UPDATE ${requestTable}
      SET
        status = 'APPROVED',
        up_on = now()
      WHERE row_id IN (${requestIdsSql})
    `);

    // =====================================
    // COMMIT
    // =====================================

    await connect_db.query("COMMIT");

    // =====================================
    // NOTIFY SUPPLIER
    // =====================================

    const supplierUsers = await db_query.customQuery(`
      SELECT
        row_id
      FROM ${schema}.users
      WHERE supplier_id = '${supplierId.replaceAll("'", "`")}'
    `);

    if (supplierUsers.data?.length) {
      for (const supplierUser of supplierUsers.data) {
        await createNotification({
          user_id: supplierUser.row_id,

          title: "New Order Received",

          message: `New order created with ${requests.data.length} item(s)`,

          type: "ORDER",

          reference_id: orderRowId,
        });
      }
    }

    // =====================================
    // NOTIFY COUNTER USERS
    // =====================================

    const counterUsers = await db_query.customQuery(`
      SELECT
        u.row_id
      FROM ${requestTable} r

      LEFT JOIN ${schema}.users u
        ON u.counter_id = r.counter_id

      WHERE r.row_id IN (${requestIdsSql})
    `);

    if (counterUsers.data?.length) {
      const uniqueUsers = [...new Set(counterUsers.data.map((u) => u.row_id))];

      for (const userId of uniqueUsers) {
        await createNotification({
          user_id: userId,

          title: "Request Approved",

          message: `${uniqueRequestIds.length} request(s) approved`,

          type: "REQUEST",

          reference_id: orderRowId,
        });
      }
    }

    // =====================================
    // FINAL RESPONSE
    // =====================================

    return libFunc.sendResponse(res, {
      status: 0,

      msg: "Final order created successfully",

      data: {
        order_id: orderRowId,

        shop_id: finalShopId,

        supplier_id: supplierId,

        order_type: "NORMAL",

        parent_order_id: null,

        resolution_status: "OPEN",

        request_count: uniqueRequestIds.length,

        item_count: requests.data.length,
      },
    });
  } catch (error) {
    console.log("createFinalOrder ERROR:", error);

    try {
      await connect_db.query("ROLLBACK");
    } catch (e) {
      console.log("Rollback error:", e);
    }

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

    // =====================================
    // ROLE VALIDATION
    // =====================================

    if (user.user_role !== "SHOP_ADMIN" && user.user_role !== "ADMIN") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let conditions = [];

    // =====================================
    // SHOP_ADMIN
    // =====================================

    if (user.user_role === "SHOP_ADMIN") {
      if (!user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop ID not found in token",
        });
      }

      conditions.push(`o.shop_id = '${user.shopId}'`);
    }

    // =====================================
    // ADMIN
    // =====================================

    if (user.user_role === "ADMIN") {
      const { shop_id } = req.data || {};

      if (shop_id) {
        conditions.push(`o.shop_id = '${shop_id.trim()}'`);
      }
    }

    const whereCondition =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // =====================================
    // FETCH ORDERS
    // =====================================

    const result = await db_query.customQuery(`
      SELECT

        -- =====================================
        -- ORDER
        -- =====================================

        o.row_id AS order_id,
        o.order_status,
        o.order_date,

        -- NEW
        o.order_type,
        o.parent_order_id,
        o.resolution_status,

        -- =====================================
        -- SUPPLIER
        -- =====================================

        sup.row_id AS supplier_id,
        sup.supplier_name,

        -- =====================================
        -- SHOP
        -- =====================================

        sh.row_id AS shop_id,
        sh.shop_name,

        -- =====================================
        -- ORDER ITEM
        -- =====================================

        oi.row_id AS order_item_id,

        -- Exact counter request
        oi.request_id,

        oi.sweet_id,

        -- Original requested quantity
        oi.quantity,

        -- =====================================
        -- SUPPLIER FULFILLMENT
        -- =====================================

        oi.item_status,

        COALESCE(
          oi.supplied_quantity,
          0
        ) AS supplied_quantity,

        COALESCE(
          oi.cancelled_quantity,
          0
        ) AS cancelled_quantity,

        oi.reject_reason,

        -- =====================================
        -- REORDER INFORMATION
        -- =====================================

        oi.parent_order_item_id,

        oi.remaining_action,

        oi.remaining_action_on,

        -- =====================================
        -- TOTAL QUANTITY SUPPLIED
        -- FROM ALL REORDER CHILD ITEMS
        -- =====================================

        COALESCE(
          (
            SELECT SUM(
              COALESCE(child.supplied_quantity, 0)
            )
            FROM ${schema}.order_items child
            WHERE child.parent_order_item_id = oi.row_id
          ),
          0
        ) AS reorder_supplied_quantity,

        -- =====================================
        -- REMAINING QUANTITY
        -- =====================================

        (
          oi.quantity::numeric

          - COALESCE(
              oi.supplied_quantity,
              0
            )::numeric

          - COALESCE(
              (
                SELECT SUM(
                  COALESCE(child.supplied_quantity, 0)
                )
                FROM ${schema}.order_items child
                WHERE child.parent_order_item_id = oi.row_id
              ),
              0
            )::numeric

          - COALESCE(
              oi.cancelled_quantity,
              0
            )::numeric

        ) AS remaining_quantity,

        -- =====================================
        -- COUNTER
        -- =====================================

        oi.counter_id,
        c.counter_name,
        c.location,

        -- =====================================
        -- SWEET
        -- =====================================

        s.sweet_name,
        s.unit

      FROM ${schema}.orders o

      LEFT JOIN ${schema}.shops sh
        ON sh.row_id = o.shop_id

      LEFT JOIN ${schema}.suppliers sup
        ON sup.row_id = o.supplier_id

      LEFT JOIN ${schema}.order_items oi
        ON oi.order_id = o.row_id

      LEFT JOIN ${schema}.sweets s
        ON s.row_id = oi.sweet_id

      LEFT JOIN ${schema}.counters c
        ON c.row_id = oi.counter_id

      ${whereCondition}

      ORDER BY
        o.order_date DESC,
        oi.cr_on ASC
    `);

    console.log("getShopOrders result:", result);

    // =====================================
    // GROUP ORDER-WISE
    // =====================================

    const ordersMap = {};

    for (const row of result.data || []) {
      // =====================================
      // CREATE ORDER
      // =====================================

      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          order_id: row.order_id,

          order_status: row.order_status,

          order_date: row.order_date,

          // NEW
          order_type: row.order_type || "NORMAL",

          parent_order_id: row.parent_order_id || null,

          resolution_status: row.resolution_status || "OPEN",

          shop_id: row.shop_id,

          shop_name: row.shop_name,

          supplier_id: row.supplier_id,

          supplier_name: row.supplier_name,

          items: [],
        };
      }

      // =====================================
      // ADD ORDER ITEM
      // =====================================

      if (row.order_item_id) {
        const requestedQuantity = Number(row.quantity || 0);

        const suppliedQuantity = Number(row.supplied_quantity || 0);

        const reorderSuppliedQuantity = Number(
          row.reorder_supplied_quantity || 0,
        );

        const cancelledQuantity = Number(row.cancelled_quantity || 0);

        // =====================================
        // FINAL REMAINING
        // =====================================

        const remainingQuantity = Math.max(
          0,
          requestedQuantity -
            suppliedQuantity -
            reorderSuppliedQuantity -
            cancelledQuantity,
        );

        // =====================================
        // ADD ITEM
        // =====================================

        ordersMap[row.order_id].items.push({
          order_item_id: row.order_item_id,

          // Exact counter request
          request_id: row.request_id,

          sweet_id: row.sweet_id,

          sweet_name: row.sweet_name,

          unit: row.unit,

          // =====================================
          // QUANTITY INFORMATION
          // =====================================

          // Original requested quantity
          quantity: requestedQuantity,

          // Current order supplied quantity
          supplied_quantity: suppliedQuantity,

          // All child/reorder supplied quantity
          reorder_supplied_quantity: reorderSuppliedQuantity,

          // Shop Admin cancelled quantity
          cancelled_quantity: cancelledQuantity,

          // Final remaining
          remaining_quantity: remainingQuantity,

          // =====================================
          // REORDER INFO
          // =====================================

          parent_order_item_id: row.parent_order_item_id || null,

          remaining_action: row.remaining_action || "PENDING",

          remaining_action_on: row.remaining_action_on || null,

          // =====================================
          // COUNTER
          // =====================================

          counter_id: row.counter_id,

          counter_name: row.counter_name,

          location: row.location,

          // =====================================
          // SUPPLIER STATUS
          // =====================================

          item_status: row.item_status || "PENDING",

          reject_reason: row.reject_reason,
        });
      }
    }

    // =====================================
    // UPDATE RESOLUTION STATUS
    // =====================================
    //
    // Important:
    // Parent order RESOLVED only when
    // every original/root item has
    // remaining = 0.
    //
    // =====================================

    for (const order of Object.values(ordersMap)) {
      // Reorder child order ko parent
      // resolution calculation nahi karni.
      //
      // Parent order hi overall request
      // resolution maintain karega.

      if (order.order_type === "REORDER") {
        continue;
      }

      const hasRemaining = order.items.some(
        (item) => Number(item.remaining_quantity) > 0,
      );

      order.resolution_status = hasRemaining ? "OPEN" : "RESOLVED";
    }

    // =====================================
    // FINAL RESPONSE
    // =====================================

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

// test 3
// async function getCounterRequests(req, res) {
//   try {
//     const user = req.data;

//     const requestTable = schema + ".counter_requests";
//     const counterTable = schema + ".counters";
//     const sweetTable = schema + ".sweets";
//     const orderItemTable = schema + ".order_items";
//     const orderTable = schema + ".orders";

//     let conditions = ["1=1"];

//     // 🟡 COUNTER USER → own requests
//     if (user.user_role === "COUNTER_USER") {
//       conditions.push(`r.counter_id = '${user.counterId}'`);
//     }

//     // 🟠 SHOP ADMIN → all counters of shop
//     if (user.user_role === "SHOP_ADMIN") {
//       conditions.push(`c.shop_id = '${user.shopId}'`);
//     }

//     // 🔴 ADMIN → all requests

//     const whereClause = `WHERE ${conditions.join(" AND ")}`;

//     const result = await db_query.customQuery(`
//       SELECT
//         r.row_id,
//         r.quantity AS requested_quantity,
//         r.status,
//         oi.item_status as supplier_status,

//         COALESCE(
//           SUM(oi.supplied_quantity),
//           0
//         ) AS supplied_quantity,

//         GREATEST(
//           r.quantity - COALESCE(SUM(oi.supplied_quantity), 0),
//           0
//         ) AS pending_quantity,

//         TO_CHAR(r.cr_on, 'YYYY-MM-DD HH24:MI:SS') AS cr_on,

//         c.row_id AS counter_id,
//         c.counter_name,

//         s.row_id AS sweet_id,
//         s.sweet_name,
//         s.unit

//       FROM ${requestTable} r

//       LEFT JOIN ${counterTable} c
//         ON c.row_id = r.counter_id

//       LEFT JOIN ${sweetTable} s
//         ON s.row_id = r.sweet_id

//       LEFT JOIN ${orderItemTable} oi
//         ON oi.counter_id = r.counter_id
//         AND oi.sweet_id = r.sweet_id

//       LEFT JOIN ${orderTable} o
//         ON o.row_id = oi.order_id

//       ${whereClause}

//       GROUP BY
//         r.row_id,
//         r.quantity,
//         r.status,
//         oi.item_status,
//         r.cr_on,
//         c.row_id,
//         c.counter_name,
//         s.row_id,
//         s.sweet_name,
//         s.unit

//       ORDER BY r.cr_on DESC
//     `);

//     return libFunc.sendResponse(res, {
//       status: 0,
//       msg: "Counter requests fetched successfully",
//       data: result.data || [],
//     });
//   } catch (error) {
//     console.log("getCounterRequests error:", error);

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Something went wrong",
//       error: error.message,
//     });
//   }
// }

// async function getCounterRequests(req, res) {
//   try {
//     const user = req.data;

//     const requestTable = schema + ".counter_requests";
//     const counterTable = schema + ".counters";
//     const sweetTable = schema + ".sweets";
//     const orderItemTable = schema + ".order_items";
//     const orderTable = schema + ".orders";

//     let conditions = ["1=1"];

//     // 🟡 COUNTER USER → own requests
//     if (user.user_role === "COUNTER_USER") {
//       conditions.push(`r.counter_id = '${user.counterId}'`);
//     }

//     // 🟠 SHOP ADMIN → all counters of shop
//     if (user.user_role === "SHOP_ADMIN") {
//       conditions.push(`c.shop_id = '${user.shopId}'`);
//     }

//     // 🔴 ADMIN → all requests

//     const whereClause = `WHERE ${conditions.join(" AND ")}`;

//     const result = await db_query.customQuery(`
//       SELECT
//         r.row_id,

//         CONCAT('REQ-', r.id) AS requested_order,

//         -- Counter requested quantity
//         r.quantity AS requested_quantity,

//         r.status as shop_status,

//         -- Supplier item status
//         oi.item_status AS supplier_status,

//         -- Supplier supplied quantity
//         COALESCE(
//           SUM(oi.supplied_quantity),
//           0
//         ) AS supplied_quantity,

//         -- Remaining pending quantity
//         GREATEST(
//           r.quantity - COALESCE(SUM(oi.supplied_quantity), 0),
//           0
//         ) AS pending_quantity,

//         -- Full creation date/time
//         TO_CHAR(
//           r.cr_on,
//           'YYYY-MM-DD HH24:MI:SS'
//         ) AS cr_on,

//         -- 🔹 Group key
//         TO_CHAR(
//           r.cr_on,
//           'YYYY-MM-DD HH24:MI'
//         ) AS request_group,

//         c.row_id AS counter_id,
//         c.counter_name,

//         s.row_id AS sweet_id,
//         s.sweet_name,
//         s.unit

//       FROM ${requestTable} r

//       LEFT JOIN ${counterTable} c
//         ON c.row_id = r.counter_id

//       LEFT JOIN ${sweetTable} s
//         ON s.row_id = r.sweet_id

//       LEFT JOIN ${orderItemTable} oi
//         ON oi.counter_id = r.counter_id
//         AND oi.sweet_id = r.sweet_id

//       LEFT JOIN ${orderTable} o
//         ON o.row_id = oi.order_id

//       ${whereClause}

//       GROUP BY
//         r.row_id,
//         r.quantity,
//         r.status,
//         oi.item_status,
//         r.cr_on,

//         c.row_id,
//         c.counter_name,

//         s.row_id,
//         s.sweet_name,
//         s.unit

//       ORDER BY r.cr_on DESC
//     `);

//     const requests = result.data || [];

//     // 🔹 Group requests according to cr_on
//     const groupedRequests = {};

//     requests.forEach((item) => {
//       const groupKey = item.request_group;

//       if (!groupedRequests[groupKey]) {
//         groupedRequests[groupKey] = {
//           request_group: groupKey,
//           cr_on: groupKey,

//           total_requests: 0,
//           total_requested_quantity: 0,
//           total_supplied_quantity: 0,
//           total_pending_quantity: 0,

//           requests: [],
//         };
//       }

//       // Total request count
//       groupedRequests[groupKey].total_requests += 1;

//       // Total requested
//       groupedRequests[groupKey].total_requested_quantity += Number(
//         item.requested_quantity || 0,
//       );

//       // Total supplied
//       groupedRequests[groupKey].total_supplied_quantity += Number(
//         item.supplied_quantity || 0,
//       );

//       // Total pending
//       groupedRequests[groupKey].total_pending_quantity += Number(
//         item.pending_quantity || 0,
//       );

//       // Individual request
//       groupedRequests[groupKey].requests.push(item);
//     });

//     // 🔹 Convert object to array
//     const data = Object.values(groupedRequests);

//     return libFunc.sendResponse(res, {
//       status: 0,
//       msg: "Counter requests fetched successfully",
//       data,
//     });
//   } catch (error) {
//     console.log("getCounterRequests error:", error);

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Something went wrong",
//       error: error.message,
//     });
//   }
// }

// async function getCounterRequests(req, res) {
//   try {
//     const user = req.data;

//     const requestTable = schema + ".counter_requests";
//     const counterTable = schema + ".counters";
//     const sweetTable = schema + ".sweets";
//     const orderItemTable = schema + ".order_items";

//     let conditions = ["1=1"];

//     // =====================================================
//     // COUNTER USER → OWN REQUESTS
//     // =====================================================

//     if (user.user_role === "COUNTER_USER") {
//       conditions.push(`r.counter_id = '${user.counterId}'`);
//     }

//     // =====================================================
//     // SHOP ADMIN → ALL COUNTERS OF SHOP
//     // =====================================================

//     if (user.user_role === "SHOP_ADMIN") {
//       conditions.push(`c.shop_id = '${user.shopId}'`);
//     }

//     // =====================================================
//     // ADMIN → ALL REQUESTS
//     // =====================================================

//     const whereClause = `
//       WHERE ${conditions.join(" AND ")}
//     `;

//     // =====================================================
//     // FETCH REQUESTS
//     // =====================================================

//     const query = `
//       SELECT
//         r.row_id,

//         CONCAT(
//           'REQ-',
//           r.id
//         ) AS requested_order,

//         -- Counter requested quantity
//         r.quantity AS requested_quantity,

//         -- Counter request status
//         r.status AS shop_status,

//         -- Supplier item status
//         COALESCE(
//           oi.item_status,
//           'PENDING'
//         ) AS supplier_status,

//         -- Supplier supplied quantity
//         COALESCE(
//           oi.supplied_quantity,
//           0
//         ) AS supplied_quantity,

//         -- Remaining pending quantity
//         GREATEST(
//           r.quantity
//           -
//           COALESCE(
//             oi.supplied_quantity,
//             0
//           ),
//           0
//         ) AS pending_quantity,

//         -- Full creation date/time
//         TO_CHAR(
//           r.cr_on,
//           'YYYY-MM-DD HH24:MI:SS'
//         ) AS cr_on,

//         -- Group key
//         TO_CHAR(
//           r.cr_on,
//           'YYYY-MM-DD HH24:MI'
//         ) AS request_group,

//         -- Counter
//         c.row_id AS counter_id,
//         c.counter_name,

//         -- Sweet
//         s.row_id AS sweet_id,
//         s.sweet_name,
//         s.unit

//       FROM ${requestTable} r

//       LEFT JOIN ${counterTable} c
//         ON c.row_id = r.counter_id

//       LEFT JOIN ${sweetTable} s
//         ON s.row_id = r.sweet_id

//       -- IMPORTANT:
//       -- Match order_item with exact counter request.
//       LEFT JOIN ${orderItemTable} oi
//         ON oi.request_id = r.row_id

//       ${whereClause}

//       ORDER BY r.cr_on DESC
//     `;

//     console.log("getCounterRequests query:", query);

//     const result = await db_query.customQuery(query, "Get Counter Requests");

//     console.log("getCounterRequests result:", result);

//     const requests = result.data || [];

//     // =====================================================
//     // GROUP REQUESTS
//     // =====================================================

//     const groupedRequests = {};

//     requests.forEach((item) => {
//       const groupKey = item.request_group;

//       if (!groupedRequests[groupKey]) {
//         groupedRequests[groupKey] = {
//           request_group: groupKey,
//           cr_on: groupKey,

//           total_requests: 0,
//           total_requested_quantity: 0,
//           total_supplied_quantity: 0,
//           total_pending_quantity: 0,

//           requests: [],
//         };
//       }

//       // Request count
//       groupedRequests[groupKey].total_requests += 1;

//       // Requested quantity
//       groupedRequests[groupKey].total_requested_quantity += Number(
//         item.requested_quantity || 0,
//       );

//       // Supplied quantity
//       groupedRequests[groupKey].total_supplied_quantity += Number(
//         item.supplied_quantity || 0,
//       );

//       // Pending quantity
//       groupedRequests[groupKey].total_pending_quantity += Number(
//         item.pending_quantity || 0,
//       );

//       // Individual request
//       groupedRequests[groupKey].requests.push(item);
//     });

//     // =====================================================
//     // ARRAY RESPONSE
//     // =====================================================

//     const data = Object.values(groupedRequests);

//     return libFunc.sendResponse(res, {
//       status: 0,
//       msg: "Counter requests fetched successfully",
//       data,
//     });
//   } catch (error) {
//     console.log("getCounterRequests error:", error);

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Something went wrong",
//       error: error.message,
//     });
//   }
// }

async function getCounterRequests(req, res) {
  try {
    const user = req.data;

    const requestTable = schema + ".counter_requests";
    const counterTable = schema + ".counters";
    const sweetTable = schema + ".sweets";
    const orderTable = schema + ".orders";
    const orderItemTable = schema + ".order_items";
    const supplierTable = schema + ".suppliers";
    const chalanTable = schema + ".chalans";

    // =====================================================
    // ROLE CONDITIONS
    // =====================================================

    let conditions = ["1=1"];

    // COUNTER USER → OWN REQUESTS
    if (user.user_role === "COUNTER_USER") {
      if (!user.counterId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Counter ID not found",
        });
      }

      conditions.push(`r.counter_id = '${user.counterId}'`);
    }

    // SHOP ADMIN → ALL COUNTERS OF SHOP
    if (user.user_role === "SHOP_ADMIN") {
      if (!user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop ID not found",
        });
      }

      conditions.push(`c.shop_id = '${user.shopId}'`);
    }

    // ADMIN → ALL REQUESTS

    const whereClause = `
      WHERE ${conditions.join(" AND ")}
    `;

    // =====================================================
    // MAIN QUERY
    // =====================================================

    const query = `
      SELECT

        /* =================================================
           REQUEST DETAILS
        ================================================= */

        r.row_id,

        CONCAT(
          'REQ-',
          r.id
        ) AS requested_order,

        r.quantity::numeric AS requested_quantity,

        r.status AS shop_status,

        TO_CHAR(
          r.cr_on,
          'YYYY-MM-DD HH24:MI:SS'
        ) AS cr_on,

        TO_CHAR(
          r.cr_on,
          'YYYY-MM-DD HH24:MI'
        ) AS request_group,


        /* =================================================
           COUNTER
        ================================================= */

        c.row_id AS counter_id,

        c.counter_name,


        /* =================================================
           SWEET
        ================================================= */

        s.row_id AS sweet_id,

        s.sweet_name,

        s.unit,


        /* =================================================
           ORDER DETAILS
        ================================================= */

        oi.order_id,

        CASE
          WHEN o.id IS NOT NULL
          THEN CONCAT('ORD-', o.id)
          ELSE NULL
        END AS order_number,

        o.order_type,

        o.parent_order_id,

        o.order_status,

        o.resolution_status,


        /* =================================================
           SUPPLIER
        ================================================= */

        sup.row_id AS supplier_id,

        sup.supplier_name,


        /* =================================================
           CURRENT ORDER ITEM STATUS
        ================================================= */

        COALESCE(
          oi.item_status,
          'PENDING'
        ) AS supplier_status,

        COALESCE(
          oi.supplied_quantity,
          0
        )::numeric AS supplied_quantity,


        /* =================================================
           CANCELLED QUANTITY
        ================================================= */

        COALESCE(
          oi.cancelled_quantity,
          0
        )::numeric AS cancelled_quantity,


        /* =================================================
           REORDER SUPPLIED QUANTITY

           Original item ke against jitne bhi
           reorder items hain unka total
        ================================================= */

        COALESCE(
          (
            SELECT SUM(
              COALESCE(
                child.supplied_quantity,
                0
              )::numeric
            )
            FROM ${orderItemTable} child
            WHERE child.parent_order_item_id = oi.row_id
          ),
          0
        )::numeric AS reorder_supplied_quantity,


        /* =================================================
           TOTAL SUPPLIED

           Original supplied
           +
           Reorder supplied
        ================================================= */

        (
          COALESCE(
            oi.supplied_quantity,
            0
          )::numeric

          +

          COALESCE(
            (
              SELECT SUM(
                COALESCE(
                  child.supplied_quantity,
                  0
                )::numeric
              )
              FROM ${orderItemTable} child
              WHERE child.parent_order_item_id = oi.row_id
            ),
            0
          )::numeric
        ) AS total_supplied_quantity,


        /* =================================================
           REMAINING QUANTITY

           Requested
           - Original supplied
           - Reorder supplied
           - Cancelled
        ================================================= */

        GREATEST(

          r.quantity::numeric

          -

          COALESCE(
            oi.supplied_quantity,
            0
          )::numeric

          -

          COALESCE(
            (
              SELECT SUM(
                COALESCE(
                  child.supplied_quantity,
                  0
                )::numeric
              )
              FROM ${orderItemTable} child
              WHERE child.parent_order_item_id = oi.row_id
            ),
            0
          )::numeric

          -

          COALESCE(
            oi.cancelled_quantity,
            0
          )::numeric,

          0

        ) AS remaining_quantity,


        /* =================================================
           REMAINING ACTION
        ================================================= */

        COALESCE(
          oi.remaining_action,
          'PENDING'
        ) AS remaining_action,

        TO_CHAR(
          oi.remaining_action_on,
          'YYYY-MM-DD HH24:MI:SS'
        ) AS remaining_action_on,


        /* =================================================
           CURRENT ORDER CHALLAN
        ================================================= */

        ch.row_id AS chalan_id,

        CASE
          WHEN ch.row_id IS NOT NULL
          THEN TRUE
          ELSE FALSE
        END AS challan_created,

        COALESCE(
          ch.is_verified,
          FALSE
        ) AS challan_verified,

        CASE

          WHEN ch.row_id IS NULL
            THEN 'NOT_CREATED'

          WHEN ch.is_verified = TRUE
            THEN 'VERIFIED'

          ELSE 'PENDING_VERIFICATION'

        END AS challan_status,

        TO_CHAR(
          ch.dispatch_date,
          'YYYY-MM-DD HH24:MI:SS'
        ) AS dispatch_date,


        /* =================================================
           REORDER ORDERS

           Original/root item ke against
           saare reorder orders
        ================================================= */

        COALESCE(

          (
            SELECT json_agg(

              json_build_object(

                'order_id',
                child_order.row_id,

                'order_number',
                CONCAT(
                  'ORD-',
                  child_order.id
                ),

                'order_type',
                child_order.order_type,

                'parent_order_id',
                child_order.parent_order_id,

                'order_status',
                child_order.order_status,

                'resolution_status',
                child_order.resolution_status,

                'requested_quantity',
                child_item.quantity::numeric,

                'supplied_quantity',
                COALESCE(
                  child_item.supplied_quantity,
                  0
                )::numeric,

                'cancelled_quantity',
                COALESCE(
                  child_item.cancelled_quantity,
                  0
                )::numeric,

                'remaining_quantity',

                GREATEST(

                  child_item.quantity::numeric

                  -

                  COALESCE(
                    child_item.supplied_quantity,
                    0
                  )::numeric

                  -

                  COALESCE(
                    child_item.cancelled_quantity,
                    0
                  )::numeric,

                  0

                ),

                'item_status',
                COALESCE(
                  child_item.item_status,
                  'PENDING'
                ),

                'remaining_action',
                COALESCE(
                  child_item.remaining_action,
                  'PENDING'
                ),

                'chalan_id',
                child_ch.row_id,

                'challan_status',

                CASE

                  WHEN child_ch.row_id IS NULL
                    THEN 'NOT_CREATED'

                  WHEN child_ch.is_verified = TRUE
                    THEN 'VERIFIED'

                  ELSE 'PENDING_VERIFICATION'

                END,

                'dispatch_date',
                TO_CHAR(
                  child_ch.dispatch_date,
                  'YYYY-MM-DD HH24:MI:SS'
                ),

                'created_at',
                TO_CHAR(
                  child_order.cr_on,
                  'YYYY-MM-DD HH24:MI:SS'
                )

              )

              ORDER BY child_order.cr_on DESC

            )

            FROM ${orderItemTable} child_item

            INNER JOIN ${orderTable} child_order

              ON child_order.row_id =
                 child_item.order_id

            LEFT JOIN LATERAL (

              SELECT

                ch2.row_id,

                ch2.is_verified,

                ch2.dispatch_date

              FROM ${chalanTable} ch2

              WHERE ch2.order_id =
                    child_order.row_id

              ORDER BY ch2.cr_on DESC

              LIMIT 1

            ) child_ch ON TRUE

            WHERE child_item.parent_order_item_id =
                  oi.row_id

          ),

          '[]'::json

        ) AS reorder_orders,


        /* =================================================
           ORDER DATES
        ================================================= */

        TO_CHAR(
          o.cr_on,
          'YYYY-MM-DD HH24:MI:SS'
        ) AS order_created_at,

        TO_CHAR(
          o.up_on,
          'YYYY-MM-DD HH24:MI:SS'
        ) AS order_updated_at


      /* ===================================================
         TABLES
      =================================================== */

      FROM ${requestTable} r


      /* COUNTER */

      LEFT JOIN ${counterTable} c

        ON c.row_id =
           r.counter_id


      /* SWEET */

      LEFT JOIN ${sweetTable} s

        ON s.row_id =
           r.sweet_id


      /* ===================================================
         IMPORTANT

         Exact request → order_item

         Isse previous request ka supplier status
         new request mein nahi aayega.
      =================================================== */

      LEFT JOIN ${orderItemTable} oi

        ON oi.request_id =
           r.row_id


      /* ORDER */

      LEFT JOIN ${orderTable} o

        ON o.row_id =
           oi.order_id


      /* SUPPLIER */

      LEFT JOIN ${supplierTable} sup

        ON sup.row_id =
           o.supplier_id


      /* ===================================================
         LATEST CHALLAN OF CURRENT ORDER
      =================================================== */

      LEFT JOIN LATERAL (

        SELECT

          ch1.row_id,

          ch1.is_verified,

          ch1.dispatch_date

        FROM ${chalanTable} ch1

        WHERE ch1.order_id =
              o.row_id

        ORDER BY ch1.cr_on DESC

        LIMIT 1

      ) ch ON TRUE


      ${whereClause}


      ORDER BY r.cr_on DESC
    `;

    console.log("getCounterRequests query:", query);

    // =====================================================
    // EXECUTE
    // =====================================================

    const result = await db_query.customQuery(query, "Get Counter Requests");

    console.log("getCounterRequests result:", result);

    const requests = result.data || [];

    // =====================================================
    // GROUP REQUESTS
    // =====================================================

    const groupedRequests = {};

    requests.forEach((item) => {
      const groupKey = item.request_group;

      if (!groupedRequests[groupKey]) {
        groupedRequests[groupKey] = {
          request_group: groupKey,

          cr_on: groupKey,

          total_requests: 0,

          total_requested_quantity: 0,

          total_supplied_quantity: 0,

          total_pending_quantity: 0,

          requests: [],
        };
      }

      // ===================================================
      // REQUEST COUNT
      // ===================================================

      groupedRequests[groupKey].total_requests += 1;

      // ===================================================
      // REQUESTED
      // ===================================================

      groupedRequests[groupKey].total_requested_quantity += Number(
        item.requested_quantity || 0,
      );

      // ===================================================
      // TOTAL SUPPLIED
      // ===================================================

      groupedRequests[groupKey].total_supplied_quantity += Number(
        item.total_supplied_quantity || 0,
      );

      // ===================================================
      // TOTAL REMAINING
      // ===================================================

      groupedRequests[groupKey].total_pending_quantity += Number(
        item.remaining_quantity || 0,
      );

      // ===================================================
      // INDIVIDUAL REQUEST
      // ===================================================

      groupedRequests[groupKey].requests.push(item);
    });

    // =====================================================
    // FINAL DATA
    // =====================================================

    const data = Object.values(groupedRequests);

    return libFunc.sendResponse(res, {
      status: 0,

      msg: "Counter requests fetched successfully",

      data,
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
    const chalanTable = schema + ".chalans";
    const orderItemTable = schema + ".order_items";

    const { order_id, status } = req.data || {};
    const user = req.data;

    const validStatuses = [
      "PENDING",
      "ACCEPTED",
      "PARTIAL",
      "REJECTED",
      "DISPATCHED",
      "DELIVERED",
    ];

    // =========================
    // ROLE VALIDATION
    // =========================

    if (!["ADMIN", "SHOP_ADMIN", "SUPPLIER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // =========================
    // BASIC VALIDATION
    // =========================

    if (!order_id || !status) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order ID and status required",
      });
    }

    const orderId = order_id.trim();
    const finalStatus = status.trim().toUpperCase();

    if (!validStatuses.includes(finalStatus)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid status",
      });
    }

    // =========================
    // GET ORDER
    // =========================

    const orderCheck = await db_query.customQuery(`
      SELECT
        row_id,
        supplier_id,
        shop_id,
        order_status
      FROM ${orderTable}
      WHERE row_id = '${orderId.replaceAll("'", "`")}'
    `);

    if (!orderCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid order",
      });
    }

    const order = orderCheck.data[0];

    // =========================
    // SUPPLIER AUTHORIZATION
    // =========================

    if (user.user_role === "SUPPLIER") {
      if (!user.supplierId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Supplier ID not found in token",
        });
      }

      if (order.supplier_id !== user.supplierId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Unauthorized order",
        });
      }

      // Supplier should not mark delivered.
      // Partial should normally be handled at item level.
      if (!["ACCEPTED", "REJECTED", "DISPATCHED"].includes(finalStatus)) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Supplier cannot set this status",
        });
      }
    }

    // =========================
    // SHOP ADMIN AUTHORIZATION
    // =========================

    if (user.user_role === "SHOP_ADMIN") {
      if (!user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop ID not found in token",
        });
      }

      if (order.shop_id !== user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Unauthorized shop order",
        });
      }

      if (finalStatus !== "DELIVERED") {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop admin can only mark delivered",
        });
      }
    }

    // =========================
    // STATUS FLOW
    // =========================

    const currentStatus = order.order_status;

    const validFlow = {
      PENDING: ["ACCEPTED", "REJECTED"],

      ACCEPTED: ["DISPATCHED"],

      DISPATCHED: ["DELIVERED"],

      PARTIAL: ["DISPATCHED"],
    };

    if (
      validFlow[currentStatus] &&
      !validFlow[currentStatus].includes(finalStatus)
    ) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: `Invalid status transition from ${currentStatus} → ${finalStatus}`,
      });
    }

    // =========================
    // DISPATCHED → CHALAN REQUIRED
    // =========================

    if (finalStatus === "DISPATCHED") {
      const existingChalan = await db_query.customQuery(`
        SELECT row_id
        FROM ${chalanTable}
        WHERE order_id = '${orderId.replaceAll("'", "`")}'
      `);

      if (!existingChalan.data?.length) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Chalan not created yet. Please create chalan first.",
        });
      }
    }

    // =========================
    // UPDATE ORDER
    // =========================

    await db_query.addData(
      orderTable,
      {
        order_status: finalStatus,
      },
      orderId,
      "Order",
    );

    // =========================
    // NOTIFY SHOP ADMIN
    // =========================

    const shopAdmins = await db_query.customQuery(`
      SELECT row_id
      FROM ${userTable}
      WHERE role = 'SHOP_ADMIN'
      AND shop_id = '${order.shop_id}'
    `);

    if (shopAdmins.data?.length) {
      for (const admin of shopAdmins.data) {
        await createNotification({
          user_id: admin.row_id,
          title: "Order Status Updated",
          message: `Order is ${finalStatus}`,
          type: "ORDER",
          reference_id: orderId,
        });
      }
    }

    // =========================
    // NOTIFY SUPPLIER USERS
    // =========================

    const supplierUsers = await db_query.customQuery(`
      SELECT row_id
      FROM ${userTable}
      WHERE supplier_id = '${order.supplier_id}'
    `);

    if (supplierUsers.data?.length) {
      for (const supplierUser of supplierUsers.data) {
        await createNotification({
          user_id: supplierUser.row_id,
          title: "Order Update",
          message: `Order is ${finalStatus}`,
          type: "ORDER",
          reference_id: orderId,
        });
      }
    }

    // =========================
    // NOTIFY COUNTER USERS
    // =========================

    /*
      IMPORTANT:

      Do NOT find counter users using only sweet_id.

      order_items.request_id directly identifies
      the original counter request.
    */

    const counterUsers = await db_query.customQuery(`
      SELECT DISTINCT
        u.row_id
      FROM ${orderItemTable} oi

      INNER JOIN ${schema}.counter_requests r
        ON r.row_id = oi.request_id

      INNER JOIN ${userTable} u
        ON u.counter_id = r.counter_id

      WHERE oi.order_id = '${orderId.replaceAll("'", "`")}'
    `);

    if (counterUsers.data?.length) {
      for (const counterUser of counterUsers.data) {
        await createNotification({
          user_id: counterUser.row_id,
          title: "Order Update",
          message: `Your requested items are ${finalStatus}`,
          type: "ORDER",
          reference_id: orderId,
        });
      }
    }

    // =========================
    // RESPONSE
    // =========================

    return libFunc.sendResponse(res, {
      status: 0,
      msg: `Order ${finalStatus} successfully`,
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
    const counterTable = schema + ".counters";

    // =========================
    // ROLE VALIDATION
    // =========================

    if (!["SUPPLIER", "SHOP_ADMIN", "ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let conditions = [];

    // =========================
    // SUPPLIER
    // =========================

    if (user.user_role === "SUPPLIER") {
      if (!user.supplierId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Supplier ID not found in token",
        });
      }

      conditions.push(`ch.supplier_id = '${user.supplierId}'`);
    }

    // =========================
    // SHOP ADMIN
    // =========================

    if (user.user_role === "SHOP_ADMIN") {
      if (!user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop ID not found in token",
        });
      }

      conditions.push(`o.shop_id = '${user.shopId}'`);
    }

    // =========================
    // ADMIN
    // =========================
    // ADMIN can see all chalans

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // =========================
    // FETCH CHALANS
    // =========================

    const result = await db_query.customQuery(`
      SELECT

        -- Chalan
        ch.row_id AS chalan_id,
        ch.order_id,
        ch.dispatch_date::date::text AS dispatch_date,
        ch.transport_details,
        ch.is_verified,
        ch.verification_code,

        -- Order
        o.order_status,
        o.order_date,

        -- Shop
        sh.row_id AS shop_id,
        sh.shop_name,
        sh.city,
        sh.state,

        -- Supplier
        sup.row_id AS supplier_id,
        sup.supplier_name,

        -- Order Item
        oi.row_id AS order_item_id,
        oi.request_id,
        oi.sweet_id,
        oi.quantity AS requested_quantity,
        oi.item_status,
        oi.supplied_quantity,
        oi.reject_reason,

        -- Counter
        oi.counter_id,
        c.counter_name,
        c.location,

        -- Sweet
        s.sweet_name,
        s.unit

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

      LEFT JOIN ${counterTable} c
        ON c.row_id = oi.counter_id

      ${where}

      -- Only actually supplied items
      AND oi.supplied_quantity > 0

      ORDER BY ch.cr_on DESC
    `);

    // =========================
    // GROUP CHALAN-WISE
    // =========================

    const chalanMap = {};

    for (const row of result.data || []) {
      if (!chalanMap[row.chalan_id]) {
        chalanMap[row.chalan_id] = {
          chalan_id: row.chalan_id,

          order_id: row.order_id,
          order_status: row.order_status,
          order_date: row.order_date,

          dispatch_date: row.dispatch_date,
          transport_details: row.transport_details,

          is_verified: row.is_verified,

          // ⚠️ Consider hiding this from normal responses
          verification_code: row.verification_code,

          shop: {
            shop_id: row.shop_id,
            shop_name: row.shop_name,
            city: row.city,
            state: row.state,
          },

          supplier: {
            supplier_id: row.supplier_id,
            supplier_name: row.supplier_name,
          },

          items: [],
        };
      }

      if (row.order_item_id) {
        chalanMap[row.chalan_id].items.push({
          order_item_id: row.order_item_id,
          request_id: row.request_id,

          sweet_id: row.sweet_id,
          sweet_name: row.sweet_name,
          unit: row.unit,

          requested_quantity: Number(row.requested_quantity || 0),

          supplied_quantity: Number(row.supplied_quantity || 0),

          item_status: row.item_status || "PENDING",

          reject_reason: row.reject_reason,

          counter: {
            counter_id: row.counter_id,
            counter_name: row.counter_name,
            location: row.location,
          },
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
    const counterTable = schema + ".counters";
    const supplierTable = schema + ".suppliers";

    const { supplier_id } = req.data || {};
    const user = req.data;

    console.log("getSupplierOrders user:", user);

    // =========================
    // ROLE VALIDATION
    // =========================
    if (!["SUPPLIER", "ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let conditions = [];

    // =========================
    // SUPPLIER
    // =========================
    if (user.user_role === "SUPPLIER") {
      if (!user.supplierId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Supplier ID not found in token",
        });
      }

      conditions.push(`o.supplier_id = '${user.supplierId}'`);
    }

    // =========================
    // ADMIN
    // =========================
    if (user.user_role === "ADMIN") {
      if (!supplier_id) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Supplier ID required",
        });
      }

      conditions.push(
        `o.supplier_id = '${supplier_id.trim().replaceAll("'", "`")}'`,
      );
    }

    // =========================
    // SHOP ADMIN
    // =========================
    if (user.user_role === "SHOP_ADMIN") {
      if (!user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop ID not found in token",
        });
      }

      conditions.push(`o.shop_id = '${user.shopId}'`);
    }

    const whereCondition =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // =========================
    // FETCH ORDERS
    // =========================
    const result = await db_query.customQuery(`
      SELECT

        -- =========================
        -- ORDER
        -- =========================
        o.row_id AS order_id,
        o.order_status,
        o.order_date,

        o.order_type,
        o.parent_order_id,
        o.resolution_status,

        -- =========================
        -- SUPPLIER
        -- =========================
        sup.row_id AS supplier_id,
        sup.supplier_name,

        -- =========================
        -- SHOP
        -- =========================
        sh.row_id AS shop_id,
        sh.shop_name,
        sh.city,
        sh.state,

        -- =========================
        -- ORDER ITEM
        -- =========================
        oi.row_id AS order_item_id,
        oi.request_id,

        oi.sweet_id,
        oi.quantity,

        -- =========================
        -- ITEM PROCESSING
        -- =========================
        oi.item_status,
        oi.supplied_quantity,
        oi.reject_reason,

        -- =========================
        -- REORDER FIELDS
        -- =========================
        oi.parent_order_item_id,
        oi.cancelled_quantity,
        oi.remaining_action,
        oi.remaining_action_on,

        -- =========================
        -- COUNTER
        -- =========================
        oi.counter_id,
        c.counter_name,
        c.location,

        -- =========================
        -- SWEET
        -- =========================
        s.sweet_name,
        s.unit,

        -- =========================
        -- REORDER SUPPLIED QUANTITY
        -- =========================
        COALESCE(
          (
            SELECT SUM(
              COALESCE(child.supplied_quantity, 0)
            )
            FROM ${itemTable} child
            WHERE child.parent_order_item_id = oi.row_id
          ),
          0
        ) AS reorder_supplied_quantity,

        -- =========================
        -- REMAINING QUANTITY
        -- =========================
        GREATEST(
          0,

          -- ORIGINAL QUANTITY
          COALESCE(
            NULLIF(TRIM(oi.quantity), '')::numeric,
            0
          )

          -

          -- CURRENT ORDER SUPPLIED
          COALESCE(
            oi.supplied_quantity,
            0
          )

          -

          -- REORDER SUPPLIED
          COALESCE(
            (
              SELECT SUM(
                COALESCE(child.supplied_quantity, 0)
              )
              FROM ${itemTable} child
              WHERE child.parent_order_item_id = oi.row_id
            ),
            0
          )

          -

          -- CANCELLED QUANTITY
          COALESCE(
            oi.cancelled_quantity,
            0
          )

        ) AS remaining_quantity

      FROM ${orderTable} o

      -- =========================
      -- SHOP
      -- =========================
      LEFT JOIN ${shopTable} sh
        ON sh.row_id = o.shop_id

      -- =========================
      -- SUPPLIER
      -- =========================
      LEFT JOIN ${supplierTable} sup
        ON sup.row_id = o.supplier_id

      -- =========================
      -- ORDER ITEMS
      -- =========================
      LEFT JOIN ${itemTable} oi
        ON oi.order_id = o.row_id

      -- =========================
      -- SWEET
      -- =========================
      LEFT JOIN ${sweetTable} s
        ON s.row_id = oi.sweet_id

      -- =========================
      -- COUNTER
      -- =========================
      LEFT JOIN ${counterTable} c
        ON c.row_id = oi.counter_id

      ${whereCondition}

      ORDER BY
        o.order_date DESC,
        oi.cr_on ASC
    `);

    // =========================
    // HANDLE DB RESULT
    // =========================
    const rows = Array.isArray(result) ? result : result.data || [];

    // =========================
    // NO DATA
    // =========================
    if (rows.length === 0) {
      return libFunc.sendResponse(res, {
        status: 0,
        msg: "No orders found",
        data: [],
      });
    }

    // =========================
    // GROUP ORDERS
    // =========================
    const ordersMap = {};

    for (const row of rows) {
      // =========================
      // CREATE ORDER
      // =========================
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          order_id: row.order_id,
          order_status: row.order_status,
          order_date: row.order_date,

          // REORDER
          order_type: row.order_type || "NORMAL",
          parent_order_id: row.parent_order_id || null,
          resolution_status: row.resolution_status || "OPEN",

          // =========================
          // SUPPLIER
          // =========================
          supplier: {
            supplier_id: row.supplier_id,
            supplier_name: row.supplier_name,
          },

          // =========================
          // SHOP
          // =========================
          shop: {
            shop_id: row.shop_id,
            shop_name: row.shop_name,
            city: row.city,
            state: row.state,
          },

          items: [],
        };
      }

      // =========================
      // ADD ITEM
      // =========================
      if (row.order_item_id) {
        const requestedQuantity = Number(row.quantity || 0);

        const suppliedQuantity = Number(row.supplied_quantity || 0);

        const reorderSuppliedQuantity = Number(
          row.reorder_supplied_quantity || 0,
        );

        const cancelledQuantity = Number(row.cancelled_quantity || 0);

        const remainingQuantity = Math.max(
          0,
          Number(row.remaining_quantity || 0),
        );

        ordersMap[row.order_id].items.push({
          // =========================
          // ORDER ITEM
          // =========================
          order_item_id: row.order_item_id,
          request_id: row.request_id,

          // =========================
          // REORDER RELATION
          // =========================
          parent_order_item_id: row.parent_order_item_id || null,

          // =========================
          // SWEET
          // =========================
          sweet_id: row.sweet_id,
          sweet_name: row.sweet_name,
          unit: row.unit,

          // =========================
          // QUANTITY
          // =========================
          quantity: requestedQuantity,

          // =========================
          // COUNTER
          // =========================
          counter_id: row.counter_id,
          counter_name: row.counter_name,
          location: row.location,

          // =========================
          // SUPPLIER PROCESSING
          // =========================
          item_status: row.item_status || "PENDING",

          supplied_quantity: suppliedQuantity,

          reject_reason: row.reject_reason,

          // =========================
          // REORDER
          // =========================
          reorder_supplied_quantity: reorderSuppliedQuantity,

          cancelled_quantity: cancelledQuantity,

          remaining_quantity: remainingQuantity,

          remaining_action: row.remaining_action || "PENDING",

          remaining_action_on: row.remaining_action_on || null,
        });
      }
    }

    // =========================
    // FINAL DATA
    // =========================
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
    const { order_id } = req.data || {};

    if (!order_id) {
      return res.status(400).send("Order ID required");
    }

    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";
    const sweetTable = schema + ".sweets";
    const supplierTable = schema + ".suppliers";
    const counterTable = schema + ".counters";
    const shopTable = schema + ".shops";

    const safeOrderId = order_id.trim().replaceAll("'", "`");

    // ==============================
    // FETCH ORDER DATA
    // ==============================

    const result = await db_query.customQuery(`
      SELECT
        o.row_id AS order_id,
        o.order_date,
        o.order_status,

        -- Supplier
        sup.row_id AS supplier_id,
        sup.supplier_name,
        sup.phone AS supplier_phone,
        sup.email AS supplier_email,
        sup.address AS supplier_address,

        -- Shop
        sh.row_id AS shop_id,
        sh.shop_name,
        sh.address AS shop_address,
        sh.city,
        sh.state,
        sh.pincode,
        sh.phone AS shop_phone,

        -- Order Item
        oi.row_id AS order_item_id,
        oi.request_id,
        oi.quantity,
        oi.supplied_quantity,
        oi.item_status,
        oi.reject_reason,

        -- Sweet
        sw.row_id AS sweet_id,
        sw.sweet_name,
        sw.unit,
        sw.price,

        -- Counter
        c.row_id AS counter_id,
        c.counter_name,
        c.location

      FROM ${orderTable} o

      LEFT JOIN ${supplierTable} sup
        ON sup.row_id = o.supplier_id

      LEFT JOIN ${shopTable} sh
        ON sh.row_id = o.shop_id

      LEFT JOIN ${itemTable} oi
        ON oi.order_id = o.row_id

      LEFT JOIN ${sweetTable} sw
        ON sw.row_id = oi.sweet_id

      LEFT JOIN ${counterTable} c
        ON c.row_id = oi.counter_id

      WHERE o.row_id = '${safeOrderId}'

      ORDER BY oi.cr_on ASC
    `);

    if (!result.data || result.data.length === 0) {
      return res.status(404).send("Order not found");
    }

    const data = result.data;
    const order = data[0];

    // ==============================
    // PDF FOLDER
    // ==============================

    const orgFolder = path.join("./public/uploads", "ShopMedia");

    if (!fs.existsSync(orgFolder)) {
      fs.mkdirSync(orgFolder, {
        recursive: true,
      });
    }

    // ==============================
    // FILE
    // ==============================

    const fileName = `Report_${Date.now()}.pdf`;

    const filePath = path.join(orgFolder, fileName);

    // ==============================
    // CREATE PDF
    // ==============================

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
    });

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=order_${order_id}.pdf`,
    );

    doc.pipe(fs.createWriteStream(filePath));

    // ==============================
    // HEADER
    // ==============================

    doc.fontSize(18).fillColor("#2c3e50").text("PURCHASE ORDER", {
      align: "center",
    });

    doc.moveDown(0.5);

    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    doc.moveDown();

    // ==============================
    // ORDER INFO
    // ==============================

    doc.fontSize(11).fillColor("#000");

    doc.text(`Order ID: ${order.order_id}`);

    doc.text(
      `Date: ${
        order.order_date ? new Date(order.order_date).toLocaleDateString() : "-"
      }`,
    );

    doc.text(`Status: ${order.order_status || "-"}`);

    doc.moveDown();

    // ==============================
    // SHOP DETAILS
    // ==============================

    doc.fontSize(12).fillColor("#34495e").text("Shop Details", {
      underline: true,
    });

    doc.moveDown(0.3);

    doc.fontSize(10).fillColor("#000");

    doc.text(`Name: ${order.shop_name || "-"}`);

    doc.text(`Address: ${order.shop_address || "-"}`);

    doc.text(`City: ${order.city || "-"}`);

    doc.text(`State: ${order.state || "-"}`);

    doc.text(`Pincode: ${order.pincode || "-"}`);

    doc.text(`Phone: ${order.shop_phone || "-"}`);

    doc.moveDown();

    // ==============================
    // SUPPLIER DETAILS
    // ==============================

    doc.fontSize(12).fillColor("#34495e").text("Supplier Details", {
      underline: true,
    });

    doc.moveDown(0.3);

    doc.fontSize(10).fillColor("#000");

    doc.text(`Name: ${order.supplier_name || "-"}`);

    doc.text(`Phone: ${order.supplier_phone || "-"}`);

    doc.text(`Email: ${order.supplier_email || "-"}`);

    doc.text(`Address: ${order.supplier_address || "-"}`);

    doc.moveDown();

    // ==============================
    // ITEMS
    // ==============================

    doc.fontSize(12).fillColor("#000").text("Order Items", {
      underline: true,
    });

    doc.moveDown(0.5);

    const col1 = 45; // Sweet
    const col2 = 210; // Counter
    const col3 = 350; // Requested
    const col4 = 420; // Supplied
    const col5 = 490; // Unit

    let tableTop = doc.y;

    // ==============================
    // TABLE HEADER
    // ==============================

    doc.rect(40, tableTop, 515, 22).fill("#f2f2f2");

    doc.fillColor("#000").fontSize(9);

    doc.text("Sweet", col1, tableTop + 6);

    doc.text("Counter", col2, tableTop + 6);

    doc.text("Requested", col3, tableTop + 6);

    doc.text("Supplied", col4, tableTop + 6);

    doc.text("Unit", col5, tableTop + 6);

    let y = tableTop + 28;

    // ==============================
    // TABLE ROWS
    // ==============================

    data.forEach((item, index) => {
      // Prevent rows from going outside page
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      if (index % 2 === 0) {
        doc.rect(40, y - 3, 515, 22).fill("#fafafa");
      }

      doc.fillColor("#000").fontSize(8);

      doc.text(item.sweet_name || "-", col1, y, {
        width: 155,
      });

      doc.text(item.counter_name || "-", col2, y, {
        width: 130,
      });

      doc.text(Number(item.quantity || 0).toString(), col3, y);

      doc.text(Number(item.supplied_quantity || 0).toString(), col4, y);

      doc.text(item.unit || "-", col5, y);

      y += 22;
    });

    // ==============================
    // SUMMARY
    // ==============================

    doc.moveDown(2);

    const totalRequested = data.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    const totalSupplied = data.reduce(
      (sum, item) => sum + Number(item.supplied_quantity || 0),
      0,
    );

    doc.fontSize(10).fillColor("#000");

    doc.text(`Total Requested Quantity: ${totalRequested}`);

    doc.text(`Total Supplied Quantity: ${totalSupplied}`);

    doc.moveDown();

    // ==============================
    // FOOTER
    // ==============================

    doc
      .fontSize(9)
      .fillColor("gray")
      .text("This is a system generated document.", {
        align: "center",
      });

    doc.end();

    // ==============================
    // FILE URL
    // ==============================

    const fileUrl = `uploads/ShopMedia/${fileName}`;

    const serverUrl = "https://stock-mangments.onrender.com/";

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "PDF generated successfully",
      filePath: serverUrl + fileUrl,
    });
  } catch (error) {
    console.log("downloadOrderPDF error:", error);

    return res.status(500).send("Error generating PDF");
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
//     const serverUrl = "https://api.joswee.cloud";

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
    const { chalan_id } = req.data || {};

    if (!chalan_id) {
      return res.status(400).send("Chalan ID required");
    }

    const chalanTable = schema + ".chalans";
    const orderTable = schema + ".orders";
    const supplierTable = schema + ".suppliers";
    const shopTable = schema + ".shops";
    const itemTable = schema + ".order_items";
    const sweetTable = schema + ".sweets";
    const categoryTable = schema + ".categories";
    const counterTable = schema + ".counters";

    const safeChalanId = chalan_id.trim().replaceAll("'", "`");

    // ================= QUERY =================

    const result = await db_query.customQuery(`
      SELECT

        -- Chalan
        ch.id AS chalan_serial_id,
        ch.row_id AS chalan_id,
        ch.dispatch_date,
        ch.transport_details,
        ch.verification_code,
        ch.is_verified,

        -- Order
        o.id AS order_serial_id,
        o.row_id AS order_id,
        o.order_status,

        -- Supplier
        sup.row_id AS supplier_id,
        sup.supplier_name,
        sup.phone AS supplier_phone,
        sup.address AS supplier_address,

        -- Shop
        sh.row_id AS shop_id,
        sh.shop_name,
        sh.city,
        sh.state,
        sh.address AS shop_address,
        sh.phone AS shop_phone,

        -- Order Item
        oi.row_id AS order_item_id,
        oi.request_id,
        oi.sweet_id,
        oi.counter_id,
        oi.quantity AS ordered_quantity,
        oi.supplied_quantity,
        oi.item_status,

        -- Sweet
        sw.sweet_name,
        sw.unit,

        -- Category
        cat.row_id AS category_id,
        cat.category_name,

        -- Counter
        c.counter_name,
        c.location AS counter_location

      FROM ${chalanTable} ch

      INNER JOIN ${orderTable} o
        ON o.row_id = ch.order_id

      LEFT JOIN ${supplierTable} sup
        ON sup.row_id = ch.supplier_id

      LEFT JOIN ${shopTable} sh
        ON sh.row_id = o.shop_id

      INNER JOIN ${itemTable} oi
        ON oi.order_id = o.row_id
        AND oi.item_status IN ('ACCEPTED', 'PARTIAL')
        AND oi.supplied_quantity > 0

      LEFT JOIN ${sweetTable} sw
        ON sw.row_id = oi.sweet_id

      LEFT JOIN ${categoryTable} cat
        ON cat.row_id = sw.category_id

      LEFT JOIN ${counterTable} c
        ON c.row_id = oi.counter_id

      WHERE ch.row_id = '${safeChalanId}'

      ORDER BY
        c.counter_name ASC,
        cat.category_name ASC,
        sw.sweet_name ASC
    `);

    if (!result.data?.length) {
      return res
        .status(404)
        .send("Chalan not found or no accepted supplied items found");
    }

    const data = result.data;
    const firstRow = data[0];

    // ================= DISPLAY IDS =================

    const chalanDisplayId = `CHL-${String(firstRow.chalan_serial_id).padStart(6, "0")}`;

    const orderDisplayId = `ORD-${String(firstRow.order_serial_id).padStart(6, "0")}`;

    // ================= GROUPING =================

    const groupedData = {};

    data.forEach((item) => {
      const counter = item.counter_name || "Default Counter";

      const category = item.category_name || "Others";

      if (!groupedData[counter]) {
        groupedData[counter] = {};
      }

      if (!groupedData[counter][category]) {
        groupedData[counter][category] = [];
      }

      groupedData[counter][category].push(item);
    });

    // ================= FILE SETUP =================
    // const BASE_UPLOAD_PATH = "./public/uploads";
    const BASE_UPLOAD_PATH = "/home/uploads";

    const folder = path.join(BASE_UPLOAD_PATH, "ShopMedia");

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, {
        recursive: true,
      });
    }

    const fileName = `Chalan_${Date.now()}.pdf`;

    const filePath = path.join(folder, fileName);

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
    });

    doc.pipe(fs.createWriteStream(filePath));

    const startX = 40;

    const colWidths = {
      name: 230,
      qty: 90,
      unit: 70,
      status: 90,
    };

    const rowHeight = 20;

    let isFirstPage = true;

    // ================= COUNTER LOOP =================

    for (const counter of Object.keys(groupedData)) {
      if (!isFirstPage) {
        doc.addPage();
      }

      isFirstPage = false;

      // ================= HEADER =================

      doc
        .fontSize(16)
        .fillColor("#2c3e50")
        .font("Helvetica-Bold")
        .text("DISPATCH CHALAN", {
          align: "center",
        });

      doc.moveDown(0.5);

      doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

      doc.moveDown();

      // ================= BASIC INFO =================

      doc.fontSize(10).fillColor("#000").font("Helvetica");

      doc.text(`Chalan ID: ${chalanDisplayId}`);

      doc.text(`Order ID: ${orderDisplayId}`);

      doc
        .font("Helvetica-Bold")
        .text(`Verification Code: ${firstRow.verification_code || "-"}`)
        .font("Helvetica");

      doc.text(
        `Dispatch Date: ${
          firstRow.dispatch_date
            ? new Date(firstRow.dispatch_date).toLocaleDateString()
            : "-"
        }`,
      );

      doc.text(
        `Chalan Status: ${
          firstRow.is_verified ? "VERIFIED" : "PENDING VERIFICATION"
        }`,
      );

      doc.moveDown();

      // ================= SUPPLIER =================

      doc
        .fontSize(11)
        .fillColor("#34495e")
        .font("Helvetica-Bold")
        .text("Supplier Details", {
          underline: true,
        });

      doc.moveDown(0.3).fontSize(10).font("Helvetica").fillColor("#000");

      doc.text(`Name: ${firstRow.supplier_name || "-"}`);

      doc.text(`Phone: ${firstRow.supplier_phone || "-"}`);

      doc.text(`Address: ${firstRow.supplier_address || "-"}`);

      doc.moveDown();

      // ================= SHOP =================

      doc
        .fontSize(11)
        .fillColor("#34495e")
        .font("Helvetica-Bold")
        .text("Shop Details", {
          underline: true,
        });

      doc.moveDown(0.3).fontSize(10).font("Helvetica").fillColor("#000");

      doc.text(`Shop Name: ${firstRow.shop_name || "-"}`);

      doc.text(`Phone: ${firstRow.shop_phone || "-"}`);

      doc.text(`Address: ${firstRow.shop_address || "-"}`);

      doc.text(`City: ${firstRow.city || "-"}, ${firstRow.state || "-"}`);

      doc.moveDown();

      // ================= TRANSPORT =================

      doc
        .fontSize(11)
        .fillColor("#34495e")
        .font("Helvetica-Bold")
        .text("Transport Details", {
          underline: true,
        });

      doc.moveDown(0.3).fontSize(10).font("Helvetica").fillColor("#000");

      doc.text(firstRow.transport_details || "-");

      doc.moveDown();

      // ================= COUNTER =================

      const counterItems = Object.values(groupedData[counter]).flat();

      const counterLocation = counterItems[0]?.counter_location;

      doc
        .fontSize(13)
        .fillColor("#2980b9")
        .font("Helvetica-Bold")
        .text(`Counter: ${counter}`);

      if (counterLocation) {
        doc
          .fontSize(9)
          .fillColor("#555")
          .font("Helvetica")
          .text(`Location: ${counterLocation}`);
      }

      doc.moveDown(0.5);

      // ================= CATEGORY LOOP =================

      for (const category of Object.keys(groupedData[counter])) {
        doc
          .fontSize(11)
          .fillColor("#8e44ad")
          .font("Helvetica-Bold")
          .text(`Category: ${category}`);

        doc.moveDown(0.3);

        let y = doc.y;

        // ================= TABLE HEADER =================

        doc.rect(startX, y, 500, rowHeight).fill("#f2f2f2");

        doc.fillColor("#000").fontSize(9).font("Helvetica-Bold");

        doc.text("Sweet Name", startX + 5, y + 5, {
          width: colWidths.name,
        });

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
          {
            width: colWidths.status,
            align: "center",
          },
        );

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

          doc.text(
            item.item_status || "ACCEPTED",
            startX + colWidths.name + colWidths.qty + colWidths.unit,
            y + 5,
            {
              width: colWidths.status,
              align: "center",
            },
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
      }

      // ================= FOOTER =================

      doc.moveDown(2);

      doc
        .fontSize(9)
        .fillColor("gray")
        .font("Helvetica")
        .text("This is a system generated document.", {
          align: "center",
        });
    }

    // ================= END PDF =================

    doc.end();

    // ================= RESPONSE =================

    const fileUrl = `/uploads/ShopMedia/${fileName}`;

    const serverUrl = "https://api.joswee.cloud";

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

// async function downloadChalanPDF(req, res) {
//   try {
//     const { chalan_id } = req.data || {};

//     if (!chalan_id) {
//       return res.status(400).send("Chalan ID required");
//     }

//     const chalanTable = schema + ".chalans";
//     const orderTable = schema + ".orders";
//     const supplierTable = schema + ".suppliers";
//     const shopTable = schema + ".shops";
//     const itemTable = schema + ".order_items";
//     const sweetTable = schema + ".sweets";
//     const categoryTable = schema + ".categories";
//     const counterTable = schema + ".counters";

//     // Safe SQL string
//     const safeChalanId = chalan_id.trim().replaceAll("'", "''");

//     // ============================================================
//     // QUERY
//     // ============================================================

//     const result = await db_query.customQuery(`
//       SELECT

//         -- Chalan
//         ch.id AS chalan_serial_id,
//         ch.row_id AS chalan_id,
//         ch.dispatch_date,
//         ch.transport_details,
//         ch.verification_code,
//         ch.is_verified,

//         -- Order
//         o.id AS order_serial_id,
//         o.row_id AS order_id,
//         o.order_status,

//         -- Supplier
//         sup.row_id AS supplier_id,
//         sup.supplier_name,
//         sup.phone AS supplier_phone,
//         sup.address AS supplier_address,

//         -- Shop
//         sh.row_id AS shop_id,
//         sh.shop_name,
//         sh.city,
//         sh.state,
//         sh.address AS shop_address,
//         sh.phone AS shop_phone,

//         -- Order Item
//         oi.row_id AS order_item_id,
//         oi.request_id,
//         oi.sweet_id,
//         oi.counter_id,
//         oi.quantity AS ordered_quantity,
//         oi.supplied_quantity,
//         oi.item_status,

//         -- Sweet
//         sw.sweet_name,
//         sw.unit,

//         -- Category
//         cat.row_id AS category_id,
//         cat.category_name,

//         -- Counter
//         c.counter_name,
//         c.location AS counter_location

//       FROM ${chalanTable} ch

//       INNER JOIN ${orderTable} o
//         ON o.row_id = ch.order_id

//       LEFT JOIN ${supplierTable} sup
//         ON sup.row_id = ch.supplier_id

//       LEFT JOIN ${shopTable} sh
//         ON sh.row_id = o.shop_id

//       INNER JOIN ${itemTable} oi
//         ON oi.order_id = o.row_id
//         AND oi.item_status = 'ACCEPTED'
//         AND oi.supplied_quantity > 0

//       LEFT JOIN ${sweetTable} sw
//         ON sw.row_id = oi.sweet_id

//       LEFT JOIN ${categoryTable} cat
//         ON cat.row_id = sw.category_id

//       LEFT JOIN ${counterTable} c
//         ON c.row_id = oi.counter_id

//       WHERE ch.row_id = '${safeChalanId}'

//       ORDER BY
//         c.counter_name ASC,
//         cat.category_name ASC,
//         sw.sweet_name ASC
//     `);

//     if (!result.data?.length) {
//       return res
//         .status(404)
//         .send("Chalan not found or no accepted supplied items found");
//     }

//     const data = result.data;
//     const firstRow = data[0];

//     // ============================================================
//     // DISPLAY IDS
//     // ============================================================

//     const chalanDisplayId = `CHL-${String(firstRow.chalan_serial_id).padStart(6, "0")}`;

//     const orderDisplayId = `ORD-${String(firstRow.order_serial_id).padStart(6, "0")}`;

//     // ============================================================
//     // GROUPING
//     // ============================================================

//     const groupedData = {};

//     data.forEach((item) => {
//       const counter = item.counter_name || "Default Counter";
//       const category = item.category_name || "Others";

//       if (!groupedData[counter]) {
//         groupedData[counter] = {};
//       }

//       if (!groupedData[counter][category]) {
//         groupedData[counter][category] = [];
//       }

//       groupedData[counter][category].push(item);
//     });

//     // ============================================================
//     // FILE SETUP
//     // ============================================================

//     const BASE_UPLOAD_PATH = ".public/uploads";

//     const folder = path.join(BASE_UPLOAD_PATH, "ShopMedia");

//     if (!fs.existsSync(folder)) {
//       fs.mkdirSync(folder, {
//         recursive: true,
//       });
//     }

//     const fileName = `Chalan_${Date.now()}.pdf`;
//     const filePath = path.join(folder, fileName);

//     // ============================================================
//     // A5 PDF
//     // ============================================================

//     const doc = new PDFDocument({
//       size: "A5",
//       margin: 25,
//       autoFirstPage: true,
//     });

//     const writeStream = fs.createWriteStream(filePath);

//     doc.pipe(writeStream);

//     // A5 dimensions in points
//     const PAGE_WIDTH = 419.53;
//     const PAGE_HEIGHT = 595.28;

//     const CONTENT_WIDTH = PAGE_WIDTH - 50;

//     // ============================================================
//     // LOGO
//     // ============================================================

//     function drawRoundLogo() {
//       const logoPath = path.join(
//         process.cwd(),
//         "public",
//         "uploads",
//         "logo.jpg",
//       );

//       if (!fs.existsSync(logoPath)) {
//         console.log("Logo not found:", logoPath);
//         return;
//       }

//       const logoSize = 48;

//       const x = (PAGE_WIDTH - logoSize) / 2;
//       const y = 18;

//       doc.save();

//       doc.circle(x + logoSize / 2, y + logoSize / 2, logoSize / 2);

//       doc.clip();

//       doc.image(logoPath, x, y, {
//         width: logoSize,
//         height: logoSize,
//       });

//       doc.restore();

//       // Border around logo
//       doc
//         .circle(x + logoSize / 2, y + logoSize / 2, logoSize / 2)
//         .lineWidth(1)
//         .strokeColor("#34495e")
//         .stroke();

//       doc.y = y + logoSize + 7;
//     }

//     // ============================================================
//     // PAGE HEADER
//     // ============================================================

//     function drawPageHeader() {
//       drawRoundLogo();

//       doc
//         .fontSize(15)
//         .font("Helvetica-Bold")
//         .fillColor("#1f2937")
//         .text("DISPATCH CHALAN", {
//           align: "center",
//           width: CONTENT_WIDTH,
//         });

//       doc.moveDown(0.2);

//       doc
//         .fontSize(7)
//         .font("Helvetica")
//         .fillColor("#6b7280")
//         .text("GOODS DISPATCH DOCUMENT", {
//           align: "center",
//           width: CONTENT_WIDTH,
//         });

//       doc.moveDown(0.5);

//       doc
//         .moveTo(25, doc.y)
//         .lineTo(PAGE_WIDTH - 25, doc.y)
//         .lineWidth(1)
//         .strokeColor("#34495e")
//         .stroke();

//       doc.moveDown(0.6);
//     }

//     // ============================================================
//     // INFO BOX
//     // ============================================================

//     function drawInfoBox() {
//       const boxX = 25;
//       const boxY = doc.y;

//       const boxWidth = CONTENT_WIDTH;
//       const boxHeight = 70;

//       doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 5).fill("#f8fafc");

//       doc
//         .roundedRect(boxX, boxY, boxWidth, boxHeight, 5)
//         .lineWidth(0.6)
//         .strokeColor("#d1d5db")
//         .stroke();

//       const leftX = boxX + 10;
//       const rightX = boxX + 205;

//       let y = boxY + 9;

//       doc
//         .fontSize(8)
//         .font("Helvetica-Bold")
//         .fillColor("#374151")
//         .text("CHALAN ID", leftX, y);

//       doc
//         .fontSize(8)
//         .font("Helvetica")
//         .fillColor("#111827")
//         .text(chalanDisplayId, leftX + 65, y);

//       doc
//         .font("Helvetica-Bold")
//         .fillColor("#374151")
//         .text("ORDER ID", rightX, y);

//       doc
//         .font("Helvetica")
//         .fillColor("#111827")
//         .text(orderDisplayId, rightX + 55, y);

//       y += 15;

//       doc
//         .font("Helvetica-Bold")
//         .fillColor("#374151")
//         .text("DISPATCH DATE", leftX, y);

//       doc
//         .font("Helvetica")
//         .fillColor("#111827")
//         .text(
//           firstRow.dispatch_date
//             ? new Date(firstRow.dispatch_date).toLocaleDateString()
//             : "-",
//           leftX + 65,
//           y,
//         );

//       doc.font("Helvetica-Bold").fillColor("#374151").text("STATUS", rightX, y);

//       const statusText = firstRow.is_verified ? "VERIFIED" : "PENDING";

//       doc
//         .font("Helvetica-Bold")
//         .fillColor(firstRow.is_verified ? "#15803d" : "#b45309")
//         .text(statusText, rightX + 55, y);

//       y += 15;

//       doc
//         .font("Helvetica-Bold")
//         .fillColor("#374151")
//         .text("VERIFICATION", leftX, y);

//       doc
//         .font("Helvetica-Bold")
//         .fillColor("#111827")
//         .text(firstRow.verification_code || "-", leftX + 65, y);

//       y += 15;

//       doc
//         .font("Helvetica-Bold")
//         .fillColor("#374151")
//         .text("ORDER STATUS", leftX, y);

//       doc
//         .font("Helvetica")
//         .fillColor("#111827")
//         .text(firstRow.order_status || "-", leftX + 65, y);

//       doc.y = boxY + boxHeight + 10;
//     }

//     // ============================================================
//     // SECTION TITLE
//     // ============================================================

//     function drawSectionTitle(title) {
//       doc.fontSize(9).font("Helvetica-Bold").fillColor("#1f2937").text(title);

//       doc.moveDown(0.25);
//     }

//     // ============================================================
//     // SUPPLIER + SHOP
//     // ============================================================

//     function drawPartyDetails() {
//       const startY = doc.y;

//       const gap = 8;
//       const boxWidth = (CONTENT_WIDTH - gap) / 2;
//       const boxHeight = 80;

//       // Supplier box
//       doc.roundedRect(25, startY, boxWidth, boxHeight, 5).fill("#fafafa");

//       doc
//         .roundedRect(25, startY, boxWidth, boxHeight, 5)
//         .lineWidth(0.5)
//         .strokeColor("#d1d5db")
//         .stroke();

//       doc
//         .fontSize(9)
//         .font("Helvetica-Bold")
//         .fillColor("#374151")
//         .text("SUPPLIER", 33, startY + 8);

//       doc.fontSize(7.5).font("Helvetica").fillColor("#111827");

//       doc.text(`Name: ${firstRow.supplier_name || "-"}`, 33, startY + 25, {
//         width: boxWidth - 16,
//         ellipsis: true,
//       });

//       doc.text(`Phone: ${firstRow.supplier_phone || "-"}`, 33, startY + 39, {
//         width: boxWidth - 16,
//         ellipsis: true,
//       });

//       doc.text(
//         `Address: ${firstRow.supplier_address || "-"}`,
//         33,
//         startY + 53,
//         {
//           width: boxWidth - 16,
//           height: 18,
//           ellipsis: true,
//         },
//       );

//       // Shop box
//       const shopX = 25 + boxWidth + gap;

//       doc.roundedRect(shopX, startY, boxWidth, boxHeight, 5).fill("#fafafa");

//       doc
//         .roundedRect(shopX, startY, boxWidth, boxHeight, 5)
//         .lineWidth(0.5)
//         .strokeColor("#d1d5db")
//         .stroke();

//       doc
//         .fontSize(9)
//         .font("Helvetica-Bold")
//         .fillColor("#374151")
//         .text("SHOP", shopX + 8, startY + 8);

//       doc.fontSize(7.5).font("Helvetica").fillColor("#111827");

//       doc.text(`Name: ${firstRow.shop_name || "-"}`, shopX + 8, startY + 25, {
//         width: boxWidth - 16,
//         ellipsis: true,
//       });

//       doc.text(`Phone: ${firstRow.shop_phone || "-"}`, shopX + 8, startY + 39, {
//         width: boxWidth - 16,
//         ellipsis: true,
//       });

//       doc.text(
//         `City: ${firstRow.city || "-"}, ${firstRow.state || "-"}`,
//         shopX + 8,
//         startY + 53,
//         {
//           width: boxWidth - 16,
//           ellipsis: true,
//         },
//       );

//       doc.y = startY + boxHeight + 10;
//     }

//     // ============================================================
//     // TRANSPORT
//     // ============================================================

//     function drawTransport() {
//       const boxY = doc.y;
//       const boxHeight = 42;

//       doc.roundedRect(25, boxY, CONTENT_WIDTH, boxHeight, 5).fill("#f8fafc");

//       doc
//         .roundedRect(25, boxY, CONTENT_WIDTH, boxHeight, 5)
//         .lineWidth(0.5)
//         .strokeColor("#d1d5db")
//         .stroke();

//       doc
//         .fontSize(8)
//         .font("Helvetica-Bold")
//         .fillColor("#374151")
//         .text("TRANSPORT DETAILS", 33, boxY + 7);

//       doc
//         .fontSize(7.5)
//         .font("Helvetica")
//         .fillColor("#111827")
//         .text(firstRow.transport_details || "-", 33, boxY + 21, {
//           width: CONTENT_WIDTH - 16,
//           height: 15,
//           ellipsis: true,
//         });

//       doc.y = boxY + boxHeight + 10;
//     }

//     // ============================================================
//     // TABLE HEADER
//     // ============================================================

//     function drawTableHeader() {
//       const y = doc.y;

//       const colWidths = {
//         name: 185,
//         qty: 50,
//         unit: 55,
//         status: 79,
//       };

//       const rowHeight = 19;

//       doc.roundedRect(25, y, CONTENT_WIDTH, rowHeight, 3).fill("#e5e7eb");

//       doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#111827");

//       doc.text("Sweet Name", 30, y + 5, {
//         width: colWidths.name - 8,
//       });

//       doc.text("Qty", 25 + colWidths.name, y + 5, {
//         width: colWidths.qty,
//         align: "center",
//       });

//       doc.text("Unit", 25 + colWidths.name + colWidths.qty, y + 5, {
//         width: colWidths.unit,
//         align: "center",
//       });

//       doc.text(
//         "Status",
//         25 + colWidths.name + colWidths.qty + colWidths.unit,
//         y + 5,
//         {
//           width: colWidths.status,
//           align: "center",
//         },
//       );

//       doc.y = y + rowHeight;

//       return {
//         colWidths,
//         rowHeight,
//       };
//     }

//     // ============================================================
//     // DRAW ITEM
//     // ============================================================

//     function drawItem(item, index, tableConfig) {
//       const { colWidths, rowHeight } = tableConfig;

//       const y = doc.y;

//       if (y + rowHeight + 20 > PAGE_HEIGHT - 25) {
//         doc.addPage();

//         drawPageHeader();

//         doc
//           .fontSize(8)
//           .font("Helvetica-Bold")
//           .fillColor("#2563eb")
//           .text(`Counter: ${item.counter_name || "Default Counter"}`);

//         doc.moveDown(0.4);

//         const newTableConfig = drawTableHeader();

//         return drawItem(item, index, newTableConfig);
//       }

//       if (index % 2 === 0) {
//         doc.rect(25, y, CONTENT_WIDTH, rowHeight).fill("#fafafa");
//       }

//       doc.fontSize(7.2).font("Helvetica").fillColor("#111827");

//       doc.text(item.sweet_name || "-", 30, y + 5, {
//         width: colWidths.name - 10,
//         ellipsis: true,
//       });

//       doc.text(
//         String(Number(item.supplied_quantity || 0)),
//         25 + colWidths.name,
//         y + 5,
//         {
//           width: colWidths.qty,
//           align: "center",
//         },
//       );

//       doc.text(item.unit || "-", 25 + colWidths.name + colWidths.qty, y + 5, {
//         width: colWidths.unit,
//         align: "center",
//       });

//       doc.text(
//         item.item_status || "ACCEPTED",
//         25 + colWidths.name + colWidths.qty + colWidths.unit,
//         y + 5,
//         {
//           width: colWidths.status,
//           align: "center",
//         },
//       );

//       doc
//         .moveTo(25, y + rowHeight)
//         .lineTo(25 + CONTENT_WIDTH, y + rowHeight)
//         .lineWidth(0.3)
//         .strokeColor("#e5e7eb")
//         .stroke();

//       doc.y = y + rowHeight;
//     }

//     // ============================================================
//     // TOTAL
//     // ============================================================

//     function drawTotal(total) {
//       const y = doc.y;

//       if (y + 24 > PAGE_HEIGHT - 25) {
//         doc.addPage();
//         drawPageHeader();
//       }

//       const totalY = doc.y;

//       doc.roundedRect(25, totalY, CONTENT_WIDTH, 22, 4).fill("#ecfdf5");

//       doc
//         .fontSize(8)
//         .font("Helvetica-Bold")
//         .fillColor("#111827")
//         .text("TOTAL SUPPLIED", 32, totalY + 6);

//       doc
//         .fontSize(9)
//         .font("Helvetica-Bold")
//         .fillColor("#047857")
//         .text(total.toString(), 25, totalY + 6, {
//           width: CONTENT_WIDTH - 10,
//           align: "right",
//         });

//       doc.y = totalY + 22;
//     }

//     // ============================================================
//     // PAGE FOOTER
//     // ============================================================

//     function drawFooter() {
//       const footerY = PAGE_HEIGHT - 18;

//       doc
//         .fontSize(6.5)
//         .font("Helvetica")
//         .fillColor("#9ca3af")
//         .text("System generated dispatch chalan", 25, footerY, {
//           width: CONTENT_WIDTH,
//           align: "center",
//         });

//       doc.fillColor("#000");
//     }

//     // ============================================================
//     // FIRST PAGE
//     // ============================================================

//     drawPageHeader();

//     drawInfoBox();

//     drawPartyDetails();

//     drawTransport();

//     // ============================================================
//     // COUNTER LOOP
//     // ============================================================

//     const counters = Object.keys(groupedData);

//     for (let counterIndex = 0; counterIndex < counters.length; counterIndex++) {
//       const counter = counters[counterIndex];

//       // If not enough space for counter heading
//       if (doc.y + 45 > PAGE_HEIGHT - 25) {
//         doc.addPage();

//         drawPageHeader();
//       }

//       const counterItems = Object.values(groupedData[counter]).flat();

//       const counterLocation = counterItems[0]?.counter_location;

//       // ==========================================================
//       // COUNTER HEADER
//       // ==========================================================

//       const counterBoxY = doc.y;

//       doc.roundedRect(25, counterBoxY, CONTENT_WIDTH, 32, 5).fill("#eff6ff");

//       doc
//         .roundedRect(25, counterBoxY, CONTENT_WIDTH, 32, 5)
//         .lineWidth(0.5)
//         .strokeColor("#bfdbfe")
//         .stroke();

//       doc
//         .fontSize(10)
//         .font("Helvetica-Bold")
//         .fillColor("#1d4ed8")
//         .text(`COUNTER: ${counter}`, 33, counterBoxY + 7);

//       if (counterLocation) {
//         doc
//           .fontSize(7)
//           .font("Helvetica")
//           .fillColor("#64748b")
//           .text(`Location: ${counterLocation}`, 33, counterBoxY + 20);
//       }

//       doc.y = counterBoxY + 40;

//       // ==========================================================
//       // CATEGORY LOOP
//       // ==========================================================

//       const categories = Object.keys(groupedData[counter]);

//       for (
//         let categoryIndex = 0;
//         categoryIndex < categories.length;
//         categoryIndex++
//       ) {
//         const category = categories[categoryIndex];

//         const categoryItems = groupedData[counter][category];

//         // Category heading
//         if (doc.y + 35 > PAGE_HEIGHT - 25) {
//           doc.addPage();

//           drawPageHeader();

//           doc
//             .fontSize(8)
//             .font("Helvetica-Bold")
//             .fillColor("#1d4ed8")
//             .text(`Counter: ${counter}`);

//           doc.moveDown(0.4);
//         }

//         doc
//           .fontSize(8.5)
//           .font("Helvetica-Bold")
//           .fillColor("#7c3aed")
//           .text(`Category: ${category}`);

//         doc.moveDown(0.3);

//         // Table header
//         let tableConfig = drawTableHeader();

//         let total = 0;

//         // ========================================================
//         // ITEMS
//         // ========================================================

//         categoryItems.forEach((item, index) => {
//           const qty = Number(item.supplied_quantity || 0);

//           total += qty;

//           const beforeY = doc.y;

//           drawItem(item, index, tableConfig);

//           // If page changed inside drawItem,
//           // table config may need to remain valid.
//           if (doc.y < beforeY) {
//             tableConfig = drawTableHeader();
//           }
//         });

//         // ========================================================
//         // CATEGORY TOTAL
//         // ========================================================

//         if (doc.y + 24 > PAGE_HEIGHT - 25) {
//           doc.addPage();

//           drawPageHeader();

//           doc
//             .fontSize(8)
//             .font("Helvetica-Bold")
//             .fillColor("#1d4ed8")
//             .text(`Counter: ${counter}`);

//           doc.moveDown(0.4);

//           tableConfig = drawTableHeader();
//         }

//         drawTotal(total);

//         doc.moveDown(0.7);
//       }
//     }

//     // ============================================================
//     // FINAL FOOTER
//     // ============================================================

//     if (doc.y > PAGE_HEIGHT - 45) {
//       doc.addPage();
//     }

//     doc.moveDown(1);

//     doc
//       .fontSize(7)
//       .font("Helvetica")
//       .fillColor("#6b7280")
//       .text("This is a system generated document. No signature is required.", {
//         align: "center",
//         width: CONTENT_WIDTH,
//       });

//     // Footer on current page
//     drawFooter();

//     // ============================================================
//     // END PDF
//     // ============================================================

//     doc.end();

//     // ============================================================
//     // RESPONSE AFTER PDF CREATED
//     // ============================================================

//     writeStream.on("finish", () => {
//       const fileUrl = `.public/uploads/ShopMedia/${fileName}`;

//       const serverUrl = "https://api.joswee.cloud";

//       return libFunc.sendResponse(res, {
//         status: 0,
//         msg: "Chalan PDF generated successfully",
//         filePath: serverUrl + fileUrl,
//       });
//     });

//     writeStream.on("error", (error) => {
//       console.log("Chalan PDF write error:", error);

//       if (!res.headersSent) {
//         return res.status(500).send("Error saving Chalan PDF");
//       }
//     });
//   } catch (error) {
//     console.log("downloadChalanPDF error:", error);

//     if (!res.headersSent) {
//       return res.status(500).send("Error generating PDF");
//     }
//   }
// }


// old
// async function downloadOrderRequestPDF(req, res) {
//   try {
//     const { order_id } = req.data || {};

//     if (!order_id) {
//       return res.status(400).send("Order ID required");
//     }

//     const orderTable = schema + ".orders";
//     const itemTable = schema + ".order_items";
//     const shopTable = schema + ".shops";
//     const sweetTable = schema + ".sweets";
//     const counterTable = schema + ".counters";
//     const categoryTable = schema + ".categories";
//     const departmentTable = schema + ".departments";

//     const safeOrderId = order_id.trim().replaceAll("'", "`");

//     // =====================================================
//     // FETCH ORDER DATA
//     // =====================================================

//     const result = await db_query.customQuery(`
//       SELECT

//         -- Order
//         o.id AS order_serial_id,
//         o.row_id AS order_id,
//         o.order_status,
//         o.order_date,
//         o.supplier_id,

//         -- Shop
//         sh.row_id AS shop_id,
//         sh.shop_name,
//         sh.address AS shop_address,
//         sh.city,
//         sh.state,
//         sh.phone AS shop_phone,

//         -- Order Item
//         oi.row_id AS order_item_id,
//         oi.request_id,
//         oi.quantity,
//         oi.item_status,
//         oi.counter_id,

//         -- Sweet
//         sw.row_id AS sweet_id,
//         COALESCE(sw.sweet_name, 'Unknown Sweet') AS sweet_name,
//         COALESCE(sw.unit, '-') AS unit,

//         -- Counter
//         c.row_id AS counter_id,
//         COALESCE(c.counter_name, 'Default Counter') AS counter_name,
//         c.location AS counter_location,

//         -- Category
//         cat.row_id AS category_id,
//         COALESCE(cat.category_name, 'Others') AS category_name,

//         -- Department
//         d.row_id AS department_id,
//         COALESCE(d.department_name, 'Others') AS department_name

//       FROM ${orderTable} o

//       LEFT JOIN ${shopTable} sh
//         ON sh.row_id = o.shop_id

//       LEFT JOIN ${itemTable} oi
//         ON oi.order_id = o.row_id

//       LEFT JOIN ${sweetTable} sw
//         ON sw.row_id = oi.sweet_id

//       LEFT JOIN ${counterTable} c
//         ON c.row_id = oi.counter_id

//       LEFT JOIN ${categoryTable} cat
//         ON cat.row_id = sw.category_id

//       LEFT JOIN ${departmentTable} d
//         ON d.row_id = cat.department_id

//       WHERE o.row_id = '${safeOrderId}'

//       ORDER BY
//         c.counter_name ASC,
//         cat.category_name ASC,
//         sw.sweet_name ASC
//     `);

//     const data = result.data || [];

//     if (data.length === 0) {
//       return res.status(404).send("No order found");
//     }

//     const order = data[0];

//     // =====================================================
//     // DISPLAY ORDER ID
//     // =====================================================

//     const orderDisplayId = `ORD-${String(order.order_serial_id).padStart(
//       6,
//       "0",
//     )}`;

//     // =====================================================
//     // FILE SETUP
//     // =====================================================

//     // const BASE_UPLOAD_PATH = "./public/uploads";
//     const BASE_UPLOAD_PATH = "/home/uploads";

//     const folder = path.join(BASE_UPLOAD_PATH, "OrderRequests");

//     if (!fs.existsSync(folder)) {
//       fs.mkdirSync(folder, {
//         recursive: true,
//       });
//     }

//     const fileName = `OrderRequest_${Date.now()}.pdf`;

//     const filePath = path.join(folder, fileName);

//     const doc = new PDFDocument({
//       margin: 30,
//       size: "A4",
//     });

//     doc.pipe(fs.createWriteStream(filePath));

//     // =====================================================
//     // HEADER
//     // =====================================================

//     doc.fontSize(17).font("Helvetica-Bold").text("ORDER REQUEST", {
//       align: "center",
//     });

//     doc.moveDown(0.4);

//     doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke();

//     doc.moveDown(0.5);

//     // =====================================================
//     // ORDER INFORMATION
//     // =====================================================

//     doc.fontSize(9).font("Helvetica");

//     doc.text(`Order ID: ${orderDisplayId}`, {
//       continued: true,
//     });

//     doc.text(`Status: ${order.order_status || "-"}`, {
//       align: "right",
//     });

//     doc.text(
//       `Order Date: ${
//         order.order_date ? new Date(order.order_date).toLocaleDateString() : "-"
//       }`,
//     );

//     doc.moveDown(0.5);

//     // =====================================================
//     // SHOP
//     // =====================================================

//     doc.fontSize(10).font("Helvetica-Bold").text("Shop Details");

//     doc.fontSize(8).font("Helvetica");

//     doc.text(`Shop: ${order.shop_name || "-"}`, {
//       continued: true,
//     });

//     doc.text(`Phone: ${order.shop_phone || "-"}`, {
//       align: "right",
//     });

//     doc.text(
//       `Address: ${order.shop_address || "-"}, ${
//         order.city || "-"
//       }, ${order.state || "-"}`,
//     );

//     doc.moveDown(0.6);

//     // =====================================================
//     // TABLE
//     // =====================================================

//     const startX = 30;
//     let y = doc.y;

//     const rowHeight = 18;

//     const colWidths = {
//       counter: 105,
//       category: 105,
//       department: 105,
//       sweet: 135,
//       qty: 40,
//       unit: 45,
//     };

//     const totalWidth = 535;

//     // =====================================================
//     // TABLE HEADER
//     // =====================================================

//     doc.rect(startX, y, totalWidth, rowHeight).fill("#e5e5e5");

//     doc.fillColor("#000").fontSize(7).font("Helvetica-Bold");

//     let x = startX;

//     doc.text("Counter", x + 3, y + 5, {
//       width: colWidths.counter,
//     });

//     x += colWidths.counter;

//     doc.text("Category", x + 3, y + 5, {
//       width: colWidths.category,
//     });

//     x += colWidths.category;

//     doc.text("Department", x + 3, y + 5, {
//       width: colWidths.department,
//     });

//     x += colWidths.department;

//     doc.text("Sweet", x + 3, y + 5, {
//       width: colWidths.sweet,
//     });

//     x += colWidths.sweet;

//     doc.text("Qty", x, y + 5, {
//       width: colWidths.qty,
//       align: "center",
//     });

//     x += colWidths.qty;

//     doc.text("Unit", x, y + 5, {
//       width: colWidths.unit,
//       align: "center",
//     });

//     y += rowHeight;

//     // =====================================================
//     // ITEMS
//     // =====================================================

//     let grandTotal = 0;

//     data.forEach((item, index) => {
//       const qty = Number(item.quantity || 0);

//       grandTotal += qty;

//       // Keep single page
//       if (y > 760) {
//         return;
//       }

//       if (index % 2 === 0) {
//         doc.rect(startX, y, totalWidth, rowHeight).fill("#fafafa");
//       }

//       doc.fillColor("#000").fontSize(7).font("Helvetica");

//       let x = startX;

//       doc.text(item.counter_name || "-", x + 3, y + 5, {
//         width: colWidths.counter - 6,
//         ellipsis: true,
//       });

//       x += colWidths.counter;

//       doc.text(item.category_name || "-", x + 3, y + 5, {
//         width: colWidths.category - 6,
//         ellipsis: true,
//       });

//       x += colWidths.category;

//       doc.text(item.department_name || "-", x + 3, y + 5, {
//         width: colWidths.department - 6,
//         ellipsis: true,
//       });

//       x += colWidths.department;

//       doc.text(item.sweet_name || "-", x + 3, y + 5, {
//         width: colWidths.sweet - 6,
//         ellipsis: true,
//       });

//       x += colWidths.sweet;

//       doc.text(qty.toString(), x, y + 5, {
//         width: colWidths.qty,
//         align: "center",
//       });

//       x += colWidths.qty;

//       doc.text(item.unit || "-", x, y + 5, {
//         width: colWidths.unit,
//         align: "center",
//       });

//       y += rowHeight;
//     });

//     // =====================================================
//     // TOTAL
//     // =====================================================

//     doc.rect(startX, y, totalWidth, rowHeight).fill("#e8f8f5");

//     doc.fillColor("#000").fontSize(8).font("Helvetica-Bold");

//     doc.text("TOTAL", startX + 5, y + 5, {
//       width: 420,
//     });

//     doc.text(grandTotal.toString(), startX + 420, y + 5, {
//       width: 60,
//       align: "center",
//     });

//     doc.moveDown(2);

//     // =====================================================
//     // FOOTER
//     // =====================================================

//     doc
//       .fontSize(8)
//       .font("Helvetica")
//       .fillColor("gray")
//       .text("System generated order request.", {
//         align: "center",
//       });

//     doc.fillColor("#000");

//     // =====================================================
//     // END
//     // =====================================================

//     doc.end();

//     const fileUrl = `/uploads/OrderRequests/${fileName}`;

//     const serverUrl = "https://api.joswee.cloud";

//     return libFunc.sendResponse(res, {
//       status: 0,
//       msg: "Order request PDF generated successfully",
//       filePath: serverUrl + fileUrl,
//     });
//   } catch (error) {
//     console.log("downloadOrderRequestPDF error:", error);

//     return res.status(500).send("Error generating order request PDF");
//   }
// }



async function downloadOrderRequestPDF(req, res) {
  try {
    const { order_id } = req.data || {};

    if (!order_id) {
      return res.status(400).send("Order ID required");
    }

    // =====================================================
    // TABLES
    // =====================================================

    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";
    const shopTable = schema + ".shops";
    const sweetTable = schema + ".sweets";
    const counterTable = schema + ".counters";
    const categoryTable = schema + ".categories";
    const departmentTable = schema + ".departments";

    // =====================================================
    // SAFE ORDER ID
    // =====================================================

    const safeOrderId = String(order_id)
      .trim()
      .replaceAll("'", "''");

    // =====================================================
    // FETCH ORDER DATA
    // =====================================================

    const result = await db_query.customQuery(`
      SELECT

        -- =================================================
        -- ORDER
        -- =================================================

        o.id AS order_serial_id,
        o.row_id AS order_id,
        o.order_status,
        o.order_date,
        o.supplier_id,

        -- =================================================
        -- SHOP
        -- =================================================

        sh.row_id AS shop_id,
        sh.shop_name,
        sh.address AS shop_address,
        sh.city,
        sh.state,
        sh.phone AS shop_phone,

        -- =================================================
        -- ORDER ITEM
        -- =================================================

        oi.row_id AS order_item_id,
        oi.request_id,
        oi.quantity,
        oi.item_status,
        oi.counter_id,

        -- =================================================
        -- SWEET
        -- =================================================

        sw.row_id AS sweet_id,

        COALESCE(
          sw.sweet_name,
          'Unknown Sweet'
        ) AS sweet_name,

        COALESCE(
          sw.unit,
          '-'
        ) AS unit,

        -- =================================================
        -- COUNTER
        -- =================================================

        c.row_id AS counter_id,

        COALESCE(
          c.counter_name,
          'Default Counter'
        ) AS counter_name,

        c.location AS counter_location,

        -- =================================================
        -- CATEGORY
        -- =================================================

        cat.row_id AS category_id,

        COALESCE(
          cat.category_name,
          'Others'
        ) AS category_name,

        -- =================================================
        -- DEPARTMENT
        -- =================================================

        d.row_id AS department_id,

        COALESCE(
          d.department_name,
          'Others'
        ) AS department_name

      FROM ${orderTable} o

      LEFT JOIN ${shopTable} sh
        ON sh.row_id = o.shop_id

      LEFT JOIN ${itemTable} oi
        ON oi.order_id = o.row_id

      LEFT JOIN ${sweetTable} sw
        ON sw.row_id = oi.sweet_id

      LEFT JOIN ${counterTable} c
        ON c.row_id = oi.counter_id

      LEFT JOIN ${categoryTable} cat
        ON cat.row_id = sw.category_id

      LEFT JOIN ${departmentTable} d
        ON d.row_id = cat.department_id

      WHERE o.row_id = '${safeOrderId}'

      ORDER BY
        c.counter_name ASC,
        cat.category_name ASC,
        sw.sweet_name ASC
    `);

    // =====================================================
    // DATA
    // =====================================================

    const data = result.data || [];

    if (data.length === 0) {
      return res.status(404).send("No order found");
    }

    const order = data[0];

    // =====================================================
    // DISPLAY ORDER ID
    // =====================================================

    const orderDisplayId =
      `ORD-${String(order.order_serial_id).padStart(6, "0")}`;

    // =====================================================
    // PATH
    // =====================================================

    const BASE_UPLOAD_PATH = "/home/uploads";

    const folder = path.join(
      BASE_UPLOAD_PATH,
      "OrderRequests"
    );

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, {
        recursive: true,
      });
    }

    // =====================================================
    // LOGO
    // =====================================================

    const LOGO_PATH = path.join(
      BASE_UPLOAD_PATH,
      "ShopMedia",
      "1789809020026_logo.jpg"
    );

    const hasLogo = fs.existsSync(LOGO_PATH);

    if (!hasLogo) {
      console.log(
        "Order request logo not found:",
        LOGO_PATH
      );
    }

    // =====================================================
    // FILE
    // =====================================================

    const fileName =
      `OrderRequest_${orderDisplayId}_${Date.now()}.pdf`;

    const filePath = path.join(
      folder,
      fileName
    );

    // =====================================================
    // A5 SETTINGS
    // =====================================================

    const PAGE_WIDTH = 419.53;
    const PAGE_HEIGHT = 595.28;

    const MARGIN = 22;

    const CONTENT_WIDTH =
      PAGE_WIDTH - MARGIN * 2;

    // =====================================================
    // PDF
    // =====================================================

    const doc = new PDFDocument({
      size: "A5",
      layout: "portrait",

      margins: {
        top: MARGIN,
        bottom: MARGIN,
        left: MARGIN,
        right: MARGIN,
      },

      autoFirstPage: true,
    });

    const writeStream =
      fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // =====================================================
    // COLORS
    // =====================================================

    const BRAND_DARK = "#4A2C1F";
    const BRAND = "#6B4030";
    const BRAND_LIGHT = "#F4EBDD";
    const GOLD = "#B68A3A";

    const BLACK = "#171717";
    const GREY = "#666666";
    const BORDER = "#D5CEC7";
    const LIGHT_ROW = "#FBF9F7";
    const WHITE = "#FFFFFF";

    // =====================================================
    // DATE FORMAT
    // =====================================================

    function formatDate(date) {
      if (!date) {
        return "-";
      }

      const d = new Date(date);

      if (isNaN(d.getTime())) {
        return "-";
      }

      return d.toLocaleDateString(
        "en-IN"
      );
    }

    // =====================================================
    // ROUND LOGO
    // =====================================================

    function drawRoundLogo(x, y, size) {
      if (!hasLogo) {
        return;
      }

      try {
        // Outer circle
        doc
          .circle(
            x + size / 2,
            y + size / 2,
            size / 2 + 3
          )
          .fillColor(BRAND_LIGHT)
          .fill();

        // Clip image to circle
        doc.save();

        doc
          .circle(
            x + size / 2,
            y + size / 2,
            size / 2
          )
          .clip();

        doc.image(
          LOGO_PATH,
          x,
          y,
          {
            width: size,
            height: size,
          }
        );

        doc.restore();

        // Border
        doc
          .circle(
            x + size / 2,
            y + size / 2,
            size / 2 + 1
          )
          .lineWidth(1)
          .strokeColor(GOLD)
          .stroke();

      } catch (error) {
        console.log(
          "Round logo error:",
          error
        );
      }
    }

    // =====================================================
    // TOP RIGHT DESIGN
    // =====================================================

    function drawTopDesign() {
      const designWidth = 125;
      const designHeight = 78;

      const x =
        PAGE_WIDTH - designWidth;

      const y = 0;

      // Dark curved shape
      doc
        .moveTo(
          x + 32,
          y
        )
        .lineTo(
          PAGE_WIDTH,
          y
        )
        .lineTo(
          PAGE_WIDTH,
          y + designHeight
        )
        .bezierCurveTo(
          PAGE_WIDTH - 25,
          y + 75,
          PAGE_WIDTH - 70,
          y + 72,
          x,
          y + 50
        )
        .bezierCurveTo(
          x + 15,
          y + 28,
          x + 25,
          y + 12,
          x + 32,
          y
        )
        .fillColor(BRAND_DARK)
        .fill();

      // Gold curve
      doc
        .moveTo(
          x + 8,
          y + 56
        )
        .bezierCurveTo(
          x + 35,
          y + 70,
          x + 70,
          y + 70,
          PAGE_WIDTH,
          y + 53
        )
        .lineWidth(1.8)
        .strokeColor(GOLD)
        .stroke();

      // Decorative text
      doc
        .font("Helvetica-Bold")
        .fontSize(5)
        .fillColor("#F5E7D0")
        .text(
          "ORDER REQUEST",
          x + 43,
          y + 25,
          {
            width: 70,
            align: "center",
            lineBreak: false,
          }
        );
    }

    // =====================================================
    // FOOTER
    // =====================================================
    //
    // IMPORTANT:
    // Footer is drawn using absolute coordinates and
    // lineBreak:false so PDFKit will NOT create another page.
    //
    // =====================================================

    function drawFooter() {
      const footerLineY =
        PAGE_HEIGHT - 30;

      const footerTextY =
        PAGE_HEIGHT - 22;

      // Separator
      doc
        .moveTo(
          MARGIN,
          footerLineY
        )
        .lineTo(
          PAGE_WIDTH - MARGIN,
          footerLineY
        )
        .lineWidth(0.6)
        .strokeColor(GOLD)
        .stroke();

      // Existing footer text only
      doc
        .font("Helvetica")
        .fontSize(6.5)
        .fillColor(GREY)
        .text(
          "System generated order request.",
          MARGIN,
          footerTextY,
          {
            width: CONTENT_WIDTH,
            align: "center",
            lineBreak: false,
          }
        );

      doc.fillColor(BLACK);
    }

    // =====================================================
    // BUSINESS HEADER
    // =====================================================

    function drawBusinessHeader() {
      const headerY = MARGIN;

      // Top decoration
      drawTopDesign();

      // ===================================================
      // LOGO
      // ===================================================

      const logoSize = 58;

      drawRoundLogo(
        MARGIN,
        headerY + 2,
        logoSize
      );

      // ===================================================
      // SHOP INFORMATION
      // ===================================================

      const shopX =
        MARGIN + 70;

      const shopWidth =
        CONTENT_WIDTH - 70;

      // Shop name
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(BRAND_DARK)
        .text(
          order.shop_name || "-",
          shopX,
          headerY + 5,
          {
            width: shopWidth - 70,
            ellipsis: true,
            lineBreak: false,
          }
        );

      // Brand line
      doc
        .font("Helvetica-Bold")
        .fontSize(5.2)
        .fillColor(GOLD)
        .text(
          "PURE TASTE • HAPPY MOMENTS",
          shopX,
          headerY + 22,
          {
            width: shopWidth - 70,
            lineBreak: false,
          }
        );

      // Address
      const address = [
        order.shop_address,
        order.city,
        order.state,
      ]
        .filter(Boolean)
        .join(", ");

      doc
        .font("Helvetica")
        .fontSize(6.2)
        .fillColor(GREY)
        .text(
          address || "-",
          shopX,
          headerY + 33,
          {
            width: shopWidth - 70,
            ellipsis: true,
            lineBreak: false,
          }
        );

      // Phone
      doc
        .font("Helvetica")
        .fontSize(6.2)
        .fillColor(GREY)
        .text(
          `Phone: ${order.shop_phone || "-"}`,
          shopX,
          headerY + 44,
          {
            width: shopWidth - 70,
            ellipsis: true,
            lineBreak: false,
          }
        );

      // ===================================================
      // HEADER LINE
      // ===================================================

      const lineY =
        headerY + logoSize + 11;

      doc
        .moveTo(
          MARGIN,
          lineY
        )
        .lineTo(
          PAGE_WIDTH - MARGIN,
          lineY
        )
        .lineWidth(0.8)
        .strokeColor(BRAND)
        .stroke();

      // Gold dot
      doc
        .circle(
          MARGIN,
          lineY,
          2
        )
        .fillColor(GOLD)
        .fill();

      doc.y =
        lineY + 9;

      // ===================================================
      // ORDER REQUEST TITLE
      // ===================================================

      const titleY = doc.y;

      const titleHeight = 47;

      doc
        .roundedRect(
          MARGIN,
          titleY,
          CONTENT_WIDTH,
          titleHeight,
          6
        )
        .fillColor(BRAND_LIGHT)
        .fill();

      // Left accent
      doc
        .roundedRect(
          MARGIN,
          titleY,
          5,
          titleHeight,
          3
        )
        .fillColor(BRAND)
        .fill();

      // Title
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(BLACK)
        .text(
          "ORDER REQUEST",
          MARGIN + 16,
          titleY + 8,
          {
            width: 190,
            lineBreak: false,
          }
        );

      // Subtitle
      doc
        .font("Helvetica")
        .fontSize(5.5)
        .fillColor(BRAND)
        .text(
          "ORDER DETAILS & ITEMS",
          MARGIN + 17,
          titleY + 28,
          {
            width: 190,
            lineBreak: false,
          }
        );

      // ===================================================
      // ORDER ID
      // ===================================================

      const orderBoxX =
        PAGE_WIDTH - MARGIN - 108;

      doc
        .moveTo(
          orderBoxX - 8,
          titleY + 8
        )
        .lineTo(
          orderBoxX - 8,
          titleY + 39
        )
        .lineWidth(0.5)
        .strokeColor("#CBBEAF")
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(5.2)
        .fillColor(GREY)
        .text(
          "ORDER ID",
          orderBoxX,
          titleY + 8,
          {
            width: 100,
            lineBreak: false,
          }
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(BRAND_DARK)
        .text(
          orderDisplayId,
          orderBoxX,
          titleY + 20,
          {
            width: 100,
            lineBreak: false,
          }
        );

      doc.y =
        titleY +
        titleHeight +
        9;
    }

    // =====================================================
    // ORDER INFORMATION
    // =====================================================

    function drawOrderInformation() {
      const y = doc.y;

      const boxHeight = 46;

      doc
        .roundedRect(
          MARGIN,
          y,
          CONTENT_WIDTH,
          boxHeight,
          5
        )
        .lineWidth(0.6)
        .strokeColor(BORDER)
        .stroke();

      const colWidth =
        CONTENT_WIDTH / 3;

      // Separators
      doc
        .moveTo(
          MARGIN + colWidth,
          y + 7
        )
        .lineTo(
          MARGIN + colWidth,
          y + boxHeight - 7
        )
        .lineWidth(0.4)
        .strokeColor(BORDER)
        .stroke();

      doc
        .moveTo(
          MARGIN + colWidth * 2,
          y + 7
        )
        .lineTo(
          MARGIN + colWidth * 2,
          y + boxHeight - 7
        )
        .lineWidth(0.4)
        .strokeColor(BORDER)
        .stroke();

      // ===================================================
      // ORDER ID
      // ===================================================

      doc
        .font("Helvetica")
        .fontSize(5.2)
        .fillColor(GREY)
        .text(
          "ORDER ID",
          MARGIN + 8,
          y + 8,
          {
            lineBreak: false,
          }
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(BLACK)
        .text(
          orderDisplayId,
          MARGIN + 8,
          y + 21,
          {
            width: colWidth - 15,
            lineBreak: false,
          }
        );

      // ===================================================
      // STATUS
      // ===================================================

      const statusX =
        MARGIN + colWidth;

      doc
        .font("Helvetica")
        .fontSize(5.2)
        .fillColor(GREY)
        .text(
          "STATUS",
          statusX + 8,
          y + 8,
          {
            lineBreak: false,
          }
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(BRAND_DARK)
        .text(
          order.order_status || "-",
          statusX + 8,
          y + 21,
          {
            width: colWidth - 15,
            ellipsis: true,
            lineBreak: false,
          }
        );

      // ===================================================
      // ORDER DATE
      // ===================================================

      const dateX =
        MARGIN + colWidth * 2;

      doc
        .font("Helvetica")
        .fontSize(5.2)
        .fillColor(GREY)
        .text(
          "ORDER DATE",
          dateX + 8,
          y + 8,
          {
            lineBreak: false,
          }
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(BLACK)
        .text(
          formatDate(order.order_date),
          dateX + 8,
          y + 21,
          {
            width: colWidth - 15,
            lineBreak: false,
          }
        );

      doc.y =
        y +
        boxHeight +
        9;
    }

    // =====================================================
    // SHOP DETAILS
    // =====================================================

    function drawShopDetails() {
      const y = doc.y;

      // Heading
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(BRAND_DARK)
        .text(
          "SHOP DETAILS",
          MARGIN,
          y,
          {
            lineBreak: false,
          }
        );

      // Underline
      doc
        .moveTo(
          MARGIN,
          y + 11
        )
        .lineTo(
          MARGIN + 45,
          y + 11
        )
        .lineWidth(1)
        .strokeColor(GOLD)
        .stroke();

      // Shop
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(BLACK)
        .text(
          `Shop: ${order.shop_name || "-"}`,
          MARGIN,
          y + 18,
          {
            width:
              CONTENT_WIDTH / 2 - 5,
            ellipsis: true,
            lineBreak: false,
          }
        );

      // Phone
      doc
        .font("Helvetica")
        .fontSize(6.5)
        .fillColor(GREY)
        .text(
          `Phone: ${order.shop_phone || "-"}`,
          MARGIN + CONTENT_WIDTH / 2,
          y + 18,
          {
            width:
              CONTENT_WIDTH / 2,
            align: "right",
            ellipsis: true,
            lineBreak: false,
          }
        );

      // Address
      const address = [
        order.shop_address,
        order.city,
        order.state,
      ]
        .filter(Boolean)
        .join(", ");

      doc
        .font("Helvetica")
        .fontSize(6.2)
        .fillColor(GREY)
        .text(
          `Address: ${address || "-"}`,
          MARGIN,
          y + 30,
          {
            width: CONTENT_WIDTH,
            ellipsis: true,
            lineBreak: false,
          }
        );

      doc.y =
        y + 41;
    }

    // =====================================================
    // TABLE
    // =====================================================

    const rowHeight = 22;

    const colWidths = {
      counter: 58,
      category: 55,
      department: 55,
      sweet: 105,
      qty: 40,
      unit: 58,
    };

    const totalWidth =
      colWidths.counter +
      colWidths.category +
      colWidths.department +
      colWidths.sweet +
      colWidths.qty +
      colWidths.unit;

    // =====================================================
    // TABLE HEADER
    // =====================================================

    function drawTableHeader() {
      const y = doc.y;

      let x = MARGIN;

      // Header background
      doc
        .rect(
          MARGIN,
          y,
          totalWidth,
          rowHeight
        )
        .fillColor(BRAND_DARK)
        .fill();

      doc
        .font("Helvetica-Bold")
        .fontSize(5.8)
        .fillColor(WHITE);

      // Counter
      doc.text(
        "COUNTER",
        x + 3,
        y + 7,
        {
          width:
            colWidths.counter - 6,
          lineBreak: false,
        }
      );

      x += colWidths.counter;

      // Category
      doc.text(
        "CATEGORY",
        x + 3,
        y + 7,
        {
          width:
            colWidths.category - 6,
          lineBreak: false,
        }
      );

      x += colWidths.category;

      // Department
      doc.text(
        "DEPARTMENT",
        x + 3,
        y + 7,
        {
          width:
            colWidths.department - 6,
          lineBreak: false,
        }
      );

      x += colWidths.department;

      // Sweet
      doc.text(
        "SWEET",
        x + 3,
        y + 7,
        {
          width:
            colWidths.sweet - 6,
          lineBreak: false,
        }
      );

      x += colWidths.sweet;

      // Qty
      doc.text(
        "QTY",
        x,
        y + 7,
        {
          width: colWidths.qty,
          align: "center",
          lineBreak: false,
        }
      );

      x += colWidths.qty;

      // Unit
      doc.text(
        "UNIT",
        x,
        y + 7,
        {
          width: colWidths.unit,
          align: "center",
          lineBreak: false,
        }
      );

      // Border
      doc
        .rect(
          MARGIN,
          y,
          totalWidth,
          rowHeight
        )
        .lineWidth(0.4)
        .strokeColor(BRAND_DARK)
        .stroke();

      doc.y =
        y +
        rowHeight;
    }

    // =====================================================
    // TABLE ITEM
    // =====================================================

    function drawItem(item, index) {
      const y = doc.y;

      let x = MARGIN;

      const qty =
        Number(item.quantity || 0);

      // Alternate background
      if (index % 2 === 0) {
        doc
          .rect(
            MARGIN,
            y,
            totalWidth,
            rowHeight
          )
          .fillColor(LIGHT_ROW)
          .fill();
      }

      // Text
      doc
        .font("Helvetica")
        .fontSize(6.1)
        .fillColor(BLACK);

      // Counter
      doc.text(
        item.counter_name || "-",
        x + 3,
        y + 7,
        {
          width:
            colWidths.counter - 6,
          ellipsis: true,
          lineBreak: false,
        }
      );

      x += colWidths.counter;

      // Category
      doc.text(
        item.category_name || "-",
        x + 3,
        y + 7,
        {
          width:
            colWidths.category - 6,
          ellipsis: true,
          lineBreak: false,
        }
      );

      x += colWidths.category;

      // Department
      doc.text(
        item.department_name || "-",
        x + 3,
        y + 7,
        {
          width:
            colWidths.department - 6,
          ellipsis: true,
          lineBreak: false,
        }
      );

      x += colWidths.department;

      // Sweet
      doc
        .font("Helvetica-Bold")
        .text(
          item.sweet_name || "-",
          x + 3,
          y + 7,
          {
            width:
              colWidths.sweet - 6,
            ellipsis: true,
            lineBreak: false,
          }
        );

      x += colWidths.sweet;

      // Quantity
      doc
        .font("Helvetica-Bold")
        .text(
          qty.toString(),
          x,
          y + 7,
          {
            width: colWidths.qty,
            align: "center",
            lineBreak: false,
          }
        );

      x += colWidths.qty;

      // Unit
      doc
        .font("Helvetica")
        .text(
          item.unit || "-",
          x,
          y + 7,
          {
            width: colWidths.unit,
            align: "center",
            ellipsis: true,
            lineBreak: false,
          }
        );

      // Row border
      doc
        .rect(
          MARGIN,
          y,
          totalWidth,
          rowHeight
        )
        .lineWidth(0.3)
        .strokeColor(BORDER)
        .stroke();

      // Vertical lines
      let separatorX =
        MARGIN;

      const widths = [
        colWidths.counter,
        colWidths.category,
        colWidths.department,
        colWidths.sweet,
        colWidths.qty,
        colWidths.unit,
      ];

      widths.forEach(
        (width, index) => {
          separatorX += width;

          if (
            index <
            widths.length - 1
          ) {
            doc
              .moveTo(
                separatorX,
                y
              )
              .lineTo(
                separatorX,
                y + rowHeight
              )
              .lineWidth(0.25)
              .strokeColor(BORDER)
              .stroke();
          }
        }
      );

      doc.y =
        y +
        rowHeight;
    }

    // =====================================================
    // TOTAL
    // =====================================================

    function drawTotal(grandTotal) {
      const y = doc.y;

      const height = 28;

      doc
        .rect(
          MARGIN,
          y,
          totalWidth,
          height
        )
        .fillColor(BRAND_LIGHT)
        .fill();

      doc
        .rect(
          MARGIN,
          y,
          totalWidth,
          height
        )
        .lineWidth(0.5)
        .strokeColor("#D2C0A7")
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(BRAND_DARK)
        .text(
          "TOTAL",
          MARGIN + 7,
          y + 8,
          {
            width:
              totalWidth - 80,
            lineBreak: false,
          }
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(BRAND_DARK)
        .text(
          grandTotal.toString(),
          MARGIN + totalWidth - 65,
          y + 7,
          {
            width: 45,
            align: "center",
            lineBreak: false,
          }
        );

      doc.y =
        y +
        height +
        8;
    }

    // =====================================================
    // FIRST PAGE HEADER
    // =====================================================

    drawBusinessHeader();

    drawOrderInformation();

    drawShopDetails();

    drawTableHeader();

    // =====================================================
    // ITEMS
    // =====================================================

    let grandTotal = 0;

    let itemIndex = 0;

    /*
     * Bottom safe area.
     *
     * Footer starts around PAGE_HEIGHT - 30.
     * We keep 42px safe space before it.
     */

    const BOTTOM_SAFE_SPACE = 48;

    data.forEach((item) => {
      const qty =
        Number(item.quantity || 0);

      grandTotal += qty;

      /*
       * IMPORTANT:
       *
       * Check BEFORE drawing the row.
       * This prevents PDFKit from automatically
       * creating an unwanted page.
       */

      if (
        doc.y + rowHeight >
        PAGE_HEIGHT - BOTTOM_SAFE_SPACE
      ) {
        // Footer current page
        drawFooter();

        // New page
        doc.addPage({
          size: "A5",
          layout: "portrait",

          margins: {
            top: MARGIN,
            bottom: MARGIN,
            left: MARGIN,
            right: MARGIN,
          },
        });

        // Header on new page
        drawBusinessHeader();

        // Only table header on continuation
        drawTableHeader();

        itemIndex = 0;
      }

      drawItem(
        item,
        itemIndex
      );

      itemIndex++;
    });

    // =====================================================
    // TOTAL
    // =====================================================

    const TOTAL_HEIGHT = 36;

    /*
     * If total cannot fit on current page,
     * create a new page BEFORE drawing total.
     */

    if (
      doc.y + TOTAL_HEIGHT >
      PAGE_HEIGHT - BOTTOM_SAFE_SPACE
    ) {
      drawFooter();

      doc.addPage({
        size: "A5",
        layout: "portrait",

        margins: {
          top: MARGIN,
          bottom: MARGIN,
          left: MARGIN,
          right: MARGIN,
        },
      });

      drawBusinessHeader();

      drawTableHeader();
    }

    drawTotal(
      grandTotal
    );

    // =====================================================
    // FINAL FOOTER
    // =====================================================

    drawFooter();

    // =====================================================
    // END PDF
    // =====================================================

    doc.end();

    // =====================================================
    // WAIT FOR PDF WRITE
    // =====================================================

    await new Promise(
      (resolve, reject) => {
        writeStream.on(
          "finish",
          resolve
        );

        writeStream.on(
          "error",
          reject
        );
      }
    );

    // =====================================================
    // FILE URL
    // =====================================================

    const fileUrl =
      `/uploads/OrderRequests/${fileName}`;

    const serverUrl =
      "https://api.joswee.cloud";

    // =====================================================
    // RESPONSE
    // =====================================================

    return libFunc.sendResponse(res, {
      status: 0,

      msg:
        "Order request A5 PDF generated successfully",

      filePath:
        serverUrl + fileUrl,
    });

  } catch (error) {
    console.log(
      "downloadOrderRequestPDF error:",
      error
    );

    if (!res.headersSent) {
      return res
        .status(500)
        .send(
          "Error generating order request PDF"
        );
    }
  }
}








// async function downloadOrderRequestPDF(req, res) {
//   try {
//     const { order_id } = req.data || {};

//     if (!order_id) {
//       return res.status(400).send("Order ID required");
//     }

//     const orderTable = schema + ".orders";
//     const itemTable = schema + ".order_items";
//     const shopTable = schema + ".shops";
//     const sweetTable = schema + ".sweets";
//     const counterTable = schema + ".counters";
//     const categoryTable = schema + ".categories";
//     const departmentTable = schema + ".departments";

//     const safeOrderId = String(order_id).trim().replaceAll("'", "''");

//     // =====================================================
//     // FETCH ORDER DATA
//     // =====================================================

//     const result = await db_query.customQuery(`
//       SELECT

//         -- Order
//         o.id AS order_serial_id,
//         o.row_id AS order_id,
//         o.order_status,
//         o.order_date,
//         o.supplier_id,

//         -- Shop
//         sh.row_id AS shop_id,
//         sh.shop_name,
//         sh.address AS shop_address,
//         sh.city,
//         sh.state,
//         sh.phone AS shop_phone,

//         -- Order Item
//         oi.row_id AS order_item_id,
//         oi.request_id,
//         oi.quantity,
//         oi.item_status,
//         oi.counter_id,

//         -- Sweet
//         sw.row_id AS sweet_id,
//         COALESCE(
//           sw.sweet_name,
//           'Unknown Sweet'
//         ) AS sweet_name,

//         COALESCE(
//           sw.unit,
//           '-'
//         ) AS unit,

//         -- Counter
//         c.row_id AS counter_id,
//         COALESCE(
//           c.counter_name,
//           'Default Counter'
//         ) AS counter_name,

//         c.location AS counter_location,

//         -- Category
//         cat.row_id AS category_id,
//         COALESCE(
//           cat.category_name,
//           'Others'
//         ) AS category_name,

//         -- Department
//         d.row_id AS department_id,
//         COALESCE(
//           d.department_name,
//           'Others'
//         ) AS department_name

//       FROM ${orderTable} o

//       LEFT JOIN ${shopTable} sh
//         ON sh.row_id = o.shop_id

//       LEFT JOIN ${itemTable} oi
//         ON oi.order_id = o.row_id

//       LEFT JOIN ${sweetTable} sw
//         ON sw.row_id = oi.sweet_id

//       LEFT JOIN ${counterTable} c
//         ON c.row_id = oi.counter_id

//       LEFT JOIN ${categoryTable} cat
//         ON cat.row_id = sw.category_id

//       LEFT JOIN ${departmentTable} d
//         ON d.row_id = cat.department_id

//       WHERE o.row_id = '${safeOrderId}'

//       ORDER BY
//         c.counter_name ASC,
//         cat.category_name ASC,
//         d.department_name ASC,
//         sw.sweet_name ASC
//     `);

//     const data = result.data || [];

//     if (data.length === 0) {
//       return res.status(404).send("No order found");
//     }

//     const order = data[0];

//     // =====================================================
//     // DISPLAY ORDER ID
//     // =====================================================

//     const orderDisplayId = `ORD-${String(order.order_serial_id).padStart(
//       6,
//       "0",
//     )}`;

//     // =====================================================
//     // FILE SETUP
//     // =====================================================

//     const BASE_UPLOAD_PATH = "./public/uploads";

//     const folder = path.join(BASE_UPLOAD_PATH, "OrderRequests");

//     if (!fs.existsSync(folder)) {
//       fs.mkdirSync(folder, {
//         recursive: true,
//       });
//     }

//     const fileName = `OrderRequest_${Date.now()}.pdf`;

//     const filePath = path.join(folder, fileName);

//     // =====================================================
//     // A5 SETTINGS
//     // =====================================================

//     /*
//       A5:
//       148mm × 210mm

//       PDF points:
//       419.53 × 595.28
//     */

//     const PAGE_WIDTH = 419.53;
//     const PAGE_HEIGHT = 595.28;

//     const MARGIN = 25;

//     const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

//     // =====================================================
//     // PDF
//     // =====================================================

//     const doc = new PDFDocument({
//       size: "A5",
//       margins: {
//         top: MARGIN,
//         bottom: MARGIN,
//         left: MARGIN,
//         right: MARGIN,
//       },
//       autoFirstPage: true,
//     });

//     const writeStream = fs.createWriteStream(filePath);

//     doc.pipe(writeStream);

//     // =====================================================
//     // LOGO
//     // =====================================================

//     const LOGO_PATH = "./public/uploads/logo.jpg";

//     function drawRoundLogo() {
//       if (!fs.existsSync(LOGO_PATH)) {
//         console.log("Logo not found:", LOGO_PATH);

//         return;
//       }

//       const logoSize = 48;

//       const x = (PAGE_WIDTH - logoSize) / 2;

//       const y = 18;

//       doc.save();

//       // Circular clipping
//       doc.circle(x + logoSize / 2, y + logoSize / 2, logoSize / 2).clip();

//       doc.image(LOGO_PATH, x, y, {
//         width: logoSize,
//         height: logoSize,
//       });

//       doc.restore();

//       // Circular border
//       doc
//         .circle(x + logoSize / 2, y + logoSize / 2, logoSize / 2)
//         .lineWidth(0.7)
//         .stroke();

//       doc.y = y + logoSize + 8;
//     }

//     // =====================================================
//     // PAGE HEADER
//     // =====================================================

//     function drawPageHeader(continuation = false) {
//       // Logo
//       drawRoundLogo();

//       // -----------------------------------------------
//       // TITLE
//       // -----------------------------------------------

//       doc
//         .font("Helvetica-Bold")
//         .fontSize(16)
//         .fillColor("#000000")
//         .text(continuation ? "ORDER REQUEST - CONTINUED" : "ORDER REQUEST", {
//           align: "center",
//           width: CONTENT_WIDTH,
//         });

//       doc.moveDown(0.35);

//       // Small separator
//       doc
//         .moveTo(MARGIN, doc.y)
//         .lineTo(PAGE_WIDTH - MARGIN, doc.y)
//         .lineWidth(0.8)
//         .stroke();

//       doc.moveDown(0.6);
//     }

//     // =====================================================
//     // ORDER INFORMATION
//     // =====================================================

//     function drawOrderInfo() {
//       const boxY = doc.y;

//       const boxHeight = 73;

//       // Outer box
//       doc
//         .roundedRect(MARGIN, boxY, CONTENT_WIDTH, boxHeight, 5)
//         .lineWidth(0.7)
//         .stroke();

//       // Title
//       doc
//         .font("Helvetica-Bold")
//         .fontSize(9)
//         .fillColor("#000000")
//         .text("ORDER INFORMATION", MARGIN + 10, boxY + 8);

//       // Left column
//       doc.font("Helvetica").fontSize(7.5);

//       doc.text(`Order ID: ${orderDisplayId}`, MARGIN + 10, boxY + 25);

//       doc.text(
//         `Date: ${
//           order.order_date
//             ? new Date(order.order_date).toLocaleDateString("en-IN")
//             : "-"
//         }`,
//         MARGIN + 10,
//         boxY + 40,
//       );

//       doc.text(`Status: ${order.order_status || "-"}`, MARGIN + 10, boxY + 55);

//       // Right column
//       const rightX = MARGIN + 205;

//       doc
//         .font("Helvetica-Bold")
//         .fontSize(8)
//         .text("SHOP", rightX, boxY + 8);

//       doc.font("Helvetica").fontSize(7.5);

//       doc.text(order.shop_name || "-", rightX, boxY + 25, {
//         width: 155,
//         ellipsis: true,
//       });

//       doc.text(`Phone: ${order.shop_phone || "-"}`, rightX, boxY + 40, {
//         width: 155,
//         ellipsis: true,
//       });

//       const address = [order.shop_address, order.city, order.state]
//         .filter(Boolean)
//         .join(", ");

//       doc.text(`Address: ${address || "-"}`, rightX, boxY + 55, {
//         width: 155,
//         ellipsis: true,
//       });

//       doc.y = boxY + boxHeight + 12;
//     }

//     // =====================================================
//     // TABLE SETTINGS
//     // =====================================================

//     const rowHeight = 21;

//     const colWidths = {
//       counter: 65,
//       category: 60,
//       department: 60,
//       sweet: 90,
//       qty: 40,
//       unit: 34,
//     };

//     // =====================================================
//     // TABLE HEADER
//     // =====================================================

//     function drawTableHeader() {
//       const y = doc.y;

//       let x = MARGIN;

//       // Background
//       doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill("#eeeeee");

//       doc.fillColor("#000000").font("Helvetica-Bold").fontSize(6.5);

//       doc.text("COUNTER", x + 3, y + 7, {
//         width: colWidths.counter - 6,
//       });

//       x += colWidths.counter;

//       doc.text("CATEGORY", x + 3, y + 7, {
//         width: colWidths.category - 6,
//       });

//       x += colWidths.category;

//       doc.text("DEPARTMENT", x + 3, y + 7, {
//         width: colWidths.department - 6,
//       });

//       x += colWidths.department;

//       doc.text("SWEET", x + 3, y + 7, {
//         width: colWidths.sweet - 6,
//       });

//       x += colWidths.sweet;

//       doc.text("QTY", x, y + 7, {
//         width: colWidths.qty,
//         align: "center",
//       });

//       x += colWidths.qty;

//       doc.text("UNIT", x, y + 7, {
//         width: colWidths.unit,
//         align: "center",
//       });

//       doc.y = y + rowHeight;

//       // Bottom line
//       doc
//         .moveTo(MARGIN, doc.y)
//         .lineTo(PAGE_WIDTH - MARGIN, doc.y)
//         .lineWidth(0.5)
//         .stroke();
//     }

//     // =====================================================
//     // DRAW ITEM
//     // =====================================================

//     function drawItem(item, index) {
//       const y = doc.y;

//       if (index % 2 === 0) {
//         doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill("#fafafa");
//       }

//       doc.fillColor("#000000").font("Helvetica").fontSize(6.8);

//       let x = MARGIN;

//       doc.text(item.counter_name || "-", x + 3, y + 7, {
//         width: colWidths.counter - 6,
//         ellipsis: true,
//       });

//       x += colWidths.counter;

//       doc.text(item.category_name || "-", x + 3, y + 7, {
//         width: colWidths.category - 6,
//         ellipsis: true,
//       });

//       x += colWidths.category;

//       doc.text(item.department_name || "-", x + 3, y + 7, {
//         width: colWidths.department - 6,
//         ellipsis: true,
//       });

//       x += colWidths.department;

//       doc.text(item.sweet_name || "-", x + 3, y + 7, {
//         width: colWidths.sweet - 6,
//         ellipsis: true,
//       });

//       x += colWidths.sweet;

//       const qty = Number(item.quantity || 0);

//       doc.text(String(qty), x, y + 7, {
//         width: colWidths.qty,
//         align: "center",
//       });

//       x += colWidths.qty;

//       doc.text(item.unit || "-", x, y + 7, {
//         width: colWidths.unit,
//         align: "center",
//       });

//       doc.y = y + rowHeight;

//       // Row separator
//       doc
//         .moveTo(MARGIN, doc.y)
//         .lineTo(PAGE_WIDTH - MARGIN, doc.y)
//         .lineWidth(0.25)
//         .stroke();
//     }

//     // =====================================================
//     // DRAW TOTAL
//     // =====================================================

//     function drawTotal(total) {
//       const y = doc.y;

//       doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight + 2).fill("#eeeeee");

//       doc.fillColor("#000000").font("Helvetica-Bold").fontSize(8);

//       doc.text("TOTAL QUANTITY", MARGIN + 8, y + 7, {
//         width: CONTENT_WIDTH - 70,
//       });

//       doc.text(String(total), PAGE_WIDTH - MARGIN - 50, y + 7, {
//         width: 40,
//         align: "right",
//       });

//       doc.y = y + rowHeight + 12;
//     }

//     // =====================================================
//     // FOOTER
//     // =====================================================

//     function drawFooter() {
//       doc
//         .font("Helvetica")
//         .fontSize(6.5)
//         .fillColor("#666666")
//         .text("System generated order request", {
//           align: "center",
//           width: CONTENT_WIDTH,
//         });

//       doc.fillColor("#000000");
//     }

//     // =====================================================
//     // FIRST PAGE HEADER
//     // =====================================================

//     drawPageHeader(false);

//     drawOrderInfo();

//     drawTableHeader();

//     // =====================================================
//     // ITEMS + PAGE BREAK
//     // =====================================================

//     let grandTotal = 0;

//     let itemIndex = 0;

//     data.forEach((item) => {
//       const qty = Number(item.quantity || 0);

//       grandTotal += qty;

//       /*
//        * A5 usable area:
//        * If current row is too close to bottom,
//        * create a new A5 page.
//        */

//       if (doc.y > PAGE_HEIGHT - 65) {
//         doc.addPage({
//           size: "A5",
//           margins: {
//             top: MARGIN,
//             bottom: MARGIN,
//             left: MARGIN,
//             right: MARGIN,
//           },
//         });

//         drawPageHeader(true);

//         drawOrderInfo();

//         drawTableHeader();

//         itemIndex = 0;
//       }

//       drawItem(item, itemIndex);

//       itemIndex++;
//     });

//     // =====================================================
//     // TOTAL
//     // =====================================================

//     /*
//      * Make sure total does not get pushed
//      * outside the A5 page.
//      */

//     if (doc.y > PAGE_HEIGHT - 45) {
//       doc.addPage({
//         size: "A5",
//         margins: {
//           top: MARGIN,
//           bottom: MARGIN,
//           left: MARGIN,
//           right: MARGIN,
//         },
//       });

//       drawPageHeader(true);
//     }

//     drawTotal(grandTotal);

//     drawFooter();

//     // =====================================================
//     // END PDF
//     // =====================================================

//     doc.end();

//     // =====================================================
//     // RESPONSE AFTER FILE CREATION
//     // =====================================================

//     writeStream.on("finish", () => {
//       // IMPORTANT: leading /
//       const fileUrl = `/public/uploads/OrderRequests/${fileName}`;

//       const serverUrl = "https://api.joswee.cloud";

//       return libFunc.sendResponse(res, {
//         status: 0,
//         msg: "Order request PDF generated successfully",
//         filePath: serverUrl + fileUrl,
//       });
//     });

//     writeStream.on("error", (error) => {
//       console.log("Order PDF write error:", error);

//       if (!res.headersSent) {
//         return res.status(500).send("Error writing order request PDF");
//       }
//     });
//   } catch (error) {
//     console.log("downloadOrderRequestPDF error:", error);

//     if (!res.headersSent) {
//       return res.status(500).send("Error generating order request PDF");
//     }
//   }
// }


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

// test 1
// async function getAllCounterRequestsByShop(req, res) {
//   try {
//     const requestTable = schema + ".counter_requests";
//     const counterTable = schema + ".counters";
//     const sweetTable = schema + ".sweets";
//     const orderItemTable = schema + ".order_items";

//     const user = req.data;

//     // ✅ Filters
//     const { status, shop_id } = req.data || {};

//     // 🔒 Role validation
//     if (user.user_role !== "SHOP_ADMIN" && user.user_role !== "ADMIN") {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Access denied",
//       });
//     }

//     // 🔹 Dynamic WHERE
//     let where = "";

//     // ✅ SHOP_ADMIN → only own shop data
//     if (user.user_role === "SHOP_ADMIN") {
//       const shopId = user.shop_id || user.shopId;

//       if (!shopId) {
//         return libFunc.sendResponse(res, {
//           status: 1,
//           msg: "Invalid shop",
//         });
//       }

//       where = `WHERE c.shop_id = '${shopId}'`;
//     }

//     // ✅ ADMIN → shop wise data only
//     if (user.user_role === "ADMIN") {
//       if (!shop_id) {
//         return libFunc.sendResponse(res, {
//           status: 1,
//           msg: "shop_id is required",
//         });
//       }

//       where = `WHERE c.shop_id = '${shop_id}'`;
//     }

//     // ✅ Status filter
//     if (status) {
//       if (where) {
//         where += ` AND r.status = '${status}'`;
//       } else {
//         where = `WHERE r.status = '${status}'`;
//       }
//     }

//     // 🔹 Query
//     const result = await db_query.customQuery(`
//       SELECT
//         r.row_id,

//         -- Counter requested quantity
//         r.quantity AS requested_quantity,

//         -- Supplier supplied quantity
//         COALESCE(
//           SUM(oi.supplied_quantity),
//           0
//         ) AS supplied_quantity,

//         -- Remaining pending quantity
//         GREATEST(
//           r.quantity - COALESCE(SUM(oi.supplied_quantity), 0),
//           0
//         ) AS pending_quantity,

//         r.status,

//         TO_CHAR(
//           r.cr_on,
//           'YYYY-MM-DD HH24:MI:SS'
//         ) AS cr_on,

//         s.row_id AS sweet_id,
//         s.sweet_name,
//         s.unit,

//         c.row_id AS counter_id,
//         c.counter_name,
//         c.location,
//         c.shop_id

//       FROM ${requestTable} r

//       LEFT JOIN ${counterTable} c
//         ON c.row_id = r.counter_id

//       LEFT JOIN ${sweetTable} s
//         ON s.row_id = r.sweet_id

//       LEFT JOIN ${orderItemTable} oi
//         ON oi.counter_id = r.counter_id
//         AND oi.sweet_id = r.sweet_id

//       ${where}

//       GROUP BY
//         r.row_id,
//         r.quantity,
//         r.status,
//         r.cr_on,

//         s.row_id,
//         s.sweet_name,
//         s.unit,

//         c.row_id,
//         c.counter_name,
//         c.location,
//         c.shop_id

//       ORDER BY r.cr_on DESC
//     `);

//     return libFunc.sendResponse(res, {
//       status: 0,
//       msg: "Shop counter requests fetched successfully",
//       data: result.data || [],
//     });
//   } catch (error) {
//     console.log("getAllCounterRequestsByShop error:", error);

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Something went wrong",
//       error: error.message,
//     });
//   }
// }

// async function getAllCounterRequestsByShop(req, res) {
//   try {
//     const requestTable = schema + ".counter_requests";
//     const counterTable = schema + ".counters";
//     const sweetTable = schema + ".sweets";
//     const orderItemTable = schema + ".order_items";

//     const user = req.data;

//     // ✅ Filters
//     const { status, shop_id } = req.data || {};

//     // 🔒 Role validation
//     if (user.user_role !== "SHOP_ADMIN" && user.user_role !== "ADMIN") {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Access denied",
//       });
//     }

//     // 🔹 Dynamic WHERE
//     let where = "";

//     // ✅ SHOP_ADMIN → only own shop data
//     if (user.user_role === "SHOP_ADMIN") {
//       const shopId = user.shop_id || user.shopId;

//       if (!shopId) {
//         return libFunc.sendResponse(res, {
//           status: 1,
//           msg: "Invalid shop",
//         });
//       }

//       where = `WHERE c.shop_id = '${shopId}'`;
//     }

//     // ✅ ADMIN → shop wise data only
//     if (user.user_role === "ADMIN") {
//       if (!shop_id) {
//         return libFunc.sendResponse(res, {
//           status: 1,
//           msg: "shop_id is required",
//         });
//       }

//       where = `WHERE c.shop_id = '${shop_id}'`;
//     }

//     // ✅ Status filter
//     if (status) {
//       if (where) {
//         where += ` AND r.status = '${status}'`;
//       } else {
//         where = `WHERE r.status = '${status}'`;
//       }
//     }

//     // 🔹 Query
//     const result = await db_query.customQuery(`
//       SELECT
//         r.row_id,

//         CONCAT('REQ-', r.id) AS requested_order,

//         -- Counter requested quantity
//         r.quantity AS requested_quantity,

//         -- Supplier supplied quantity
//         COALESCE(
//           SUM(oi.supplied_quantity),
//           0
//         ) AS supplied_quantity,

//         -- Remaining pending quantity
//         GREATEST(
//           r.quantity - COALESCE(SUM(oi.supplied_quantity), 0),
//           0
//         ) AS pending_quantity,

//         r.status,

//         -- 🔹 Request group based on cr_on
//         TO_CHAR(
//           r.cr_on,
//           'YYYY-MM-DD HH24:MI'
//         ) AS request_group,

//         TO_CHAR(
//           r.cr_on,
//           'YYYY-MM-DD HH24:MI:SS'
//         ) AS cr_on,

//         s.row_id AS sweet_id,
//         s.sweet_name,
//         s.unit,

//         c.row_id AS counter_id,
//         c.counter_name,
//         c.location,
//         c.shop_id

//       FROM ${requestTable} r

//       LEFT JOIN ${counterTable} c
//         ON c.row_id = r.counter_id

//       LEFT JOIN ${sweetTable} s
//         ON s.row_id = r.sweet_id

//       LEFT JOIN ${orderItemTable} oi
//         ON oi.counter_id = r.counter_id
//         AND oi.sweet_id = r.sweet_id

//       ${where}

//       GROUP BY
//         r.row_id,
//         r.quantity,
//         oi.item_status,
//         r.cr_on,

//         s.row_id,
//         s.sweet_name,
//         s.unit,

//         c.row_id,
//         c.counter_name,
//         c.location,
//         c.shop_id

//       ORDER BY r.cr_on DESC
//     `);

//     console.log("result", result);

//     const requests = result.data || [];

//     // 🔹 Group requests according to cr_on (YYYY-MM-DD HH:MI)
//     const groupedRequests = {};

//     requests.forEach((item) => {
//       const groupKey = item.request_group;

//       if (!groupedRequests[groupKey]) {
//         groupedRequests[groupKey] = {
//           request_group: groupKey,
//           cr_on: groupKey,
//           total_requests: 0,
//           total_requested_quantity: 0,
//           total_supplied_quantity: 0,
//           total_pending_quantity: 0,
//           requests: [],
//         };
//       }

//       groupedRequests[groupKey].total_requests += 1;

//       groupedRequests[groupKey].total_requested_quantity += Number(
//         item.requested_quantity || 0,
//       );

//       groupedRequests[groupKey].total_supplied_quantity += Number(
//         item.supplied_quantity || 0,
//       );

//       groupedRequests[groupKey].total_pending_quantity += Number(
//         item.pending_quantity || 0,
//       );

//       groupedRequests[groupKey].requests.push(item);
//     });

//     // 🔹 Convert object → array
//     const data = Object.values(groupedRequests);

//     console.log("data", data.requests);

//     return libFunc.sendResponse(res, {
//       status: 0,
//       msg: "Shop counter requests fetched successfully",
//       data,
//     });
//   } catch (error) {
//     console.log("getAllCounterRequestsByShop error:", error);

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Something went wrong",
//       error: error.message,
//     });
//   }
// }

// async function getAllCounterRequestsByShop(req, res) {
//   try {
//     const requestTable = schema + ".counter_requests";
//     const counterTable = schema + ".counters";
//     const sweetTable = schema + ".sweets";
//     const orderItemTable = schema + ".order_items";

//     const user = req.data;

//     // Filters
//     const { status, shop_id } = req.data || {};

//     // Role validation
//     if (user.user_role !== "SHOP_ADMIN" && user.user_role !== "ADMIN") {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Access denied",
//       });
//     }

//     // Dynamic WHERE
//     let where = "";

//     // SHOP_ADMIN → only own shop data
//     if (user.user_role === "SHOP_ADMIN") {
//       const shopId = user.shop_id || user.shopId;

//       if (!shopId) {
//         return libFunc.sendResponse(res, {
//           status: 1,
//           msg: "Invalid shop",
//         });
//       }

//       where = `WHERE c.shop_id = '${shopId}'`;
//     }

//     // ADMIN → shop wise data
//     if (user.user_role === "ADMIN") {
//       if (!shop_id) {
//         return libFunc.sendResponse(res, {
//           status: 1,
//           msg: "shop_id is required",
//         });
//       }

//       where = `WHERE c.shop_id = '${shop_id}'`;
//     }

//     // Status filter
//     if (status) {
//       if (where) {
//         where += ` AND r.status = '${status}'`;
//       } else {
//         where = `WHERE r.status = '${status}'`;
//       }
//     }

//     // Query
//     const result = await db_query.customQuery(`
//       SELECT
//         r.row_id,

//         CONCAT('REQ-', r.id) AS requested_order,

//         -- Requested quantity
//         r.quantity AS requested_quantity,

//         -- Supplied quantity
//         COALESCE(oi.supplied_quantity, 0) AS supplied_quantity,

//         -- Pending quantity
//         GREATEST(
//           r.quantity - COALESCE(oi.supplied_quantity, 0),
//           0
//         ) AS pending_quantity,

//         r.status,

//         -- Request group
//         TO_CHAR(
//           r.cr_on,
//           'YYYY-MM-DD HH24:MI'
//         ) AS request_group,

//         TO_CHAR(
//           r.cr_on,
//           'YYYY-MM-DD HH24:MI:SS'
//         ) AS cr_on,

//         s.row_id AS sweet_id,
//         s.sweet_name,
//         s.unit,

//         c.row_id AS counter_id,
//         c.counter_name,
//         c.location,
//         c.shop_id

//       FROM ${requestTable} r

//       LEFT JOIN ${counterTable} c
//         ON c.row_id = r.counter_id

//       LEFT JOIN ${sweetTable} s
//         ON s.row_id = r.sweet_id

//       LEFT JOIN ${orderItemTable} oi
//         ON oi.counter_id = r.counter_id
//         AND oi.sweet_id = r.sweet_id

//       ${where}

//       GROUP BY
//         r.row_id,
//         r.quantity,
//         oi.supplied_quantity,
//         r.status,
//         r.cr_on,

//         s.row_id,
//         s.sweet_name,
//         s.unit,

//         c.row_id,
//         c.counter_name,
//         c.location,
//         c.shop_id

//       ORDER BY r.cr_on DESC
//     `);

//     console.log("result", result);

//     const requests = result.data || [];

//     // Group requests according to request time
//     const groupedRequests = {};

//     requests.forEach((item) => {
//       const groupKey = item.request_group;

//       if (!groupedRequests[groupKey]) {
//         groupedRequests[groupKey] = {
//           request_group: groupKey,
//           cr_on: groupKey,
//           total_requests: 0,
//           total_requested_quantity: 0,
//           total_supplied_quantity: 0,
//           total_pending_quantity: 0,
//           requests: [],
//         };
//       }

//       groupedRequests[groupKey].total_requests += 1;

//       groupedRequests[groupKey].total_requested_quantity += Number(
//         item.requested_quantity || 0
//       );

//       groupedRequests[groupKey].total_supplied_quantity += Number(
//         item.supplied_quantity || 0
//       );

//       groupedRequests[groupKey].total_pending_quantity += Number(
//         item.pending_quantity || 0
//       );

//       groupedRequests[groupKey].requests.push(item);
//     });

//     // Convert object → array
//     const data = Object.values(groupedRequests);

//     console.log("data", data);

//     return libFunc.sendResponse(res, {
//       status: 0,
//       msg: "Shop counter requests fetched successfully",
//       data,
//     });

//   } catch (error) {
//     console.log("getAllCounterRequestsByShop error:", error);

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Something went wrong",
//       error: error.message,
//     });
//   }
// }

async function getAllCounterRequestsByShop(req, res) {
  try {
    const requestTable = schema + ".counter_requests";
    const counterTable = schema + ".counters";
    const sweetTable = schema + ".sweets";
    const orderItemTable = schema + ".order_items";

    const user = req.data;

    // Filters
    const { status, shop_id } = req.data || {};

    // =====================================
    // ROLE VALIDATION
    // =====================================

    if (user.user_role !== "SHOP_ADMIN" && user.user_role !== "ADMIN") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // =====================================
    // DYNAMIC WHERE
    // =====================================

    let conditions = [];

    // =====================================
    // SHOP_ADMIN
    // Only own shop
    // =====================================

    if (user.user_role === "SHOP_ADMIN") {
      const shopId = user.shopId;

      if (!shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop ID not found in token",
        });
      }

      conditions.push(`c.shop_id = '${shopId}'`);
    }

    // =====================================
    // ADMIN
    // Shop wise data
    // =====================================

    if (user.user_role === "ADMIN") {
      if (!shop_id) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "shop_id is required",
        });
      }

      conditions.push(`c.shop_id = '${shop_id.trim()}'`);
    }

    // =====================================
    // STATUS FILTER
    // =====================================

    if (status) {
      conditions.push(`r.status = '${status.trim()}'`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // =====================================
    // FETCH REQUESTS
    // =====================================

    const result = await db_query.customQuery(`
      SELECT

        r.row_id,

        CONCAT('REQ-', r.id) AS requested_order,

        -- Request details
        r.quantity AS requested_quantity,

        r.status AS request_status,

        -- Order item details
        COALESCE(
          oi.item_status,
          'PENDING'
        ) AS item_status,

        COALESCE(
          oi.supplied_quantity,
          0
        ) AS supplied_quantity,

        GREATEST(
          r.quantity -
          COALESCE(oi.supplied_quantity, 0),
          0
        ) AS pending_quantity,

        oi.order_id,

        oi.reject_reason,

        -- Request dates
        TO_CHAR(
          r.cr_on,
          'YYYY-MM-DD HH24:MI'
        ) AS request_group,

        TO_CHAR(
          r.cr_on,
          'YYYY-MM-DD HH24:MI:SS'
        ) AS cr_on,

        -- Sweet
        s.row_id AS sweet_id,
        s.sweet_name,
        s.unit,

        -- Counter
        c.row_id AS counter_id,
        c.counter_name,
        c.location,

        -- Shop
        c.shop_id

      FROM ${requestTable} r

      LEFT JOIN ${counterTable} c
        ON c.row_id = r.counter_id

      LEFT JOIN ${sweetTable} s
        ON s.row_id = r.sweet_id

      -- IMPORTANT:
      -- Exact request → exact order item
      LEFT JOIN ${orderItemTable} oi
        ON oi.request_id = r.row_id

      ${whereClause}

      ORDER BY r.cr_on DESC
    `);

    console.log("getAllCounterRequestsByShop result:", result);

    const requests = result.data || [];

    // =====================================
    // GROUP BY REQUEST TIME
    // =====================================

    const groupedRequests = {};

    requests.forEach((item) => {
      const groupKey = item.request_group;

      if (!groupedRequests[groupKey]) {
        groupedRequests[groupKey] = {
          request_group: groupKey,

          cr_on: groupKey,

          total_requests: 0,

          total_requested_quantity: 0,

          total_supplied_quantity: 0,

          total_pending_quantity: 0,

          requests: [],
        };
      }

      // Total requests
      groupedRequests[groupKey].total_requests += 1;

      // Requested quantity
      groupedRequests[groupKey].total_requested_quantity += Number(
        item.requested_quantity || 0,
      );

      // Supplied quantity
      groupedRequests[groupKey].total_supplied_quantity += Number(
        item.supplied_quantity || 0,
      );

      // Pending quantity
      groupedRequests[groupKey].total_pending_quantity += Number(
        item.pending_quantity || 0,
      );

      // Individual request
      groupedRequests[groupKey].requests.push(item);
    });

    // =====================================
    // OBJECT → ARRAY
    // =====================================

    const data = Object.values(groupedRequests);

    console.log("Grouped request data:", data);

    // =====================================
    // RESPONSE
    // =====================================

    return libFunc.sendResponse(res, {
      status: 0,

      msg: "Shop counter requests fetched successfully",

      data,
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
  try {
    const table = schema + ".notifications";
    const user = req.data;

    const { page = 1, limit = 10, type, is_read } = req.data || {};

    // ==============================
    // ROLE VALIDATION
    // ==============================

    if (
      !["ADMIN", "SHOP_ADMIN", "COUNTER_USER", "SUPPLIER"].includes(
        user.user_role,
      )
    ) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // ==============================
    // USER ID FROM TOKEN
    // ==============================

    if (!user.userId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "User ID not found in token",
      });
    }

    const userId = user.userId.trim().replaceAll("'", "`");

    // ==============================
    // PAGINATION VALIDATION
    // ==============================

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const offset = (pageNumber - 1) * limitNumber;

    // ==============================
    // BASE CONDITION
    // ==============================

    let conditions = [`user_id = '${userId}'`, `is_deleted = false`];

    // ==============================
    // TYPE FILTER
    // ==============================

    if (type) {
      const safeType = type.trim().replaceAll("'", "`");

      conditions.push(`type = '${safeType}'`);
    }

    // ==============================
    // READ FILTER
    // ==============================

    if (is_read !== undefined) {
      const readValue = is_read === true || is_read === "true";

      const unreadValue = is_read === false || is_read === "false";

      if (!readValue && !unreadValue) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Invalid is_read value",
        });
      }

      conditions.push(`is_read = ${readValue}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // ==============================
    // FETCH NOTIFICATIONS
    // ==============================

    const notifications = await db_query.customQuery(`
        SELECT
          row_id,
          title,
          message,
          type,
          reference_id,
          reference_type,
          priority,
          is_read,
          cr_on,
          up_on

        FROM ${table}

        ${whereClause}

        ORDER BY
          cr_on DESC

        LIMIT ${limitNumber}
        OFFSET ${offset}
      `);

    // ==============================
    // TOTAL COUNT
    // ==============================

    const countRes = await db_query.customQuery(`
        SELECT COUNT(*) AS total

        FROM ${table}

        ${whereClause}
      `);

    const total = Number(countRes.data?.[0]?.total || 0);

    // ==============================
    // UNREAD COUNT
    // ==============================

    const unreadRes = await db_query.customQuery(`
        SELECT COUNT(*) AS unread

        FROM ${table}

        WHERE user_id = '${userId}'
        AND is_read = false
        AND is_deleted = false
      `);

    const unread = Number(unreadRes.data?.[0]?.unread || 0);

    // ==============================
    // TOTAL PAGES
    // ==============================

    const totalPages = Math.ceil(total / limitNumber);

    // ==============================
    // SUCCESS
    // ==============================

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Notifications fetched successfully",
      data: {
        notifications: notifications.data || [],

        total,

        unread,

        page: pageNumber,

        limit: limitNumber,

        total_pages: totalPages,
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

    const user = req.data;
    const { notification_id } = req.data || {};

    // ==============================
    // USER ID FROM TOKEN
    // ==============================

    if (!user.userId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "User ID not found in token",
      });
    }

    if (!notification_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "notification_id required",
      });
    }

    const notificationId = notification_id.trim().replaceAll("'", "`");

    const userId = user.userId.trim().replaceAll("'", "`");

    // ==============================
    // MARK AS READ
    // ==============================

    const result = await db_query.customQuery(`
      UPDATE ${table}

      SET
        is_read = true,
        up_on = now()

      WHERE row_id = '${notificationId}'
      AND user_id = '${userId}'
      AND is_deleted = false

      RETURNING row_id
    `);

    // ==============================
    // NOT FOUND / UNAUTHORIZED
    // ==============================

    if (!result.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Notification not found or unauthorized",
      });
    }

    // ==============================
    // SUCCESS
    // ==============================

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Notification marked as read",
      data: {
        notification_id: notificationId,
        is_read: true,
      },
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
    const user = req.data;

    const { sweet_id, start_date, end_date, counter_id, shop_id } =
      req.data || {};

    const expiryTable = schema + ".expiry_logs";
    const sweetTable = schema + ".sweets";
    const counterTable = schema + ".counters";
    const shopTable = schema + ".shops";

    // ==============================
    // ROLE VALIDATION
    // ==============================

    if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    let conditions = [];

    // ==============================
    // SHOP ADMIN
    // ==============================

    if (user.user_role === "SHOP_ADMIN") {
      if (!user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop ID not found in token",
        });
      }

      // If counter_id is provided,
      // make sure it belongs to this shop.
      if (counter_id) {
        conditions.push(
          `e.counter_id = '${counter_id.trim().replaceAll("'", "`")}'`,
        );
      }

      conditions.push(`c.shop_id = '${user.shopId}'`);
    }

    // ==============================
    // COUNTER USER
    // ==============================

    if (user.user_role === "COUNTER_USER") {
      if (!user.counterId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Counter ID missing in user token",
        });
      }

      conditions.push(
        `e.counter_id = '${user.counterId.trim().replaceAll("'", "`")}'`,
      );
    }

    // ==============================
    // ADMIN
    // ==============================

    if (user.user_role === "ADMIN") {
      if (shop_id) {
        conditions.push(`c.shop_id = '${shop_id.trim().replaceAll("'", "`")}'`);
      }

      if (counter_id) {
        conditions.push(
          `e.counter_id = '${counter_id.trim().replaceAll("'", "`")}'`,
        );
      }
    }

    // ==============================
    // SWEET FILTER
    // ==============================

    if (sweet_id) {
      conditions.push(`e.sweet_id = '${sweet_id.trim().replaceAll("'", "`")}'`);
    }

    // ==============================
    // DATE FILTER
    // ==============================

    if (start_date) {
      conditions.push(
        `e.expiry_date >= '${start_date.trim().replaceAll("'", "`")}'`,
      );
    }

    if (end_date) {
      conditions.push(
        `e.expiry_date <= '${end_date.trim().replaceAll("'", "`")}'`,
      );
    }

    // ==============================
    // WHERE
    // ==============================

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // ==============================
    // QUERY
    // ==============================

    const query = `
      SELECT

        e.row_id AS expiry_log_id,
        e.id AS expiry_serial_id,

        e.counter_id,
        c.counter_name,
        c.location,

        c.shop_id,
        sh.shop_name,

        e.sweet_id,
        s.sweet_name,
        s.unit,

        e.inventory_id,
        e.quantity,
        e.expiry_date,

        e.loss_amount,
        e.reason,

        e.cr_on,
        e.up_on

      FROM ${expiryTable} e

      LEFT JOIN ${sweetTable} s
        ON s.row_id = e.sweet_id

      LEFT JOIN ${counterTable} c
        ON c.row_id = e.counter_id

      LEFT JOIN ${shopTable} sh
        ON sh.row_id = c.shop_id

      ${whereClause}

      ORDER BY
        e.expiry_date DESC,
        e.cr_on DESC
    `;

    console.log("fetchExpiryLogs query:", query);

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

    const safeOrderId = order_id.trim().replaceAll("'", "`");

    // =====================================================
    // FETCH ORDER ITEMS
    // =====================================================

    const itemsRes = await db_query.customQuery(`
      SELECT
        row_id,
        item_status
      FROM ${itemTable}
      WHERE order_id = '${safeOrderId}'
    `);

    const items = itemsRes.data || [];

    if (!items.length) {
      console.log(`No order items found for order ${order_id}`);
      return;
    }

    // =====================================================
    // STATUS COUNTERS
    // =====================================================

    let accepted = 0;
    let partial = 0;
    let rejected = 0;
    let pending = 0;

    for (const item of items) {
      const status = item.item_status || "PENDING";

      switch (status) {
        case "ACCEPTED":
          accepted++;
          break;

        case "PARTIAL":
          partial++;
          break;

        case "REJECTED":
          rejected++;
          break;

        case "PENDING":
        default:
          pending++;
          break;
      }
    }

    const total = items.length;

    // =====================================================
    // DETERMINE ORDER STATUS
    // =====================================================

    let finalStatus = "PENDING";

    // ---------------------------------------------
    // ALL ITEMS ACCEPTED
    // ---------------------------------------------

    if (accepted === total) {
      finalStatus = "ACCEPTED";
    }

    // ---------------------------------------------
    // ALL ITEMS REJECTED
    // ---------------------------------------------
    else if (rejected === total) {
      finalStatus = "REJECTED";
    }

    // ---------------------------------------------
    // ANY ITEM STILL PENDING
    // ---------------------------------------------
    //
    // If supplier has not processed all items,
    // order should remain PENDING unless there is
    // already a processed/mixed state.
    //
    else if (pending === total) {
      finalStatus = "PENDING";
    }

    // ---------------------------------------------
    // PARTIAL / MIXED PROCESSING
    // ---------------------------------------------
    //
    // Examples:
    //
    // ACCEPTED + REJECTED
    // ACCEPTED + PARTIAL
    // PARTIAL + REJECTED
    // ACCEPTED + PARTIAL + REJECTED
    // ACCEPTED + PENDING
    // PARTIAL + PENDING
    //
    else {
      finalStatus = "PARTIAL";
    }

    // =====================================================
    // UPDATE ORDER
    // =====================================================

    await db_query.addData(
      orderTable,
      {
        order_status: finalStatus,
      },
      order_id,
      "Order",
    );

    console.log(`Order ${order_id} status updated to ${finalStatus}`);
  } catch (err) {
    console.error("updateOrderStatusBasedOnItems error:", err);

    throw err;
  }
}

async function updateOrderItemsBySupplier(req, res) {
  try {
    const { order_id, items } = req.data || {};
    const user = req.data;

    const orderTable = schema + ".orders";
    const orderItemTable = schema + ".order_items";

    console.log("updateOrderItemsBySupplier:", req.data);

    // =====================================================
    // ROLE VALIDATION
    // =====================================================

    if (!user || user.user_role !== "SUPPLIER") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only supplier allowed",
      });
    }

    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (!order_id || !Array.isArray(items) || items.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order and items required",
      });
    }

    if (!user.supplierId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Supplier ID not found in token",
      });
    }

    const orderId = order_id.trim().replaceAll("'", "`");

    // =====================================================
    // CHECK ORDER
    // =====================================================

    const orderCheck = await db_query.customQuery(`
      SELECT
        row_id,
        shop_id,
        supplier_id,
        order_status,
        order_type,
        parent_order_id,
        resolution_status
      FROM ${orderTable}
      WHERE row_id = '${orderId}'
      LIMIT 1
    `);

    if (!orderCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid order",
      });
    }

    const order = orderCheck.data[0];

    // =====================================================
    // SUPPLIER OWNERSHIP
    // =====================================================

    if (order.supplier_id !== user.supplierId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Unauthorized order",
      });
    }

    // =====================================================
    // ORDER STATUS CHECK
    // =====================================================

    if (!["PENDING", "ACCEPTED", "PARTIAL"].includes(order.order_status)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: `Items cannot be updated when order status is ${order.order_status}`,
      });
    }

    // =====================================================
    // RESOLUTION CHECK
    // =====================================================

    if (order.resolution_status === "RESOLVED") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order is already resolved",
      });
    }

    // =====================================================
    // TRANSACTION
    // =====================================================

    await connect_db.query("BEGIN");

    try {
      // ===================================================
      // DUPLICATE ITEM CHECK
      // ===================================================

      const itemIds = items.map((item) => item.order_item_id).filter(Boolean);

      const uniqueItemIds = [...new Set(itemIds)];

      if (uniqueItemIds.length !== itemIds.length) {
        await connect_db.query("ROLLBACK");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Duplicate order item found",
        });
      }

      // ===================================================
      // PROCESS ITEMS
      // ===================================================

      for (const item of items) {
        const {
          order_item_id,
          supplied_quantity = 0,
          status,
          // reason = "",
        } = item;

        // ===============================================
        // ITEM STATUS VALIDATION
        // ===============================================

        if (!["ACCEPTED", "PARTIAL", "REJECTED"].includes(status)) {
          await connect_db.query("ROLLBACK");

          return libFunc.sendResponse(res, {
            status: 1,
            msg: "Invalid item status. Use ACCEPTED, PARTIAL or REJECTED",
          });
        }

        // ===============================================
        // ORDER ITEM ID
        // ===============================================

        if (!order_item_id) {
          await connect_db.query("ROLLBACK");

          return libFunc.sendResponse(res, {
            status: 1,
            msg: "order_item_id is required for every item",
          });
        }

        const orderItemId = order_item_id.trim().replaceAll("'", "`");

        // ===============================================
        // SUPPLIED QUANTITY
        // ===============================================

        const suppliedQty = Number(supplied_quantity);

        if (!Number.isFinite(suppliedQty) || suppliedQty < 0) {
          await connect_db.query("ROLLBACK");

          return libFunc.sendResponse(res, {
            status: 1,
            msg: "Invalid supplied quantity",
          });
        }

        // ===============================================
        // CHECK ORDER ITEM
        // ===============================================

        const itemCheck = await db_query.customQuery(`
            SELECT
              oi.row_id,
              oi.order_id,
              oi.quantity,
              oi.supplied_quantity,
              oi.cancelled_quantity,
              oi.item_status,
              oi.parent_order_item_id
            FROM ${orderItemTable} oi
            WHERE oi.row_id = '${orderItemId}'
            AND oi.order_id = '${orderId}'
            LIMIT 1
          `);

        if (!itemCheck.data?.length) {
          await connect_db.query("ROLLBACK");

          return libFunc.sendResponse(res, {
            status: 1,
            msg: `Invalid order item: ${order_item_id}`,
          });
        }

        const orderItem = itemCheck.data[0];

        // ===============================================
        // REQUESTED QUANTITY
        // ===============================================

        const requestedQty = Number(orderItem.quantity || 0);

        // ===============================================
        // CANCELLED QUANTITY
        // ===============================================

        const cancelledQty = Number(orderItem.cancelled_quantity || 0);

        // ===============================================
        // SUPPLIED QUANTITY CANNOT EXCEED REQUEST
        // ===============================================

        if (suppliedQty > requestedQty) {
          await connect_db.query("ROLLBACK");

          return libFunc.sendResponse(res, {
            status: 1,
            msg: `Supplied quantity cannot exceed requested quantity for item ${order_item_id}`,
          });
        }

        // ===============================================
        // CANCELLED ITEM CANNOT BE SUPPLIED
        // ===============================================

        if (cancelledQty > 0 && status !== "REJECTED") {
          await connect_db.query("ROLLBACK");

          return libFunc.sendResponse(res, {
            status: 1,
            msg: "Cancelled item cannot be supplied",
          });
        }

        // ===============================================
        // REJECTED
        // ===============================================

        if (status === "REJECTED" && suppliedQty > 0) {
          await connect_db.query("ROLLBACK");

          return libFunc.sendResponse(res, {
            status: 1,
            msg: "Rejected item cannot have supplied quantity",
          });
        }

        // ===============================================
        // REJECT REASON
        // ===============================================

        // if (status === "REJECTED" && !String(reason).trim()) {
        //   await connect_db.query("ROLLBACK");

        //   return libFunc.sendResponse(res, {
        //     status: 1,
        //     msg: "Reject reason is required for rejected item",
        //   });
        // }

        // ===============================================
        // ACCEPTED = FULL SUPPLY
        // ===============================================

        if (status === "ACCEPTED" && suppliedQty !== requestedQty) {
          await connect_db.query("ROLLBACK");

          return libFunc.sendResponse(res, {
            status: 1,
            msg: `Accepted item must have full supplied quantity (${requestedQty})`,
          });
        }

        // ===============================================
        // PARTIAL
        // ===============================================

        if (status === "PARTIAL") {
          if (suppliedQty <= 0) {
            await connect_db.query("ROLLBACK");

            return libFunc.sendResponse(res, {
              status: 1,
              msg: "Partial item must have supplied quantity greater than 0",
            });
          }

          if (suppliedQty >= requestedQty) {
            await connect_db.query("ROLLBACK");

            return libFunc.sendResponse(res, {
              status: 1,
              msg: "Partial supplied quantity must be less than requested quantity",
            });
          }
        }

        // ===============================================
        // SAFE REASON
        // ===============================================

        // const safeReason = String(reason || "")
        //   .trim()
        //   .replaceAll("'", "`");

        // ===============================================
        // UPDATE ORDER ITEM
        // ===============================================

        await db_query.customQuery(`
          UPDATE ${orderItemTable}
          SET
            item_status = '${status}',
            supplied_quantity = ${suppliedQty},
            up_on = NOW()
          WHERE row_id = '${orderItemId}'
          AND order_id = '${orderId}'
        `);
      }

      // ===================================================
      // UPDATE CURRENT ORDER STATUS
      // ===================================================

      await updateOrderStatusBasedOnItems(orderId);

      // ===================================================
      // UPDATE ROOT ORDER RESOLUTION
      // ===================================================
      //
      // NORMAL:
      //   root order = current order
      //
      // REORDER:
      //   root order = parent_order_id
      //
      // Reorder child supplied quantity must be counted
      // against original/root item.
      // ===================================================

      let rootOrderId = orderId;

      if (order.order_type === "REORDER" && order.parent_order_id) {
        rootOrderId = order.parent_order_id;
      }

      await updateOrderResolution(rootOrderId);

      // ===================================================
      // COMMIT
      // ===================================================

      await connect_db.query("COMMIT");

      // ===================================================
      // RESPONSE
      // ===================================================

      return libFunc.sendResponse(res, {
        status: 0,
        msg: "Order items updated successfully",
        data: {
          order_id: orderId,
          order_type: order.order_type || "NORMAL",
          root_order_id: rootOrderId,
        },
      });
    } catch (transactionError) {
      try {
        await connect_db.query("ROLLBACK");
      } catch (rollbackError) {
        console.log("Rollback error:", rollbackError);
      }

      throw transactionError;
    }
  } catch (error) {
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
    const userTable = schema + ".users";

    const { order_id, dispatch_date, transport_details = "" } = req.data || {};

    const user = req.data;

    // =====================================================
    // ROLE VALIDATION
    // =====================================================

    if (!user || user.user_role !== "SUPPLIER") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only supplier allowed",
      });
    }

    if (!user.supplierId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Supplier ID not found in token",
      });
    }

    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (!order_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order ID required",
      });
    }

    const orderId = order_id.trim().replaceAll("'", "`");

    // =====================================================
    // GET ORDER
    // =====================================================

    const orderData = await db_query.customQuery(`
        SELECT
          row_id,
          supplier_id,
          shop_id,
          order_status,
          order_type,
          parent_order_id,
          resolution_status
        FROM ${orderTable}
        WHERE row_id = '${orderId}'
        LIMIT 1
      `);

    if (!orderData.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid order",
      });
    }

    const order = orderData.data[0];

    // =====================================================
    // SUPPLIER OWNERSHIP
    // =====================================================

    if (order.supplier_id !== user.supplierId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Unauthorized order",
      });
    }

    // =====================================================
    // RESOLUTION CHECK
    // =====================================================

    // if (order.resolution_status === "RESOLVED") {
    //   return libFunc.sendResponse(res, {
    //     status: 1,
    //     msg: "Order is already resolved",
    //   });
    // }

    // =====================================================
    // ORDER STATUS
    // =====================================================

    if (!["ACCEPTED", "PARTIAL"].includes(order.order_status)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: `Chalan cannot be created when order status is ${order.order_status}`,
      });
    }

    // =====================================================
    // CHECK EXISTING CHALAN
    // =====================================================
    //
    // This is per ORDER.
    //
    // NORMAL order:
    //   normal order can have one challan
    //
    // REORDER order:
    //   reorder child order can have its own challan
    //
    // Therefore we check order_id, NOT parent_order_id.
    // =====================================================

    const existingChalan = await db_query.customQuery(`
        SELECT
          row_id,
          is_verified
        FROM ${chalanTable}
        WHERE order_id = '${orderId}'
        AND supplier_id = '${user.supplierId}'
        LIMIT 1
      `);

    if (existingChalan.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Chalan already created for this order",
        data: {
          chalan_id: existingChalan.data[0].row_id,
          is_verified: existingChalan.data[0].is_verified,
        },
      });
    }

    // =====================================================
    // CHECK ORDER ITEMS
    // =====================================================
    //
    // At least one item must have supplied quantity > 0.
    //
    // Rejected-only order should not generate challan.
    // =====================================================

    const itemCheck = await db_query.customQuery(`
        SELECT
          row_id,
          item_status,
          quantity,
          supplied_quantity
        FROM ${schema}.order_items
        WHERE order_id = '${orderId}'
        AND COALESCE(
          supplied_quantity,
          0
        )::numeric > 0
      `);

    if (!itemCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Chalan cannot be created because no quantity is available for dispatch",
      });
    }

    // =====================================================
    // BEGIN TRANSACTION
    // =====================================================

    await client.query("BEGIN");

    // =====================================================
    // GENERATE CHALAN ID
    // =====================================================

    const chalanRowId = libFunc.randomid();

    // =====================================================
    // GENERATE VERIFICATION OTP
    // =====================================================

    const verification_code = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    // =====================================================
    // CREATE CHALAN
    // =====================================================

    await db_query.addData(
      chalanTable,
      {
        row_id: chalanRowId,
        order_id: orderId,
        supplier_id: user.supplierId,
        dispatch_date: dispatch_date || null,
        transport_details: String(transport_details || "")
          .trim()
          .replaceAll("'", "`"),
        verification_code,
        is_verified: false,
      },
      null,
      "Chalan",
    );

    // =====================================================
    // UPDATE ORDER STATUS
    // =====================================================

    await db_query.addData(
      orderTable,
      {
        order_status: "DISPATCHED",
      },
      orderId,
      "Order",
    );

    // =====================================================
    // COMMIT
    // =====================================================

    await client.query("COMMIT");

    // =====================================================
    // NOTIFICATION → SHOP ADMIN
    // =====================================================

    const shopAdmins = await db_query.customQuery(`
        SELECT
          row_id
        FROM ${userTable}
        WHERE role = 'SHOP_ADMIN'
        AND shop_id = '${order.shop_id}'
      `);

    if (shopAdmins.data?.length) {
      for (const admin of shopAdmins.data) {
        await createNotification({
          user_id: admin.row_id,
          title:
            order.order_type === "REORDER"
              ? "Reorder Dispatched"
              : "Order Dispatched",

          message:
            order.order_type === "REORDER"
              ? `Reorder dispatched successfully. Verification OTP: ${verification_code}`
              : `Order dispatched successfully. Verification OTP: ${verification_code}`,

          type: "CHALLAN",
          reference_id: chalanRowId,
        });
      }
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Chalan created successfully. Waiting for verification.",

      data: {
        chalan_id: chalanRowId,
        order_id: orderId,

        order_type: order.order_type || "NORMAL",

        parent_order_id: order.parent_order_id || null,

        verification_required: true,

        otp: verification_code,
      },
    });
  } catch (error) {
    // =====================================================
    // ROLLBACK
    // =====================================================

    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.log("Rollback error:", rollbackError);
    }

    console.log("createChalan error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function verifyChalan(req, res) {
  const client = connect_db;

  try {
    const user = req.data;

    const { chalan_id, otp } = req.data || {};

    // =====================================================
    // 1. ROLE VALIDATION
    // =====================================================

    if (!user || user.user_role !== "SHOP_ADMIN") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only shop admin can verify chalan",
      });
    }

    if (!user.shopId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Shop ID not found in token",
      });
    }

    if (!chalan_id || !otp) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Chalan ID and OTP required",
      });
    }

    const chalanId = chalan_id.trim().replaceAll("'", "`");

    const enteredOtp = otp.toString().trim();

    // =====================================================
    // BEGIN TRANSACTION
    // =====================================================

    await client.query("BEGIN");

    // =====================================================
    // 2. GET CHALAN + ORDER
    // =====================================================

    const chalanRes = await client.query(`
      SELECT
        ch.row_id AS chalan_id,
        ch.order_id,
        ch.supplier_id,
        ch.dispatch_date,
        ch.verification_code,
        ch.is_verified,

        o.shop_id,
        o.order_status,
        o.order_type,
        o.parent_order_id,
        o.resolution_status

      FROM ${schema}.chalans ch

      INNER JOIN ${schema}.orders o
        ON o.row_id = ch.order_id

      WHERE ch.row_id = '${chalanId}'
      AND o.shop_id = '${user.shopId}'

      FOR UPDATE
    `);

    if (chalanRes.rows.length === 0) {
      await client.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid chalan or unauthorized shop",
      });
    }

    const chalan = chalanRes.rows[0];

    // =====================================================
    // 3. ALREADY VERIFIED
    // =====================================================

    if (chalan.is_verified) {
      await client.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Chalan already verified",
      });
    }

    // =====================================================
    // 4. OTP VERIFY
    // =====================================================

    if (chalan.verification_code !== enteredOtp) {
      await client.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid OTP",
      });
    }

    // =====================================================
    // 5. ORDER STATUS VALIDATION
    // =====================================================

    if (!["DISPATCHED", "ACCEPTED", "PARTIAL"].includes(chalan.order_status)) {
      await client.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: `Chalan cannot be verified when order status is ${chalan.order_status}`,
      });
    }

    // =====================================================
    // 6. GET ORDER ITEMS
    // =====================================================

    const itemsRes = await client.query(`
      SELECT
        oi.row_id AS order_item_id,
        oi.request_id,

        oi.sweet_id,
        oi.counter_id,

        oi.quantity AS ordered_quantity,

        COALESCE(
          oi.supplied_quantity,
          0
        )::numeric AS supplied_quantity,

        oi.item_status,

        s.sweet_name,
        s.shelf_life_days

      FROM ${schema}.order_items oi

      LEFT JOIN ${schema}.sweets s
        ON s.row_id = oi.sweet_id

      WHERE oi.order_id = '${chalan.order_id}'

      AND COALESCE(
        oi.supplied_quantity,
        0
      )::numeric > 0
    `);

    const items = itemsRes.rows;

    if (items.length === 0) {
      await client.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "No supplied items found for this order",
      });
    }

    // =====================================================
    // 7. PROCESS INVENTORY
    // =====================================================

    const inventoryItems = [];

    for (const item of items) {
      const sweetId = item.sweet_id;
      const counterId = item.counter_id;

      const qty = Number(item.supplied_quantity || 0);

      // ================================================
      // COUNTER VALIDATION
      // ================================================

      if (!counterId) {
        await client.query("ROLLBACK");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: `Counter not found for sweet ${item.sweet_name}`,
        });
      }

      if (qty <= 0) {
        continue;
      }

      // ================================================
      // EXPIRY DATE
      // ================================================

      const shelfLife = Number(item.shelf_life_days || 0);

      const dispatchDate = chalan.dispatch_date
        ? new Date(chalan.dispatch_date)
        : new Date();

      if (Number.isNaN(dispatchDate.getTime())) {
        await client.query("ROLLBACK");

        return libFunc.sendResponse(res, {
          status: 1,
          msg: `Invalid dispatch date for chalan ${chalanId}`,
        });
      }

      dispatchDate.setDate(dispatchDate.getDate() + shelfLife);

      const expiryDate = dispatchDate.toISOString().split("T")[0];

      // ================================================
      // INVENTORY UPSERT
      // ================================================

      await client.query(`
        INSERT INTO ${schema}.inventory
        (
          row_id,
          counter_id,
          sweet_id,
          quantity,
          expiry_date
        )
        VALUES
        (
          '${libFunc.randomid()}',
          '${counterId}',
          '${sweetId}',
          ${qty},
          '${expiryDate}'
        )

        ON CONFLICT (
          counter_id,
          sweet_id
        )

        DO UPDATE SET

          quantity =
            COALESCE(
              ${schema}.inventory.quantity::numeric,
              0
            )
            +
            EXCLUDED.quantity::numeric,

          expiry_date =
            EXCLUDED.expiry_date,

          up_on = NOW()
      `);

      // ================================================
      // STOCK TRANSACTION
      // ================================================

      await client.query(`
        INSERT INTO ${schema}.stock_transactions
        (
          row_id,
          counter_id,
          sweet_id,
          transaction_type,
          quantity,
          reference_id,
          notes
        )
        VALUES
        (
          '${libFunc.randomid()}',
          '${counterId}',
          '${sweetId}',
          'IN',
          ${qty},
          '${chalanId}',
          'Chalan verified - stock received'
        )
      `);

      inventoryItems.push({
        order_item_id: item.order_item_id,

        sweet_id: sweetId,

        sweet_name: item.sweet_name,

        counter_id: counterId,

        quantity: qty,

        expiry_date: expiryDate,
      });
    }

    // =====================================================
    // 8. MARK CHALAN VERIFIED
    // =====================================================

    await client.query(`
      UPDATE ${schema}.chalans
      SET
        is_verified = TRUE,
        up_on = NOW()
      WHERE row_id = '${chalanId}'
    `);

    // =====================================================
    // 9. CURRENT ORDER → DELIVERED
    // =====================================================

    await client.query(`
      UPDATE ${schema}.orders
      SET
        order_status = 'DELIVERED',
        up_on = NOW()
      WHERE row_id = '${chalan.order_id}'
    `);

    // =====================================================
    // 10. UPDATE ROOT ORDER RESOLUTION
    // =====================================================
    //
    // NORMAL:
    //   rootOrderId = current order
    //
    // REORDER:
    //   rootOrderId = parent_order_id
    //
    // This recalculates:
    //
    // requested
    // - root supplied
    // - all reorder supplied
    // - cancelled
    //
    // and sets OPEN / RESOLVED.
    // =====================================================

    let rootOrderId = chalan.order_id;

    if (chalan.order_type === "REORDER" && chalan.parent_order_id) {
      rootOrderId = chalan.parent_order_id;
    }

    await updateOrderResolution(rootOrderId);

    // =====================================================
    // 11. COMMIT
    // =====================================================

    await client.query("COMMIT");

    // =====================================================
    // 12. RESPONSE
    // =====================================================

    return libFunc.sendResponse(res, {
      status: 0,

      msg: "Chalan verified & inventory updated successfully",

      data: {
        chalan_id: chalanId,

        order_id: chalan.order_id,

        order_type: chalan.order_type || "NORMAL",

        parent_order_id: chalan.parent_order_id || null,

        root_order_id: rootOrderId,

        order_status: "DELIVERED",

        resolution_status:
          chalan.order_type === "REORDER" ? "UPDATED_ON_ROOT_ORDER" : "UPDATED",

        inventory_items: inventoryItems,
      },
    });
  } catch (error) {
    // =====================================================
    // ROLLBACK
    // =====================================================

    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.log("Rollback error:", rollbackError);
    }

    console.log("verifyChalan error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
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

    // =========================
    // ROLE VALIDATION
    // =========================

    if (user.user_role !== "SHOP_ADMIN") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only shop admin allowed",
      });
    }

    if (!user.shopId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Shop ID not found in token",
      });
    }

    const shopId = user.shopId;

    // =========================
    // SAFE DATA
    // =========================

    function safeData(response) {
      return response && response.status === 0 && Array.isArray(response.data)
        ? response.data
        : [];
    }

    // =========================
    // 1. FETCH CHALANS
    // =========================

    const chalansRes = await db_query.customQuery(`
      SELECT
        ch.row_id AS chalan_id,
        ch.order_id,
        ch.dispatch_date,
        ch.transport_details,
        ch.verification_code,
        ch.is_verified,

        o.order_status,

        sup.row_id AS supplier_id,
        sup.supplier_name

      FROM ${schema}.chalans ch

      INNER JOIN ${schema}.orders o
        ON o.row_id = ch.order_id

      LEFT JOIN ${schema}.suppliers sup
        ON sup.row_id = ch.supplier_id

      WHERE o.shop_id = '${shopId.replaceAll("'", "`")}'

      ORDER BY ch.cr_on DESC
    `);

    const chalans = safeData(chalansRes);

    const result = [];

    // =========================
    // 2. EACH CHALAN
    // =========================

    for (const ch of chalans) {
      // =========================
      // 3. CHALAN ITEMS
      // =========================

      const chalanItemsRes = await db_query.customQuery(`
        SELECT
          ci.sweet_id,
          s.sweet_name,
          ci.dispatched_quantity

        FROM ${schema}.chalan_items ci

        LEFT JOIN ${schema}.sweets s
          ON s.row_id = ci.sweet_id

        WHERE ci.chalan_id = '${ch.chalan_id}'
      `);

      const chalanItems = safeData(chalanItemsRes);

      // =========================
      // 4. ORDER ITEMS
      // =========================

      const orderItemsRes = await db_query.customQuery(`
        SELECT
          oi.row_id AS order_item_id,
          oi.request_id,
          oi.sweet_id,

          s.sweet_name,
          s.unit,

          oi.quantity AS ordered_qty,
          oi.supplied_quantity,
          oi.item_status,
          oi.reject_reason,

          oi.counter_id,
          c.counter_name,
          c.location

        FROM ${schema}.order_items oi

        LEFT JOIN ${schema}.sweets s
          ON s.row_id = oi.sweet_id

        LEFT JOIN ${schema}.counters c
          ON c.row_id = oi.counter_id

        WHERE oi.order_id = '${ch.order_id}'
      `);

      const orderItems = safeData(orderItemsRes);

      // =========================
      // 5. MERGE
      // =========================

      const finalItems = [];

      for (const oi of orderItems) {
        /*
         * IMPORTANT:
         * request_id identifies the exact
         * counter request for this order item.
         */

        let requestedQty = 0;

        if (oi.request_id) {
          const requestRes = await db_query.customQuery(`
              SELECT quantity
              FROM ${schema}.counter_requests
              WHERE row_id = '${oi.request_id}'
            `);

          const requestData = safeData(requestRes);

          if (requestData.length) {
            requestedQty = Number(requestData[0].quantity || 0);
          }
        }

        // =========================
        // CHALAN QUANTITY
        // =========================

        const chItem = chalanItems.find(
          (item) => item.sweet_id === oi.sweet_id,
        );

        const dispatchedQty = chItem
          ? Number(chItem.dispatched_quantity || 0)
          : 0;

        // =========================
        // FINAL ITEM
        // =========================

        finalItems.push({
          order_item_id: oi.order_item_id,
          request_id: oi.request_id,

          sweet_id: oi.sweet_id,
          sweet_name: oi.sweet_name,
          unit: oi.unit,

          requested_qty: requestedQty,

          ordered_qty: Number(oi.ordered_qty || 0),

          supplied_qty: Number(oi.supplied_quantity || 0),

          dispatched_qty: dispatchedQty,

          item_status: oi.item_status || "PENDING",

          reject_reason: oi.reject_reason,

          counter: {
            counter_id: oi.counter_id,
            counter_name: oi.counter_name,
            location: oi.location,
          },
        });
      }

      // =========================
      // FINAL CHALAN
      // =========================

      result.push({
        chalan_id: ch.chalan_id,

        order_id: ch.order_id,
        order_status: ch.order_status,

        supplier: {
          supplier_id: ch.supplier_id,
          supplier_name: ch.supplier_name,
        },

        dispatch_date: ch.dispatch_date,
        transport_details: ch.transport_details,

        otp: ch.verification_code,
        is_verified: ch.is_verified,

        items: finalItems,
      });
    }

    // =========================
    // RESPONSE
    // =========================

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
  order_date::date::text AS date,
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

// async function getShopDashboard(user) {
//   try {
//     const shopId = user.shopId;

//     const summaryQuery = `
//       SELECT
//         COUNT(*) as total_orders,
//         COUNT(*) FILTER (WHERE order_status='PENDING') as pending,
//         COUNT(*) FILTER (WHERE order_status='ACCEPTED') as approved,
//         COUNT(*) FILTER (WHERE order_status='REJECTED') as rejected
//       FROM sms.orders
//       WHERE shop_id = '${shopId}'
//     `;

//     const lowStockQuery = `
//       SELECT
//         i.*,
//         s.sweet_name
//       FROM sms.inventory i

//       JOIN sms.sweets s
//         ON s.row_id = i.sweet_id

//       JOIN sms.counters c
//         ON c.row_id = i.counter_id

//       WHERE i.quantity::int <= i.min_stock
//         AND c.shop_id = '${shopId}'

//       LIMIT 10
//     `;

//     const outStockQuery = `
//       SELECT
//         i.*,
//         s.sweet_name
//       FROM sms.inventory i

//       JOIN sms.sweets s
//         ON s.row_id = i.sweet_id

//       JOIN sms.counters c
//         ON c.row_id = i.counter_id

//       WHERE i.quantity::numeric = 0
//         AND c.shop_id = '${shopId}'
//     `;

//     const expiryQuery = `
//       SELECT
//         i.*,
//         s.sweet_name
//       FROM sms.inventory i

//       LEFT JOIN sms.sweets s
//         ON s.row_id = i.sweet_id

//       WHERE i.expiry_date <= CURRENT_DATE + INTERVAL '2 days'
//         AND i.counter_id IN (
//           SELECT row_id
//           FROM sms.counters
//           WHERE shop_id = '${shopId}'
//         )

//       ORDER BY i.expiry_date ASC
//       LIMIT 10
//     `;

//     const trendQuery = `
//       SELECT
//         order_date::date::text AS date,
//         COUNT(*) AS count
//       FROM sms.orders
//       WHERE shop_id = '${shopId}'
//       GROUP BY order_date::date
//       ORDER BY date DESC
//       LIMIT 7
//     `;

//     const financialQuery = `
//       SELECT
//         COALESCE(
//           SUM(
//             oi.quantity::numeric * s.price
//           ),
//           0
//         ) AS total_amount

//       FROM sms.order_items oi

//       JOIN sms.sweets s
//         ON s.row_id = oi.sweet_id

//       JOIN sms.orders o
//         ON o.row_id = oi.order_id

//       WHERE o.shop_id = '${shopId}'
//     `;

//     const [summary, lowStock, expiry, trend, out, financial] =
//       await Promise.all([
//         db_query.customQuery(summaryQuery),
//         db_query.customQuery(lowStockQuery),
//         db_query.customQuery(expiryQuery),
//         db_query.customQuery(trendQuery),
//         db_query.customQuery(outStockQuery),
//         db_query.customQuery(financialQuery),
//       ]);

//     return {
//       summary: summary.data,

//       inventory: {
//         low_stock: lowStock.data,
//         out_of_stock: out.data,
//         // expiring: expiry.data,
//       },

//       financials: financial.data[0] || {},

//       charts: {
//         orders_trend: trend.data,
//       },

//       alerts: {
//         expiry: expiry.data,
//       },
//     };
//   } catch (err) {
//     throw err;
//   }
// }

async function getShopDashboard(user) {
  try {
    const shopId = user.shopId;

    console.log("SHOP DASHBOARD shopId =>", shopId);

    const summaryQuery = `
      SELECT  
        COUNT(*) AS total_orders, 
        COUNT(*) FILTER (
          WHERE order_status = 'PENDING'
        ) AS pending, 
        COUNT(*) FILTER (
          WHERE order_status = 'ACCEPTED'
        ) AS approved, 
        COUNT(*) FILTER (
          WHERE order_status = 'REJECTED'
        ) AS rejected 
      FROM sms.orders 
      WHERE shop_id = '${shopId}'
    `;

    const lowStockQuery = `
      SELECT 
        i.*,
        s.sweet_name,
        c.row_id AS counter_row_id,
        c.shop_id AS counter_shop_id
      FROM sms.inventory i
      LEFT JOIN sms.sweets s 
        ON s.row_id = i.sweet_id
      LEFT JOIN sms.counters c
        ON c.row_id = i.counter_id
      WHERE i.quantity::numeric <= i.min_stock
        AND c.shop_id = '${shopId}'
      LIMIT 10
    `;

    const outStockQuery = `
      SELECT 
        i.*,
        s.sweet_name,
        c.row_id AS counter_row_id,
        c.shop_id AS counter_shop_id
      FROM sms.inventory i
      LEFT JOIN sms.sweets s 
        ON s.row_id = i.sweet_id
      LEFT JOIN sms.counters c
        ON c.row_id = i.counter_id
      WHERE i.quantity::numeric = 0
        AND c.shop_id = '${shopId}'
    `;

    const expiryQuery = `
      SELECT  
        i.*,
        s.sweet_name,
        c.shop_id AS counter_shop_id
      FROM sms.inventory i
      LEFT JOIN sms.sweets s
        ON s.row_id = i.sweet_id
      LEFT JOIN sms.counters c
        ON c.row_id = i.counter_id
      WHERE i.expiry_date <= CURRENT_DATE + INTERVAL '2 days'
        AND c.shop_id = '${shopId}'
      ORDER BY i.expiry_date ASC
      LIMIT 10
    `;

    const trendQuery = `
      SELECT
        order_date::date::text AS date,
        COUNT(*) AS count
      FROM sms.orders
      WHERE shop_id = '${shopId}'
      GROUP BY order_date::date
      ORDER BY date DESC
      LIMIT 7
    `;

    const financialQuery = `
      SELECT 
        COALESCE(
          SUM(
            oi.quantity::numeric * s.price
          ),
          0
        ) AS total_amount
      FROM sms.order_items oi
      JOIN sms.sweets s
        ON s.row_id = oi.sweet_id
      JOIN sms.orders o
        ON o.row_id = oi.order_id
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

    console.log("SUMMARY =>", summary.data);
    console.log("LOW STOCK =>", lowStock.data);
    console.log("OUT STOCK =>", out.data);
    console.log("EXPIRY =>", expiry.data);
    console.log("TREND =>", trend.data);
    console.log("FINANCIAL =>", financial.data);

    return {
      summary: summary.data,

      inventory: {
        low_stock: lowStock.data,
        out_of_stock: out.data,
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

    return "Transactional data deleted successfully";
  } catch (error) {
    console.error("Delete Error:", error);

    throw error;
  }
}

async function deleteAPIforcleandata(req, res) {
  try {
    // 🔥 Delete transactional
    await deleteNecessaryData();

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Transactional data deleted successfully",
      data: [],
    });
  } catch (err) {
    console.error("deleteAPIforcleandata error:", err);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Delete failed",
      error: err.message,
      data: [],
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

async function getCounterDashboardRequests(req, res) {
  try {
    const user = req.data;

    const requestTable = schema + ".counter_requests";
    const counterTable = schema + ".counters";
    const sweetTable = schema + ".sweets";
    const orderItemTable = schema + ".order_items";

    // 🔒 Only Counter User
    if (user.user_role !== "COUNTER_USER") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    const counterId = user.counterId || user.counter_id;

    if (!counterId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid counter",
      });
    }

    const result = await db_query.customQuery(`
      SELECT
        r.row_id,

        -- Requested quantity
        r.quantity AS requested_quantity,

        -- Supplied quantity
        COALESCE(
          SUM(oi.supplied_quantity),
          0
        ) AS supplied_quantity,

        -- Pending quantity
        GREATEST(
          r.quantity - COALESCE(SUM(oi.supplied_quantity), 0),
          0
        ) AS pending_quantity,

        oi.item_status,

        TO_CHAR(
          r.cr_on,
          'YYYY-MM-DD HH24:MI:SS'
        ) AS cr_on,

        s.row_id AS sweet_id,
        s.sweet_name,
        s.unit

      FROM ${requestTable} r

      LEFT JOIN ${counterTable} c
        ON c.row_id = r.counter_id

      LEFT JOIN ${sweetTable} s
        ON s.row_id = r.sweet_id

      LEFT JOIN ${orderItemTable} oi
        ON oi.counter_id = r.counter_id
        AND oi.sweet_id = r.sweet_id

      WHERE r.counter_id = '${counterId}'

      GROUP BY
        r.row_id,
        r.quantity,
        oi.item_status,
        r.cr_on,
        s.row_id,
        s.sweet_name,
        s.unit

      ORDER BY r.cr_on DESC

      LIMIT 10
    `);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Last 10 counter requests fetched successfully",
      data: result.data || [],
    });
  } catch (error) {
    console.log("getCounterDashboardRequests error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function assignSweetToCounter(req, res) {
  try {
    const mappingTable = schema + ".counter_sweets";
    const counterTable = schema + ".counters";
    const sweetTable = schema + ".sweets";

    const { counter_ids, sweet_id } = req.data || {};

    const user = req.data;

    // =====================================
    // Role validation
    // =====================================
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // =====================================
    // Basic validation
    // =====================================
    if (!sweet_id || !Array.isArray(counter_ids) || counter_ids.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Sweet and at least one counter are required",
      });
    }

    const sweetId = sweet_id.trim();

    // =====================================
    // Shop ID from token
    // =====================================
    const shopId = user.shopId;

    if (user.user_role === "SHOP_ADMIN" && !shopId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Shop ID not found in token",
      });
    }

    // =====================================
    // Remove duplicate counter IDs
    // =====================================
    const uniqueCounterIds = [
      ...new Set(counter_ids.filter((id) => id).map((id) => id.trim())),
    ];

    if (uniqueCounterIds.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Valid counter IDs are required",
      });
    }

    // =====================================
    // Check Sweet exists
    // =====================================
    const sweetCheck = await db_query.customQuery(`
      SELECT
        row_id,
        sweet_name
      FROM ${sweetTable}
      WHERE row_id = '${sweetId}'
      AND is_active = true
    `);

    if (!sweetCheck.data?.length) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid sweet",
      });
    }

    // =====================================
    // Counter IDs for SQL
    // =====================================
    const counterIdsSql = uniqueCounterIds
      .map((id) => `'${id.replaceAll("'", "`")}'`)
      .join(",");

    // =====================================
    // Check all counters
    // =====================================
    const counterCheck = await db_query.customQuery(`
      SELECT
        row_id,
        shop_id,
        counter_name
      FROM ${counterTable}
      WHERE row_id IN (${counterIdsSql})
    `);

    if (
      !counterCheck.data ||
      counterCheck.data.length !== uniqueCounterIds.length
    ) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "One or more invalid counters",
      });
    }

    // =====================================
    // SHOP_ADMIN
    // Counter must belong to token shop
    // =====================================
    if (user.user_role === "SHOP_ADMIN") {
      const invalidCounter = counterCheck.data.find(
        (counter) => counter.shop_id !== shopId,
      );

      if (invalidCounter) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "You cannot assign sweet to another shop counter",
        });
      }
    }

    // =====================================
    // Check existing mappings
    // =====================================
    const existingMapping = await db_query.customQuery(`
      SELECT
        row_id,
        shop_id,
        counter_id,
        sweet_id,
        is_active
      FROM ${mappingTable}
      WHERE sweet_id = '${sweetId}'
      AND counter_id IN (${counterIdsSql})
    `);

    const existingMap = new Map();

    if (existingMapping.data?.length) {
      existingMapping.data.forEach((item) => {
        existingMap.set(item.counter_id, item);
      });
    }

    // =====================================
    // Separate counters
    // =====================================
    const alreadyAssigned = [];
    const inactiveMappings = [];
    const newCounterIds = [];

    uniqueCounterIds.forEach((counterId) => {
      const existing = existingMap.get(counterId);

      // No mapping exists
      if (!existing) {
        newCounterIds.push(counterId);
      }

      // Mapping exists and active
      else if (existing.is_active === true) {
        alreadyAssigned.push(counterId);
      }

      // Mapping exists but inactive
      else {
        inactiveMappings.push(existing);
      }
    });

    // =====================================
    // Reactivate inactive mappings
    // =====================================
    for (const mapping of inactiveMappings) {
      await db_query.customQuery(`
        UPDATE ${mappingTable}
        SET
          is_active = true,
          shop_id = '${shopId}',
          up_on = now()
        WHERE row_id = '${mapping.row_id}'
      `);
    }

    // =====================================
    // Create new mappings
    // =====================================
    const createdCounters = [];

    for (const counterId of newCounterIds) {
      const columns = {
        row_id: libFunc.randomid(),

        // Shop ID from token
        shop_id: shopId,

        // Counter selected by user
        counter_id: counterId,

        // Sweet selected by user
        sweet_id: sweetId,

        is_active: true,
      };

      await db_query.addData(
        mappingTable,
        columns,
        null,
        "Counter Sweet Mapping",
      );

      createdCounters.push(counterId);
    }

    // =====================================
    // Final counts
    // =====================================
    const assignedCount = createdCounters.length + inactiveMappings.length;

    const alreadyAssignedCount = alreadyAssigned.length;

    // =====================================
    // Partial success
    // Some already assigned
    // =====================================
    if (alreadyAssignedCount > 0) {
      return libFunc.sendResponse(res, {
        status: 1,

        msg:
          `${assignedCount} counter(s) assigned successfully, ` +
          `${alreadyAssignedCount} counter(s) already had this sweet assigned`,

        data: {
          shop_id: shopId,
          sweet_id: sweetId,

          assigned_count: assignedCount,

          assigned_counter_ids: [
            ...createdCounters,
            ...inactiveMappings.map((item) => item.counter_id),
          ],

          already_assigned_count: alreadyAssignedCount,

          already_assigned_counter_ids: alreadyAssigned,
        },
      });
    }

    // =====================================
    // Full success
    // =====================================
    return libFunc.sendResponse(res, {
      status: 0,

      msg: `Sweet assigned successfully to ` + `${assignedCount} counter(s)`,

      data: {
        shop_id: shopId,
        sweet_id: sweetId,

        assigned_count: assignedCount,

        assigned_counter_ids: [
          ...createdCounters,
          ...inactiveMappings.map((item) => item.counter_id),
        ],

        already_assigned_count: 0,
        already_assigned_counter_ids: [],
      },
    });
  } catch (error) {
    console.log("assignSweetToCounter error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function fetchCounterSweets(req, res) {
  try {
    const user = req.data;

    const { search } = req.data || {};

    // =====================================
    // Role validation
    // =====================================
    if (!["ADMIN", "SHOP_ADMIN", "COUNTER_USER"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    // =====================================
    // Counter ID from token
    // =====================================
    const counterId = user.counterId;

    if (!counterId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Counter ID not found in token",
      });
    }

    // =====================================
    // Shop ID from token
    // =====================================
    const shopId = user.shopId;

    // =====================================
    // Conditions
    // =====================================
    let conditions = [
      `s.is_active = true`,
      `cs.counter_id = '${counterId}'`,
      `cs.is_active = true`,
    ];

    // =====================================
    // SHOP_ADMIN
    // Counter must belong to user's shop
    // =====================================
    if (user.user_role === "SHOP_ADMIN") {
      if (!shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Shop ID not found in token",
        });
      }

      conditions.push(`counter.shop_id = '${shopId}'`);
    }

    // =====================================
    // Search
    // =====================================
    if (search) {
      const safeSearch = search.trim().replaceAll("'", "`");

      conditions.push(`
        (
          LOWER(s.sweet_name)
            LIKE LOWER('%${safeSearch}%')

          OR LOWER(cat.category_name)
            LIKE LOWER('%${safeSearch}%')

          OR LOWER(d.department_name)
            LIKE LOWER('%${safeSearch}%')

          OR LOWER(sup.supplier_name)
            LIKE LOWER('%${safeSearch}%')
        )
      `);
    }

    // =====================================
    // Final Query
    // =====================================
    const sql = `
      SELECT
        s.row_id ,
        s.sweet_name,
        s.unit,
        s.price,
        s.shelf_life_days,
        s.description,
        s.image_url,
        s.return_type,

        cat.row_id AS category_id,
        cat.category_name,

        d.row_id AS department_id,
        d.department_name,

        sup.row_id AS supplier_id,
        sup.supplier_name,

        counter.row_id AS counter_id,
        counter.counter_name,

        cs.shop_id,
        cs.is_active AS is_assigned,

        cs.cr_on AS assigned_on,
        cs.up_on AS assignment_updated_on

      FROM ${schema}.counter_sweets cs

      INNER JOIN ${schema}.sweets s
        ON s.row_id = cs.sweet_id

      INNER JOIN ${schema}.counters counter
        ON counter.row_id = cs.counter_id

      LEFT JOIN ${schema}.categories cat
        ON cat.row_id = s.category_id

      LEFT JOIN ${schema}.departments d
        ON d.row_id = cat.department_id

      LEFT JOIN ${schema}.suppliers sup
        ON sup.row_id = s.supplier_id

      WHERE ${conditions.join(" AND ")}

      ORDER BY s.sweet_name ASC
    `;

    console.log("Final Query:", sql);

    const result = await db_query.customQuery(sql);

    return libFunc.sendResponse(res, result);
  } catch (error) {
    console.log("fetchCounterSweets error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

// async function downloadDepartmentSlipPDF(req, res) {
//   try {
//     const { order_id } = req.data || {};

//     if (!order_id) {
//       return res.status(400).send("Order ID required");
//     }

//     const orderTable = schema + ".orders";
//     const itemTable = schema + ".order_items";
//     const shopTable = schema + ".shops";
//     const sweetTable = schema + ".sweets";
//     const counterTable = schema + ".counters";
//     const categoryTable = schema + ".categories";
//     const departmentTable = schema + ".departments";

//     const safeOrderId = order_id.trim().replaceAll("'", "`");

//     // =====================================================
//     // GET ORDER + CHECK SUPPLIER ACCEPTANCE
//     // =====================================================

//     const result = await db_query.customQuery(`
//       SELECT

//         o.id AS order_serial_id,
//         o.row_id AS order_id,
//         o.order_status,
//         o.order_date,
//         o.supplier_id,

//         sh.row_id AS shop_id,
//         sh.shop_name,
//         sh.address AS shop_address,
//         sh.city,
//         sh.state,
//         sh.phone AS shop_phone,

//         oi.row_id AS order_item_id,
//         oi.quantity,
//         oi.item_status,
//         oi.counter_id,

//         sw.row_id AS sweet_id,
//         COALESCE(
//           sw.sweet_name,
//           'Unknown Sweet'
//         ) AS sweet_name,

//         COALESCE(
//           sw.unit,
//           '-'
//         ) AS unit,

//         c.row_id AS counter_id,
//         COALESCE(
//           c.counter_name,
//           'Default Counter'
//         ) AS counter_name,

//         c.location AS counter_location,

//         cat.row_id AS category_id,
//         COALESCE(
//           cat.category_name,
//           'Others'
//         ) AS category_name,

//         d.row_id AS department_id,
//         COALESCE(
//           d.department_name,
//           'Others'
//         ) AS department_name

//       FROM ${orderTable} o

//       LEFT JOIN ${shopTable} sh
//         ON sh.row_id = o.shop_id

//       LEFT JOIN ${itemTable} oi
//         ON oi.order_id = o.row_id

//       LEFT JOIN ${sweetTable} sw
//         ON sw.row_id = oi.sweet_id

//       LEFT JOIN ${counterTable} c
//         ON c.row_id = oi.counter_id

//       LEFT JOIN ${categoryTable} cat
//         ON cat.row_id = sw.category_id

//       LEFT JOIN ${departmentTable} d
//         ON d.row_id = cat.department_id

//       WHERE o.row_id = '${safeOrderId}'
//       AND o.order_status = 'ACCEPTED'

//       ORDER BY
//         d.department_name ASC,
//         c.counter_name ASC,
//         cat.category_name ASC,
//         sw.sweet_name ASC
//     `);

//     const data = result.data || [];

//     // =====================================================
//     // SUPPLIER HAS NOT ACCEPTED
//     // =====================================================

//     if (data.length === 0) {
//       // Check whether order exists
//       const orderCheck = await db_query.customQuery(`
//         SELECT
//           row_id,
//           order_status
//         FROM ${orderTable}
//         WHERE row_id = '${safeOrderId}'
//       `);

//       const orderData = orderCheck.data || [];

//       if (orderData.length === 0) {
//         return res.status(404).send("Order not found");
//       }

//       if (orderData[0].order_status !== "ACCEPTED") {
//         return libFunc.sendResponse(res, {
//           status: 1,
//           msg: "Department slip is not available. Supplier must accept the order first.",
//         });
//       }

//       return res.status(404).send("No department items found");
//     }

//     const order = data[0];

//     // =====================================================
//     // DISPLAY ORDER ID
//     // =====================================================

//     const orderDisplayId = `ORD-${String(order.order_serial_id).padStart(
//       6,
//       "0",
//     )}`;

//     // =====================================================
//     // DEPARTMENT GROUPING
//     // =====================================================

//     const departmentGrouped = {};

//     data.forEach((item) => {
//       const departmentId = item.department_id || "NO_DEPARTMENT";

//       const departmentName = item.department_name || "Others";

//       if (!departmentGrouped[departmentId]) {
//         departmentGrouped[departmentId] = {
//           department_name: departmentName,
//           items: [],
//         };
//       }

//       departmentGrouped[departmentId].items.push(item);
//     });

//     // =====================================================
//     // FILE SETUP
//     // =====================================================

//     const BASE_UPLOAD_PATH = "./public/uploads";

//     const folder = path.join(BASE_UPLOAD_PATH, "DepartmentSlips");

//     if (!fs.existsSync(folder)) {
//       fs.mkdirSync(folder, {
//         recursive: true,
//       });
//     }

//     const fileName = `DepartmentSlip_${Date.now()}.pdf`;

//     const filePath = path.join(folder, fileName);

//     const doc = new PDFDocument({
//       margin: 40,
//       size: "A4",
//     });

//     doc.pipe(fs.createWriteStream(filePath));

//     // =====================================================
//     // DEPARTMENT PAGES
//     // =====================================================

//     const departments = Object.values(departmentGrouped);

//     departments.forEach((department, departmentIndex) => {
//       if (departmentIndex > 0) {
//         doc.addPage();
//       }

//       // =================================================
//       // HEADER
//       // =================================================

//       doc
//         .fontSize(18)
//         .font("Helvetica-Bold")
//         .fillColor("#000")
//         .text("DEPARTMENT SLIP", {
//           align: "center",
//         });

//       doc.moveDown(0.4);

//       doc.fontSize(14).font("Helvetica-Bold").text(department.department_name, {
//         align: "center",
//       });

//       doc.moveDown();

//       // =================================================
//       // ORDER INFO
//       // =================================================

//       doc.fontSize(10).font("Helvetica");

//       doc.text(`Order ID: ${orderDisplayId}`);

//       doc.text(`Status: ${order.order_status}`);

//       doc.text(
//         `Date: ${
//           order.order_date
//             ? new Date(order.order_date).toLocaleDateString()
//             : "-"
//         }`,
//       );

//       doc.text(`Shop: ${order.shop_name || "-"}`);

//       doc.moveDown();

//       doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

//       doc.moveDown();

//       // =================================================
//       // TABLE HEADER
//       // =================================================

//       let y = doc.y;

//       const startX = 40;
//       const rowHeight = 22;

//       const colWidths = {
//         counter: 150,
//         category: 130,
//         sweet: 160,
//         qty: 60,
//       };

//       doc.rect(startX, y, 500, rowHeight).fill("#e5e5e5");

//       doc.fillColor("#000").fontSize(9).font("Helvetica-Bold");

//       doc.text("Counter", startX + 5, y + 6, {
//         width: colWidths.counter,
//       });

//       doc.text("Category", startX + colWidths.counter + 5, y + 6, {
//         width: colWidths.category,
//       });

//       doc.text(
//         "Sweet",
//         startX + colWidths.counter + colWidths.category + 5,
//         y + 6,
//         {
//           width: colWidths.sweet,
//         },
//       );

//       doc.text(
//         "Qty",
//         startX + colWidths.counter + colWidths.category + colWidths.sweet,
//         y + 6,
//         {
//           width: colWidths.qty,
//           align: "center",
//         },
//       );

//       y += rowHeight;

//       // =================================================
//       // ITEMS
//       // =================================================

//       let total = 0;

//       department.items.forEach((item, index) => {
//         const qty = Number(item.quantity || 0);

//         total += qty;

//         if (index % 2 === 0) {
//           doc.rect(startX, y, 500, rowHeight).fill("#fafafa");
//         }

//         doc.fillColor("#000").fontSize(8).font("Helvetica");

//         doc.text(item.counter_name || "-", startX + 5, y + 6, {
//           width: colWidths.counter - 10,
//           ellipsis: true,
//         });

//         doc.text(
//           item.category_name || "-",
//           startX + colWidths.counter + 5,
//           y + 6,
//           {
//             width: colWidths.category - 10,
//             ellipsis: true,
//           },
//         );

//         doc.text(
//           item.sweet_name || "-",
//           startX + colWidths.counter + colWidths.category + 5,
//           y + 6,
//           {
//             width: colWidths.sweet - 10,
//             ellipsis: true,
//           },
//         );

//         doc.text(
//           `${qty} ${item.unit || ""}`,
//           startX + colWidths.counter + colWidths.category + colWidths.sweet,
//           y + 6,
//           {
//             width: colWidths.qty,
//             align: "center",
//           },
//         );

//         y += rowHeight;
//       });

//       // =================================================
//       // TOTAL
//       // =================================================

//       doc.rect(startX, y, 500, rowHeight).fill("#e8f8f5");

//       doc.fillColor("#000").fontSize(10).font("Helvetica-Bold");

//       doc.text("TOTAL", startX + 5, y + 6);

//       doc.text(
//         total.toString(),
//         startX + colWidths.counter + colWidths.category + colWidths.sweet,
//         y + 6,
//         {
//           width: colWidths.qty,
//           align: "center",
//         },
//       );

//       // =================================================
//       // FOOTER
//       // =================================================

//       doc.moveDown(3);

//       doc
//         .fontSize(8)
//         .font("Helvetica")
//         .fillColor("gray")
//         .text("Department Production Slip", {
//           align: "center",
//         });

//       doc.fillColor("#000");
//     });

//     // =====================================================
//     // END PDF
//     // =====================================================

//     doc.end();

//     const fileUrl = `./public/uploads/DepartmentSlips/${fileName}`;

//     const serverUrl = "https://api.joswee.cloud";

//     return libFunc.sendResponse(res, {
//       status: 0,
//       msg: "Department slip generated successfully",
//       filePath: serverUrl + fileUrl,
//     });
//   } catch (error) {
//     console.log("downloadDepartmentSlipPDF error:", error);

//     return res.status(500).send("Error generating department slip");
//   }
// }

// async function downloadDepartmentSlipPDF(req, res) {
//   try {
//     const { order_id } = req.data || {};

//     if (!order_id) {
//       return res.status(400).send("Order ID required");
//     }

//     const orderTable = schema + ".orders";
//     const itemTable = schema + ".order_items";
//     const shopTable = schema + ".shops";
//     const sweetTable = schema + ".sweets";
//     const counterTable = schema + ".counters";
//     const categoryTable = schema + ".categories";
//     const departmentTable = schema + ".departments";

//     // IMPORTANT:
//     // SQL string escape should be ''
//     const safeOrderId = String(order_id).trim().replaceAll("'", "''");

//     // =====================================================
//     // GET ORDER + CHECK SUPPLIER ACCEPTANCE
//     // =====================================================

//     const result = await db_query.customQuery(`
//       SELECT

//         o.id AS order_serial_id,
//         o.row_id AS order_id,
//         o.order_status,
//         o.order_date,
//         o.supplier_id,

//         sh.row_id AS shop_id,
//         sh.shop_name,
//         sh.address AS shop_address,
//         sh.city,
//         sh.state,
//         sh.phone AS shop_phone,

//         oi.row_id AS order_item_id,
//         oi.quantity,
//         oi.item_status,
//         oi.counter_id,

//         sw.row_id AS sweet_id,

//         COALESCE(
//           sw.sweet_name,
//           'Unknown Sweet'
//         ) AS sweet_name,

//         COALESCE(
//           sw.unit,
//           '-'
//         ) AS unit,

//         c.row_id AS counter_id,

//         COALESCE(
//           c.counter_name,
//           'Default Counter'
//         ) AS counter_name,

//         c.location AS counter_location,

//         cat.row_id AS category_id,

//         COALESCE(
//           cat.category_name,
//           'Others'
//         ) AS category_name,

//         d.row_id AS department_id,

//         COALESCE(
//           d.department_name,
//           'Others'
//         ) AS department_name

//       FROM ${orderTable} o

//       LEFT JOIN ${shopTable} sh
//         ON sh.row_id = o.shop_id

//       LEFT JOIN ${itemTable} oi
//         ON oi.order_id = o.row_id

//       LEFT JOIN ${sweetTable} sw
//         ON sw.row_id = oi.sweet_id

//       LEFT JOIN ${counterTable} c
//         ON c.row_id = oi.counter_id

//       LEFT JOIN ${categoryTable} cat
//         ON cat.row_id = sw.category_id

//       LEFT JOIN ${departmentTable} d
//         ON d.row_id = cat.department_id

//       WHERE o.row_id = '${safeOrderId}'
//       AND o.order_status = 'ACCEPTED'

//       ORDER BY
//         d.department_name ASC,
//         c.counter_name ASC,
//         cat.category_name ASC,
//         sw.sweet_name ASC
//     `);

//     const data = result.data || [];

//     // =====================================================
//     // SUPPLIER HAS NOT ACCEPTED
//     // =====================================================

//     if (data.length === 0) {
//       const orderCheck = await db_query.customQuery(`
//         SELECT
//           row_id,
//           order_status
//         FROM ${orderTable}
//         WHERE row_id = '${safeOrderId}'
//       `);

//       const orderData = orderCheck.data || [];

//       if (orderData.length === 0) {
//         return res.status(404).send("Order not found");
//       }

//       if (orderData[0].order_status !== "ACCEPTED") {
//         return libFunc.sendResponse(res, {
//           status: 1,
//           msg: "Department slip is not available. Supplier must accept the order first.",
//         });
//       }

//       return res.status(404).send("No department items found");
//     }

//     // =====================================================
//     // ORDER
//     // =====================================================

//     const order = data[0];

//     const orderDisplayId = `ORD-${String(order.order_serial_id).padStart(6, "0")}`;

//     // =====================================================
//     // DEPARTMENT GROUPING
//     // =====================================================

//     const departmentGrouped = {};

//     data.forEach((item) => {
//       const departmentId = item.department_id || "NO_DEPARTMENT";

//       const departmentName = item.department_name || "Others";

//       if (!departmentGrouped[departmentId]) {
//         departmentGrouped[departmentId] = {
//           department_name: departmentName,
//           items: [],
//         };
//       }

//       departmentGrouped[departmentId].items.push(item);
//     });

//     // =====================================================
//     // THERMAL PDF SETTINGS
//     // =====================================================

//     /*
//       80mm thermal printer

//       1mm = 2.83465 PDF points

//       80mm = approximately 226.77 points
//     */

//     const PAPER_WIDTH = 226.77;

//     const SIDE_MARGIN = 8;

//     const CONTENT_WIDTH = PAPER_WIDTH - SIDE_MARGIN * 2;

//     const ROW_HEIGHT = 18;

//     // =====================================================
//     // FILE SETUP
//     // =====================================================

//     const BASE_UPLOAD_PATH = "./public/uploads";

//     const folder = path.join(BASE_UPLOAD_PATH, "DepartmentSlips");

//     if (!fs.existsSync(folder)) {
//       fs.mkdirSync(folder, {
//         recursive: true,
//       });
//     }

//     const fileName = `DepartmentSlip_${Date.now()}.pdf`;

//     const filePath = path.join(folder, fileName);

//     // =====================================================
//     // CALCULATE FIRST PAGE HEIGHT
//     // =====================================================

//     const departments = Object.values(departmentGrouped);

//     function calculatePageHeight(department) {
//       const itemCount = department.items.length;

//       /*
//         Header
//         Logo
//         Department
//         Order details
//         Table header
//         Items
//         Total
//         Footer
//       */

//       const headerHeight = 155;

//       const tableHeight = ROW_HEIGHT + itemCount * ROW_HEIGHT;

//       const totalHeight = 25;

//       const footerHeight = 30;

//       return headerHeight + tableHeight + totalHeight + footerHeight;
//     }

//     // =====================================================
//     // CREATE THERMAL PDF
//     // =====================================================

//     const firstPageHeight = calculatePageHeight(departments[0]);

//     const doc = new PDFDocument({
//       size: [PAPER_WIDTH, firstPageHeight],

//       margins: {
//         top: 8,
//         bottom: 8,
//         left: SIDE_MARGIN,
//         right: SIDE_MARGIN,
//       },

//       autoFirstPage: true,
//     });

//     const writeStream = fs.createWriteStream(filePath);

//     doc.pipe(writeStream);

//     // =====================================================
//     // ROUND LOGO FUNCTION
//     // =====================================================

//     function drawRoundLogo() {
//       const logoPath = "./public/uploads/logo.png";

//       if (!fs.existsSync(logoPath)) {
//         console.log("Logo not found:", logoPath);

//         return;
//       }

//       const logoSize = 42;

//       const x = (PAPER_WIDTH - logoSize) / 2;

//       const y = 8;

//       doc.save();

//       // Circular clipping
//       doc.circle(x + logoSize / 2, y + logoSize / 2, logoSize / 2);

//       doc.clip();

//       doc.image(logoPath, x, y, {
//         width: logoSize,
//         height: logoSize,
//       });

//       doc.restore();

//       // Circular border
//       doc
//         .circle(x + logoSize / 2, y + logoSize / 2, logoSize / 2)
//         .lineWidth(0.5)
//         .stroke();

//       doc.y = y + logoSize + 5;
//     }

//     // =====================================================
//     // DEPARTMENT PAGES
//     // =====================================================

//     departments.forEach((department, departmentIndex) => {
//       // =================================================
//       // NEW DEPARTMENT PAGE
//       // =================================================

//       if (departmentIndex > 0) {
//         const pageHeight = calculatePageHeight(department);

//         doc.addPage({
//           size: [PAPER_WIDTH, pageHeight],

//           margins: {
//             top: 8,
//             bottom: 8,
//             left: SIDE_MARGIN,
//             right: SIDE_MARGIN,
//           },
//         });
//       }

//       // =================================================
//       // LOGO
//       // =================================================

//       drawRoundLogo();

//       // =================================================
//       // TITLE
//       // =================================================

//       doc
//         .font("Helvetica-Bold")
//         .fontSize(13)
//         .fillColor("#000000")
//         .text("DEPARTMENT SLIP", {
//           width: CONTENT_WIDTH,
//           align: "center",
//         });

//       doc.moveDown(0.2);

//       // =================================================
//       // DEPARTMENT
//       // =================================================

//       doc.font("Helvetica-Bold").fontSize(11).text(department.department_name, {
//         width: CONTENT_WIDTH,
//         align: "center",
//       });

//       doc.moveDown(0.5);

//       // =================================================
//       // SEPARATOR
//       // =================================================

//       doc
//         .moveTo(SIDE_MARGIN, doc.y)
//         .lineTo(PAPER_WIDTH - SIDE_MARGIN, doc.y)
//         .lineWidth(0.7)
//         .stroke();

//       doc.moveDown(0.4);

//       // =================================================
//       // ORDER INFO
//       // =================================================

//       doc.font("Helvetica").fontSize(8.5);

//       doc.text(`Order: ${orderDisplayId}`);

//       doc.text(`Status: ${order.order_status}`);

//       doc.text(
//         `Date: ${
//           order.order_date
//             ? new Date(order.order_date).toLocaleDateString("en-IN")
//             : "-"
//         }`,
//       );

//       doc.text(`Shop: ${order.shop_name || "-"}`);

//       if (order.shop_phone) {
//         doc.text(`Phone: ${order.shop_phone}`);
//       }

//       doc.moveDown(0.5);

//       // =================================================
//       // SEPARATOR
//       // =================================================

//       doc
//         .moveTo(SIDE_MARGIN, doc.y)
//         .lineTo(PAPER_WIDTH - SIDE_MARGIN, doc.y)
//         .lineWidth(0.7)
//         .stroke();

//       doc.moveDown(0.5);

//       // =================================================
//       // TABLE HEADER
//       // =================================================

//       const counterWidth = 60;
//       const categoryWidth = 52;
//       const sweetWidth = 75;
//       const qtyWidth = 30;

//       const tableWidth = counterWidth + categoryWidth + sweetWidth + qtyWidth;

//       let y = doc.y;

//       doc.font("Helvetica-Bold").fontSize(7.5);

//       // Header background
//       doc.rect(SIDE_MARGIN, y, tableWidth, ROW_HEIGHT).fill("#eeeeee");

//       doc.fillColor("#000000");

//       // Counter
//       doc.text("Counter", SIDE_MARGIN + 2, y + 5, {
//         width: counterWidth - 4,
//       });

//       // Category
//       doc.text("Category", SIDE_MARGIN + counterWidth + 2, y + 5, {
//         width: categoryWidth - 4,
//       });

//       // Sweet
//       doc.text("Sweet", SIDE_MARGIN + counterWidth + categoryWidth + 2, y + 5, {
//         width: sweetWidth - 4,
//       });

//       // Qty
//       doc.text(
//         "Qty",
//         SIDE_MARGIN + counterWidth + categoryWidth + sweetWidth,
//         y + 5,
//         {
//           width: qtyWidth,
//           align: "center",
//         },
//       );

//       y += ROW_HEIGHT;

//       // =================================================
//       // ITEMS
//       // =================================================

//       let total = 0;

//       department.items.forEach((item, index) => {
//         const qty = Number(item.quantity || 0);

//         total += qty;

//         // Alternating row
//         if (index % 2 === 0) {
//           doc.rect(SIDE_MARGIN, y, tableWidth, ROW_HEIGHT).fill("#fafafa");
//         }

//         doc.fillColor("#000000").font("Helvetica").fontSize(7);

//         // Counter
//         doc.text(item.counter_name || "-", SIDE_MARGIN + 2, y + 5, {
//           width: counterWidth - 4,
//           ellipsis: true,
//         });

//         // Category
//         doc.text(
//           item.category_name || "-",
//           SIDE_MARGIN + counterWidth + 2,
//           y + 5,
//           {
//             width: categoryWidth - 4,
//             ellipsis: true,
//           },
//         );

//         // Sweet
//         doc.text(
//           item.sweet_name || "-",
//           SIDE_MARGIN + counterWidth + categoryWidth + 2,
//           y + 5,
//           {
//             width: sweetWidth - 4,
//             ellipsis: true,
//           },
//         );

//         // Quantity
//         doc.text(
//           `${qty}`,
//           SIDE_MARGIN + counterWidth + categoryWidth + sweetWidth,
//           y + 5,
//           {
//             width: qtyWidth,
//             align: "center",
//           },
//         );

//         y += ROW_HEIGHT;
//       });

//       // =================================================
//       // TOTAL
//       // =================================================

//       doc.rect(SIDE_MARGIN, y, tableWidth, ROW_HEIGHT).fill("#eeeeee");

//       doc.fillColor("#000000").font("Helvetica-Bold").fontSize(8);

//       doc.text("TOTAL", SIDE_MARGIN + 2, y + 5, {
//         width: counterWidth + categoryWidth + sweetWidth - 5,
//         align: "right",
//       });

//       doc.text(
//         total.toString(),
//         SIDE_MARGIN + counterWidth + categoryWidth + sweetWidth,
//         y + 5,
//         {
//           width: qtyWidth,
//           align: "center",
//         },
//       );

//       y += ROW_HEIGHT;

//       // =================================================
//       // FOOTER
//       // =================================================

//       doc.y = y + 12;

//       doc
//         .font("Helvetica")
//         .fontSize(7)
//         .fillColor("#555555")
//         .text("Department Production Slip", {
//           width: CONTENT_WIDTH,
//           align: "center",
//         });

//       doc.moveDown(0.2);

//       doc.text("System Generated", {
//         width: CONTENT_WIDTH,
//         align: "center",
//       });

//       doc.fillColor("#000000");
//     });

//     // =====================================================
//     // END PDF
//     // =====================================================

//     doc.end();

//     // =====================================================
//     // RESPONSE AFTER FILE CREATED
//     // =====================================================

//     writeStream.on("finish", () => {
//       const fileUrl = `/public/uploads/DepartmentSlips/${fileName}`;

//       const serverUrl = "https://api.joswee.cloud";

//       return libFunc.sendResponse(res, {
//         status: 0,
//         msg: "Department slip generated successfully",
//         filePath: serverUrl + fileUrl,
//       });
//     });

//     writeStream.on("error", (error) => {
//       console.log("Department PDF write error:", error);

//       if (!res.headersSent) {
//         return res.status(500).send("Error writing department slip PDF");
//       }
//     });
//   } catch (error) {
//     console.log("downloadDepartmentSlipPDF error:", error);

//     if (!res.headersSent) {
//       return res.status(500).send("Error generating department slip");
//     }
//   }
// }

async function downloadDepartmentSlipPDF(req, res) {
  try {
    const { order_id } = req.data || {};

    if (!order_id) {
      return res.status(400).send("Order ID required");
    }

    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";
    const shopTable = schema + ".shops";
    const sweetTable = schema + ".sweets";
    const counterTable = schema + ".counters";
    const categoryTable = schema + ".categories";
    const departmentTable = schema + ".departments";

    const safeOrderId = String(order_id).trim().replaceAll("'", "''");

    // =====================================================
    // GET ORDER + CHECK SUPPLIER ACCEPTANCE
    // =====================================================

    const result = await db_query.customQuery(`
      SELECT

        o.id AS order_serial_id,
        o.row_id AS order_id,
        o.order_status,
        o.order_date,
        o.supplier_id,

        sh.row_id AS shop_id,
        sh.shop_name,
        sh.address AS shop_address,
        sh.city,
        sh.state,
        sh.phone AS shop_phone,

        oi.row_id AS order_item_id,
        oi.quantity,
        oi.item_status,
        oi.counter_id,

        sw.row_id AS sweet_id,

        COALESCE(
          sw.sweet_name,
          'Unknown Sweet'
        ) AS sweet_name,

        COALESCE(
          sw.unit,
          '-'
        ) AS unit,

        c.row_id AS counter_id,

        COALESCE(
          c.counter_name,
          'Default Counter'
        ) AS counter_name,

        c.location AS counter_location,

        cat.row_id AS category_id,

        COALESCE(
          cat.category_name,
          'Others'
        ) AS category_name,

        d.row_id AS department_id,

        COALESCE(
          d.department_name,
          'Others'
        ) AS department_name

      FROM ${orderTable} o

      LEFT JOIN ${shopTable} sh
        ON sh.row_id = o.shop_id

      LEFT JOIN ${itemTable} oi
        ON oi.order_id = o.row_id

      LEFT JOIN ${sweetTable} sw
        ON sw.row_id = oi.sweet_id

      LEFT JOIN ${counterTable} c
        ON c.row_id = oi.counter_id

      LEFT JOIN ${categoryTable} cat
        ON cat.row_id = sw.category_id

      LEFT JOIN ${departmentTable} d
        ON d.row_id = cat.department_id

      WHERE
        o.row_id = '${safeOrderId}'
        AND o.order_status = 'ACCEPTED'

      ORDER BY
        d.department_name ASC,
        c.counter_name ASC,
        cat.category_name ASC,
        sw.sweet_name ASC
    `);

    const data = result.data || [];

    // =====================================================
    // SUPPLIER HAS NOT ACCEPTED
    // =====================================================

    if (data.length === 0) {
      const orderCheck = await db_query.customQuery(`
        SELECT
          row_id,
          order_status
        FROM ${orderTable}
        WHERE row_id = '${safeOrderId}'
      `);

      const orderData = orderCheck.data || [];

      if (orderData.length === 0) {
        return res.status(404).send("Order not found");
      }

      if (orderData[0].order_status !== "ACCEPTED") {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Department slip is not available. Supplier must accept the order first.",
        });
      }

      return res.status(404).send("No department items found");
    }

    const order = data[0];

    // =====================================================
    // DISPLAY ORDER ID
    // =====================================================

    const orderDisplayId = `ORD-${String(order.order_serial_id).padStart(6, "0")}`;

    // =====================================================
    // GROUP DATA BY DEPARTMENT
    // =====================================================

    const departmentGrouped = {};

    data.forEach((item) => {
      const departmentId = item.department_id || "NO_DEPARTMENT";

      const departmentName = item.department_name || "Others";

      if (!departmentGrouped[departmentId]) {
        departmentGrouped[departmentId] = {
          department_name: departmentName,
          items: [],
        };
      }

      departmentGrouped[departmentId].items.push(item);
    });

    const departments = Object.values(departmentGrouped);

    // =====================================================
    // THERMAL PAPER SETTINGS
    // =====================================================

    // 80mm thermal paper
    const PAPER_WIDTH = 226.77;

    const SIDE_MARGIN = 8;

    const CONTENT_WIDTH = PAPER_WIDTH - SIDE_MARGIN * 2;

    // =====================================================
    // TABLE WIDTHS
    // =====================================================

    const COUNTER_WIDTH = 55;
    const CATEGORY_WIDTH = 48;
    const SWEET_WIDTH = 82;
    const QTY_WIDTH = 25;

    const TABLE_WIDTH =
      COUNTER_WIDTH + CATEGORY_WIDTH + SWEET_WIDTH + QTY_WIDTH;

    const ROW_HEIGHT = 17;

    // =====================================================
    // FILE SETUP
    // =====================================================

    const BASE_UPLOAD_PATH = "./public/uploads";

    const folder = path.join(BASE_UPLOAD_PATH, "DepartmentSlips");

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, {
        recursive: true,
      });
    }

    const fileName = `DepartmentSlip_${Date.now()}.pdf`;

    const filePath = path.join(folder, fileName);

    // =====================================================
    // PAGE HEIGHT
    // =====================================================

    /*
      Thermal printers use roll paper.

      We calculate the height according to
      the number of rows.

      If there are too many rows, we split
      the department into multiple pages.
    */

    const MAX_ROWS_PER_PAGE = 28;

    function splitItems(items) {
      const pages = [];

      for (let i = 0; i < items.length; i += MAX_ROWS_PER_PAGE) {
        pages.push(items.slice(i, i + MAX_ROWS_PER_PAGE));
      }

      return pages;
    }

    // =====================================================
    // ROUND LOGO
    // =====================================================

    const LOGO_PATH = "./public/uploads/logo.jpg";

    function drawRoundLogo(doc) {
      if (!fs.existsSync(LOGO_PATH)) {
        return;
      }

      const logoSize = 38;

      const x = (PAPER_WIDTH - logoSize) / 2;

      const y = 6;

      doc.save();

      doc.circle(x + logoSize / 2, y + logoSize / 2, logoSize / 2).clip();

      doc.image(LOGO_PATH, x, y, {
        width: logoSize,
        height: logoSize,
      });

      doc.restore();

      // Small circular outline
      doc
        .circle(x + logoSize / 2, y + logoSize / 2, logoSize / 2)
        .lineWidth(0.5)
        .stroke();

      doc.y = y + logoSize + 4;
    }

    // =====================================================
    // CALCULATE PAGE HEIGHT
    // =====================================================

    function calculatePageHeight(itemCount) {
      /*
        Logo                  48
        Title                 18
        Department            16
        Separator              8
        Order information     55
        Separator              8
        Table header          17
        Items                 dynamic
        Total                 20
        Footer                25
        Bottom margin         10
      */

      return (
        48 + 18 + 16 + 8 + 55 + 8 + 17 + itemCount * ROW_HEIGHT + 20 + 25 + 10
      );
    }

    // =====================================================
    // FIRST PAGE
    // =====================================================

    const firstDepartment = departments[0];

    const firstPages = splitItems(firstDepartment.items);

    const firstPageHeight = calculatePageHeight(firstPages[0].length);

    // =====================================================
    // CREATE PDF
    // =====================================================

    const doc = new PDFDocument({
      size: [PAPER_WIDTH, firstPageHeight],

      margins: {
        top: 6,
        bottom: 6,
        left: SIDE_MARGIN,
        right: SIDE_MARGIN,
      },

      autoFirstPage: true,
    });

    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // =====================================================
    // DRAW DEPARTMENT HEADER
    // =====================================================

    function drawHeader(department, isContinuation = false) {
      // -----------------------------------------------
      // LOGO
      // -----------------------------------------------

      drawRoundLogo(doc);

      // -----------------------------------------------
      // TITLE
      // -----------------------------------------------

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#000000")
        .text(
          isContinuation ? "DEPARTMENT SLIP - CONTINUED" : "DEPARTMENT SLIP",
          {
            width: CONTENT_WIDTH,
            align: "center",
            lineBreak: false,
          },
        );

      doc.moveDown(0.1);

      // -----------------------------------------------
      // DEPARTMENT
      // -----------------------------------------------

      doc.font("Helvetica-Bold").fontSize(9).text(department.department_name, {
        width: CONTENT_WIDTH,
        align: "center",
      });

      doc.moveDown(0.35);

      // -----------------------------------------------
      // TOP SEPARATOR
      // -----------------------------------------------

      doc
        .moveTo(SIDE_MARGIN, doc.y)
        .lineTo(PAPER_WIDTH - SIDE_MARGIN, doc.y)
        .lineWidth(0.7)
        .stroke();

      doc.moveDown(0.35);

      // -----------------------------------------------
      // ORDER INFO
      // -----------------------------------------------

      doc.font("Helvetica").fontSize(7.5);

      doc.text(`Order : ${orderDisplayId}`);

      doc.text(`Shop  : ${order.shop_name || "-"}`);

      doc.text(
        `Date  : ${
          order.order_date
            ? new Date(order.order_date).toLocaleDateString("en-IN")
            : "-"
        }`,
      );

      doc.text(`Status: ${order.order_status}`);

      doc.moveDown(0.35);

      // -----------------------------------------------
      // SECOND SEPARATOR
      // -----------------------------------------------

      doc
        .moveTo(SIDE_MARGIN, doc.y)
        .lineTo(PAPER_WIDTH - SIDE_MARGIN, doc.y)
        .lineWidth(0.7)
        .stroke();

      doc.moveDown(0.35);
    }

    // =====================================================
    // DRAW TABLE HEADER
    // =====================================================

    function drawTableHeader() {
      const y = doc.y;

      doc.font("Helvetica-Bold").fontSize(7).fillColor("#000000");

      // Header line
      doc
        .moveTo(SIDE_MARGIN, y)
        .lineTo(SIDE_MARGIN + TABLE_WIDTH, y)
        .lineWidth(0.5)
        .stroke();

      doc.text("COUNTER", SIDE_MARGIN, y + 3, {
        width: COUNTER_WIDTH,
        align: "left",
      });

      doc.text("CATEGORY", SIDE_MARGIN + COUNTER_WIDTH, y + 3, {
        width: CATEGORY_WIDTH,
        align: "left",
      });

      doc.text("SWEET", SIDE_MARGIN + COUNTER_WIDTH + CATEGORY_WIDTH, y + 3, {
        width: SWEET_WIDTH,
        align: "left",
      });

      doc.text(
        "QTY",
        SIDE_MARGIN + COUNTER_WIDTH + CATEGORY_WIDTH + SWEET_WIDTH,
        y + 3,
        {
          width: QTY_WIDTH,
          align: "center",
        },
      );

      doc.y = y + ROW_HEIGHT;

      // Bottom line
      doc
        .moveTo(SIDE_MARGIN, doc.y)
        .lineTo(SIDE_MARGIN + TABLE_WIDTH, doc.y)
        .lineWidth(0.5)
        .stroke();
    }

    // =====================================================
    // DRAW ITEM
    // =====================================================

    function drawItem(item) {
      const y = doc.y;

      const qty = Number(item.quantity || 0);

      doc.font("Helvetica").fontSize(7).fillColor("#000000");

      // Counter
      doc.text(item.counter_name || "-", SIDE_MARGIN, y + 3, {
        width: COUNTER_WIDTH - 2,
        ellipsis: true,
      });

      // Category
      doc.text(item.category_name || "-", SIDE_MARGIN + COUNTER_WIDTH, y + 3, {
        width: CATEGORY_WIDTH - 2,
        ellipsis: true,
      });

      // Sweet
      doc.text(
        item.sweet_name || "-",
        SIDE_MARGIN + COUNTER_WIDTH + CATEGORY_WIDTH,
        y + 3,
        {
          width: SWEET_WIDTH - 2,
          ellipsis: true,
        },
      );

      // Quantity
      const quantityText =
        item.unit && item.unit !== "-" ? `${qty} ${item.unit}` : `${qty}`;

      doc.text(
        quantityText,
        SIDE_MARGIN + COUNTER_WIDTH + CATEGORY_WIDTH + SWEET_WIDTH,
        y + 3,
        {
          width: QTY_WIDTH,
          align: "center",
          ellipsis: true,
        },
      );

      doc.y = y + ROW_HEIGHT;

      // Row separator
      doc
        .moveTo(SIDE_MARGIN, doc.y)
        .lineTo(SIDE_MARGIN + TABLE_WIDTH, doc.y)
        .lineWidth(0.25)
        .stroke();
    }

    // =====================================================
    // DRAW TOTAL
    // =====================================================

    function drawTotal(total) {
      const y = doc.y;

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000");

      doc.text("TOTAL", SIDE_MARGIN, y + 4, {
        width: COUNTER_WIDTH + CATEGORY_WIDTH + SWEET_WIDTH,
        align: "right",
      });

      doc.text(
        String(total),
        SIDE_MARGIN + COUNTER_WIDTH + CATEGORY_WIDTH + SWEET_WIDTH,
        y + 4,
        {
          width: QTY_WIDTH,
          align: "center",
        },
      );

      doc.y = y + 20;

      doc
        .moveTo(SIDE_MARGIN, doc.y)
        .lineTo(SIDE_MARGIN + TABLE_WIDTH, doc.y)
        .lineWidth(0.7)
        .stroke();
    }

    // =====================================================
    // DRAW FOOTER
    // =====================================================

    function drawFooter() {
      doc.moveDown(0.5);

      doc
        .font("Helvetica")
        .fontSize(6.5)
        .fillColor("#555555")
        .text("Department Production Slip", {
          width: CONTENT_WIDTH,
          align: "center",
        });

      doc.text("System Generated", {
        width: CONTENT_WIDTH,
        align: "center",
      });

      doc.fillColor("#000000");
    }

    // =====================================================
    // PROCESS DEPARTMENTS
    // =====================================================

    departments.forEach((department, departmentIndex) => {
      const departmentPages = splitItems(department.items);

      departmentPages.forEach((pageItems, pageIndex) => {
        // -----------------------------------------
        // NEW PAGE
        // -----------------------------------------

        if (departmentIndex !== 0 || pageIndex !== 0) {
          const pageHeight = calculatePageHeight(pageItems.length);

          doc.addPage({
            size: [PAPER_WIDTH, pageHeight],

            margins: {
              top: 6,
              bottom: 6,
              left: SIDE_MARGIN,
              right: SIDE_MARGIN,
            },
          });
        }

        // -----------------------------------------
        // HEADER
        // -----------------------------------------

        drawHeader(department, pageIndex > 0);

        // -----------------------------------------
        // TABLE HEADER
        // -----------------------------------------

        drawTableHeader();

        // -----------------------------------------
        // ITEMS
        // -----------------------------------------

        let pageTotal = 0;

        pageItems.forEach((item) => {
          pageTotal += Number(item.quantity || 0);

          drawItem(item);
        });

        // -----------------------------------------
        // TOTAL
        // -----------------------------------------

        /*
              Only show final total on the last
              page of that department.

              On continuation pages show
              "Page Total".
            */

        if (pageIndex === departmentPages.length - 1) {
          const departmentTotal = department.items.reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0,
          );

          drawTotal(departmentTotal);
        } else {
          const y = doc.y;

          doc
            .font("Helvetica-Bold")
            .fontSize(7.5)
            .text(`PAGE TOTAL: ${pageTotal}`, SIDE_MARGIN, y + 4, {
              width: TABLE_WIDTH,
              align: "right",
            });

          doc.y = y + 20;

          doc
            .moveTo(SIDE_MARGIN, doc.y)
            .lineTo(SIDE_MARGIN + TABLE_WIDTH, doc.y)
            .lineWidth(0.5)
            .stroke();
        }

        // -----------------------------------------
        // FOOTER
        // -----------------------------------------

        drawFooter();
      });
    });

    // =====================================================
    // END PDF
    // =====================================================

    doc.end();

    // =====================================================
    // SEND RESPONSE AFTER PDF CREATED
    // =====================================================

    writeStream.on("finish", () => {
      const fileUrl = `/public/uploads/DepartmentSlips/${fileName}`;

      const serverUrl = "https://api.joswee.cloud";

      return libFunc.sendResponse(res, {
        status: 0,
        msg: "Department slip generated successfully",
        filePath: serverUrl + fileUrl,
      });
    });

    writeStream.on("error", (error) => {
      console.log("Department PDF write error:", error);

      if (!res.headersSent) {
        return res.status(500).send("Error writing department slip");
      }
    });
  } catch (error) {
    console.log("downloadDepartmentSlipPDF error:", error);

    if (!res.headersSent) {
      return res.status(500).send("Error generating department slip");
    }
  }
}

async function getRemainingOrderItems(orderId) {
  try {
    const query = `
      SELECT
        root.row_id AS order_item_id,
        root.order_id,
        root.sweet_id,
        root.counter_id,

        root.quantity::numeric AS requested_quantity,

        COALESCE(
          root.supplied_quantity,
          0
        )::numeric AS original_supplied_quantity,

        COALESCE(
          (
            SELECT SUM(
              COALESCE(child.supplied_quantity, 0)
            )
            FROM sms.order_items child
            WHERE child.parent_order_item_id = root.row_id
          ),
          0
        )::numeric AS reorder_supplied_quantity,

        COALESCE(
          root.cancelled_quantity,
          0
        )::numeric AS cancelled_quantity,

        (
          root.quantity::numeric
          -
          COALESCE(root.supplied_quantity, 0)::numeric
          -
          COALESCE(
            (
              SELECT SUM(
                COALESCE(child.supplied_quantity, 0)
              )
              FROM sms.order_items child
              WHERE child.parent_order_item_id = root.row_id
            ),
            0
          )::numeric
          -
          COALESCE(root.cancelled_quantity, 0)::numeric
        ) AS remaining_quantity

      FROM sms.order_items root

      WHERE root.order_id = '${orderId}'
      AND root.parent_order_item_id IS NULL

      ORDER BY root.cr_on ASC
    `;

    const result = await db_query.customQuery(
      query,
      "Get Remaining Order Items",
    );

    return result.data || [];
  } catch (error) {
    console.error("getRemainingOrderItems error:", error);
    throw error;
  }
}

// async function reorderRemaining(req, res) {
//   try {
//     const user = req.data;

//     // =============================================
//     // ROLE VALIDATION
//     // =============================================

//     if (!user || user.user_role !== "SHOP_ADMIN") {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Only SHOP_ADMIN can reorder remaining quantity",
//         data: [],
//       });
//     }

//     const { order_id, items } = req.data || {};

//     // =============================================
//     // BASIC VALIDATION
//     // =============================================

//     if (!order_id) {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Order ID required",
//         data: [],
//       });
//     }

//     if (!Array.isArray(items) || items.length === 0) {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Items required",
//         data: [],
//       });
//     }

//     if (!user.shopId) {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Shop ID not found in token",
//         data: [],
//       });
//     }

//     const shopId = user.shopId;

//     const safeOrderId = order_id.trim().replaceAll("'", "`");

//     // =============================================
//     // UNIQUE ITEM IDS
//     // =============================================

//     const itemIds = [
//       ...new Set(
//         items
//           .map((x) => x.order_item_id)
//           .filter(Boolean)
//           .map((id) => id.trim()),
//       ),
//     ];

//     if (itemIds.length === 0) {
//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Valid order item IDs required",
//         data: [],
//       });
//     }

//     const itemIdString = itemIds
//       .map((id) => `'${id.replaceAll("'", "`")}'`)
//       .join(",");

//     // =============================================
//     // BEGIN TRANSACTION
//     // =============================================

//     await connect_db.query("BEGIN");

//     // =============================================
//     // CHECK PARENT ORDER
//     // =============================================

//     const orderQuery = `
//       SELECT
//         row_id,
//         shop_id,
//         supplier_id,
//         order_status,
//         order_type,
//         parent_order_id,
//         resolution_status
//       FROM sms.orders
//       WHERE row_id = '${safeOrderId}'
//       AND shop_id = '${shopId.replaceAll("'", "`")}'
//       LIMIT 1
//       FOR UPDATE
//     `;

//     const orderResult = await db_query.customQuery(
//       orderQuery,
//       "Check Parent Order",
//     );

//     if (!orderResult.data?.length) {
//       await connect_db.query("ROLLBACK");

//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Order not found",
//         data: [],
//       });
//     }

//     const parentOrder = orderResult.data[0];

//     // =============================================
//     // REORDER ONLY FOR NORMAL / REORDER ORDER
//     // =============================================

//     if (!["NORMAL", "REORDER"].includes(parentOrder.order_type || "NORMAL")) {
//       await connect_db.query("ROLLBACK");

//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Invalid order type for reorder",
//         data: [],
//       });
//     }

//     // =============================================
//     // ORDER STATUS VALIDATION
//     // =============================================

//     if (
//       !["DELIVERED", "DISPATCHED", "ACCEPTED", "PARTIAL"].includes(
//         parentOrder.order_status,
//       )
//     ) {
//       await connect_db.query("ROLLBACK");

//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Re-order is not allowed for current order status",
//         data: [],
//       });
//     }

//     // =============================================
//     // RESOLUTION CHECK
//     // =============================================

//     if (parentOrder.resolution_status === "RESOLVED") {
//       await connect_db.query("ROLLBACK");

//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Order is already resolved. No remaining quantity available",
//         data: [],
//       });
//     }

//     // =============================================
//     // FETCH ROOT ITEMS
//     // =============================================

//     const remainingQuery = `
//       SELECT
//         root.row_id AS order_item_id,
//         root.sweet_id,
//         root.counter_id,
//         root.quantity,
//         root.supplied_quantity,
//         root.cancelled_quantity,

//         GREATEST(
//           0,
//           root.quantity::numeric
//           - COALESCE(root.supplied_quantity, 0)::numeric
//           - COALESCE(
//               (
//                 SELECT SUM(
//                   COALESCE(child.supplied_quantity, 0)::numeric
//                 )
//                 FROM sms.order_items child
//                 WHERE child.parent_order_item_id = root.row_id
//               ),
//               0
//             )
//           - COALESCE(root.cancelled_quantity, 0)::numeric
//         ) AS remaining_quantity

//       FROM sms.order_items root

//       WHERE root.row_id IN (${itemIdString})

//       AND root.order_id = '${safeOrderId}'

//       AND root.parent_order_item_id IS NULL

//       FOR UPDATE
//     `;

//     const remainingResult = await db_query.customQuery(
//       remainingQuery,
//       "Calculate Remaining",
//     );

//     // =============================================
//     // CHECK ALL REQUESTED ITEMS ARE VALID ROOT ITEMS
//     // =============================================

//     if (
//       !remainingResult.data ||
//       remainingResult.data.length !== itemIds.length
//     ) {
//       await connect_db.query("ROLLBACK");

//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "Some order items are invalid or are not root order items",
//         data: [],
//       });
//     }

//     // =============================================
//     // ONLY ITEMS WITH REMAINING QUANTITY
//     // =============================================

//     const validItems = (remainingResult.data || []).filter(
//       (item) => Number(item.remaining_quantity) > 0,
//     );

//     if (validItems.length === 0) {
//       await connect_db.query("ROLLBACK");

//       return libFunc.sendResponse(res, {
//         status: 1,
//         msg: "No remaining quantity available",
//         data: [],
//       });
//     }

//     // =============================================
//     // CREATE REORDER ORDER
//     // =============================================

//     const reorderOrderId =
//       Date.now() + "_" + Math.random().toString(36).substring(2, 7);

//     const createOrderQuery = `
//       INSERT INTO sms.orders (
//         row_id,
//         shop_id,
//         supplier_id,
//         order_status,
//         order_date,
//         parent_order_id,
//         order_type,
//         resolution_status
//       )
//       VALUES (
//         '${reorderOrderId}',
//         '${parentOrder.shop_id}',
//         '${parentOrder.supplier_id}',
//         'PENDING',
//         NOW(),
//         '${safeOrderId}',
//         'REORDER',
//         'OPEN'
//       )
//     `;

//     await db_query.customQuery(createOrderQuery, "Create Reorder Order");

//     // =============================================
//     // CREATE REORDER ITEMS
//     // =============================================

//     for (const item of validItems) {
//       const reorderItemId =
//         Date.now() + "_" + Math.random().toString(36).substring(2, 7);

//       const quantity = Number(item.remaining_quantity);

//       await db_query.customQuery(
//         `
//         INSERT INTO sms.order_items (
//           row_id,
//           order_id,
//           request_id,
//           sweet_id,
//           quantity,
//           counter_id,
//           supplied_quantity,
//           cancelled_quantity,
//           item_status,
//           parent_order_item_id,
//           remaining_action,
//           remaining_action_on
//         )
//         VALUES (
//           '${reorderItemId}',
//           '${reorderOrderId}',
//           NULL,
//           '${item.sweet_id}',
//           ${quantity},
//           '${item.counter_id}',
//           0,
//           0,
//           'PENDING',
//           '${item.order_item_id}',
//           'PENDING',
//           NULL
//         )
//         `,
//         "Create Reorder Item",
//       );

//       // =========================================
//       // MARK ROOT ITEM AS REORDERED
//       // =========================================

//       await db_query.customQuery(`
//         UPDATE sms.order_items
//         SET
//           remaining_action = 'REORDERED',
//           remaining_action_on = NOW(),
//           up_on = NOW()
//         WHERE row_id = '${item.order_item_id}'
//       `);
//     }

//     // =============================================
//     // PARENT ORDER REMAINS OPEN
//     // =============================================

//     await db_query.customQuery(`
//       UPDATE sms.orders
//       SET
//         resolution_status = 'OPEN',
//         up_on = NOW()
//       WHERE row_id = '${safeOrderId}'
//     `);

//     // =============================================
//     // COMMIT
//     // =============================================

//     await connect_db.query("COMMIT");

//     // =============================================
//     // NOTIFY SUPPLIER
//     // =============================================

//     const supplierUsers = await db_query.customQuery(`
//       SELECT
//         row_id
//       FROM sms.users
//       WHERE supplier_id = '${parentOrder.supplier_id}'
//     `);

//     if (supplierUsers.data?.length) {
//       for (const supplierUser of supplierUsers.data) {
//         await createNotification({
//           user_id: supplierUser.row_id,

//           title: "Re-order Received",

//           message: `Re-order created with ${validItems.length} item(s)`,

//           type: "ORDER",

//           reference_id: reorderOrderId,
//         });
//       }
//     }

//     // =============================================
//     // RESPONSE
//     // =============================================

//     return libFunc.sendResponse(res, {
//       status: 0,

//       msg: "Remaining quantity reordered successfully",

//       data: {
//         parent_order_id: order_id,

//         reorder_order_id: reorderOrderId,

//         order_type: "REORDER",

//         resolution_status: "OPEN",

//         items: validItems.map((item) => ({
//           order_item_id: item.order_item_id,
//           sweet_id: item.sweet_id,
//           counter_id: item.counter_id,
//           remaining_quantity: Number(item.remaining_quantity),
//         })),
//       },
//     });
//   } catch (error) {
//     console.error("reorderRemaining error:", error);

//     try {
//       await connect_db.query("ROLLBACK");
//     } catch (rollbackError) {
//       console.log("Rollback error:", rollbackError);
//     }

//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Failed to reorder remaining quantity",
//       data: [],
//       error: error.message,
//     });
//   }
// }

async function reorderRemaining(req, res) {
  try {
    const user = req.data;

    // =====================================================
    // ROLE VALIDATION
    // =====================================================

    if (!user || user.user_role !== "SHOP_ADMIN") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only SHOP_ADMIN can reorder remaining quantity",
        data: [],
      });
    }

    const { order_id, items } = req.data || {};

    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (!order_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order ID required",
        data: [],
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Items required",
        data: [],
      });
    }

    if (!user.shopId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Shop ID not found in token",
        data: [],
      });
    }

    const shopId = user.shopId;

    const safeOrderId = String(order_id).trim().replaceAll("'", "`");

    const safeShopId = String(shopId).trim().replaceAll("'", "`");

    // =====================================================
    // UNIQUE ITEM IDS
    // =====================================================

    const itemIds = [
      ...new Set(
        items
          .map((x) => x.order_item_id)
          .filter(Boolean)
          .map((id) => String(id).trim()),
      ),
    ];

    if (itemIds.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Valid order item IDs required",
        data: [],
      });
    }

    const itemIdString = itemIds
      .map((id) => `'${id.replaceAll("'", "`")}'`)
      .join(",");

    // =====================================================
    // BEGIN TRANSACTION
    // =====================================================

    await connect_db.query("BEGIN");

    // =====================================================
    // GET SELECTED ORDER
    //
    // If selected order is REORDER,
    // parent_order_id will point to root order.
    // =====================================================

    const orderQuery = `
      SELECT
        row_id,
        shop_id,
        supplier_id,
        order_status,
        order_type,
        parent_order_id,
        resolution_status
      FROM sms.orders
      WHERE row_id = '${safeOrderId}'
        AND shop_id = '${safeShopId}'
      LIMIT 1
      FOR UPDATE
    `;

    const orderResult = await db_query.customQuery(
      orderQuery,
      "Check Reorder Source Order",
    );

    if (!orderResult.data?.length) {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order not found",
        data: [],
      });
    }

    const selectedOrder = orderResult.data[0];

    // =====================================================
    // VALID ORDER TYPE
    // =====================================================

    if (!["NORMAL", "REORDER"].includes(selectedOrder.order_type || "NORMAL")) {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid order type for reorder",
        data: [],
      });
    }

    // =====================================================
    // FIND ROOT ORDER
    //
    // NORMAL:
    // rootOrderId = selected order
    //
    // REORDER:
    // rootOrderId = original parent order
    // =====================================================

    let rootOrderId = selectedOrder.row_id;

    if (
      selectedOrder.order_type === "REORDER" &&
      selectedOrder.parent_order_id
    ) {
      rootOrderId = selectedOrder.parent_order_id;
    }

    rootOrderId = String(rootOrderId).trim().replaceAll("'", "`");

    // =====================================================
    // FETCH ROOT ORDER
    // =====================================================

    const rootOrderQuery = `
      SELECT
        row_id,
        shop_id,
        supplier_id,
        order_status,
        order_type,
        parent_order_id,
        resolution_status
      FROM sms.orders
      WHERE row_id = '${rootOrderId}'
        AND shop_id = '${safeShopId}'
      LIMIT 1
      FOR UPDATE
    `;

    const rootOrderResult = await db_query.customQuery(
      rootOrderQuery,
      "Check Root Order",
    );

    if (!rootOrderResult.data?.length) {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Root order not found",
        data: [],
      });
    }

    const rootOrder = rootOrderResult.data[0];

    // =====================================================
    // ROOT ORDER MUST NOT BE RESOLVED
    // =====================================================

    if (rootOrder.resolution_status === "RESOLVED") {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order is already resolved. No remaining quantity available",
        data: [],
      });
    }

    // =====================================================
    // ORDER STATUS VALIDATION
    //
    // Reorder can happen after:
    //
    // ACCEPTED
    // PARTIAL
    // DISPATCHED
    // DELIVERED
    // =====================================================

    if (
      !["DELIVERED", "DISPATCHED", "ACCEPTED", "PARTIAL"].includes(
        selectedOrder.order_status,
      )
    ) {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Re-order is not allowed for current order status",
        data: [],
      });
    }

    // =====================================================
    // RESOLVE REQUESTED ITEM IDS TO ROOT ITEMS
    //
    // User can send:
    //
    // 1. Original/root order_item_id
    //
    // OR
    //
    // 2. Reorder child order_item_id
    //
    // In both cases we find the ROOT item.
    // =====================================================

    const resolveRootItemsQuery = `
      SELECT
        child.row_id AS requested_item_id,

        CASE
          WHEN child.parent_order_item_id IS NULL
            THEN child.row_id

          ELSE child.parent_order_item_id
        END AS root_order_item_id

      FROM sms.order_items child

      WHERE child.row_id IN (${itemIdString})

      OR child.parent_order_item_id IN (${itemIdString})
    `;

    const resolveRootItemsResult = await db_query.customQuery(
      resolveRootItemsQuery,
      "Resolve Root Order Items",
    );

    const resolvedRows = resolveRootItemsResult.data || [];

    // =====================================================
    // CREATE ROOT ITEM ID MAP
    // =====================================================

    const rootItemIds = [
      ...new Set(
        resolvedRows.map((item) => item.root_order_item_id).filter(Boolean),
      ),
    ];

    if (rootItemIds.length === 0) {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "No valid root order items found",
        data: [],
      });
    }

    const rootItemIdString = rootItemIds
      .map((id) => `'${String(id).replaceAll("'", "`")}'`)
      .join(",");

    // =====================================================
    // FETCH ROOT ITEMS + CALCULATE ACTUAL REMAINING
    //
    // Remaining:
    //
    // Root Requested
    // - Root Supplied
    // - All Reorder Supplied
    // - Cancelled
    //
    // IMPORTANT:
    // quantity is TEXT in order_items,
    // therefore ::numeric is required.
    // =====================================================

    const remainingQuery = `
      SELECT

        root.row_id AS order_item_id,

        root.sweet_id,

        root.counter_id,

        root.quantity,

        root.supplied_quantity,

        root.cancelled_quantity,

        root.remaining_action,

        root.remaining_action_on,


        /* ================================================
           REORDER SUPPLIED
        ================================================= */

        COALESCE(
          (
            SELECT SUM(
              COALESCE(
                child.supplied_quantity,
                0
              )::numeric
            )

            FROM sms.order_items child

            WHERE child.parent_order_item_id =
                  root.row_id
          ),
          0
        )::numeric AS reorder_supplied_quantity,


        /* ================================================
           ACTUAL REMAINING
        ================================================= */

        GREATEST(

          root.quantity::numeric

          -

          COALESCE(
            root.supplied_quantity,
            0
          )::numeric

          -

          COALESCE(
            (
              SELECT SUM(
                COALESCE(
                  child.supplied_quantity,
                  0
                )::numeric
              )

              FROM sms.order_items child

              WHERE child.parent_order_item_id =
                    root.row_id
            ),
            0
          )::numeric

          -

          COALESCE(
            root.cancelled_quantity,
            0
          )::numeric,

          0

        ) AS remaining_quantity


      FROM sms.order_items root

      WHERE root.row_id IN (
        ${rootItemIdString}
      )

      AND root.order_id = '${rootOrderId}'

      AND root.parent_order_item_id IS NULL

      FOR UPDATE
    `;

    const remainingResult = await db_query.customQuery(
      remainingQuery,
      "Calculate Root Remaining Quantity",
    );

    const rootItems = remainingResult.data || [];

    // =====================================================
    // CHECK ALL ITEMS ARE VALID
    // =====================================================

    if (rootItems.length !== rootItemIds.length) {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Some order items are invalid or are not root order items",
        data: [],
      });
    }

    // =====================================================
    // ONLY ITEMS WITH REMAINING QUANTITY
    // =====================================================

    const validItems = (remainingResult.data || []).filter(
      (item) => Number(item.remaining_quantity) > 0,
    );

    if (validItems.length === 0) {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,
        msg: "No remaining quantity available",
        data: [],
      });
    }

    // =====================================================
    // ROOT ITEM IDS
    // =====================================================

    const validRootItemIds = validItems.map(
      (item) => `'${String(item.order_item_id).replaceAll("'", "`")}'`,
    );

    // =====================================================
    // CHECK ACTIVE REORDER
    //
    // PENDING / ACCEPTED
    // → BLOCK
    //
    // PARTIAL
    // → ALLOW next reorder
    //
    // REJECTED
    // → ALLOW
    //
    // DELIVERED
    // → ALLOW if remaining > 0
    // =====================================================

    const activeReorderQuery = `
  SELECT

    child.parent_order_item_id
      AS root_order_item_id,

    child.order_id
      AS reorder_order_id,

    child.row_id
      AS reorder_order_item_id,

    child.quantity::numeric
      AS reorder_quantity,

    COALESCE(
      child.supplied_quantity,
      0
    )::numeric AS supplied_quantity,

    COALESCE(
      child.cancelled_quantity,
      0
    )::numeric AS cancelled_quantity,

    GREATEST(
      child.quantity::numeric
      -
      COALESCE(
        child.supplied_quantity,
        0
      )::numeric
      -
      COALESCE(
        child.cancelled_quantity,
        0
      )::numeric,
      0
    ) AS reorder_remaining_quantity,

    child.item_status,

    reorder.order_status,

    reorder.resolution_status,

    reorder.order_type,

    reorder.parent_order_id

  FROM sms.order_items child

  INNER JOIN sms.orders reorder
    ON reorder.row_id = child.order_id

  WHERE child.parent_order_item_id IN (
    ${validRootItemIds.join(",")}
  )

  AND reorder.order_type = 'REORDER'

  AND GREATEST(
    child.quantity::numeric
    -
    COALESCE(
      child.supplied_quantity,
      0
    )::numeric
    -
    COALESCE(
      child.cancelled_quantity,
      0
    )::numeric,
    0
  ) > 0

  AND child.item_status IN (
    'PENDING',
    'ACCEPTED'
  )

  ORDER BY reorder.cr_on DESC

  LIMIT 1
`;

    const activeReorderResult = await db_query.customQuery(
      activeReorderQuery,
      "Check Active Reorder",
    );

    const activeReorders = activeReorderResult.data || [];

    // =====================================================
    // BLOCK DUPLICATE / ACTIVE REORDER
    // =====================================================

    if (activeReorders.length > 0) {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,

        msg: "Re-order is already in progress for one or more items. Please wait until the current re-order is processed.",

        data: activeReorders.map((item) => ({
          root_order_item_id: item.root_order_item_id,

          reorder_order_id: item.reorder_order_id,

          reorder_order_item_id: item.reorder_order_item_id,

          reorder_quantity: Number(item.reorder_quantity || 0),

          supplied_quantity: Number(item.supplied_quantity || 0),

          cancelled_quantity: Number(item.cancelled_quantity || 0),

          remaining_quantity: Number(item.reorder_remaining_quantity || 0),

          item_status: item.item_status,

          order_status: item.order_status,

          resolution_status: item.resolution_status,

          order_type: item.order_type,

          parent_order_id: item.parent_order_id,
        })),
      });
    }

    // =====================================================
    // CREATE REORDER ORDER
    // =====================================================

    const reorderOrderId =
      Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    const createOrderQuery = `
      INSERT INTO sms.orders (

        row_id,

        shop_id,

        supplier_id,

        order_status,

        order_date,

        parent_order_id,

        order_type,

        resolution_status

      )

      VALUES (

        '${reorderOrderId}',

        '${rootOrder.shop_id}',

        '${rootOrder.supplier_id}',

        'PENDING',

        NOW(),

        '${rootOrderId}',

        'REORDER',

        'OPEN'

      )
    `;

    await db_query.customQuery(createOrderQuery, "Create Reorder Order");

    // =====================================================
    // CREATE REORDER ITEMS
    // =====================================================

    const createdItems = [];

    for (const item of validItems) {
      const reorderItemId =
        Date.now() + "_" + Math.random().toString(36).substring(2, 7);

      const quantity = Number(item.remaining_quantity);

      // ===================================================
      // SAFETY
      // ===================================================

      if (!Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      // ===================================================
      // CREATE REORDER ITEM
      // ===================================================

      await db_query.customQuery(
        `
          INSERT INTO sms.order_items (

            row_id,

            order_id,

            request_id,

            sweet_id,

            quantity,

            counter_id,

            supplied_quantity,

            cancelled_quantity,

            item_status,

            parent_order_item_id,

            remaining_action,

            remaining_action_on

          )

          VALUES (

            '${reorderItemId}',

            '${reorderOrderId}',

            NULL,

            '${item.sweet_id}',

            ${quantity},

            '${item.counter_id}',

            0,

            0,

            'PENDING',

            '${item.order_item_id}',

            'PENDING',

            NULL

          )
        `,
        "Create Reorder Item",
      );

      // ===================================================
      // MARK ROOT ITEM
      // ===================================================

      await db_query.customQuery(
        `
          UPDATE sms.order_items

          SET

            remaining_action = 'REORDERED',

            remaining_action_on = NOW(),

            up_on = NOW()

          WHERE row_id =
                '${item.order_item_id}'
        `,
        "Mark Root Item Reordered",
      );

      // ===================================================
      // RESPONSE ITEM
      // ===================================================

      createdItems.push({
        root_order_item_id: item.order_item_id,

        reorder_order_item_id: reorderItemId,

        sweet_id: item.sweet_id,

        counter_id: item.counter_id,

        reorder_quantity: quantity,

        previous_supplied_quantity: Number(item.supplied_quantity || 0),

        previous_reorder_supplied_quantity: Number(
          item.reorder_supplied_quantity || 0,
        ),

        remaining_quantity: quantity,
      });
    }

    // =====================================================
    // SAFETY: NO ITEM CREATED
    // =====================================================

    if (createdItems.length === 0) {
      await connect_db.query("ROLLBACK");

      return libFunc.sendResponse(res, {
        status: 1,

        msg: "No valid remaining items available for reorder",

        data: [],
      });
    }

    // =====================================================
    // ROOT ORDER REMAINS OPEN
    //
    // Because business resolution is across
    // original + reorder orders.
    // =====================================================

    await db_query.customQuery(
      `
        UPDATE sms.orders

        SET

          resolution_status = 'OPEN',

          up_on = NOW()

        WHERE row_id =
              '${rootOrderId}'
      `,
      "Keep Root Order Open",
    );

    // =====================================================
    // COMMIT
    // =====================================================

    await connect_db.query("COMMIT");

    // =====================================================
    // NOTIFY SUPPLIER
    // =====================================================

    try {
      const supplierUsers = await db_query.customQuery(
        `
            SELECT
              row_id

            FROM sms.users

            WHERE supplier_id =
                  '${rootOrder.supplier_id}'
          `,
        "Get Supplier Users",
      );

      if (supplierUsers.data?.length) {
        for (const supplierUser of supplierUsers.data) {
          await createNotification({
            user_id: supplierUser.row_id,

            title: "Re-order Received",

            message: `Re-order ${reorderOrderId} created with ${createdItems.length} item(s)`,

            type: "ORDER",

            reference_id: reorderOrderId,

            reference_type: "ORDER",

            priority: "NORMAL",
          });
        }
      }
    } catch (notificationError) {
      // Notification failure should not
      // make successful reorder fail.

      console.log("Reorder notification error:", notificationError);
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return libFunc.sendResponse(res, {
      status: 0,

      msg: "Remaining quantity reordered successfully",

      data: {
        root_order_id: rootOrderId,

        requested_from_order_id: order_id,

        reorder_order_id: reorderOrderId,

        order_type: "REORDER",

        parent_order_id: rootOrderId,

        resolution_status: "OPEN",

        items: createdItems,
      },
    });
  } catch (error) {
    console.error("reorderRemaining error:", error);

    // =====================================================
    // ROLLBACK
    // =====================================================

    try {
      await connect_db.query("ROLLBACK");
    } catch (rollbackError) {
      console.log("Rollback error:", rollbackError);
    }

    return libFunc.sendResponse(res, {
      status: 1,

      msg: "Failed to reorder remaining quantity",

      data: [],

      error: error.message,
    });
  }
}
// {
//   "order_id": "ORDER-001",
//   "items": [
//     {
//       "order_item_id": "OI-001"
//     },
//     {
//       "order_item_id": "OI-002"
//     }
//   ]
// }

async function cancelRemaining(req, res) {
  try {
    const user = req.data;

    // =====================================================
    // ROLE CHECK
    // =====================================================

    if (!user || user.user_role !== "SHOP_ADMIN") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only SHOP_ADMIN can cancel remaining quantity",
        data: [],
      });
    }

    const { order_id, items } = req.data;

    console.log("all items", items);

    if (!order_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order ID required",
        data: [],
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Items required",
        data: [],
      });
    }

    const shopId = user.shopId;

    if (!shopId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Shop ID not found",
        data: [],
      });
    }

    // =====================================================
    // UNIQUE ITEM IDS
    // =====================================================

    const itemIds = [
      ...new Set(items.map((x) => x.order_item_id).filter((id) => id)),
    ];

    if (itemIds.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Valid order item IDs required",
        data: [],
      });
    }

    const itemIdString = itemIds.map((id) => `'${id}'`).join(",");

    // =====================================================
    // BEGIN TRANSACTION
    // =====================================================

    await db_query.customQuery("BEGIN", "Begin Cancel Remaining");

    try {
      // ===================================================
      // CHECK PARENT ORDER
      // ===================================================

      const orderQuery = `
        SELECT
          row_id,
          shop_id,
          supplier_id,
          order_status,
          order_type,
          resolution_status
        FROM sms.orders
        WHERE row_id = '${order_id}'
        AND shop_id = '${shopId}'
        LIMIT 1
        FOR UPDATE
      `;

      const orderResult = await db_query.customQuery(
        orderQuery,
        "Check Cancel Order",
      );

      if (!orderResult.data || orderResult.data.length === 0) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const order = orderResult.data[0];

      // ===================================================
      // ALREADY RESOLVED CHECK
      // ===================================================

      if (order.resolution_status === "RESOLVED") {
        throw new Error("ORDER_ALREADY_RESOLVED");
      }

      // ===================================================
      // ORDER STATUS CHECK
      // ===================================================
      //
      // Cancellation is allowed only after supplier has
      // processed the order.
      //
      // PENDING is intentionally not allowed.
      //

      const allowedStatuses = [
        "ACCEPTED",
        "PARTIAL",
        "DISPATCHED",
        "DELIVERED",
      ];

      if (!allowedStatuses.includes(order.order_status)) {
        throw new Error("INVALID_ORDER_STATUS");
      }

      // ===================================================
      // GET ROOT ITEMS + LOCK
      // ===================================================

      const itemQuery = `
        SELECT
          root.row_id AS order_item_id,
          root.sweet_id,
          root.counter_id,
          root.quantity,

          COALESCE(
            root.supplied_quantity,
            0
          )::numeric AS supplied_quantity,

          COALESCE(
            root.cancelled_quantity,
            0
          )::numeric AS cancelled_quantity,

          GREATEST(
            0,

            root.quantity::numeric

            -

            COALESCE(
              root.supplied_quantity,
              0
            )::numeric

            -

            COALESCE(
              (
                SELECT SUM(
                  COALESCE(
                    child.supplied_quantity,
                    0
                  )::numeric
                )
                FROM sms.order_items child
                WHERE child.parent_order_item_id = root.row_id
              ),
              0
            )::numeric

            -

            COALESCE(
              root.cancelled_quantity,
              0
            )::numeric

          ) AS remaining_quantity

        FROM sms.order_items root

        JOIN sms.orders o
          ON o.row_id = root.order_id

        WHERE root.row_id IN (${itemIdString})

        AND root.order_id = '${order_id}'

        AND root.parent_order_item_id IS NULL

        AND o.shop_id = '${shopId}'

        FOR UPDATE
      `;

      const itemResult = await db_query.customQuery(
        itemQuery,
        "Get Remaining For Cancel",
      );

      const foundItems = itemResult.data || [];

      // ===================================================
      // CHECK ALL REQUESTED ITEMS EXIST
      // ===================================================

      if (foundItems.length !== itemIds.length) {
        throw new Error("INVALID_ORDER_ITEMS");
      }

      // ===================================================
      // ONLY ITEMS WITH REMAINING QUANTITY
      // ===================================================

      const validItems = foundItems.filter(
        (item) => Number(item.remaining_quantity) > 0,
      );

      if (validItems.length === 0) {
        throw new Error("NO_REMAINING_QUANTITY");
      }

      // ===================================================
      // CANCEL EXACT REMAINING QUANTITY
      // ===================================================

      for (const item of validItems) {
        const remaining = Number(item.remaining_quantity);

        const updateQuery = `
          UPDATE sms.order_items

          SET
            cancelled_quantity =
              COALESCE(
                cancelled_quantity,
                0
              ) + ${remaining},

            remaining_action = 'CANCELLED',

            remaining_action_on = NOW(),

            up_on = NOW()

          WHERE row_id = '${item.order_item_id}'
          AND order_id = '${order_id}'
          AND parent_order_item_id IS NULL
        `;

        await db_query.customQuery(updateQuery, "Cancel Remaining Item");
      }

      // ===================================================
      // UPDATE ORDER RESOLUTION
      // ===================================================

      await updateOrderResolution(order_id);

      // ===================================================
      // COMMIT
      // ===================================================

      await db_query.customQuery("COMMIT", "Commit Cancel Remaining");

      // ===================================================
      // RESPONSE
      // ===================================================

      return libFunc.sendResponse(res, {
        status: 0,
        msg: "Remaining quantity cancelled successfully",
        data: validItems.map((item) => ({
          order_item_id: item.order_item_id,
          sweet_id: item.sweet_id,
          counter_id: item.counter_id,
          cancelled_quantity: Number(item.remaining_quantity),
          remaining_quantity: 0,
          remaining_action: "CANCELLED",
        })),
      });
    } catch (error) {
      // ===================================================
      // ROLLBACK
      // ===================================================

      await db_query.customQuery("ROLLBACK", "Rollback Cancel Remaining");

      // ===================================================
      // BUSINESS ERRORS
      // ===================================================

      if (error.message === "ORDER_NOT_FOUND") {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Order not found",
          data: [],
        });
      }

      if (error.message === "ORDER_ALREADY_RESOLVED") {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Order is already resolved",
          data: [],
        });
      }

      if (error.message === "INVALID_ORDER_STATUS") {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Remaining quantity cannot be cancelled while order is pending",
          data: [],
        });
      }

      if (error.message === "INVALID_ORDER_ITEMS") {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "One or more order items are invalid",
          data: [],
        });
      }

      if (error.message === "NO_REMAINING_QUANTITY") {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "No remaining quantity available for cancellation",
          data: [],
        });
      }

      throw error;
    }
  } catch (error) {
    console.error("cancelRemaining error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Failed to cancel remaining quantity",
      data: [],
    });
  }
}

// {
//   "order_id": "ORDER-001",
//   "items": [
//     {
//       "order_item_id": "OI-002"
//     }
//   ]
// }

async function updateOrderResolution(orderId) {
  try {
    // =====================================================
    // GET ROOT ORDER ITEMS
    // =====================================================

    const query = `
      SELECT
        root.row_id,

        GREATEST(
          0,

          root.quantity::numeric

          -

          COALESCE(
            root.supplied_quantity,
            0
          )::numeric

          -

          COALESCE(
            (
              SELECT SUM(
                COALESCE(
                  child.supplied_quantity,
                  0
                )::numeric
              )
              FROM sms.order_items child
              WHERE child.parent_order_item_id = root.row_id
            ),
            0
          )::numeric

          -

          COALESCE(
            root.cancelled_quantity,
            0
          )::numeric

        ) AS remaining_quantity

      FROM sms.order_items root

      WHERE root.order_id = '${orderId}'

      AND root.parent_order_item_id IS NULL
    `;

    const result = await db_query.customQuery(query, "Check Order Resolution");

    const items = result.data || [];

    // =====================================================
    // NO ITEMS
    // =====================================================

    if (items.length === 0) {
      console.log(`No root items found for order: ${orderId}`);

      return;
    }

    // =====================================================
    // CHECK REMAINING
    // =====================================================

    const remainingExists = items.some(
      (item) => Number(item.remaining_quantity) > 0,
    );

    // =====================================================
    // UPDATE ORDER RESOLUTION
    // =====================================================

    const resolutionStatus = remainingExists ? "OPEN" : "RESOLVED";

    await db_query.customQuery(
      `
        UPDATE sms.orders
        SET
          resolution_status = '${resolutionStatus}',
          up_on = NOW()
        WHERE row_id = '${orderId}'
      `,
      `Update Order Resolution - ${resolutionStatus}`,
    );

    console.log(`Order ${orderId} resolution updated to ${resolutionStatus}`);
  } catch (error) {
    console.error("updateOrderResolution error:", error);

    throw error;
  }
}
