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
  cr_shop: createShop,
  fe_shop: fetchShops,

  // counter
  cr_counter: createCounter,
  fe_counter: fetchCounters,

  // supplier
  cr_supplier: createSupplier,
  fe_supplier: fetchSuppliers,
  fe_my_ord: getSupplierOrders,
  up_ord_stu: updateOrderStatus,

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

  // order (Purchase order)
  // cr_ord: createOrder,
  cr_counter_req: createCounterRequest,
  cr_final_order: createFinalOrder,

  //Challan
  cr_challan: createChalan,

  //pdf
  dow_pdf: downloadOrderPDF,
  dow_ch_pdf: downloadChalanPDF,
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
       WHERE phone = '${phone.trim()}' OR email = '${email.trim()}'`
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
  console.log(req);
  try {
    const inventoryTable = schema + ".inventory";
    const transactionTable = schema + ".stock_transactions";
    const sweetTable = schema + ".sweets";
    const categoryTable = schema + ".categories";
    const deptTable = schema + ".departments";
    const counterTable = schema + ".counters";

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

    //  Basic validation
    if (!sweet_id || !transaction_type || !quantity) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Missing required fields",
      });
    }

    //  Resolve counter_id based on role
    let finalCounterId;

    if (user.user_role === "COUNTER_USER") {
      finalCounterId = user.counterId;
    }

    if (user.user_role === "SHOP_ADMIN") {
      if (!counter_id) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "counter_id is required",
        });
      }
      finalCounterId = counter_id;
    }

    //  Get Counter → Shop
    const counterCheck = await db_query.customQuery(`
      SELECT shop_id
      FROM ${counterTable}
      WHERE row_id = '${finalCounterId}'
    `);

    if (!counterCheck.data || counterCheck.data.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid counter",
      });
    }

    const counterShopId = counterCheck.data[0].shop_id;

    //  SHOP_ADMIN restriction
    if (user.user_role === "SHOP_ADMIN") {
      if (counterShopId !== user.shopId) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Unauthorized shop access",
        });
      }
    }

    const qty = Number(quantity);

    if (isNaN(qty) || qty <= 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Quantity must be greater than 0",
      });
    }

    //  Transaction type validation
    const validTypes = ["IN", "OUT", "ADJUST"];
    if (!validTypes.includes(transaction_type)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid transaction type",
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
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid sweet",
      });
    }

    const sweetShopId = sweetCheck.data[0].shop_id;

    //  CORE VALIDATION
    if (sweetShopId !== counterShopId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Sweet and Counter must belong to same shop",
      });
    }

    //  Min/Max validation
    if (min_stock !== null && max_stock !== null) {
      if (Number(min_stock) > Number(max_stock)) {
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "Min stock cannot be greater than max stock",
        });
      }
    }

    //  START TRANSACTION
    await connect_db.query("BEGIN");

    //  Insert transaction
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
      "Stock Transaction"
    );

    //  Check inventory
    const existing = await db_query.customQuery(`
      SELECT * FROM ${inventoryTable}
      WHERE counter_id = '${finalCounterId}'
      AND sweet_id = '${sweet_id}'
    `);

    let newQty = qty;

    if (existing.data && existing.data.length > 0) {
      const existingRow = existing.data[0];
      const currentQty = Number(existingRow.quantity);

      if (transaction_type === "IN") {
        newQty = currentQty + qty;
      } else if (transaction_type === "OUT") {
        if (currentQty < qty) {
          await connect_db.query("ROLLBACK");
          return libFunc.sendResponse(res, {
            status: 1,
            msg: "Insufficient stock",
          });
        }
        newQty = currentQty - qty;
      } else {
        newQty = qty; // ADJUST
      }

      await db_query.addData(
        inventoryTable,
        {
          quantity: newQty,
          expiry_date,
          ...(min_stock !== null && { min_stock }),
          ...(max_stock !== null && { max_stock }),
        },
        existingRow.row_id,
        "Inventory"
      );
    } else {
      if (transaction_type !== "IN") {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "No stock available",
        });
      }

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
        "Inventory"
      );
    }

    await connect_db.query("COMMIT");

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

    const { counter_id, sweet_id, transaction_type, from_date, to_date } =
      req.data || {};

    // 🔹 Base Query
    let where = `WHERE 1=1`;

    if (counter_id) {
      where += ` AND st.counter_id = '${counter_id.trim()}'`;
    }

    if (sweet_id) {
      where += ` AND st.sweet_id = '${sweet_id.trim()}'`;
    }

    if (transaction_type) {
      where += ` AND st.transaction_type = '${transaction_type}'`;
    }

    if (from_date) {
      where += ` AND st.cr_on >= '${from_date}'`;
    }

    if (to_date) {
      where += ` AND st.cr_on <= '${to_date}'`;
    }

    // 🔹 Query
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
        c.counter_name

      FROM ${transactionTable} st
      LEFT JOIN ${sweetTable} s 
        ON s.row_id = st.sweet_id
      LEFT JOIN ${counterTable} c 
        ON c.row_id = st.counter_id

      ${where}
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

    const data = await db_query.customQuery(`
      SELECT 
        i.row_id,
        i.quantity,
        i.expiry_date,

        s.row_id AS sweet_id,
        s.sweet_name,
        s.unit,
        s.price,

        c.row_id AS counter_id,
        c.counter_name,
        c.location,

        i.cr_on

      FROM ${inventoryTable} i
      LEFT JOIN ${sweetTable} s 
        ON s.row_id = i.sweet_id
      LEFT JOIN ${counterTable} c 
        ON c.row_id = i.counter_id

      WHERE i.quantity > 0
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
        "Counter Request"
      );
    }

    await connect_db.query("COMMIT");

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Request sent to shop admin",
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

    //  Role validation
    if (!["ADMIN", "SHOP_ADMIN"].includes(user.user_role)) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Access denied",
      });
    }

    //  Resolve shop_id
    let finalShopId;

    if (user.user_role === "SHOP_ADMIN") {
      finalShopId = user.shopId; //  from token
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

    //  Basic validation
    if (!supplier_id || !request_ids || request_ids.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Supplier and request_ids required",
      });
    }

    await connect_db.query("BEGIN");

    //  Validate Supplier
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

    //  Fetch PENDING requests + join counter → shop
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

    //  Shop validation
    for (let r of requests.data) {
      if (r.shop_id !== finalShopId) {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "All requests must belong to your shop",
        });
      }
    }

    //  Combine sweets
    const sweetMap = {};

    for (let r of requests.data) {
      if (!sweetMap[r.sweet_id]) {
        sweetMap[r.sweet_id] = 0;
      }
      sweetMap[r.sweet_id] += Number(r.quantity);
    }

    //  Create Order
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
      "Order"
    );

    //  Insert Order Items
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
        "Order Item"
      );
    }

    //  Update requests → APPROVED
    await db_query.customQuery(`
      UPDATE ${requestTable}
      SET status = 'APPROVED'
      WHERE row_id IN (${request_ids.map((id) => `'${id}'`).join(",")})
    `);

    await connect_db.query("COMMIT");

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

