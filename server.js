const express = require("express");
const app = express();
// const fileUpload = require('express-fileupload');
require("dotenv").config();
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const common = require("./public/lib/common.js");

const PORT = process.env.SERVER_PORT || 17000;

/**
 * for uploads forlder access
 */
// app.use('/',express.static('public/lib'))
app.use("/", express.static("./public"));

app.use(bodyParser.json({ limit: "100mb", type: "application/json" }));
app.use(
  bodyParser.urlencoded({
    limit: "5000mb",
    extended: true,
    parameterLimit: 50000,
  })
);

app.use(cors());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use("/common", common);
// app.use('/', express.static('public'));
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));
app.use(
  "/bower_components",
  express.static(path.join(__dirname, "bower_components"))
);

//////////////--------------------File Upload----------------------------------///////////////

// upload file path
const FILE_PATH = "uploads";
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `./public/${FILE_PATH}/`);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

var upload = multer({ storage: storage });
// const upload = multer({
//     dest: `./public/${FILE_PATH}/`
// });
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    // console.log(file);
    // make sure file is available
    if (!file) {
      res.status(400).send({
        status: false,
        data: "No file is selected.",
      });
    } else {
      res.send({
        status: true,
        message: "File is uploaded.",
        data: {
          name: file.filename,
          originalname: file.originalname,
          foPa: FILE_PATH + "/" + file.filename,
          mimetype: file.mimetype,
          size: file.size,
        },
      });
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/createUsers", () => {
  console.log("connection ..................");
});

app.listen(PORT, function () {
  console.log("app is listening on port " + PORT);
});
