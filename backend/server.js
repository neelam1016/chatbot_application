
import express from 'express'
import { chats } from './data/data.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { userRoutes } from './routes/userRoutes.js'
import { errorHandler, notFound } from './middlewares/errorMiddlewares.js';
import { chatRoutes } from './routes/chatRoutes.js';
import { messageRoutes } from './routes/messageRoutes.js';
import { assistantRoutes } from './routes/assistantRoutes.js';
import cors from "cors";
import http from 'http';
import { Server } from 'socket.io';


const app = express()
// Get current directory path using import.meta.url and fileURLToPath
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// console.log("directory",__dirname)

// Configure dotenv to use the custom path for .env
// dotenv.config({ path: path.join(__dirname, "./.env") });
dotenv.config();

const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

const getAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) return defaultOrigins;
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions))
app.use(express.json())


connectDB();
app.get('/', (req, res) => {
  res.send("API is running")
});


// app.get('/api/chat',(req,res)=>{
//     res.json(chats)
// })

// app.get('/api/chat/:id',(req,res)=>{
//     console.log(req.params.id)
//     const singleChat=chats.find((chat)=>chat._id==req.params.id)
//     res.send(singleChat)
// })

app.use('/api/user', userRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/message', messageRoutes)
app.use('/api/assistant', assistantRoutes)
app.use(notFound)
app.use(errorHandler)


const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('Connected to socket.io');

  socket.on('setup', (userData = {}) => {
    const userId = userData._id || userData.id;
    if (!userId) {
      console.warn('Socket setup missing user id');
      return;
    }
    const userIdStr = String(userId);
    socket.data.userId = userIdStr;
    socket.join(userIdStr);

    const existing = onlineUsers.get(userIdStr) || new Set();
    const wasOnline = existing.size > 0;
    existing.add(socket.id);
    onlineUsers.set(userIdStr, existing);

    socket.emit('online users', Array.from(onlineUsers.keys()));
    socket.emit('connected');

    if (!wasOnline) {
      socket.broadcast.emit('user online', userIdStr);
    }
  });

  socket.on('join chat', (room) => {
    socket.join(room);
    console.log('User joined room', room);
  });

  socket.on('typing', (room) => socket.in(room).emit('typing'));
  socket.on('stop typing', (room) => socket.in(room).emit('stop typing'));

  socket.on('new message', (newMessageReceived) => {
    const chat = newMessageReceived.chat;
    if (!chat || !chat.users) return console.log('chat.users not defined');

    socket.emit('message received', newMessageReceived);
    const senderId = newMessageReceived.sender && (newMessageReceived.sender._id || newMessageReceived.sender);
    const senderIdStr = senderId ? String(senderId) : null;

    chat.users.forEach((user) => {
      const userId = user && (user._id || user.id || user);
      if (!userId) return;
      if (senderIdStr && String(userId) === senderIdStr) return;
      socket.in(String(userId)).emit('message received', newMessageReceived);
    });
  });

  socket.on('disconnect', () => {
    const userIdStr = socket.data.userId;
    if (!userIdStr) return;
    const existing = onlineUsers.get(userIdStr);
    if (!existing) return;
    existing.delete(socket.id);
    if (existing.size === 0) {
      onlineUsers.delete(userIdStr);
      socket.broadcast.emit('user offline', userIdStr);
    }
  });
});

server.listen(PORT, console.log(`server started on port ${PORT}`));
