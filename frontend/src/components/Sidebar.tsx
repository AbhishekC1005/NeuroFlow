import React, { useState } from 'react';
import {
    Database,
    Wand2,
    Split,
    BrainCircuit,
    BarChart3,
    Search,
    LayoutGrid,
    Settings2,
    PanelLeftClose,
    Pipette,
    Binary
} from 'lucide-react';

export default function Sidebar({ onClose }: { onClose: () => void }) {
    const [searchTerm, setSearchTerm] = useState('');

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const categories = [
        {
            title: "Data Sources",
            items: [
                {
                    type: 'dataset',
                    label: 'Dataset',
                    desc: 'Import CSV/Excel',
                    icon: <Database size={18} />,
                    color: 'text-[#4285F4]',
                    bgColor: 'bg-[#4285F4]/10',
                    borderColor: 'group-hover:border-[#4285F4]',
                    shadowColor: 'group-hover:shadow-[0_4px_20px_rgba(66,133,244,0.15)]'
                }
            ]
        },
        {
            title: "Data Processing",
            items: [
                {
                    type: 'imputation',
                    label: 'Imputer',
                    desc: 'Handle Missing Values',
                    icon: <Pipette size={18} />,
                    color: 'text-[#F97316]',
                    bgColor: 'bg-[#F97316]/10',
                    borderColor: 'group-hover:border-[#F97316]',
                    shadowColor: 'group-hover:shadow-[0_4px_20px_rgba(249,115,22,0.15)]'
                },
                {
                    type: 'encoding',
                    label: 'Encoder',
                    desc: 'Categorical Encoding',
                    icon: <Binary size={18} />,
                    color: 'text-[#8B5CF6]',
                    bgColor: 'bg-[#8B5CF6]/10',
                    borderColor: 'group-hover:border-[#8B5CF6]',
                    shadowColor: 'group-hover:shadow-[0_4px_20px_rgba(139,92,246,0.15)]'
                },
                {
                    type: 'split',
                    label: 'Split Data',
                    desc: 'Train / Test Split',
                    icon: <Split size={18} />,
                    color: 'text-[#d946ef]',
                    bgColor: 'bg-[#d946ef]/10',
                    borderColor: 'group-hover:border-[#d946ef]',
                    shadowColor: 'group-hover:shadow-[0_4px_20px_rgba(217,70,239,0.15)]'
                },
                {
                    type: 'preprocessing',
                    label: 'Scaler',
                    desc: 'Normalize Features',
                    icon: <Wand2 size={18} />,
                    color: 'text-[#FBBC05]',
                    bgColor: 'bg-[#FBBC05]/10',
                    borderColor: 'group-hover:border-[#FBBC05]',
                    shadowColor: 'group-hover:shadow-[0_4px_20px_rgba(251,188,5,0.15)]'
                }
            ]
        },
        {
            title: "Modeling",
            items: [
                {
                    type: 'model',
                    label: 'Trainer',
                    desc: 'Train Classifier',
                    icon: <BrainCircuit size={18} />,
                    color: 'text-[#EA4335]',
                    bgColor: 'bg-[#EA4335]/10',
                    borderColor: 'group-hover:border-[#EA4335]',
                    shadowColor: 'group-hover:shadow-[0_4px_20px_rgba(234,67,53,0.15)]'
                }
            ]
        },
        {
            title: "Evaluation",
            items: [
                {
                    type: 'result',
                    label: 'Metrics',
                    desc: 'View Results',
                    icon: <BarChart3 size={18} />,
                    color: 'text-[#34A853]',
                    bgColor: 'bg-[#34A853]/10',
                    borderColor: 'group-hover:border-[#34A853]',
                    shadowColor: 'group-hover:shadow-[0_4px_20px_rgba(52,168,83,0.15)]'
                }
            ]
        }
    ];

    const filteredCategories = categories.map(category => ({
        ...category,
        items: category.items.filter(item =>
            item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.desc.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(category => category.items.length > 0);

    return (
        <aside className="w-72 h-full bg-white border-r border-gray-200 flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] relative overflow-hidden group/sidebar">

            {/* Header */}
            <div className="p-5 border-b border-gray-200 relative z-10 bg-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                            <LayoutGrid size={16} className="text-[#5f6368]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-[#202124] tracking-tight">Components</h2>
                            <p className="text-[10px] text-[#5f6368] font-medium">Build your pipeline</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[#5f6368] hover:text-[#202124] hover:bg-white p-1.5 rounded-lg transition-all"
                        title="Close Sidebar"
                    >
                        <PanelLeftClose size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4285F4] transition-colors" />
                    <input
                        type="text"
                        placeholder="Search nodes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-xs text-[#202124] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4285F4]/20 focus:border-[#4285F4] transition-all"
                    />
                </div>
            </div>

            {/* Scrollable Content - Grid Layout */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-5 relative z-10">
                {/* Drag & Drop Instruction */}
                <div className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[10px] font-medium text-blue-600">👆 Drag & Drop components to canvas</span>
                </div>

                {filteredCategories.length > 0 ? (
                    filteredCategories.map((category, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                                <h3 className="text-[10px] font-bold text-[#5f6368] uppercase tracking-widest">{category.title}</h3>
                                <div className="h-px bg-gray-100 flex-1" />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {category.items.map((item, i) => (
                                    <div
                                        key={i}
                                        className={`
                                            group relative flex flex-col items-center justify-center text-center p-2 h-20 rounded-xl border border-gray-200 bg-white
                                            cursor-grab active:cursor-grabbing transition-all duration-300 ease-out
                                            hover:border-transparent hover:scale-105 hover:shadow-lg
                                            ${item.borderColor} ${item.shadowColor}
                                        `}
                                        onDragStart={(event) => onDragStart(event, item.type)}
                                        draggable
                                    >
                                        <div className={`w-8 h-8 rounded-full ${item.bgColor} ${item.color} flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110 duration-300`}>
                                            {item.icon}
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-bold text-[#202124] group-hover:text-[#4285F4] transition-colors leading-tight">
                                                {item.label}
                                            </div>
                                            <div className="text-[9px] text-[#5f6368] leading-tight line-clamp-1 mt-0.5 scale-90">
                                                {item.desc}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <Search size={24} className="mb-2 opacity-50" />
                        <p className="text-xs">No components found</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-[#F8F9FA] relative z-10">
                <button className="w-full py-2 rounded-lg bg-white border border-gray-200 text-[10px] font-medium text-[#5f6368] hover:text-[#202124] hover:shadow-sm transition-all flex items-center justify-center gap-2">
                    <Settings2 size={12} />
                    <span>Project Settings</span>
                </button>
            </div>
        </aside>
    );
}
