
import asyncHandler from 'express-async-handler';
import { Message } from '../models/messageModel.js';
import { User } from '../models/userModel.js';
import { Chat } from '../models/chatModel.js';

const sendMessage = asyncHandler(async (req, res) => {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
        console.log("Invalid data passed into request");
        return res.sendStatus(400);
    }

    var newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId,
        readBy: [req.user._id],
    };

    try {
        var message = await Message.create(newMessage);

        message = await message.populate("sender", "name pic");
        message = await message.populate("chat");
        message = await User.populate(message, {
            path: "chat.users",
            select: "name pic email",
        });

        await Chat.findByIdAndUpdate(req.body.chatId, {
            latestMessage: message,
        });

        res.json(message);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

const allMessages = asyncHandler(async (req, res) => {
    try {
        await Message.updateMany(
            {
                chat: req.params.chatId,
                sender: { $ne: req.user._id },
                readBy: { $ne: req.user._id },
            },
            { $addToSet: { readBy: req.user._id } }
        );

        const messages = await Message.find({ chat: req.params.chatId })
            .populate("sender", "name pic email")
            .populate("chat");

        res.json(messages);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

const markAsRead = asyncHandler(async (req, res) => {
    const { chatId, messageId } = req.body || {};

    if (!chatId && !messageId) {
        return res.status(400).json({ message: "chatId or messageId is required" });
    }

    let result;
    if (messageId) {
        result = await Message.updateOne(
            {
                _id: messageId,
                sender: { $ne: req.user._id },
                readBy: { $ne: req.user._id },
            },
            { $addToSet: { readBy: req.user._id } }
        );
    } else {
        result = await Message.updateMany(
            {
                chat: chatId,
                sender: { $ne: req.user._id },
                readBy: { $ne: req.user._id },
            },
            { $addToSet: { readBy: req.user._id } }
        );
    }

    const updated = result?.modifiedCount ?? result?.nModified ?? 0;
    res.json({ updated });
});

export { sendMessage, allMessages, markAsRead };
