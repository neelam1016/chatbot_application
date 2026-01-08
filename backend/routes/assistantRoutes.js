import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { getAssistant, replyAsAssistant } from "../controller/assistantController.js";

const router = express.Router();

router.get("/user", protect, getAssistant);
router.post("/reply", protect, replyAsAssistant);

export const assistantRoutes = router;
