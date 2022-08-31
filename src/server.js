import { dirname } from "path";
import * as http from "http";
import express from "express";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { engine } from "express-handlebars";
import faker from "faker";
import { Container } from "./Container.js";
import { knexMariaDB, knexSQlite } from "./options/db.js";
// import { normalizedObject } from "./normalizacion/normalize.js";
import cookieParser from "cookie-parser";
import session from "express-session";
// import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import userService from "./models/Users.js";
import sessionService from "./models/Session.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = 8080;
const products = new Container(knexMariaDB, "product");
const chatMessages = new Container(knexSQlite, "message");
const connection = mongoose.connect(
  "mongodb+srv://test:poligamia12345@cluster0.fxygqmb.mongodb.net/?retryWrites=true&w=majority"
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    // store: MongoStore.create({
    //   mongoUrl:
    //     "mongodb+srv://test:poligamia12345@cluster0.fxygqmb.mongodb.net/?retryWrites=true&w=majority",
    //   options: { useNewUrlParser: true, useUnifiedTopology: true },
    //   ttl: 3600, //10//
    // }),
    secret: "palabrasecreta",
    resave: true, //false//
    saveUninitialized: true, //false//
  })
);

app.use(express.static(__dirname + "/public"));
app.set("views", __dirname + "/views");
app.set("view engine", "hbs");

app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    defaultLayout: "index.hbs",
    layoutsDir: __dirname + "/views/layouts",
    partialsDir: __dirname + "/views/partials",
  })
);

io.on("connection", async (socket) => {
  console.log("Usuario conectado");

  const productsList = await products.getAll();
  socket.emit("startedProductList", productsList);

  const messagesList = await chatMessages.getAll();
  socket.emit("startedMessagesList", messagesList);

  socket.on("newMessage", async (data) => {
    await chatMessages.save(data);

    const messages = await chatMessages.getAll();
    io.sockets.emit("updateMessages", messages);
  });

  socket.on("addNewProduct", async (data) => {
    await products.save(data);

    const productsList = await products.getAll();
    io.sockets.emit("updateProducts", productsList);
  });

  socket.on("disconnect", () => {
    console.log("Usuario desconectado");
  });
});

app.get("/", (req, res) => {
  res.render("pages/add-product", {});
});

app.get("/products-list", async (req, res) => {
  const productList = await products.getAll();
  res.render("pages/products-list", { productList });
});

app.post("/products", async (req, res) => {
  const product = req.body;
  await products.save(product);
  res.redirect("/products-list");
});

app.get("/products-test", async (req, res) => {
  const productList = [];

  for (let i = 0; i < 5; i++) {
    const product = {
      name: faker.commerce.productName(),
      price: faker.commerce.price(),
      image: faker.image.imageUrl(),
    };

    productList.push(product);
  }

  res.render("pages/products-test", { productList });
});

app.get("/get-cookie", (req, res) => {
  console.log(req.cookies);
  res.send(req.cookies);
});

app.get("/set-cookie", (req, res) => {
  res.cookie("cookiePrueba", 1).send("Cookie set");
});

app.get("/set-exp-cookie", (req, res) => {
  res
    .cookie("cookieTermina", "cookie :)", {
      maxAge: 6000,
    })
    .send("Cookie que se setea");
});

// app.get("/logout", (req, res) => {
//   res.clearCookie("cookiePrueba").send("no mas cookie");
// });

app.get("/register", (req, res) => {
  res.render("pages/register");
});

app.post("/register", async (req, res) => {
  const { first_name, last_name, email, age, password } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).send({ error: "Incomplete Values" });
  }

  const users = await userService.find();

  const exists = users.find((u) => u.email === email);

  if (exists) {
    return res.status(400).send({ error: "User already exists" });
  }

  const user = {
    first_name,
    last_name,
    email,
    age: age,
    password,
    role: "user",
  };

  try {
    const result = await userService.create(user);
    res.send({ status: "success", payload: result });
  } catch (error) {
    res.status(500).send({ error: error });
  }
});

app.get("/login", (req, res) => {
  res.render("pages/login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (email === "correoPrueba@correo.com" && password === "123") {
    req.session.user = {
      email,
      role: "user",
    };

    const session = {
      email,
      role: "user",
    };

    try {
      const result = await sessionService.create(session);
      res.send({ status: "success", payload: result });
    } catch (error) {
      res.status(500).send({ error: error });
    }
  } else {
    // let user = users.find((u) => u.email === email && u.password === password);
    // if (!user) {
    //   return res.status(400).send({ error: "Incorrect values" });
    // }
    // req.session.user = {
    //   email: user.email,
    //   role: user.role,
    // };
    res.send("Logueado");
  }
});

app.get("/current", (req, res) => {
  res.send(req.session.user);
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send({ error: err });
    res.send("Logged out");
  });
});

server.listen(PORT, () => {
  console.log(`Servidor escuchando puerto ${PORT}`);
});

server.on("error", (err) => console.error(err));
