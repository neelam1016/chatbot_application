
import express from "express";
import { allMessages, sendMessage, markAsRead } from "../controller/messageControllers.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, sendMessage);
router.route("/read").put(protect, markAsRead);
router.route("/:chatId").get(protect, allMessages);

export const messageRoutes = router;
