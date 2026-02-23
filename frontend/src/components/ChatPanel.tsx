import React, { useState, useRef, useEffect } from 'react';
import { User, PanelRightClose, Zap, MessageSquare, ArrowUp, Plus, RefreshCw } from 'lucide-react';
import type { Node, Edge } from 'reactflow';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type PipelineCommand = {
    type: string;
    data: {
        nodes: Node[];
        edges: Edge[];
    };
};

type Message = {
    id: string;
    role: 'user' | 'bot';
    text: string;
    timestamp: string;
    isThinking?: boolean;
    isStreaming?: boolean;
    command?: PipelineCommand | null;
    actionTaken?: boolean;
};

type ChatPanelProps = {
    onClose: () => void;
    nodes: Node[];
    edges: Edge[];
    onPipelineCreate?: (nodes: Node[], edges: Edge[]) => void;
    onPipelineReplace?: (nodes: Node[], edges: Edge[]) => void;
};

const suggestions = [
    "Explain my pipeline",
    "Suggest improvements",
    "What model should I use?",
    "Debug my workflow",
];

export default function ChatPanel({ onClose, nodes, edges, onPipelineCreate, onPipelineReplace }: ChatPanelProps) {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [input]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (text?: string) => {
        const msgText = text || input.trim();
        if (!msgText || isProcessing) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: msgText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsProcessing(true);

        const botMsgId = (Date.now() + 1).toString();

        // Add thinking message
        setMessages(prev => [...prev, {
            id: botMsgId,
            role: 'bot',
            text: '',
            timestamp: '',
            isThinking: true
        }]);

        try {
            let sampleData = null;
            const datasetNode = nodes.find(n => n.type === 'dataset');
            if (datasetNode?.data?.preview) {
                sampleData = datasetNode.data.preview;
            }

            const workflowContext = {
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.type,
                    data: {
                        label: n.data.label,
                        targetColumn: n.data.targetColumn,
                        modelType: n.data.modelType,
                        scaler: n.data.scaler,
                        strategy: n.data.strategy,
                        testSize: n.data.testSize
                    }
                })),
                edges: edges.map(e => ({ source: e.source, target: e.target }))
            };

            const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const token = localStorage.getItem('token');

            const response = await fetch(`${BASE_URL}/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    workflow: workflowContext,
                    question: msgText,
                    sample_data: sampleData
                })
            });

            if (!response.ok) throw new Error('Stream request failed');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');

            const decoder = new TextDecoder();
            let buffer = '';
            let streamedText = '';
            let finalCommand: PipelineCommand | null = null;

            // Switch from thinking to streaming
            setMessages(prev => prev.map(m =>
                m.id === botMsgId
                    ? { ...m, isThinking: false, isStreaming: true, text: '' }
                    : m
            ));

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);

                        if (event.type === 'chunk') {
                            streamedText += event.content;
                        } else if (event.type === 'done') {
                            // Use the clean parsed response text
                            streamedText = event.response || streamedText;
                            finalCommand = event.command || null;
                        } else if (event.type === 'error') {
                            streamedText = `Error: ${event.content}`;
                        }
                    } catch {
                        // skip malformed lines
                    }
                }

                // Update the bot message with streamed text so far
                // We try to extract just the "response" field as it streams in
                const displayText = extractResponseText(streamedText);
                setMessages(prev => prev.map(m =>
                    m.id === botMsgId
                        ? { ...m, text: displayText }
                        : m
                ));
            }

            // Finalize message
            const finalDisplay = extractResponseText(streamedText);
            const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            setMessages(prev => prev.map(m =>
                m.id === botMsgId
                    ? {
                        ...m,
                        text: finalDisplay,
                        timestamp: ts,
                        isStreaming: false,
                        command: finalCommand,
                        actionTaken: false
                    }
                    : m
            ));

        } catch (error: any) {
            console.error(error);
            setMessages(prev => prev.map(m =>
                m.id === botMsgId
                    ? {
                        ...m,
                        isThinking: false,
                        isStreaming: false,
                        text: "I couldn't process that request. Please check your backend connection and try again.",
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                    : m
            ));
            toast.error("Failed to get response from Flow");
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * While streaming, the raw text is the full JSON being built character-by-character.
     * We try to extract just the "response" value from the partial JSON.
     */
    const extractResponseText = (raw: string): string => {
        // Try to find the response field in partial JSON
        const match = raw.match(/"response"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"command"|"\s*})/);
        if (match) {
            return match[1]
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
        }
        // If we can't parse, just show raw but trim JSON artifacts
        return raw.replace(/^\s*\{\s*"response"\s*:\s*"?/, '').replace(/"\s*,?\s*"command"[\s\S]*$/, '');
    };

    const handleAction = (msgId: string, action: 'replace' | 'add') => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg?.command?.data) return;

        const { nodes: cmdNodes, edges: cmdEdges } = msg.command.data;

        if (action === 'replace' && onPipelineReplace) {
            onPipelineReplace(cmdNodes, cmdEdges);
        } else if (action === 'add' && onPipelineCreate) {
            onPipelineCreate(cmdNodes, cmdEdges);
        }

        // Mark action as taken so buttons disappear
        setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, actionTaken: true } : m
        ));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const isEmpty = messages.length === 0;

    return (
        <aside className="w-full h-full bg-white flex flex-col z-10 relative border-l border-gray-100">
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between shrink-0 bg-gradient-to-r from-[#F8F9FA] to-white border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#1a73e8] flex items-center justify-center shadow-lg shadow-blue-200/50">
                            <Zap size={18} className="text-white" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#34A853] rounded-full border-2 border-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-[#202124] tracking-tight">Flow</h2>
                        <p className="text-[11px] text-[#5f6368] font-medium">AI Pipeline Assistant</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-[#5f6368] hover:text-[#202124] hover:bg-[#F1F3F4] rounded-xl transition-all"
                    title="Close"
                >
                    <PanelRightClose size={18} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto sidebar-scrollbar">
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4285F4] to-[#1a73e8] flex items-center justify-center mb-5 shadow-xl shadow-blue-200/40">
                            <Zap size={28} className="text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-[#202124] mb-1">Hey, I'm Flow</h3>
                        <p className="text-sm text-[#5f6368] text-center mb-6 max-w-[260px]">
                            Your AI assistant for building, debugging, and optimizing ML pipelines.
                        </p>
                        <div className="w-full space-y-2">
                            <p className="text-[10px] font-semibold text-[#80868B] uppercase tracking-widest mb-2 text-center">Try asking</p>
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleSend(s)}
                                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#3c4043] hover:border-[#4285F4]/40 hover:bg-[#4285F4]/5 hover:text-[#1a73e8] transition-all duration-200 group flex items-center gap-3"
                                >
                                    <MessageSquare size={14} className="text-gray-300 group-hover:text-[#4285F4] transition-colors shrink-0" />
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 space-y-5">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                {/* Avatar */}
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'bot'
                                    ? 'bg-gradient-to-br from-[#4285F4] to-[#1a73e8] shadow-md shadow-blue-200/30'
                                    : 'bg-[#E8F0FE]'
                                    }`}>
                                    {msg.role === 'bot' ? (
                                        <Zap size={13} className="text-white" />
                                    ) : (
                                        <User size={13} className="text-[#4285F4]" />
                                    )}
                                </div>
                                {/* Bubble */}
                                <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                                    <div className={`inline-block max-w-full px-3.5 py-2.5 text-[13px] leading-relaxed ${msg.role === 'user'
                                        ? 'bg-[#4285F4] text-white rounded-2xl rounded-tr-md shadow-md shadow-blue-200/30'
                                        : msg.isThinking
                                            ? 'bg-[#F1F3F4] text-[#5f6368] rounded-2xl rounded-tl-md'
                                            : 'bg-[#F1F3F4] text-[#202124] rounded-2xl rounded-tl-md'
                                        }`}>
                                        {msg.isThinking ? (
                                            <div className="flex items-center gap-2 py-0.5">
                                                <div className="flex gap-1">
                                                    <span className="w-1.5 h-1.5 bg-[#4285F4] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-[#34A853] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-[#FBBC05] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                                <span className="text-xs text-[#80868B]">Flow is thinking...</span>
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
                                                        code: ({ children }: any) => (
                                                            <code className={`font-mono text-[11px] px-1 py-0.5 rounded ${msg.role === 'user' ? 'bg-white/20' : 'bg-white border border-gray-200 text-[#1a73e8]'
                                                                }`}>
                                                                {children}
                                                            </code>
                                                        ),
                                                        pre: ({ children }: any) => (
                                                            <pre className={`p-3 rounded-lg overflow-x-auto text-[11px] font-mono mb-2 ${msg.role === 'user' ? 'bg-white/15' : 'bg-white border border-gray-200'
                                                                }`}>
                                                                {children}
                                                            </pre>
                                                        ),
                                                        strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
                                                    }}
                                                >
                                                    {msg.text}
                                                </ReactMarkdown>
                                                {/* Streaming cursor */}
                                                {msg.isStreaming && (
                                                    <span className="inline-block w-1.5 h-4 bg-[#4285F4] rounded-sm animate-pulse ml-0.5 align-middle" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Pipeline Action Buttons */}
                                    {msg.role === 'bot' && msg.command && !msg.actionTaken && !msg.isStreaming && (
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => handleAction(msg.id, 'replace')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#4285F4]/30 text-[#4285F4] rounded-lg hover:bg-[#4285F4] hover:text-white transition-all duration-200 shadow-sm"
                                            >
                                                <RefreshCw size={12} />
                                                Update Existing
                                            </button>
                                            <button
                                                onClick={() => handleAction(msg.id, 'add')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#34A853]/30 text-[#34A853] rounded-lg hover:bg-[#34A853] hover:text-white transition-all duration-200 shadow-sm"
                                            >
                                                <Plus size={12} />
                                                Add New Pipeline
                                            </button>
                                        </div>
                                    )}

                                    {/* Action taken confirmation */}
                                    {msg.role === 'bot' && msg.command && msg.actionTaken && (
                                        <p className="text-[10px] text-[#34A853] mt-1.5 px-1 font-medium">✓ Applied to canvas</p>
                                    )}

                                    {!msg.isThinking && !msg.isStreaming && !msg.command && (
                                        <span className="text-[10px] text-[#80868B] mt-1 px-1">{msg.timestamp}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 shrink-0 bg-white border-t border-gray-100">
                <div className="relative bg-[#F1F3F4] rounded-2xl border border-gray-200 focus-within:border-[#4285F4] focus-within:ring-2 focus-within:ring-[#4285F4]/15 focus-within:bg-white transition-all duration-200">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isProcessing ? "Flow is thinking..." : "Ask Flow anything..."}
                        disabled={isProcessing}
                        rows={1}
                        className="w-full bg-transparent py-3 pl-4 pr-11 text-sm text-[#202124] placeholder:text-[#80868B] focus:outline-none disabled:opacity-50 disabled:cursor-wait resize-none overflow-y-auto max-h-[200px]"
                        style={{ minHeight: '44px' }}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={isProcessing || !input.trim()}
                        className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center bg-[#4285F4] hover:bg-[#1a73e8] text-white rounded-lg transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        <ArrowUp size={14} strokeWidth={2.5} />
                    </button>
                </div>
                <p className="text-[10px] text-[#80868B] text-center mt-2">
                    Flow can make mistakes · Verify important info
                </p>
            </div>
        </aside>
    );
}
