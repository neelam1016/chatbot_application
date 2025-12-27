import express from 'express';
import { allUsers, authUser, registerUser } from '../controller/userControllers.js';
import {protect} from '../middlewares/authMiddleware.js'

export const userRoutes=express.Router();

userRoutes.route('/').post(registerUser).get(protect,allUsers);
userRoutes.post('/login',authUser)
