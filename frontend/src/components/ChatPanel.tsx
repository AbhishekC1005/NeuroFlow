import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, PanelRightClose } from 'lucide-react';
import type { Node, Edge } from 'reactflow';
import axios from 'axios';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
    id: string;
    role: 'user' | 'bot';
    text: string;
    timestamp: string;
    isThinking?: boolean;
};

type ChatPanelProps = {
    onClose: () => void;
    nodes: Node[];
    edges: Edge[];
};

export default function ChatPanel({ onClose, nodes, edges }: ChatPanelProps) {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'bot',
            text: "Hello! I'm your AI pipeline assistant. I can help you configure nodes, explain algorithms, or debug your workflow. How can I assist you today?",
            timestamp: 'Just now'
        }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isProcessing) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsProcessing(true);

        // Add thinking message
        const thinkingId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
            id: thinkingId,
            role: 'bot',
            text: "Analyzing your pipeline...",
            timestamp: 'Thinking...',
            isThinking: true
        }]);

        try {
            // Extract sample data from dataset node if available
            let sampleData = null;
            const datasetNode = nodes.find(n => n.type === 'dataset');
            if (datasetNode?.data?.preview) {
                sampleData = datasetNode.data.preview;
            }

            // Construct simplified workflow context to save tokens/complexity
            const workflowContext = {
                nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data, label: n.data.label })),
                edges: edges.map(e => ({ source: e.source, target: e.target }))
            };

            const response = await axios.post('http://localhost:8000/chat', {
                workflow: workflowContext,
                question: userMsg.text,
                sample_data: sampleData
            });

            // Remove thinking message and add real response
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== thinkingId);
                return [...filtered, {
                    id: (Date.now() + 2).toString(),
                    role: 'bot',
                    text: response.data.response,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }];
            });

        } catch (error: any) {
            console.error(error);
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== thinkingId);
                return [...filtered, {
                    id: (Date.now() + 3).toString(),
                    role: 'bot',
                    text: "Sorry, I encountered an error connecting to the AI service. Please check your backend connection.",
                    timestamp: 'Error'
                }];
            });
            toast.error("Failed to get AI response");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <aside className="w-full h-full bg-white flex flex-col shadow-lg z-10 relative border-l border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#4285F4]/10 rounded-lg border border-[#4285F4]/10">
                        <Bot size={18} className="text-[#4285F4]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-[#202124]">FlowML Assistant</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-[#34A853] rounded-full animate-pulse" />
                            <span className="text-[10px] text-gray-500 font-medium">Online</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-[#202124] hover:bg-gray-100 p-1.5 rounded-lg transition-all"
                    title="Close Chat"
                >
                    <PanelRightClose size={18} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-[#F1F3F4] flex items-center justify-center shrink-0 border border-gray-100">
                            {msg.role === 'bot' ? (
                                <Bot size={14} className="text-[#FBBC05]" />
                            ) : (
                                <User size={14} className="text-[#4285F4]" />
                            )}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className={`flex items-center gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'bot' ? (
                                    <>
                                        <span className="text-xs font-bold text-gray-700">FlowML Bot</span>
                                        <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                                        <span className="text-xs font-bold text-gray-700">You</span>
                                    </>
                                )}
                            </div>
                            <div className={`p-3 border rounded-2xl text-xs leading-relaxed shadow-sm ${msg.role === 'user'
                                ? 'bg-[#4285F4] border-[#4285F4] rounded-tr-none text-white'
                                : 'bg-[#F1F3F4] border-gray-100 rounded-tl-none text-[#202124]'
                                }`}>
                                {msg.isThinking ? (
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={12} className="text-[#FBBC05] animate-pulse" />
                                        <span>{msg.text}</span>
                                    </div>
                                ) : (
                                    <div className="markdown-content">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                                ul: ({ children }: any) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                                ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                                                li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
                                                h1: ({ children }: any) => <h1 className="text-sm font-bold mt-3 mb-2">{children}</h1>,
                                                h2: ({ children }: any) => <h2 className="text-sm font-bold mt-3 mb-2">{children}</h2>,
                                                h3: ({ children }: any) => <h3 className="text-xs font-bold mt-2 mb-1">{children}</h3>,
                                                code: ({ children }: any) => <code className={`font-mono text-[10px] px-1 py-0.5 rounded ${msg.role === 'user' ? 'bg-white/20' : 'bg-black/5'}`}>{children}</code>,
                                                pre: ({ children }: any) => <pre className={`p-2 rounded-lg overflow-x-auto text-[10px] font-mono mb-2 ${msg.role === 'user' ? 'bg-white/20' : 'bg-black/5'}`}>{children}</pre>,
                                                strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isProcessing ? "Waiting for response..." : "Ask anything about your pipeline..."}
                        disabled={isProcessing}
                        className="w-full bg-[#F1F3F4] border border-transparent rounded-xl py-3 pl-4 pr-12 text-xs text-[#202124] placeholder:text-gray-500 focus:outline-none focus:bg-white focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 transition-all shadow-inner disabled:opacity-50 disabled:cursor-wait"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isProcessing || !input.trim()}
                        className="absolute right-1.5 top-1.5 p-1.5 bg-[#4285F4] hover:bg-[#3367D6] text-white rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={14} />
                    </button>
                </div>
                <div className="text-[10px] text-gray-400 text-center mt-2">
                    AI can make mistakes. Verify important info.
                </div>
            </div>
        </aside>
    );
}
