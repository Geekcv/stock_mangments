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

  // order
  cr_ord: createOrder,

  //Challan
  cr_challan: createChalan,
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
  try {
    console.log("request", req.data);

    const tablename = schema + ".shops";

    const {
      shop_name,
      address = "",
      city = "",
      state = "",
      pincode = "",
      phone = "",
      email = "",
      gst_number = "",
      owner_name = "",
      logo_url = "",
    } = req.data || {};

    // Validation
    if (!shop_name) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Shop name is required",
      });
    }

    //  Columns object
    const columns = {
      row_id: libFunc.randomid(),
      shop_name: shop_name.trim().replaceAll("'", "`"),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      phone: phone.trim(),
      email: email.trim(),
      gst_number: gst_number.trim(),
      owner_name: owner_name.trim(),
      logo_url: logo_url.trim(),
      is_active: true,
    };

    //  Insert Data
    const resp = await db_query.addData(tablename, columns);

    return libFunc.sendResponse(res, resp);
  } catch (error) {
    console.log("createShop error:", error);
    return libFunc.sendResponse(res, {
      status: 0,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

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

    //  Validation
    if (!shop_id || !counter_name || !name || !email || !phone || !password) {
      console.log("Required fields missing");
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Required fields missing",
      });
    }

    //  Duplicate check (like supplier)
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

    const counterRowId = libFunc.randomid();

    //  Insert Counter
    const counterColumns = {
      row_id: counterRowId,
      shop_id: shop_id.trim(),
      counter_name: counter_name.trim().replaceAll("'", "`"),
      location: location.trim(),
    };

    const counterResp = await db_query.addData(counterTable, counterColumns);

    if (counterResp.status === 0) {
      //  Insert User
      const userColumns = {
        row_id: libFunc.randomid(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        role: "COUNTER_USER",
        counter_id: counterRowId,
      };

      const userResp = await db_query.addData(userTable, userColumns);

      if (userResp.status === 0) {
        //  SUCCESS
        await connect_db.query("COMMIT");
        console.log("Counter and counter user created successfully");

        return libFunc.sendResponse(res, {
          status: 0,
          msg: "Counter and counter user created successfully",
          data: {
            counter_id: counterRowId,
          },
        });
      } else {
        //  User insert failed
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, userResp);
      }
    } else {
      //  Counter insert failed
      await connect_db.query("ROLLBACK");
      return libFunc.sendResponse(res, counterResp);
    }
  } catch (error) {
    console.log("createCounter error:", error);

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
    console.log("request", req.data);

    const tablename = schema + ".shops";

    const { city, state, search } = req.data || {};

    //  Dynamic WHERE conditions
    let conditions = ["is_active = true"];

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

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

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
        is_active,
        cr_on,
        up_on
      FROM ${tablename}
      ${whereClause}
      ORDER BY shop_name ASC
    `;

    const result = await db_query.customQuery(query, "Shop Fetch");
    console.log("res", result);

    return libFunc.sendResponse(res, {
      status: 0,
      data: result.rows,
    });
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

  const result = await db_query.customQuery(query, "Counter fetch");
  console.log("results-->", result);

  return libFunc.sendResponse(res, {
    status: 0,
    data: result.rows,
  });
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

  return libFunc.sendResponse(res, {
    status: 0,
    data: result.rows,
  });
}

async function createDepartment(req, res) {
  const tablename = schema + ".departments";

  const department_name = req.data.department_name;
  const description = req.data.description || "";

  if (!department_name) {
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Department name is required",
    });
  }

  const columns = {
    row_id: libFunc.randomid(),
    department_name: department_name.trim().replaceAll("'", "`"),
    description: description.trim(),
  };

  const resp = await db_query.addData(tablename, columns);

  return libFunc.sendResponse(res, resp);
}

async function fetchDepartments(req, res) {
  const table = `${schema}.departments`;

  const sql = `
    SELECT
      d.row_id,
      d.department_name,
      d.description,
      d.cr_on
    FROM ${table} d
    ORDER BY d.department_name
  `;

  const dbRes = await db_query.customQuery(sql, "Fetch Departments");
  console.log("dbres", dbRes);

  return libFunc.sendResponse(res, {
    status: 0,
    data: dbRes || [],
  });
}

