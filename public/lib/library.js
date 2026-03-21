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

  // Department
  cr_dep: createDepartment,
  fe_dep: fetchDepartments,

  //Category
  cr_cat: createCategory,
  fe_cat: fetchAllCategories,

  // Products
  cr_sweets: createSweet,
  fe_sweets: fetchAllSweets,
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
  console.log("request", req);

  const counterTable = schema + ".counters";
  const userTable = schema + ".users";

  const { shop_id, counter_name, location, name, email, phone, password } =
    req.data;

  if (!shop_id || !counter_name || !name || !email || !phone || !password) {
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Required fields missing",
    });
  }

  const counterRowId = libFunc.randomid();

  const counterColumns = {
    row_id: counterRowId,
    shop_id: shop_id.trim(),
    counter_name: counter_name.trim().replaceAll("'", "`"),
    location: location ? location.trim() : "",
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
    counter_id: counterRowId,
  };

  const userResp = await db_query.addData(userTable, userColumns);

  if (userResp.status !== 0) {
    return libFunc.sendResponse(res, userResp);
  }

  return libFunc.sendResponse(res, {
    status: 0,
    msg: "Counter and counter user created successfully",
  });
}

async function createSupplier(req, res) {
  console.log("request", req);

  const supplierTable = schema + ".suppliers";
  const userTable = schema + ".users";

  const { supplier_name, phone, email, address, password } = req.data;

  if (!supplier_name || !email || !phone || !password) {
    return libFunc.sendResponse(res, {
      status: 1,
      msg: "Required fields missing",
    });
  }

  const supplierRowId = libFunc.randomid();

  const supplierColumns = {
    row_id: supplierRowId,
    supplier_name: supplier_name.trim().replaceAll("'", "`"),
    phone: phone.trim(),
    email: email.trim(),
    address: address ? address.trim() : "",
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
    role: "SUPPLIER",
  };

  const userResp = await db_query.addData(userTable, userColumns);

  if (userResp.status !== 0) {
    return libFunc.sendResponse(res, userResp);
  }

  return libFunc.sendResponse(res, {
    status: 0,
    msg: "Supplier and supplier login created successfully",
  });
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
    console.log("results",result)

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

// async function addInventory(req, res) {

//   const tablename = schema + ".inventory";

//   const counter_id = req.data.counter_id;
//   const sweet_id = req.data.sweet_id;
//   const quantity = req.data.quantity || 0;
//   const expiry_date = req.data.expiry_date || null;

//   if (!counter_id || !sweet_id) {
//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Counter and Sweet required"
//     });
//   }

//   const columns = {
//     row_id: libFunc.randomid(),
//     counter_id: counter_id.trim(),
//     sweet_id: sweet_id.trim(),
//     quantity: quantity,
//     expiry_date: expiry_date
//   };

//   const resp = await db_query.addData(tablename, columns);

//   return libFunc.sendResponse(res, resp);
// }

// async function createStockTransaction(req, res) {

//   const tablename = schema + ".stock_transactions";

//   const counter_id = req.data.counter_id;
//   const sweet_id = req.data.sweet_id;
//   const transaction_type = req.data.transaction_type;
//   const quantity = req.data.quantity;
//   const reference_id = req.data.reference_id || "";
//   const notes = req.data.notes || "";

//   if (!counter_id || !sweet_id || !transaction_type || !quantity) {
//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Missing required fields"
//     });
//   }

//   const columns = {
//     row_id: libFunc.randomid(),
//     counter_id: counter_id.trim(),
//     sweet_id: sweet_id.trim(),
//     transaction_type: transaction_type,
//     quantity: quantity,
//     reference_id: reference_id,
//     notes: notes
//   };

//   const resp = await db_query.addData(tablename, columns);

//   return libFunc.sendResponse(res, resp);
// }

// async function fetchDepartments(req, res) {

//   const query = `
//     SELECT row_id, department_name
//     FROM ${schema}.departments
//     ORDER BY department_name
//   `;

//   const result = await db_query.customQuery(query);

//   return libFunc.sendResponse(res, { status: 0, data: result.rows });
// }

// async function fetchCategories(req, res) {

//   const { department_id } = req.data;

//   const query = `
//     SELECT row_id, category_name
//     FROM ${schema}.categories
//     WHERE department_id='${department_id}'
//     ORDER BY category_name
//   `;

//   const result = await db_query.customQuery(query);

//   return libFunc.sendResponse(res, { status: 0, data: result.rows });
// }

// async function fetchSweets(req, res) {

//   const query = `
//     SELECT
//       s.row_id,
//       s.sweet_name,
//       c.category_name,
//       d.department_name
//     FROM ${schema}.sweets s
//     LEFT JOIN ${schema}.categories c ON c.row_id = s.category_id
//     LEFT JOIN ${schema}.departments d ON d.row_id = c.department_id
//   `;

//   const result = await db_query.customQuery(query);

//   return libFunc.sendResponse(res, { status: 0, data: result.rows });
// }

// async function createOrder(req, res) {

//   const tablename = schema + ".orders";

//   const counter_id = req.data.counter_id;
//   const supplier_id = req.data.supplier_id;

//   if (!counter_id || !supplier_id) {
//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Counter and Supplier required"
//     });
//   }

//   const columns = {
//     row_id: libFunc.randomid(),
//     counter_id: counter_id.trim(),
//     supplier_id: supplier_id.trim(),
//     order_status: "PENDING"
//   };

//   const resp = await db_query.addData(tablename, columns);

//   return libFunc.sendResponse(res, resp);
// }

// async function addOrderItem(req, res) {

//   const tablename = schema + ".order_items";

//   const order_id = req.data.order_id;
//   const sweet_id = req.data.sweet_id;
//   const quantity = req.data.quantity;

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
//     quantity: quantity
//   };

//   const resp = await db_query.addData(tablename, columns);

//   return libFunc.sendResponse(res, resp);
// }

// async function createChalan(req, res) {

//   const tablename = schema + ".chalans";

//   const order_id = req.data.order_id;
//   const supplier_id = req.data.supplier_id;
//   const dispatch_date = req.data.dispatch_date;
//   const transport_details = req.data.transport_details || "";

//   if (!order_id || !supplier_id) {
//     return libFunc.sendResponse(res, {
//       status: 1,
//       msg: "Order and Supplier required"
//     });
//   }

//   const columns = {
//     row_id: libFunc.randomid(),
//     order_id: order_id.trim(),
//     supplier_id: supplier_id.trim(),
//     dispatch_date: dispatch_date,
//     transport_details: transport_details.trim()
//   };

//   const resp = await db_query.addData(tablename, columns);

//   return libFunc.sendResponse(res, resp);
// }

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