async function getOrderDetails(req, res) {
  try {
    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";
    const sweetTable = schema + ".sweets";
    const supplierTable = schema + ".suppliers";
    const counterTable = schema + ".counters";

    const { order_id } = req.data || {};

    // 🔹 Validation
    if (!order_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order ID required",
      });
    }

    // 🔹 Fetch Order + Items
    const result = await db_query.customQuery(`
      SELECT
        o.row_id AS order_id,
        o.order_status,
        o.order_date,

        c.row_id AS counter_id,
        c.counter_name,
        c.location,

        s.row_id AS supplier_id,
        s.supplier_name,

        oi.sweet_id,
        sw.sweet_name,
        sw.unit,
        oi.quantity

      FROM ${orderTable} o
      LEFT JOIN ${counterTable} c 
        ON c.row_id = o.counter_id
      LEFT JOIN ${supplierTable} s 
        ON s.row_id = o.supplier_id
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

    // 🔹 Format Response
    const orderData = {
      order_id: result.data[0].order_id,
      order_status: result.data[0].order_status,
      order_date: result.data[0].order_date,
      counter: {
        counter_id: result.data[0].counter_id,
        counter_name: result.data[0].counter_name,
        location: result.data[0].location,
      },
      supplier: {
        supplier_id: result.data[0].supplier_id,
        supplier_name: result.data[0].supplier_name,
      },
      items: [],
    };

    for (let row of result.data) {
      if (row.sweet_id) {
        orderData.items.push({
          sweet_id: row.sweet_id,
          sweet_name: row.sweet_name,
          unit: row.unit,
          quantity: row.quantity,
        });
      }
    }

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Order details fetched successfully",
      data: orderData,
    });
  } catch (error) {
    console.log("getOrderDetails error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function getOrdersByCounter(req, res) {
  try {
    const orderTable = schema + ".orders";
    const itemTable = schema + ".order_items";
    const sweetTable = schema + ".sweets";
    const supplierTable = schema + ".suppliers";

    const { counter_id, order_status, from_date, to_date } = req.data || {};

    // 🔹 Validation
    if (!counter_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Counter ID required",
      });
    }

    // 🔹 Dynamic WHERE
    let where = `WHERE o.counter_id = '${counter_id.trim()}'`;

    if (order_status) {
      where += ` AND o.order_status = '${order_status}'`;
    }

    if (from_date) {
      where += ` AND o.order_date >= '${from_date}'`;
    }

    if (to_date) {
      where += ` AND o.order_date <= '${to_date}'`;
    }

    // 🔹 Query
    const result = await db_query.customQuery(`
      SELECT
        o.row_id AS order_id,
        o.order_status,
        o.order_date,

        s.row_id AS supplier_id,
        s.supplier_name,

        oi.sweet_id,
        sw.sweet_name,
        sw.unit,
        oi.quantity

      FROM ${orderTable} o
      LEFT JOIN ${supplierTable} s 
        ON s.row_id = o.supplier_id
      LEFT JOIN ${itemTable} oi 
        ON oi.order_id = o.row_id
      LEFT JOIN ${sweetTable} sw 
        ON sw.row_id = oi.sweet_id

      ${where}
      ORDER BY o.order_date DESC
    `);

    // 🔹 Group order-wise
    const ordersMap = {};

    for (let row of result.data) {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          order_id: row.order_id,
          order_status: row.order_status,
          order_date: row.order_date,
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

    const finalData = Object.values(ordersMap);

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Orders fetched successfully",
      data: finalData,
    });
  } catch (error) {
    console.log("getOrdersByCounter error:", error);

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

async function updateOrderStatus(req, res) {
  try {
    const orderTable = schema + ".orders";

    const { order_id, order_status } = req.data || {};

    // 🔹 Validation
    if (!order_id || !order_status) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order ID and Status required",
      });
    }

    // 🔹 Check order exists
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

    const currentStatus = orderCheck.data[0].order_status;

    // 🔥 Rules
    if (currentStatus === "COMPLETED") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Completed order cannot be updated",
      });
    }

    if (currentStatus === "PENDING" && order_status !== "DISPATCHED") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only DISPATCHED allowed from PENDING",
      });
    }

    if (currentStatus === "DISPATCHED" && order_status !== "COMPLETED") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Only COMPLETED allowed from DISPATCHED",
      });
    }

    // 🔹 Update
    const resp = await db_query.addData(
      orderTable,
      { order_status },
      order_id.trim(),
      "Order"
    );

    return libFunc.sendResponse(res, resp);
  } catch (error) {
    console.log("updateOrderStatus error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

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
      "Order"
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

    const { order_id, status } = req.data || {};
    const user = req.data;

    const validStatuses = ["ACCEPTED", "REJECTED", "DISPATCHED", "DELIVERED"];

    //  Validation
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

    //  Get order
    const orderCheck = await db_query.customQuery(`
      SELECT supplier_id, shop_id, order_status
      FROM ${orderTable}
      WHERE row_id = '${order_id.trim()}'
    `);

    if (!orderCheck.data || orderCheck.data.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid order",
      });
    }

    const order = orderCheck.data[0];

    //  Role-based access
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

    //  Status flow validation
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

    //  Update
    await db_query.addData(
      orderTable,
      { order_status: status },
      order_id.trim(),
      "Order"
    );

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

    const { order_id, dispatch_date, transport_details = "" } = req.data || {};
    const user = req.data;

    // Role validation
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

    //  Get Order
    const orderCheck = await db_query.customQuery(`
      SELECT supplier_id, order_status
      FROM ${orderTable}
      WHERE row_id = '${order_id.trim()}'
    `);

    if (!orderCheck.data || orderCheck.data.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid order",
      });
    }

    const order = orderCheck.data[0];

    //  Ensure supplier owns order
    if (order.supplier_id !== user.supplierId) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Unauthorized order access",
      });
    }

    //  Status check
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

    await connect_db.query("BEGIN");

    //  Double check (avoid race condition)
    const existingChalan = await db_query.customQuery(`
      SELECT 1 FROM ${chalanTable}
      WHERE order_id = '${order_id.trim()}'
    `);

    if (existingChalan.data && existingChalan.data.length > 0) {
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Chalan already exists for this order",
      });
    }

    //  Create Chalan
    const chalanRowId = libFunc.randomid();

    await db_query.addData(chalanTable, {
      row_id: chalanRowId,
      order_id: order_id.trim(),
      supplier_id: user.supplierId, //  from token, not request
      dispatch_date: dispatch_date,
      transport_details: transport_details.trim(),
    });

    //  Update Order Status
    await db_query.addData(
      orderTable,
      { order_status: "DISPATCHED" },
      order_id.trim(),
      "Order"
    );

    await connect_db.query("COMMIT");

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
          }
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
      "Order"
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
      `attachment; filename=order_${order_id}.pdf`
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
        { align: "right" }
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

    const result = await db_query.customQuery(`
      SELECT
        ch.row_id AS chalan_id,
        ch.dispatch_date,
        ch.transport_details,

        o.row_id AS order_id,

        s.supplier_name,
        s.phone,
        s.address,

        oi.quantity,
        sw.sweet_name,
        sw.unit

      FROM ${chalanTable} ch
      LEFT JOIN ${orderTable} o ON o.row_id = ch.order_id
      LEFT JOIN ${supplierTable} s ON s.row_id = ch.supplier_id
      LEFT JOIN ${itemTable} oi ON oi.order_id = o.row_id
      LEFT JOIN ${sweetTable} sw ON sw.row_id = oi.sweet_id

      WHERE ch.row_id = '${chalan_id}'
    `);

    if (!result.data || result.data.length === 0) {
      return res.status(404).send("Chalan not found");
    }

    const data = result.data;

    const orgFolder = path.join("./public/uploads", "ShopMedia");
    if (!fs.existsSync(orgFolder)) {
      fs.mkdirSync(orgFolder, { recursive: true });
    }

    // 🔹 File name + path
    const fileName = `Report_${Date.now()}.pdf`;
    const filePath = path.join(orgFolder, fileName);

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=chalan_${chalan_id}.pdf`
    );

    doc.pipe(fs.createWriteStream(filePath));

    // ================= HEADER =================
    doc
      .fontSize(18)
      .fillColor("#2c3e50")
      .text("DISPATCH CHALAN", { align: "center" });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // ================= CHALAN INFO =================
    doc.fontSize(11).fillColor("#000");
    doc
      .text(`Chalan ID: ${data[0].chalan_id}`, { continued: true })
      .text(`        Order ID: ${data[0].order_id}`, { align: "right" });
    doc.text(
      `Dispatch Date: ${new Date(data[0].dispatch_date).toLocaleDateString()}`
    );
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
    doc.text(`Address: ${data[0].address}`);
    doc.moveDown();

    // ================= TRANSPORT =================
    doc
      .fontSize(12)
      .fillColor("#34495e")
      .text("Transport Details", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#000");
    doc.text(`${data[0].transport_details}`);
    doc.moveDown();

    // ================= ITEMS TABLE =================
    doc.fontSize(12).fillColor("#000").text("Items", { underline: true });
    doc.moveDown(0.5);

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
      // Zebra row for readability
      if (index % 2 === 0) {
        doc.rect(40, y - 2, 500, 20).fill("#fafafa");
        doc.fillColor("#000");
      }

      // Proper aligned columns
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
      .text("This is a system generated document.", { align: "center" });

    doc.end();

    const fileUrl = `uploads/${chalan_id}/${fileName}`;
    const serverUrl = "https://stock-mangments.onrender.com/";

    return libFunc.sendResponse(res, {
      status: 0,
      msg: "PDF generated successfully",
      filePath: serverUrl + fileUrl,
    });
  } catch (error) {
    console.log("downloadChalanPDF error:", error);
    res.status(500).send("Error generating PDF");
  }
}