async function createCategory(req, res) {
  const tablename = schema + ".categories";

  const department_id = req.data.department_id;
  const category_name = req.data.category_name;

  if (!department_id || !category_name) {
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Department and Category name required",
    });
  }

  const columns = {
    row_id: libFunc.randomid(),
    department_id: department_id.trim(),
    category_name: category_name.trim().replaceAll("'", "`"),
  };

  const resp = await db_query.addData(tablename, columns);

  return libFunc.sendResponse(res, resp);
}

async function fetchAllCategories(req, res) {
  const sql = `
    SELECT
      c.row_id,
      c.category_name,
      c.department_id,
      d.department_name,
      c.cr_on
    FROM ${schema}.categories c
    LEFT JOIN ${schema}.departments d
      ON d.row_id = c.department_id
    ORDER BY c.category_name ASC
  `;

  const result = await db_query.customQuery(sql, "Fetch All Categories");
  console.log("results", result);

  return libFunc.sendResponse(res, {
    status: 0,
    data: result.rows || [],
  });
}

async function createSweet(req, res) {
  try {
    console.log("request", req.data);

    const tablename = schema + ".sweets";
    const categoryTable = schema + ".categories";

    const {
      category_id,
      sweet_name,
      unit = "KG",
      price = 0,
      shelf_life_days = 0,
      description = "",
      image_url = "",
    } = req.data || {};

    // Validation
    if (!category_id || !sweet_name) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Category and Sweet name required",
      });
    }

    // Check category exists
    const categoryCheck = await db_query.customQuery(`
      SELECT 1 FROM ${categoryTable}
      WHERE row_id = '${category_id.trim()}'
    `);

    if (categoryCheck.length === 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Invalid or inactive category",
      });
    }

    // Duplicate check (same category)
    const existingSweet = await db_query.customQuery(`
      SELECT 1 FROM ${tablename}
      WHERE category_id = '${category_id.trim()}'
      AND LOWER(sweet_name) = LOWER('${sweet_name.trim().replaceAll("'", "`")}')
    `);

    if (existingSweet.length > 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Sweet already exists in this category",
      });
    }

    // Insert Data
    const columns = {
      row_id: libFunc.randomid(),
      category_id: category_id.trim(),
      sweet_name: sweet_name.trim().replaceAll("'", "`"),
      unit: unit,
      price: price,
      shelf_life_days: shelf_life_days,
      description: description.trim(),
      image_url: image_url.trim(),
      is_active: true,
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
  try {
    console.log("request", req.data);

    const { category_id, department_id, search } = req.data || {};

    //  Conditions
    let conditions = ["s.is_active = true"];

    if (category_id) {
      conditions.push(`s.category_id = '${category_id.replaceAll("'", "`")}'`);
    }

    if (department_id) {
      conditions.push(`d.row_id = '${department_id.replaceAll("'", "`")}'`);
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
        s.is_active,
        s.cr_on,
        s.up_on
      FROM ${schema}.sweets s
      LEFT JOIN ${schema}.categories c
        ON c.row_id = s.category_id
      LEFT JOIN ${schema}.departments d
        ON d.row_id = c.department_id
      ${whereClause}
      ORDER BY s.sweet_name ASC
    `;

    const result = await db_query.customQuery(sql, "Fetch All Sweets");
    console.log("results", result);

    return libFunc.sendResponse(res, {
      status: 0,
      data: result || [],
    });
  } catch (error) {
    console.log("fetchAllSweets error:", error);

    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Something went wrong",
      error: error.message,
    });
  }
}

async function addStock(req, res) {
  try {
    const inventoryTable = schema + ".inventory";
    const transactionTable = schema + ".stock_transactions";

    const {
      counter_id,
      sweet_id,
      transaction_type, // IN / OUT / ADJUST
      quantity,
      expiry_date = null,
      reference_id = "",
      notes = "",
    } = req.data || {};

    //  Validation
    if (!counter_id || !sweet_id || !transaction_type || !quantity) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Missing required fields",
      });
    }

    const qty = Number(quantity);

    if (qty <= 0) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Quantity must be greater than 0",
      });
    }

    //  START TRANSACTION
    await connect_db.query("BEGIN");

    //  Insert transaction
    const transactionData = {
      row_id: libFunc.randomid(),
      counter_id: counter_id.trim(),
      sweet_id: sweet_id.trim(),
      transaction_type,
      quantity: qty,
      reference_id,
      notes,
    };

    await db_query.addData(transactionTable, transactionData);

    //  Check existing inventory
    const existing = await db_query.customQuery(`
      SELECT * FROM ${inventoryTable}
      WHERE counter_id = '${counter_id}'
      AND sweet_id = '${sweet_id}'
    `);

    let newQty = qty;

    if (existing.data && existing.data.length > 0) {
      const existingRow = existing.data[0];
      const inventoryRowId = existingRow.row_id;
      const currentQty = Number(existing.data[0].quantity);

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
      } else if (transaction_type === "ADJUST") {
        newQty = qty;
      }

      //  Update inventory
      await db_query.addData(
        inventoryTable,
        { quantity: newQty, expiry_date },
        existingRow.row_id,
        "Inventory"
      );
    } else {
      //  New inventory row (only for IN)
      if (transaction_type !== "IN") {
        await connect_db.query("ROLLBACK");
        return libFunc.sendResponse(res, {
          status: 1,
          msg: "No stock available to deduct",
        });
      }

      await db_query.addData(inventoryTable, {
        row_id: libFunc.randomid(),
        counter_id,
        sweet_id,
        quantity: qty,
        expiry_date,
      });
    }

    //  COMMIT
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
      msg: "Something went wrong",
      error: error.message,
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

async function createChalan(req, res) {
  try {
    const chalanTable = schema + ".chalans";
    const orderTable = schema + ".orders";

    const {
      order_id,
      supplier_id,
      dispatch_date,
      transport_details = "",
    } = req.data || {};

    // 🔹 Validation
    if (!order_id || !supplier_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order and Supplier required",
      });
    }

    //  Check Order Exists
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

    //  Prevent duplicate dispatch
    if (currentStatus === "DISPATCHED") {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Order already dispatched",
      });
    }

    await connect_db.query("BEGIN");

    //  Create Chalan
    const chalanRowId = libFunc.randomid();

    await db_query.addData(chalanTable, {
      row_id: chalanRowId,
      order_id: order_id.trim(),
      supplier_id: supplier_id.trim(),
      dispatch_date: dispatch_date || new Date(),
      transport_details: transport_details.trim(),
    });

    //  Update Order Status
    const updateResp = await db_query.addData(
      orderTable,
      { order_status: "DISPATCHED" },
      order_id.trim(),
      "Order"
    );

    console.log("Update Response:", updateResp);

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
    const counterTable = schema + ".counters";

    const { supplier_id } = req.data || {};

    // 🔹 Validation
    if (!supplier_id) {
      return libFunc.sendResponse(res, {
        status: 1,
        msg: "Supplier ID required",
      });
    }

    // 🔹 Fetch Orders + Items
    const result = await db_query.customQuery(`
      SELECT 
        o.row_id AS order_id,
        o.order_status,
        o.order_date,

        c.counter_name,
        c.location,

        oi.sweet_id,
        s.sweet_name,
        s.unit,
        oi.quantity

      FROM ${orderTable} o
      LEFT JOIN ${counterTable} c 
        ON c.row_id = o.counter_id
      LEFT JOIN ${itemTable} oi 
        ON oi.order_id = o.row_id
      LEFT JOIN ${sweetTable} s 
        ON s.row_id = oi.sweet_id

      WHERE o.supplier_id = '${supplier_id.trim()}'
      ORDER BY o.order_date DESC
    `);

    // 🔹 Group data (order-wise)
    const ordersMap = {};

    for (let row of result.data) {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          order_id: row.order_id,
          order_status: row.order_status,
          order_date: row.order_date,
          counter_name: row.counter_name,
          location: row.location,
          items: [],
        };
      }

      ordersMap[row.order_id].items.push({
        sweet_id: row.sweet_id,
        sweet_name: row.sweet_name,
        unit: row.unit,
        quantity: row.quantity,
      });
    }

    const finalData = Object.values(ordersMap);
    console.log("find", finalData);

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
