import { Chat } from "../models/chatModel.js";
import { User } from "../models/userModel.js";
import { Message } from "../models/messageModel.js";

const getChatSortTime = (chat) => {
    const latest = chat.latestMessage || {};
    const raw = latest.createdAt || latest.updatedAt || chat.updatedAt || chat.createdAt;
    const time = raw ? new Date(raw).getTime() : 0;
    return Number.isNaN(time) ? 0 : time;
};

export const accessChat = async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        res.status(400);
        res.json("userId is missing")
    }

    var isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: { $elemMatch: { $eq: req.user._id } } },
            { users: { $elemMatch: { $eq: userId } } }
        ]
    })
        .populate("users", '-password')
        .populate("latestMessage")

    isChat = await User.populate(isChat, {
        path: "latestMessage.sender",
        select: "name pic email"
    })
    if (isChat.length > 0) {
        const existingChat = isChat[0];
        if (!existingChat.isGroupChat) {
            const otherUser = existingChat.users.find(u => u._id.toString() !== req.user._id.toString());
            if (otherUser) existingChat.chatName = otherUser.name;
        }
        res.json(existingChat)
    }
    else {
        var chatData = {
            chatName: "sender",
            isGroupChat: false,
            users: [req.user._id, userId]
        }
        try {
            const createdChat = await Chat.create(chatData);
            const fullChat = await Chat.findOne({ _id: createdChat._id }).populate("users", "-password");

            if (!fullChat.isGroupChat) {
                const otherUser = fullChat.users.find(u => u._id.toString() !== req.user._id.toString());
                if (otherUser) fullChat.chatName = otherUser.name;
            }

            res.status(200).send(fullChat)
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
}

export const fetchChats = async (req, res) => {
    try {
        let results = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 });

        results = await User.populate(results, {
            path: "latestMessage.sender",
            select: "name pic email"
        });

        // compute unread counts per chat for the requesting user
        const unreadCounts = await Promise.all(results.map(async (chat) => {
            const count = await Message.countDocuments({
                chat: chat._id,
                sender: { $ne: req.user._id },
                readBy: { $ne: req.user._id }
            });
            return count;
        }));
        const chatsWithUnread = results.map((chat, idx) => {
            const chatObj = chat.toObject();
            if (!chatObj.isGroupChat) {
                const otherUser = (chatObj.users || []).find(u => String(u._id) !== String(req.user._id));
                if (otherUser) {
                    chatObj.chatName = otherUser.name;
                }
            }
            chatObj.unread = unreadCounts[idx] || 0;
            return chatObj;
        }).sort((a, b) => getChatSortTime(b) - getChatSortTime(a));

        res.status(200).send(chatsWithUnread);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

export const createGroupChat = async (req, res) => {
    if (!req.body.users || !req.body.name) {
        return res.status(400).send({ message: "Please fill all the fields" });
    }

    let users = JSON.parse(req.body.users);

    if (users.length < 2) {
        return res
            .status(400)
            .send("More than 2 users are required to form a group chat");
    }

    users.push(req.user);

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users.map((u) => u._id ? u._id : u),
            isGroupChat: true,
            groupAdmin: req.user._id,
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(fullGroupChat);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const renameGroup = async (req, res) => {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        { chatName },
        { new: true }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!updatedChat) {
        res.status(404).json({ message: "Chat not found" });
    } else {
        res.json(updatedChat);
    }
};

export const addToGroup = async (req, res) => {
    const { chatId, userId } = req.body;

    const added = await Chat.findByIdAndUpdate(
        chatId,
        { $push: { users: userId } },
        { new: true }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!added) {
        res.status(404).json({ message: "Chat not found" });
    } else {
        res.json(added);
    }
};

export const removeFromGroup = async (req, res) => {
    const { chatId, userId } = req.body;

    const removed = await Chat.findByIdAndUpdate(
        chatId,
        { $pull: { users: userId } },
        { new: true }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!removed) {
        res.status(404).json({ message: "Chat not found" });
    } else {
        res.json(removed);
    }
};

export const getChatsByUserId = async (req, res) => {
    const { id } = req.params;
    try {
        const results = await Chat.find({ users: { $elemMatch: { $eq: id } } })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 });
        const populated = await User.populate(results, {
            path: "latestMessage.sender",
            select: "name pic email",
        });

        // compute unread counts for the authenticated user (req.user)
        const userId = req.user?._id;
        const unreadCounts = userId ? await Promise.all(populated.map(async (chat) => {
            const count = await Message.countDocuments({
                chat: chat._id,
                sender: { $ne: userId },
                readBy: { $ne: userId }
            });
            return count;
        })) : [];

        const chatsWithUnread = populated.map((chat, idx) => {
            const chatObj = chat.toObject();
            chatObj.unread = userId ? (unreadCounts[idx] || 0) : 0;
            return chatObj;
        }).sort((a, b) => getChatSortTime(b) - getChatSortTime(a));

        res.status(200).json(chatsWithUnread);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getGroupChats = async (req, res) => {
    try {
        const groups = await Chat.find({ isGroupChat: true })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 });
        // populate sender info
        const populated = await User.populate(groups, {
            path: "latestMessage.sender",
            select: "name pic email",
        });

        // compute unread counts for authenticated user
        const userId = req.user?._id;
        const unreadCounts = userId ? await Promise.all(populated.map(async (chat) => {
            const count = await Message.countDocuments({
                chat: chat._id,
                sender: { $ne: userId },
                readBy: { $ne: userId }
            });
            return count;
        })) : [];

        const chatsWithUnread = populated.map((chat, idx) => {
            const chatObj = chat.toObject();
            chatObj.unread = userId ? (unreadCounts[idx] || 0) : 0;
            return chatObj;
        }).sort((a, b) => getChatSortTime(b) - getChatSortTime(a));

        res.status(200).json(chatsWithUnread);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
