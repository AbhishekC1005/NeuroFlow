import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Send, MessageSquare, Plus, ArrowLeft, Paperclip, FileText, Download, Loader2, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Message {
    id: number;
    sender_id: number;
    sender_name?: string;
    content: string;
    file_url?: string;
    file_type?: string;
    file_name?: string;
    created_at: string;
}

interface Conversation {
    id: number;
    name: string;
    is_group: boolean;
    recipient_username?: string;
    last_message?: string;
    last_message_time?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

export default function ChatInterface() {
    const { user, token } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeChat, setActiveChat] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [showNewChatInput, setShowNewChatInput] = useState(false);
    const [newChatUsername, setNewChatUsername] = useState('');
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupMembers, setGroupMembers] = useState('');
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [addMemberUsername, setAddMemberUsername] = useState('');

    const ws = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize WebSocket
    useEffect(() => {
        if (!user || !token) return;

        ws.current = new WebSocket(`${WS_BASE_URL}/ws/chat/${user.id}`);

        ws.current.onopen = () => {
            console.log('Connected to Chat WebSocket');
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'new_message') {
                // Update active chat messages if visible
                if (activeChat && data.group_id === activeChat.id) {
                    setMessages((prev) => {
                        // Prevent duplicates (e.g. from optimistic update)
                        if (prev.some(m => m.id === data.id)) return prev;

                        return [...prev, {
                            id: data.id,
                            sender_id: data.sender_id,
                            sender_name: data.sender_name,
                            content: data.content,
                            file_url: data.file_url,
                            file_type: data.file_type,
                            file_name: data.file_name,
                            created_at: data.created_at
                        }];
                    });
                    scrollToBottom();
                }
                // Refresh conversations list
                fetchConversations();
            }
        };

        return () => {
            ws.current?.close();
        };
    }, [user, token, activeChat]);

    // Fetch Conversations
    const fetchConversations = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (err) {
            console.error("Failed to fetch conversations", err);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    // Fetch Messages when chat is selected
    useEffect(() => {
        if (!activeChat) return;

        const fetchMessages = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/chat/${activeChat.id}/messages`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data);
                    scrollToBottom();
                }
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
        };

        fetchMessages();
    }, [activeChat]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat || !ws.current) return;

        const payload = {
            type: 'message',
            group_id: activeChat.id,
            content: newMessage
        };

        ws.current.send(JSON.stringify(payload));
        setNewMessage('');
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !activeChat) return;

        const file = e.target.files[0];
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('group_id', activeChat.id.toString());

        try {
            const res = await fetch(`${API_BASE_URL}/chat/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                    // Content-Type not set for FormData, browser sets it with boundary
                },
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Upload failed');
            }

            // Optimistic Update
            const data = await res.json();
            setMessages((prev) => {
                if (prev.some(m => m.id === data.id)) return prev;
                return [...prev, {
                    id: data.id,
                    sender_id: data.sender_id,
                    content: data.content,
                    file_url: data.file_url,
                    file_type: data.file_type,
                    file_name: data.file_name,
                    created_at: data.created_at
                }];
            });
            scrollToBottom();

        } catch (err: any) {
            console.error("Upload failed", err);
            alert(`Upload failed: ${err.message}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDownload = async (e: React.MouseEvent, url: string, filename: string) => {
        e.preventDefault();
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Download failed", err);
            window.open(url, '_blank');
        }
    };

    const handleCreateChat = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch(`${API_BASE_URL}/chat/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ recipient_username: newChatUsername })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Failed to create chat');
            }

            const newChat = await res.json();
            const conversationObj: Conversation = {
                id: newChat.id,
                name: newChat.name,
                is_group: false,
                recipient_username: newChat.name
            };

            setConversations(prev => [conversationObj, ...prev]);
            setActiveChat(conversationObj);
            setShowNewChatInput(false);
            setNewChatUsername('');

        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const memberList = groupMembers.split(',').map(s => s.trim()).filter(Boolean);
            if (!groupName || memberList.length === 0) {
                throw new Error("Group name and at least one member required");
            }

            const res = await fetch(`${API_BASE_URL}/chat/group/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: groupName, member_usernames: memberList })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Failed to create group');
            }

            const newGroup = await res.json();
            const conversationObj: Conversation = {
                id: newGroup.id,
                name: newGroup.name,
                is_group: true
            };

            setConversations(prev => [conversationObj, ...prev]);
            setActiveChat(conversationObj);
            setShowNewChatInput(false);
            setGroupName('');
            setGroupMembers('');
            setIsGroupMode(false);

        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeChat || !addMemberUsername) return;

        try {
            const res = await fetch(`${API_BASE_URL}/chat/${activeChat.id}/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ username: addMemberUsername })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Failed to add member');
            }
            alert('Member added successfully');
            setAddMemberUsername('');
            setIsAddMemberOpen(false);
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="h-screen w-full bg-gray-50 flex flex-col font-['Outfit',_'Inter',_sans-serif]">
            {/* Top Navigation Bar */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-30 shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        to="/workspace"
                        className="group flex items-center gap-2 text-gray-500 hover:text-[#4285F4] transition-all duration-200 px-3 py-2 rounded-xl hover:bg-blue-50"
                    >
                        <div className="p-1 rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-colors">
                            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                        </div>
                        <span className="font-medium text-sm">Back to Workspace</span>
                    </Link>
                </div>
                <div className="font-semibold text-gray-800 text-lg">Community Chat</div>
                <div className="w-32 flex justify-end">
                    {/* Placeholder for future actions */}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative w-full bg-white">

                {/* Sidebar - Conversations List */}
                <div className={`
                    flex flex-col border-r border-gray-200 bg-white z-20 
                    ${activeChat ? 'hidden md:flex md:w-80 lg:w-96' : 'w-full md:w-80 lg:w-96'} 
                `}>
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0 h-[73px]">
                        <h2 className="font-bold text-xl text-gray-900 tracking-tight">Messages</h2>
                        <button
                            onClick={() => setShowNewChatInput(!showNewChatInput)}
                            className={`p-2 rounded-full transition-all duration-200 ${showNewChatInput ? 'bg-gray-100 text-gray-600 rotate-45' : 'text-[#4285F4] hover:bg-blue-50'}`}
                            title="New Chat"
                        >
                            <Plus size={24} />
                        </button>
                    </div>

                    {/* New Chat Input */}
                    {showNewChatInput && (
                        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                            {/* Toggle Mode */}
                            <div className="flex bg-white p-1 rounded-lg border border-gray-200 mb-3">
                                <button
                                    onClick={() => setIsGroupMode(false)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${!isGroupMode ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Direct Message
                                </button>
                                <button
                                    onClick={() => setIsGroupMode(true)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${isGroupMode ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    New Group
                                </button>
                            </div>

                            {isGroupMode ? (
                                <form onSubmit={handleCreateGroup} className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Group Name"
                                        value={groupName}
                                        onChange={e => setGroupName(e.target.value)}
                                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none bg-white"
                                        autoFocus
                                    />
                                    <input
                                        type="text"
                                        placeholder="Usernames (comma separated, e.g. bob, alice)"
                                        value={groupMembers}
                                        onChange={e => setGroupMembers(e.target.value)}
                                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none bg-white"
                                    />
                                    <button type="submit" className="w-full bg-[#4285F4] text-white px-4 py-2 rounded-lg hover:bg-[#3367D6] font-medium text-sm">
                                        Create Group
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleCreateChat} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter username..."
                                        value={newChatUsername}
                                        onChange={e => setNewChatUsername(e.target.value)}
                                        className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none bg-white"
                                        autoFocus
                                    />
                                    <button type="submit" className="bg-[#4285F4] text-white px-4 py-2 rounded-lg hover:bg-[#3367D6] font-medium text-sm">
                                        Chat
                                    </button>
                                </form>
                            )}
                            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                        </div>
                    )}

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto">
                        {conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6 text-gray-400">
                                <MessageSquare size={48} className="mb-4 opacity-20" />
                                <p className="font-medium">No chats yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {conversations.map(chat => (
                                    <div
                                        key={chat.id}
                                        onClick={() => setActiveChat(chat)}
                                        className={`group p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${activeChat?.id === chat.id ? 'bg-blue-50/60 border-r-4 border-r-[#4285F4]' : 'border-r-4 border-r-transparent'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm transition-transform group-hover:scale-105 ${activeChat?.id === chat.id
                                                ? 'bg-[#4285F4] text-white shadow-[#4285F4]/20'
                                                : 'bg-white border-2 border-gray-100 text-gray-600'
                                                }`}>
                                                {chat.name[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <h3 className={`font-semibold text-sm truncate ${activeChat?.id === chat.id ? 'text-[#4285F4]' : 'text-gray-900'}`}>
                                                        {chat.name}
                                                    </h3>
                                                    {chat.last_message_time && (
                                                        <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">
                                                            {new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-xs truncate max-w-[200px] leading-relaxed ${activeChat?.id === chat.id ? 'text-gray-600 font-medium' : 'text-gray-500'}`}>
                                                    {chat.last_message || 'No messages yet'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col bg-[#FAFAFA] relative ${!activeChat ? 'hidden md:flex' : 'flex'} w-full`}>
                    {activeChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-[73px] px-6 border-b border-gray-200 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setActiveChat(null)} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-[#4285F4] to-[#3B78E7] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                                            {activeChat.name[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-gray-900 text-base leading-tight">{activeChat.name}</h2>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-white"></span>
                                                <span className="text-xs text-gray-500 font-medium">{activeChat.is_group ? 'Group Chat' : 'Online'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {activeChat.is_group && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsAddMemberOpen(!isAddMemberOpen)}
                                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Add Member"
                                        >
                                            <UserPlus size={20} />
                                        </button>

                                        {isAddMemberOpen && (
                                            <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h3 className="text-sm font-semibold text-gray-900">Add Member</h3>
                                                    <button onClick={() => setIsAddMemberOpen(false)} className="text-gray-400 hover:text-gray-600">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                                <form onSubmit={handleAddMember} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Username"
                                                        value={addMemberUsername}
                                                        onChange={e => setAddMemberUsername(e.target.value)}
                                                        className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-300 focus:border-blue-500 outline-none"
                                                        autoFocus
                                                    />
                                                    <button type="submit" className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700">
                                                        <Plus size={16} />
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                                <div className="flex justify-center my-6">
                                    <span className="px-4 py-1.5 bg-gray-100 rounded-full text-[10px] font-medium text-gray-500 uppercase tracking-wide border border-gray-200">
                                        Messages are end-to-end encrypted
                                    </span>
                                </div>
                                {messages.map((msg, idx) => {
                                    const isMe = msg.sender_id === user?.id;
                                    const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;

                                    return (
                                        <div key={msg.id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            {!isMe && showAvatar && (
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 mt-1">
                                                    {activeChat.name[0]?.toUpperCase()}
                                                </div>
                                            )}
                                            {!isMe && !showAvatar && <div className="w-8" />}

                                            <div className={`max-w-[75%] md:max-w-[60%] group relative`}>
                                                {!isMe && activeChat.is_group && msg.sender_name && (
                                                    <p className="text-[10px] text-gray-500 font-medium mb-1 ml-1">{msg.sender_name}</p>
                                                )}
                                                <div className={`px-5 py-3 text-sm leading-relaxed shadow-sm transition-all ${isMe
                                                    ? 'bg-[#4285F4] text-white rounded-2xl rounded-tr-none shadow-blue-500/10'
                                                    : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-none'
                                                    }`}>

                                                    {/* File Attachment Rendering */}
                                                    {msg.file_url && (
                                                        <div className="mb-2">
                                                            {msg.file_type === 'image' ? (
                                                                <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                                                                    <img
                                                                        src={msg.file_url}
                                                                        alt="Attachment"
                                                                        className="rounded-lg max-h-60 object-cover hover:opacity-90 transition-opacity border-2 border-white/20"
                                                                    />
                                                                </a>
                                                            ) : (
                                                                <a
                                                                    href={msg.file_url}
                                                                    onClick={e => handleDownload(e, msg.file_url!, msg.file_name!)}
                                                                    className={`flex items-center gap-3 p-3 rounded-lg ${isMe ? 'bg-blue-600 text-blue-50' : 'bg-gray-50 text-gray-700'}`}
                                                                >
                                                                    <div className="p-2 bg-white/20 rounded">
                                                                        <FileText size={20} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-medium truncate text-xs">{msg.file_name || 'Attached File'}</p>
                                                                        <p className="text-[10px] opacity-70">Click to download</p>
                                                                    </div>
                                                                    <Download size={16} className="opacity-70" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}

                                                    {msg.content}
                                                </div>
                                                <p className={`text-[10px] mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity font-medium px-1 ${isMe ? 'text-right text-gray-400' : 'text-left text-gray-400'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 md:p-6 bg-white border-t border-gray-100 sticky bottom-0 z-20">
                                <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 p-2 focus-within:border-[#4285F4] focus-within:ring-4 focus-within:ring-[#4285F4]/10 transition-all">

                                    {/* File Input */}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="p-3 text-gray-400 hover:text-[#4285F4] hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
                                        title="Attach file"
                                    >
                                        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                                    </button>

                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        placeholder="Type your message..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 p-3 max-h-32 min-h-[44px] text-gray-800 placeholder:text-gray-400 resize-none font-medium"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="p-3 bg-[#4285F4] text-white rounded-xl hover:bg-[#3367D6] hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none disabled:hover:bg-[#4285F4] transition-all duration-200"
                                    >
                                        <Send size={18} className="translate-x-0.5 -translate-y-0.5" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#FAFAFA]" style={{ backgroundImage: 'radial-gradient(#E5E7EB 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
                            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl shadow-gray-200/50 border-4 border-white animate-pulse-slow">
                                <MessageSquare size={48} className="text-[#4285F4]" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">FlowML Community Chat</h2>
                            <p className="max-w-md text-gray-500 leading-relaxed">
                                Select a conversation from the sidebar to start messaging, or create a new chat to connect with other researchers.
                            </p>
                            <div className="mt-8 flex gap-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                <span>Real-time</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300 self-center"></span>
                                <span>Secure</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300 self-center"></span>
                                <span>Fast</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
