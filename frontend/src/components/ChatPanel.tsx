import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

type Message = {
    id: string;
    role: 'user' | 'bot';
    text: string;
    timestamp: string;
    isThinking?: boolean;
};

export default function ChatPanel() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'bot',
            text: "Hello! I'm your AI pipeline assistant. I can help you configure nodes, explain algorithms, or debug your workflow. How can I assist you today?",
            timestamp: 'Just now'
        },
        {
            id: '2',
            role: 'user',
            text: "I need help setting up a Random Forest model.",
            timestamp: 'Just now'
        },
        {
            id: '3',
            role: 'bot',
            text: "Analyzing your pipeline configuration...",
            timestamp: 'Thinking...',
            isThinking: true
        }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: 'Just now'
        };

        setMessages(prev => [...prev, newMessage]);
        setInput('');

        // Simulate bot response
        setTimeout(() => {
            const botResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                text: "I've received your message. This is a dummy response for now!",
                timestamp: 'Just now'
            };
            setMessages(prev => [...prev, botResponse]);
        }, 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <aside className="w-80 bg-slate-900/50 backdrop-blur-xl border-l border-slate-800/50 flex flex-col shadow-2xl z-10 relative">
            {/* Header */}
            <div className="p-4 border-b border-slate-800/50 flex items-center gap-3 bg-slate-900/50">
                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/20">
                    <Bot size={18} className="text-purple-400" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-slate-200">Neuro Assistant</h2>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-slate-400 font-medium">Online</span>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/30">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                            {msg.role === 'bot' ? (
                                <Bot size={14} className="text-purple-400" />
                            ) : (
                                <User size={14} className="text-blue-400" />
                            )}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className={`flex items-center gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'bot' ? (
                                    <>
                                        <span className="text-xs font-bold text-slate-300">NeuroBot</span>
                                        <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                                        <span className="text-xs font-bold text-slate-300">You</span>
                                    </>
                                )}
                            </div>
                            <div className={`p-3 border rounded-2xl text-xs leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-blue-600/10 border-blue-500/20 rounded-tr-none text-blue-100'
                                    : 'bg-slate-800/50 border-slate-700/50 rounded-tl-none text-slate-300'
                                }`}>
                                {msg.isThinking ? (
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={12} className="text-yellow-500 animate-pulse" />
                                        <span>{msg.text}</span>
                                    </div>
                                ) : (
                                    <p>{msg.text}</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900/50 border-t border-slate-800/50 backdrop-blur-md">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything about your pipeline..."
                        className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-4 pr-12 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all shadow-inner"
                    />
                    <button
                        onClick={handleSend}
                        className="absolute right-1.5 top-1.5 p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors shadow-lg shadow-purple-500/20"
                    >
                        <Send size={14} />
                    </button>
                </div>
                <div className="text-[10px] text-slate-600 text-center mt-2">
                    AI can make mistakes. Verify important info.
                </div>
            </div>
        </aside>
    );
}
