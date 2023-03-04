const http = require("http");
const express = require("express");
const socketio = require("socket.io");
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

//
// app.get ("/query", async (req, res) => {
//   const key = req.query. key;
//   const question = req.query.question;

//   try {
//     const answer = await apiQuery (key, question);
//     res.send(answer);
//   } catch (e) {
//     res.send(JSON.stringify({ Error: e.message }));
//   }

//   async const apiQuery=(key, question)=> {
//   const configuration = new Configuration ({
//   apiKey: process.env.OPENAI_API_KEY,
// });
//   const openai = new OpenAIApi(configuration);
//   const completion = await openai.createCompletion(
//   {
//   model: "gpt-3.5-turbo",
//   messages: [ {role: "user", content: question }],
//   },
// {
//   proxy:false,
//   httpAgent:tunnel.httpOverHttp({
//     proxy:{
//       host:"127.0.0.1",port:7890
//     }
//   })
//   }
// )
//

const apiQuery = async (question) => {
  const configuration = new openai.Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);
  const completion = await createCompletion(
    {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: question }],
    },
    {
      proxy: false,
      httpAgent: tunnel.httpOverHttp({
        proxy: {
          host: "127.0.0.1",
          port: 7890,
        },
      }),
    }
  );
  return completion.data.choices[0].text;
};

app.get("/query", async (req, res) => {
  // const apiQuery = async (question) => {
  //   const configuration = new openai.Configuration({
  //     apiKey: process.env.OPENAI_API_KEY,
  //   });
  //   const openai = new OpenAIApi(configuration);
  //   const completion = await createCompletion(
  //     {
  //       model: "gpt-3.5-turbo",
  //       messages: [{ role: "user", content: question }],
  //     },
  //     {
  //       proxy: false,
  //       httpAgent: tunnel.httpOverHttp({
  //         proxy: {
  //           host: "127.0.0.1",
  //           port: 7890,
  //         },
  //       }),
  //     }
  //   );
  //   return completion.data.choices[0].text;
  // };
  //
  const fetchData = async (inputText) => {
    const agent = new HttpsProxyAgent("http://127.0.0.1:7890");

    const response = await axios
      .post(
        process.env.CHAT_API_URL,
        {
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: inputText }],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          httpsAgent: agent,
        }
      )
      .catch((err) => {
        console.log(err.message);
      });

    return response.data.choices[0].message.content.trim();
  };

  //
  const question = req.query.question;
  console.log(question);
  try {
    const answer = await fetchData(question);
    res.send(answer);
  } catch (e) {
    console.log(e);
    res.send(JSON.stringify({ Error: e.message }));
  }
});

server.listen(process.env.PORT || 8080, () =>
  console.log(`Server has started.`)
);
