import express from 'express'
import { protect } from '../middlewares/authMiddleware.js'
import { accessChat, fetchChats } from '../controller/chatControllers.js';
export const chatRoutes=express.Router()

chatRoutes.post('/',protect,accessChat);
chatRoutes.get('/',protect,fetchChats);
// chatRoutes.post('/group',protect.createGroupChat);
// chatRoutes.put('/rename',protect,renameGroup);
// chatRoutes.put('/groupremove',protect,removeFromGroup);
// chatRoutes.put('/groupadd',protect,addToGroup)