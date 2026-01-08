import {
    Box,
    Flex,
    Text,
    Input,
    InputGroup,
    InputLeftElement,
    Avatar,
    Stack,
    IconButton,
    Button,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Checkbox,
    VStack,
    FormControl,
    FormLabel,
    Spinner,
    Badge,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    SimpleGrid,
} from "@chakra-ui/react";
import { SearchIcon, AddIcon, HamburgerIcon, ArrowBackIcon, ArrowForwardIcon, CloseIcon } from "@chakra-ui/icons";
import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import axios from 'axios';
import { useHistory } from "react-router-dom";


const EMOJI_SET = [
    "😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊", "😋", "😎", "😍", "😘", "🥰", "🙂", "🙃", "🤗", "🤩", "🤔",
    "😐", "🙄", "😏", "😴", "😌", "😛", "😜", "😝", "😒", "😔", "😕", "☹️", "🙁", "😢", "😭", "😡", "😠", "🤬", "😳", "🤯",
    "👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉",
    "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙", "💪", "🫶",
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
    "🍎", "🍌", "🍉", "🍇", "🍓", "🍒", "🥑", "🥗", "🍔", "🍕", "🍟", "🌮", "🍜", "🍣", "🍩", "🍪", "🍰", "☕", "🍵", "🥤",
    "🍺", "🍻", "🍷", "🍸", "🍹", "🥂",
    "🚗", "🚕", "🚙", "🚌", "🚎", "🚆", "🚊", "🚉", "✈️", "🛫", "🛬", "🚀", "🛳️", "🚢", "🚤", "🏠", "🏡", "🏢", "🏖️",
    "🏝️", "🗻", "🗺️", "🧳",
    "✅", "☑️", "❌", "⚠️", "⛔", "🚫", "❗", "❓", "💯", "🔔", "🔕", "🔒", "🔓", "⭐", "🌟", "✨", "🔥", "⚡", "📌", "📎",
];

    export const Chatpage = () => {
        const [chats, setChats] = useState([]);
        const [selectedChat, setSelectedChat] = useState(null);
        const [inputValue, setInputValue] = useState("");
        const [messages, setMessages] = useState([]);
        const [loadingMessages, setLoadingMessages] = useState(false);
        const [assistantUser, setAssistantUser] = useState(null);
        const [assistantPending, setAssistantPending] = useState(false);
        const [chatSearch, setChatSearch] = useState("");
        const [messageSearch, setMessageSearch] = useState("");
        const [showMessageSearch, setShowMessageSearch] = useState(false);
        const [onlineUsers, setOnlineUsers] = useState([]);
        const createDisclosure = useDisclosure();
        const profileDisclosure = useDisclosure();
        const emojiDisclosure = useDisclosure();
        const membersDisclosure = useDisclosure();
        const [profileData, setProfileData] = useState(null);
        const [loadingProfile, setLoadingProfile] = useState(false);
        const messagesContainerRef = useRef(null);
        const selectedChatRef = useRef(null);
        const socketRef = useRef(null);
        const socketConnectedRef = useRef(false);
        const messageInputRef = useRef(null);

        const history = useHistory();
        const formatTime = (t) => {
            if (!t) return "";
            try {
                return new Date(t).toLocaleString();
            } catch (e) {
                return String(t);
            }
        };
        const getDayKey = (value) => {
            if (!value) return "";
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return "";
            return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
        };
        const getDateLabel = (value) => {
            if (!value) return "";
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return "";
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const msgStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const diffDays = Math.floor((todayStart - msgStart) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return "Today";
            if (diffDays > 0 && diffDays < 7) {
                return d.toLocaleDateString("en-US", { weekday: "short" });
            }
            return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        };
        const getAssistantId = () => assistantUser && (assistantUser._id || assistantUser.id);
        const isAssistantChat = (chat) => {
            const assistantId = getAssistantId();
            if (!assistantId || !chat) return false;
            const raw = chat.raw || chat;
            const users = raw.users || [];
            const normalize = (u) => (u ? String(u._id || u.id || u) : "");
            return users.some((u) => normalize(u) === String(assistantId));
        };

        const fetchChats = async () => {
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : {};
                const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                const { data } = await axios.get(`${base}/api/chats`, config);

                const mapped = (data || []).map((c) => ({
                    id: c._id,
                    name: c.chatName || (c.users && c.users[0] ? c.users[0].name : 'Unknown'),
                    lastMessage: c.latestMessage ? c.latestMessage.content : '',
                    time: c.latestMessage ? formatTime(c.latestMessage.createdAt || c.latestMessage.updatedAt) : formatTime(c.updatedAt),
                    unread: c.unread || 0,
                    raw: c,
                    pic: c.users && c.users[1] ? c.users[1].pic : ''
                }));

                setChats(mapped);
            } catch (err) {
                console.error('Failed to fetch chats', err);
            }
        };

        const fetchMessages = async (chat) => {
            if (!chat) return;
            try {
                setLoadingMessages(true);
                const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : {};
                const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                const chatId = chat.id || chat._id;
                const { data } = await axios.get(`${base}/api/message/${chatId}`, config);
                setMessages(data || []);
            } catch (err) {
                console.error('Failed to fetch messages', err);
                setMessages([]);
            } finally {
                setLoadingMessages(false);
            }
        };

        const markMessageAsRead = async ({ messageId, chatId } = {}) => {
            if (!messageId && !chatId) return;
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' } } : { headers: { 'Content-Type': 'application/json' } };
                const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                await axios.put(`${base}/api/message/read`, { messageId, chatId }, config);
            } catch (err) {
                console.error('Failed to mark message as read', err);
            }
        };

        const markChatAsRead = async (chat) => {
            const chatId = chat && (chat.id || chat._id || (chat.raw && chat.raw._id));
            if (!chatId) return;
            await markMessageAsRead({ chatId });
        };

        const handleOpenMembers = () => {
            const activeChat = selectedChat && (selectedChat.raw || selectedChat);
            const members = activeChat && activeChat.users;
            if (!members || members.length === 0) return;
            membersDisclosure.onOpen();
        };

        const handleEmojiSelect = (emoji) => {
            setInputValue((prev) => `${prev}${emoji}`);
            emojiDisclosure.onClose();
            if (messageInputRef.current) {
                messageInputRef.current.focus();
            }
        };

        useEffect(() => {
            fetchChats();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        useEffect(() => {
            let mounted = true;
            (async () => {
                try {
                    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                    const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : {};
                    const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                    const { data } = await axios.get(`${base}/api/assistant/user`, config);
                    if (mounted) setAssistantUser(data || null);
                } catch (err) {
                    console.error('Failed to load assistant user', err);
                    if (mounted) setAssistantUser(null);
                }
            })();

            return () => { mounted = false; };
        }, []);

        useEffect(() => {
            if (selectedChat) {
                fetchMessages(selectedChat.raw || selectedChat);
                markChatAsRead(selectedChat.raw || selectedChat);
                setMessageSearch("");
                setShowMessageSearch(false);
                membersDisclosure.onClose();
            } else {
                setMessages([]);
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [selectedChat]);

        useEffect(() => {
            selectedChatRef.current = selectedChat;
        }, [selectedChat]);

        const updateChatFromMessage = (newMessage) => {
            const incomingChatId = newMessage && newMessage.chat && (newMessage.chat._id || newMessage.chat);
            if (!incomingChatId) return;
            const activeChat = selectedChatRef.current;
            const activeChatId = activeChat && (activeChat.id || activeChat._id);
            setChats((prev) => {
                let updatedChat = null;
                const next = (prev || []).map((c) => {
                    const chatId = c.id || (c.raw && c.raw._id);
                    if (String(chatId) !== String(incomingChatId)) return c;
                    const unread = activeChatId && String(activeChatId) === String(incomingChatId) ? 0 : (c.unread || 0) + 1;
                    updatedChat = {
                        ...c,
                        lastMessage: newMessage.content || '',
                        time: formatTime(newMessage.createdAt || newMessage.updatedAt),
                        unread,
                    };
                    return updatedChat;
                });
                if (!updatedChat) return prev;
                return [updatedChat, ...next.filter((c) => c !== updatedChat)];
            });
        };

        useEffect(() => {
            const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
            const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            socketRef.current = io(base);
            socketRef.current.emit('setup', userInfo);
            socketRef.current.on('connected', () => {
                socketConnectedRef.current = true;
            });
            socketRef.current.on('online users', (users = []) => {
                const list = users.map((u) => String(u));
                setOnlineUsers(list);
            });
            socketRef.current.on('user online', (userId) => {
                const id = String(userId);
                setOnlineUsers((prev) => (prev.includes(id) ? prev : [...prev, id]));
            });
            socketRef.current.on('user offline', (userId) => {
                const id = String(userId);
                setOnlineUsers((prev) => prev.filter((u) => u !== id));
            });
            socketRef.current.on('message received', (newMessage) => {
                const activeChat = selectedChatRef.current;
                const activeChatId = activeChat && (activeChat.id || activeChat._id);
                const incomingChatId = newMessage && newMessage.chat && (newMessage.chat._id || newMessage.chat);
                updateChatFromMessage(newMessage);
                if (activeChatId && incomingChatId && String(activeChatId) === String(incomingChatId)) {
                    setMessages((prev) => [...prev, newMessage]);
                    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                    const userId = userInfo._id || userInfo.id || (userInfo.user && (userInfo.user._id || userInfo.user.id));
                    const senderId = newMessage.sender && (newMessage.sender._id || newMessage.sender);
                    if (!senderId || !userId || String(senderId) !== String(userId)) {
                        const messageId = newMessage && (newMessage._id || newMessage.id);
                        markMessageAsRead({ messageId, chatId: incomingChatId });
                    }
                }
            });
            return () => {
                if (socketRef.current) {
                    socketRef.current.off('connected');
                    socketRef.current.off('online users');
                    socketRef.current.off('user online');
                    socketRef.current.off('user offline');
                    socketRef.current.off('message received');
                    socketRef.current.disconnect();
                }
            };
        }, []);

        useEffect(() => {
            if (!selectedChat || !socketRef.current) return;
            const chatId = selectedChat.id || selectedChat._id;
            socketRef.current.emit('join chat', chatId);
        }, [selectedChat]);

        useEffect(() => {
            if (!selectedChat) return;
            const activeChatId = selectedChat.id || selectedChat._id;
            setChats((prev) =>
                (prev || []).map((c) => {
                    const chatId = c.id || (c.raw && c.raw._id);
                    if (String(chatId) !== String(activeChatId)) return c;
                    if (!c.unread) return c;
                    return { ...c, unread: 0 };
                })
            );
        }, [selectedChat]);

        useEffect(() => {
            const el = messagesContainerRef.current;
            if (!el) return;
            el.scrollTop = el.scrollHeight;
        }, [messages, selectedChat]);

        const handleProfile = () => profileDisclosure.onOpen();
        const handleLogout = () =>  history.push("/");;

        const requestAssistantReply = async ({ chatId, prompt }) => {
            try {
                setAssistantPending(true);
                const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' } } : { headers: { 'Content-Type': 'application/json' } };
                const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                const { data } = await axios.post(`${base}/api/assistant/reply`, { chatId, prompt }, config);
                if (socketRef.current && socketConnectedRef.current) {
                    socketRef.current.emit('new message', data);
                } else {
                    setMessages((prev) => [...prev, data]);
                    updateChatFromMessage(data);
                }
            } catch (err) {
                console.error('Failed to get assistant reply', err);
            } finally {
                setAssistantPending(false);
            }
        };

        const handleSendMessage = async () => {
            if (!selectedChat) return;
            const content = inputValue;
            if (!content.trim()) return;
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' } } : { headers: { 'Content-Type': 'application/json' } };
                const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                const chatId = selectedChat.id || selectedChat._id;
                const { data } = await axios.post(`${base}/api/message`, { content, chatId }, config);
                if (socketRef.current && socketConnectedRef.current) {
                    socketRef.current.emit('new message', data);
                }
                setInputValue('');
                if (isAssistantChat(selectedChat)) {
                    await requestAssistantReply({ chatId, prompt: content });
                }
            } catch (err) {
                console.error('Failed to send message', err);
            }
        };

        // Create Group Modal
        function CreateGroupModal() {
            const isOpen = createDisclosure.isOpen;
            const onClose = createDisclosure.onClose;
            const [groupName, setGroupName] = useState("");
            const [usersList, setUsersList] = useState([]);
            const [selectedUsers, setSelectedUsers] = useState([]);
            const [loadingUsers, setLoadingUsers] = useState(false);
            const assistantId = getAssistantId();

            useEffect(() => {
                if (!isOpen) return;
                (async () => {
                    try {
                        setLoadingUsers(true);
                        const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                        const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : {};
                        const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                        const { data } = await axios.get(`${base}/api/user/`, config);
                        const meId = userInfo._id || userInfo.id || (userInfo.user && (userInfo.user._id || userInfo.user.id));
                        const others = (data || []).filter(u => {
                            const id = u && (u._id || u.id);
                            if (!id) return false;
                            if (String(id) === String(meId)) return false;
                            if (assistantId && String(id) === String(assistantId)) return false;
                            return true;
                        });
                        setUsersList(others);
                    } catch (err) {
                        console.error('Failed to fetch users', err);
                    } finally {
                        setLoadingUsers(false);
                    }
                })();
            }, [isOpen]);

            const toggleUser = (id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

            const createGroup = async () => {
                if (!groupName.trim()) { alert('Please enter a group name'); return; }
                if (selectedUsers.length < 1) { alert('Select at least one user'); return; }
                try {
                    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                    const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' } } : { headers: { 'Content-Type': 'application/json' } };
                    const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                    const { data } = await axios.post(`${base}/api/chats/group`, { name: groupName, users: JSON.stringify(selectedUsers) }, config);
                    await fetchChats();
                    const mapped = { id: data._id, name: data.chatName, lastMessage: data.latestMessage ? data.latestMessage.content : '', time: data.latestMessage ? formatTime(data.latestMessage.createdAt || data.latestMessage.updatedAt) : formatTime(data.updatedAt), unread: data.unread || 0, raw: data, pic: data.users && data.users[1] ? data.users[1].pic : '' };
                    setSelectedChat(mapped);
                    setGroupName(''); setSelectedUsers([]); onClose();
                } catch (err) { console.error('Failed to create group', err); alert('Failed to create group'); }
            };

            return (
                <Modal isOpen={isOpen} onClose={onClose} size="md">
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>Create Group</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody>
                            <FormControl mb={3}><FormLabel>Group Name</FormLabel><Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name" /></FormControl>
                            <FormControl>
                                <FormLabel>Select Users</FormLabel>
                                {loadingUsers ? <Spinner /> : (
                                    <VStack align="start" maxH="240px" overflowY="auto">{usersList.map(u => (<Checkbox key={u._id} isChecked={selectedUsers.includes(u._id)} onChange={() => toggleUser(u._id)}>{u.name} ({u.email || u._id})</Checkbox>))}</VStack>
                                )}
                            </FormControl>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
                            <Button colorScheme="teal" onClick={createGroup}>Create</Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            );
        }

        // Users menu with avatars and search
        function UsersMenu({ assistantUser }) {
            const [usersList, setUsersList] = useState([]);
            const [loadingUsers, setLoadingUsers] = useState(false);
            const [search, setSearch] = useState('');
            const assistantId = assistantUser && (assistantUser._id || assistantUser.id);

            const handleOpen = async () => {
                if (usersList.length > 0) return;
                try {
                    setLoadingUsers(true);
                    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                    const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : {};
                    const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                    const { data } = await axios.get(`${base}/api/user/`, config);
                    const meId = userInfo._id || userInfo.id || (userInfo.user && (userInfo.user._id || userInfo.user.id));
                    const others = (data || []).filter(u => {
                        const id = u && (u._id || u.id);
                        if (!id) return false;
                        if (String(id) === String(meId)) return false;
                        if (assistantId && String(id) === String(assistantId)) return false;
                        return true;
                    });
                    setUsersList(others);
                } catch (err) { console.error('Failed to fetch users', err); setUsersList([]); }
                finally { setLoadingUsers(false); }
            };

            const openChatWith = async (userId) => {
                try {
                    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                    const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' } } : { headers: { 'Content-Type': 'application/json' } };
                    const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                    const { data } = await axios.post(`${base}/api/chats`, { userId }, config);
                    await fetchChats();
                    const mapped = { id: data._id, name: data.chatName || (data.users && data.users[0] ? data.users[0].name : 'Unknown'), lastMessage: data.latestMessage ? data.latestMessage.content : '', time: data.latestMessage ? formatTime(data.latestMessage.createdAt || data.latestMessage.updatedAt) : formatTime(data.updatedAt), unread: data.unread || 0, raw: data, pic: data.users && data.users[1] ? data.users[1].pic : '' };
                    setSelectedChat(mapped);
                } catch (err) { console.error('Failed to open/create chat', err); alert('Failed to open chat'); }
            };

            const filtered = usersList.filter(u => !search || (u.name && u.name.toLowerCase().includes(search.toLowerCase())) || (u.email && u.email.toLowerCase().includes(search.toLowerCase())));

            return (
                <Menu onOpen={handleOpen}>
                    <MenuButton as={IconButton} aria-label="New" icon={<AddIcon />} size="sm" variant="ghost" rounded="full" />
                    <MenuList minW="280px" maxH="360px" overflowY="auto">
                        {assistantUser && (
                            <MenuItem onClick={() => openChatWith(assistantUser._id || assistantUser.id)} bg="blue.50" _hover={{ bg: "blue.100" }}>
                                <Flex align="center" gap={3} w="100%">
                                    <Avatar size="sm" name={assistantUser.name} src={assistantUser.pic} />
                                    <Box textAlign="left">
                                        <Text fontSize="sm">{assistantUser.name || "AI Assistant"}</Text>
                                        <Text fontSize="xs" color="gray.500">AI assistant</Text>
                                    </Box>
                                    <Badge ml="auto" colorScheme="blue">AI</Badge>
                                </Flex>
                            </MenuItem>
                        )}
                        <MenuItem onClick={() => createDisclosure.onOpen()} bg="teal.50" _hover={{ bg: "teal.100" }}>
                            New Group
                        </MenuItem>
                        <Box px={3} py={2}><Input placeholder="Search users" size="sm" value={search} onChange={e => setSearch(e.target.value)} /></Box>
                        {loadingUsers ? <MenuItem><Spinner size="sm" /></MenuItem> : filtered.map(u => (
                            <MenuItem key={u._id} onClick={() => openChatWith(u._id)}>
                                <Flex align="center" gap={3}>
                                    <Avatar size="sm" name={u.name} src={u.pic} />
                                    <Box textAlign="left">
                                        <Text fontSize="sm">{u.name}</Text>
                                        <Text fontSize="xs" color="gray.500">{u.email || u._id}</Text>
                                    </Box>
                                </Flex>
                            </MenuItem>
                        ))}
                    </MenuList>
                </Menu>
            );
        }

        // Profile modal
        function ProfileModal() {
            const isOpen = profileDisclosure.isOpen;
            const onClose = profileDisclosure.onClose;

            useEffect(() => {
                let mounted = true;
                if (!isOpen) return;
                if (profileData) return; // already loaded, avoid re-fetch

                (async () => {
                    try {
                        setLoadingProfile(true);
                        const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                        const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : {};
                        const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                        const { data } = await axios.get(`${base}/api/user/profile`, config);
                        if (!mounted) return;
                        setProfileData(data || null);
                    } catch (err) {
                        if (!mounted) return;
                        console.error('Failed to fetch profile', err);
                        setProfileData(null);
                    } finally {
                        if (!mounted) return;
                        setLoadingProfile(false);
                    }
                })();

                return () => { mounted = false; };
            }, [isOpen]);

            return (
                <Modal isOpen={isOpen} onClose={onClose} size="sm">
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>Profile</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody>
                            {loadingProfile ? (
                                <Spinner />
                            ) : profileData ? (
                                <Box textAlign="center">
                                    <Avatar size="xl" name={profileData.name} src={profileData.pic} mb={3} />
                                    <Text fontWeight="semibold">{profileData.name}</Text>
                                    <Text fontSize="sm" color="gray.600">{profileData.email}</Text>
                                </Box>
                            ) : (
                                <Text>Unable to load profile.</Text>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="ghost" onClick={onClose}>Close</Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            );
        }

        function MembersModal() {
            const isOpen = membersDisclosure.isOpen;
            const onClose = membersDisclosure.onClose;
            const activeChat = selectedChat && (selectedChat.raw || selectedChat);
            const members = (activeChat && activeChat.users) || [];
            const isGroupChat = activeChat && activeChat.isGroupChat;
            const title = isGroupChat ? "Group Members" : "Participants";
            const groupAdmin = activeChat && activeChat.groupAdmin;
            const groupAdminId = groupAdmin && (groupAdmin._id || groupAdmin.id || groupAdmin);
            const canAddMembers = !!isGroupChat;
            const [showAdd, setShowAdd] = useState(false);
            const [usersList, setUsersList] = useState([]);
            const [loadingUsers, setLoadingUsers] = useState(false);
            const [search, setSearch] = useState("");
            const [addingUserId, setAddingUserId] = useState("");
            const assistantId = getAssistantId();

            useEffect(() => {
                if (!isOpen) return;
                if (!canAddMembers || !showAdd) return;
                let mounted = true;
                (async () => {
                    try {
                        setLoadingUsers(true);
                        const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                        const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : {};
                        const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                        const { data } = await axios.get(`${base}/api/user/`, config);
                        if (!mounted) return;
                        setUsersList(data || []);
                    } catch (err) {
                        if (!mounted) return;
                        console.error('Failed to fetch users', err);
                        setUsersList([]);
                    } finally {
                        if (mounted) setLoadingUsers(false);
                    }
                })();

                return () => { mounted = false; };
            }, [isOpen, canAddMembers, showAdd]);

            useEffect(() => {
                if (isOpen) return;
                setShowAdd(false);
                setSearch("");
            }, [isOpen]);

            const normalizeId = (u) => (u ? String(u._id || u.id || u) : "");
            const memberIds = new Set(members.map(normalizeId));
            const availableUsers = (usersList || []).filter((u) => {
                const id = normalizeId(u);
                if (!id || memberIds.has(id)) return false;
                if (assistantId && id === String(assistantId)) return false;
                return true;
            });
            const memberSearchTerm = search.trim().toLowerCase();
            const filteredUsers = availableUsers.filter((u) => {
                if (!memberSearchTerm) return true;
                const name = (u.name || "").toLowerCase();
                const email = (u.email || "").toLowerCase();
                return name.includes(memberSearchTerm) || email.includes(memberSearchTerm);
            });

            const handleAddMember = async (user) => {
                if (!activeChat) return;
                const userId = user && (user._id || user.id);
                const chatId = activeChat._id || activeChat.id;
                if (!userId || !chatId) return;
                try {
                    setAddingUserId(String(userId));
                    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
                    const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' } } : { headers: { 'Content-Type': 'application/json' } };
                    const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                    const { data } = await axios.put(`${base}/api/chats/groupadd`, { chatId, userId }, config);
                    setSelectedChat((prev) => prev ? { ...prev, raw: data, name: data.chatName || prev.name } : prev);
                    setUsersList((prev) => (prev || []).filter((u) => String(u._id || u.id) !== String(userId)));
                    fetchChats();
                    setShowAdd(false);
                    setSearch("");
                } catch (err) {
                    console.error('Failed to add member', err);
                    alert('Failed to add member');
                } finally {
                    setAddingUserId("");
                }
            };

            return (
                <Modal isOpen={isOpen} onClose={onClose} size="sm">
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader pr="3.5rem">
                            <Flex align="center" justify="space-between">
                                <Text>{title}</Text>
                                {canAddMembers && (
                                    <Button size="xs" variant="outline" colorScheme="teal" onClick={() => setShowAdd((prev) => !prev)}>
                                        {showAdd ? "Close" : "Add Members"}
                                    </Button>
                                )}
                            </Flex>
                        </ModalHeader>
                        <ModalCloseButton />
                        <ModalBody>
                            {canAddMembers && showAdd && (
                                <Box mb={4}>
                                    <Input placeholder="Search users" size="sm" value={search} onChange={(e) => setSearch(e.target.value)} mb={2} />
                                    {loadingUsers ? (
                                        <Spinner size="sm" />
                                    ) : (
                                        <Stack spacing={2} maxH="200px" overflowY="auto">
                                            {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                                                <Flex key={u._id || u.id} align="center" justify="space-between">
                                                    <Flex align="center" gap={2}>
                                                        <Avatar size="xs" name={u.name} src={u.pic} />
                                                        <Box>
                                                            <Text fontSize="sm">{u.name || "Unknown"}</Text>
                                                            {u.email && <Text fontSize="xs" color="gray.500">{u.email}</Text>}
                                                        </Box>
                                                    </Flex>
                                                    <Button
                                                        size="xs"
                                                        colorScheme="teal"
                                                        onClick={() => handleAddMember(u)}
                                                        isLoading={addingUserId === String(u._id || u.id)}
                                                    >
                                                        Add
                                                    </Button>
                                                </Flex>
                                            )) : (
                                                <Text fontSize="xs" color="gray.500">No users found.</Text>
                                            )}
                                        </Stack>
                                    )}
                                </Box>
                            )}
                            {!showAdd && (
                                members.length > 0 ? (
                                    <Stack spacing={3}>
                                        {members.map((u) => {
                                            const key = u._id || u.id || u.email || u.name;
                                            const isMemberAdmin = groupAdminId && String(u._id || u.id) === String(groupAdminId);
                                            return (
                                                <Flex key={key} align="center" gap={3}>
                                                    <Avatar size="sm" name={u.name} src={u.pic} />
                                                    <Box>
                                                        <Flex align="center" gap={2}>
                                                            <Text fontSize="sm" fontWeight="semibold">{u.name || "Unknown"}</Text>
                                                            {isMemberAdmin && <Badge colorScheme="teal">Admin</Badge>}
                                                        </Flex>
                                                        {u.email && <Text fontSize="xs" color="gray.500">{u.email}</Text>}
                                                    </Box>
                                                </Flex>
                                            );
                                        })}
                                    </Stack>
                                ) : (
                                    <Text fontSize="sm" color="gray.500">No members found.</Text>
                                )
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="ghost" onClick={onClose}>Close</Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            );
        }

        const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
        const userId = userInfo._id || userInfo.id || (userInfo.user && (userInfo.user._id || userInfo.user.id));
        const userIdStr = userId ? String(userId) : "";
        const searchTerm = chatSearch.trim().toLowerCase();
        const messageSearchTerm = messageSearch.trim().toLowerCase();
        const filteredChats = (chats || []).filter((chat) => {
            if (!searchTerm) return true;
            const name = (chat.name || "").toLowerCase();
            return name.includes(searchTerm);
        });
        const filteredMessages = (messages || []).filter((msg) => {
            if (!messageSearchTerm) return true;
            const content = (msg.content || "").toLowerCase();
            return content.includes(messageSearchTerm);
        });
        const onlineSet = new Set((onlineUsers || []).map((u) => String(u)));
        const getChatStatus = (chat) => {
            if (!chat || !userIdStr) return "";
            const raw = chat.raw || chat;
            const users = raw.users || [];
            const normalize = (u) => (u ? String(u._id || u.id || u) : "");
            if (raw.isGroupChat) {
                const onlineCount = users
                    .map(normalize)
                    .filter((id) => id && id !== userIdStr)
                    .filter((id) => onlineSet.has(id)).length;
                return `${onlineCount} online`;
            }
            const otherUser = users.find((u) => normalize(u) && normalize(u) !== userIdStr);
            const otherId = normalize(otherUser);
            if (!otherId) return "offline";
            return onlineSet.has(otherId) ? "online" : "offline";
        };
        const statusText = selectedChat ? getChatStatus(selectedChat) : "";
        const renderedMessages = [];
        let lastDayKey = "";
        (filteredMessages.length > 0 ? filteredMessages : []).forEach((msg) => {
            const timeValue = msg.createdAt || msg.updatedAt || msg.time || "";
            const dayKey = getDayKey(timeValue);
            if (dayKey && dayKey !== lastDayKey) {
                const label = getDateLabel(timeValue);
                if (label) {
                    renderedMessages.push(
                        <Flex key={`date-${dayKey}`} justify="center" my={2}>
                            <Box bg="#E2E8F0" px={3} py={1} borderRadius="full">
                                <Text fontSize="xs" color="gray.600">{label}</Text>
                            </Box>
                        </Flex>
                    );
                }
                lastDayKey = dayKey;
            }
            const senderId = msg.sender && (msg.sender._id || msg.sender);
            const mine = senderId && userId && String(senderId) === String(userId);
            const time = timeValue || '';
            renderedMessages.push(
                <Flex key={msg._id || msg.id} marginTop={1} justify={mine ? "flex-end" : "flex-start"}>
                    <Box maxW="70%" bg={mine ? "#D9FDD3" : "white"} p={2} px={3} borderRadius="lg" boxShadow="sm" position="relative" borderTopLeftRadius={!mine ? 0 : "lg"} borderTopRightRadius={mine ? 0 : "lg"}>
                        <Text fontSize="sm" color="#111B21">{msg.content}</Text>
                        <Text fontSize="10px" color="gray.500" textAlign="right" mt={1}>{time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                    </Box>
                </Flex>
            );
        });
        const showAssistantTyping = assistantPending && selectedChat && isAssistantChat(selectedChat);
        if (showAssistantTyping) {
            renderedMessages.push(
                <Flex key="assistant-typing" marginTop={1} justify="flex-start">
                    <Box maxW="70%" bg="white" p={2} px={3} borderRadius="lg" boxShadow="sm" borderTopLeftRadius={0}>
                        <Flex align="center" gap={2}>
                            <Spinner size="xs" />
                            <Text fontSize="sm" color="#111B21">Assistant is typing...</Text>
                        </Flex>
                    </Box>
                </Flex>
            );
        }

        return (
            <Box w="100%" h="100vh" bg="#F6F6F6" overflow="hidden">
                <Flex h="100%" minH="0">
                    {/* Sidebar / Chat List */}
                    <Box w={{ base: "100%", md: "30%" }} bg="white" borderRight="1px solid #E2E8F0" display={{ base: selectedChat ? "none" : "flex", md: "flex" }} flexDir="column">
                        <Box p={4} borderBottom="1px solid #E2E8F0" bg="#F0F2F5">
                            <Flex justify="space-between" align="center" mb={4}>
                                <Avatar size="sm" name="User" src="https://bit.ly/broken-link" />
                                <Flex gap={3} align="center">
                                    <IconButton aria-label="Status" icon={<Text>◎</Text>} size="sm" variant="ghost" rounded="full" />
                                    <UsersMenu assistantUser={assistantUser} />
                                    <Menu>
                                        <MenuButton as={IconButton} aria-label="Menu" icon={<HamburgerIcon />} size="sm" variant="ghost" rounded="full" />
                                        <MenuList>
                                            <MenuItem onClick={handleProfile}>Profile</MenuItem>
                                            <MenuItem onClick={handleLogout}>Logout</MenuItem>
                                        </MenuList>
                                    </Menu>
                                </Flex>
                            </Flex>
                            <InputGroup>
                                <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
                                <Input placeholder="Search or start new chat" bg="white" borderRadius="lg" fontSize="sm" value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} />
                            </InputGroup>
                        </Box>

                        <Box overflowY="auto" minH="0" maxH="calc(100vh - 50px)" pb="80px" flex={1} bg="white" sx={{ '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { background: '#CBD5E0', borderRadius: '8px' }, '&::-webkit-scrollbar-track': { background: 'transparent' } }}>
                            {(filteredChats.length > 0 ? filteredChats : []).map((chat) => (
                                <Flex key={chat.id} p={3} align="center" cursor="pointer" bg={selectedChat?.id === chat.id ? "#F0F2F5" : "transparent"} _hover={{ bg: "#F5F5F5" }} onClick={() => setSelectedChat(chat)} borderBottom="1px solid #F0F2F5">
                                    <Avatar size="md" name={chat.name} src={chat.pic} mr={3} />
                                    <Box flex={1}>
                                        <Flex justify="space-between" align="center" mb={1}>
                                            <Text fontWeight="semibold" fontSize="md" color="#111B21">{chat.name}</Text>
                                            <Text fontSize="xs" color={chat.unread > 0 ? "#25D366" : "gray.500"}>{chat.time}</Text>
                                        </Flex>
                                        <Flex justify="space-between" align="center">
                                            <Text fontSize="sm" color="gray.600" noOfLines={1}>{chat.lastMessage}</Text>
                                            {chat.unread > 0 && (<Box bg="#25D366" color="white" borderRadius="full" minW="20px" h="20px" fontSize="xs" display="flex" alignItems="center" justifyContent="center" fontWeight="bold" px={1}>{chat.unread}</Box>)}
                                        </Flex>
                                    </Box>
                                </Flex>
                            ))}
                        </Box>
                    </Box>

                    {/* Main Chat Window */}
                    <Box w={{ base: "100%", md: "70%" }} display={{ base: selectedChat ? "flex" : "none", md: "flex" }} flexDir="column" bg="#EFEAE2" position="relative" h="100%" minH="0">
                        {selectedChat ? (
                            <>
                                <Flex p={3} bg="#F0F2F5" align="center" borderBottom="1px solid #E2E8F0" justify="space-between">
                                <Flex align="center">
                                    <IconButton aria-label="Back" icon={<ArrowBackIcon />} display={{ base: "flex", md: "none" }} mr={2} onClick={() => setSelectedChat(null)} variant="ghost" />
                                    <Flex align="center" cursor="pointer" onClick={handleOpenMembers}>
                                        <Avatar size="sm" name={selectedChat.name} src={selectedChat.pic} mr={3} />
                                        <Box>
                                            <Text fontWeight="semibold" fontSize="md" color="#111B21">{selectedChat.name}</Text>
                                            <Text fontSize="xs" color="gray.500">{statusText || "offline"}</Text>
                                        </Box>
                                    </Flex>
                                </Flex>
                                <Flex gap={2} align="center">
                                    {showMessageSearch && (
                                        <Input
                                            size="sm"
                                            maxW={{ base: "140px", md: "200px" }}
                                            placeholder="Search messages"
                                            value={messageSearch}
                                            onChange={(e) => setMessageSearch(e.target.value)}
                                            bg="white"
                                        />
                                    )}
                                    <IconButton
                                        aria-label={showMessageSearch ? "Close search" : "Search"}
                                        icon={showMessageSearch ? <CloseIcon /> : <SearchIcon />}
                                        variant="ghost"
                                        color="gray.600"
                                        onClick={() => {
                                            if (showMessageSearch) {
                                                setShowMessageSearch(false);
                                                setMessageSearch("");
                                            } else {
                                                setShowMessageSearch(true);
                                            }
                                        }}
                                    />
                                    
                                </Flex>
                                </Flex>

                                <Box ref={messagesContainerRef} display="flex" flexDir="column" overflowY="auto" minH="0" flex="1 1 0" sx={{ '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { background: '#CBD5E0', borderRadius: '8px' }, '&::-webkit-scrollbar-track': { background: 'transparent' } }} p={4}>
                                    {renderedMessages}
                                </Box>

                                <Box p={3} bg="#F0F2F5" borderTop="1px solid #E2E8F0" w="100%" >
                                    <Flex gap={2}>
                                        <Popover isOpen={emojiDisclosure.isOpen} onOpen={emojiDisclosure.onOpen} onClose={emojiDisclosure.onClose} placement="top-start">
                                            <PopoverTrigger>
                                                <IconButton aria-label="Emoji" icon={<Text>☺</Text>} variant="ghost" color="gray.600" />
                                            </PopoverTrigger>
                                        <PopoverContent w="300px" borderRadius="md" boxShadow="lg">
                                            <PopoverBody p={2} maxH="240px" overflowY="auto">
                                                <SimpleGrid columns={6} spacing={1}>
                                                    {EMOJI_SET.map((emoji) => (
                                                        <Button key={emoji} size="sm" variant="ghost" onClick={() => handleEmojiSelect(emoji)}>
                                                            {emoji}
                                                        </Button>
                                                    ))}
                                                </SimpleGrid>
                                            </PopoverBody>
                                        </PopoverContent>
                                        </Popover>
                                        <IconButton aria-label="Attach" icon={<Text>📎</Text>} variant="ghost" color="gray.600" />
                                        <Input ref={messageInputRef} placeholder="Type a message" bg="white" borderRadius="lg" border="none" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleSendMessage()} />
                                        {inputValue ? (<IconButton aria-label="Send" icon={<ArrowForwardIcon />} onClick={handleSendMessage} colorScheme="teal" variant="ghost" />) : (<IconButton aria-label="Mic" icon={<Text>🎤</Text>} variant="ghost" color="gray.600" />)}
                                    </Flex>
                                </Box>
                            </>
                        ) : (
                            <Flex align="center" justify="center" h="100%" flexDir="column" color="gray.500">
                                <Text fontSize="2xl" mb={4}>Welcome to Chat App</Text>
                                <Text>Select a chat to start messaging</Text>
                            </Flex>
                        )}
                    </Box>
                </Flex>
                <ProfileModal />
                <CreateGroupModal />
                <MembersModal />
            </Box>
        );

    };
