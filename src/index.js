require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { join } = require("path");
const uploadPath = join(__dirname, "./uploads");
const {
  dbConnection,
  portConnection,
} = require("./settings/connection/connect");
const globalErrorHandler = require("./settings/errorHandle/errHandler");
const allRoutes = require("./router");
const server = require("http").createServer(app);
app.use(cors());
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
const sockets = require("./sockets/socket");

app.use(express.static(uploadPath));

app.use(express.static("public"));

app.use(express.json());

dbConnection();

sockets(io, app);

app.use("/api", allRoutes);

app.use(globalErrorHandler);

portConnection(server);
