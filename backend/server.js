
import express from 'express'
import { chats } from './data/data.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import {userRoutes} from './routes/userRoutes.js'
import { errorHandler, notFound } from './middlewares/errorMiddlewares.js';
import { chatRoutes } from './routes/chatRoutes.js';
import cors from "cors";


const app=express()
// Get current directory path using import.meta.url and fileURLToPath
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// console.log("directory",__dirname)

// Configure dotenv to use the custom path for .env
// dotenv.config({ path: path.join(__dirname, "./.env") });
dotenv.config();
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions))
app.use(express.json())


connectDB();
app.get('/',(req,res)=>{
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

app.use('/api/user',userRoutes)
app.use('/api/chats',chatRoutes)
app.use(notFound)
app.use(errorHandler)


const PORT = process.env.PORT || 5000;
app.listen(PORT,console.log(`server started on port ${PORT}`));