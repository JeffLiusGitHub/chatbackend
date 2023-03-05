const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const openai = require("openai");
const tunnel = require("tunnel");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");
const { Configuration, OpenAIApi } = require("openai");
const HttpsProxyAgent = require("https-proxy-agent");
const axios = require("axios");
const router = require("./router");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(router);
app.use(bodyParser.json());
io.on("connect", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.join(user.room);

    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to room ${user.room}.`,
    });
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined!` });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    console.log({ user });
    if (user) {
      io.to(user.room).emit("message", { user: user.name, text: message });
    } else {
      io.emit("message", {
        user: "admin",
        text: "New user cannot be login, please login again with different user",
      });
    }

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left.`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});
const fetchData = async (inputText) => {
  const agent = new HttpsProxyAgent("http://127.0.0.1:7890");
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: inputText }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        // httpsAgent: agent,
      }
    );
    console.log(response.data.choices[0].message.content);
    return response.data.choices[0].message.content;
  } catch (err) {
    return err.response;
  }
};
app.post("/query", async (req, res) => {
  const { question } = req.body;
  try {
    const answer = await fetchData(question);
    res.status(200).send({ answer });
  } catch (e) {
    console.log(e.response);
    res.status(500).send({ error: e.message });
  }
});

server.listen(process.env.PORT || 8080, () =>
  console.log(`Server has started.`)
);
