import asyncHandler from "express-async-handler";
import { Chat } from "../models/chatModel.js";
import { Message } from "../models/messageModel.js";
import { User } from "../models/userModel.js";
import { buildAssistantMessages, generateAssistantReply, getAssistantUser } from "../services/assistantService.js";

export const getAssistant = asyncHandler(async (req, res) => {
    const assistant = await getAssistantUser();
    res.json({
        _id: assistant._id,
        name: assistant.name,
        email: assistant.email,
        pic: assistant.pic,
    });
});

export const replyAsAssistant = asyncHandler(async (req, res) => {
    const { chatId, prompt } = req.body || {};
    if (!chatId) {
        return res.status(400).json({ message: "chatId is required" });
    }

    const assistant = await getAssistantUser();
    const chat = await Chat.findById(chatId);
    if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
    }
    if (chat.isGroupChat) {
        return res.status(400).json({ message: "Assistant replies are only supported in 1:1 chats." });
    }

    const userId = req.user?._id;
    const users = chat.users || [];
    const hasUser = users.some((id) => String(id) === String(userId));
    const hasAssistant = users.some((id) => String(id) === String(assistant._id));
    if (!hasUser || !hasAssistant) {
        return res.status(403).json({ message: "Assistant is not part of this chat." });
    }

    const contextLimit = Number(process.env.AI_CONTEXT_MESSAGES || 20);
    const history = await Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .limit(Number.isFinite(contextLimit) && contextLimit > 0 ? contextLimit : 20);
    const orderedHistory = history.reverse();

    const messages = buildAssistantMessages({
        history: orderedHistory,
        assistantId: assistant._id,
        prompt,
    });
    console.log("Assistant messages:", messages);

    const reply = await generateAssistantReply({ messages });
    console.log("Assistant reply:", reply);
    const content = (reply?.content || "").trim();
    if (!content) {
        return res.status(502).json({ message: "Assistant returned an empty response." });
    }

    let assistantMessage = await Message.create({
        sender: assistant._id,
        content,
        chat: chatId,
        readBy: [assistant._id],
    });

    assistantMessage = await assistantMessage.populate("sender", "name pic email");
    assistantMessage = await assistantMessage.populate("chat");
    assistantMessage = await User.populate(assistantMessage, {
        path: "chat.users",
        select: "name pic email",
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: assistantMessage });

    res.json(assistantMessage);
});
