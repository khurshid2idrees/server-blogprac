const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const UserModel = require("./Models/UserModel");
const PostModel = require("./Models/PostModel");

const app = express();

// middlewares
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.static("public"));

mongoose
  .connect("mongodb://localhost:27017/kachori")
  .then((res) => console.log("database connected"))
  .catch((err) => console.log(err));

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json("token is missing");
  } else {
    jwt.verify(token, "jwt-secret-key", (err, decoded) => {
      if (err) {
        return res.json("token is wrong");
      } else {
        req.email = decoded.email;
        req.name = decoded.name;
        next();
      }
    });
  }
};

app.get("/", verifyUser, (req, res) => {
  return res.json({ email: req.email, name: req.name });
});

app.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  bcrypt
    .hash(password, 10)
    .then((bcrypedpassword) => {
      UserModel.create({
        name: username,
        email: email,
        password: bcrypedpassword,
      })
        .then((user) => {
          res.json("success");
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => console.log(err));
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  UserModel.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.json("user does not exist");
      } else {
        bcrypt.compare(password, user.password, (err, response) => {
          if (response) {
            const token = jwt.sign(
              { name: user.name, email: user.email },
              "jwt-secret-key",
              { expiresIn: "1d" }
            );
            res.cookie("token", token);
            return res.json("success");
          } else {
            return res.json("password did not match");
          }
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

// non-auth

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Public/Images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
});

app.post("/create", verifyUser, upload.single("file"), (req, res) => {
  const { title, description } = req.body;
  PostModel.create({
    title: title,
    description: description,
    file: req.file.filename,
  })
    .then((result) => res.json("success"))
    .catch((err) => res.json(err));
});

app.post("/delete", (req, res) => {
  const { id } = req.body;
  PostModel.deleteOne({ _id: id })
    .then((res) => res.json('success'))
    .catch((err) => console.log(err));
});

app.get("/posts", (req, res) => {
  PostModel.find()
    .then((post) => res.json(post))
    .catch((err) => console.log(err));
});

app.get("/getpostbyid/:id", (req, res) => {
  const id = req.params.id;
  PostModel.findById({ _id: id })
    .then((post) => res.json(post))
    .catch((err) => console.log(err));
});

app.put("/editpost/:id", (req, res) => {
  const id = req.params.id;
  PostModel.findByIdAndUpdate({
    _id: id},{
    title: req.body.title,
    description: req.body.description,
  })
    .then((result) => res.json(res.json("success")))
    .catch((err) => console.log(err));
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json("success");
});

app.listen(5000, () => {
  console.log("server started");
});
