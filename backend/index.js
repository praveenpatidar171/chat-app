const express =  require('express')
const connectDB = require("./config/db");
const dotenv = require('dotenv')
const cors = require('cors')
const mainrouter = require('./routes/index')
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require('path');


const app = express();

app.use(cors(
  {
      origin: ["https://deploy-mern-frontend.vercel.app"],
      methods: ["POST", "GET", "PUT"],
      credentials: true
  }
));

app.use(express.json());
dotenv.config()
connectDB();
const port = process.env.PORT || 5000

app.use('/api', mainrouter)

///  deployment code ---------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/dist")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "dist", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}
  
// "frontend", "dist", "index.html"
 
///  deployment code ---------------------------------

//error handling middlewares
app.use(notFound);
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

const io = require('socket.io')(server, {
  pingTimeout: 60000,
  cors: {
    origin: 'http://127.0.0.1:5173',
  },
});

io.on("connection", (socket) => {
  console.log('connected to socket.io');

  //this will take user data from frontend and create a exclusive socket for a user
  socket.on('setup', (userData) => {
    socket.join(userData._id);
    socket.emit('connected');
  });

  socket.on('join chat', (room) => {
    socket.join(room);
    console.log("User joined the room " + room);
  });

  socket.on('typing', (room) => socket.in(room).emit('typing'));
  socket.on('stop typing', (room) => socket.in(room).emit('stop typing'));

  socket.on('new message', (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;
    if (!chat.users) return console.log('chat.users not defined');

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit('message recieved', newMessageRecieved);
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });

});