import React, { useState } from 'react';
import {
    Database,
    Wand2,
    Split,
    BrainCircuit,
    BarChart3,
    Search,
    ChevronRight,
    Pipette,
    Binary,
    X
} from 'lucide-react';

export default function Sidebar({ onClose }: { onClose: () => void }) {
    const [searchTerm, setSearchTerm] = useState('');

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const nodes = [
        {
            type: 'dataset',
            label: 'Dataset',
            desc: 'Import CSV/Excel',
            icon: <Database size={20} />,
            color: '#4285F4',
        },
        {
            type: 'imputation',
            label: 'Imputer',
            desc: 'Handle missing values',
            icon: <Pipette size={20} />,
            color: '#F97316',
        },
        {
            type: 'encoding',
            label: 'Encoder',
            desc: 'Categorical encoding',
            icon: <Binary size={20} />,
            color: '#8B5CF6',
        },
        {
            type: 'split',
            label: 'Split Data',
            desc: 'Train/test split',
            icon: <Split size={20} />,
            color: '#d946ef',
        },
        {
            type: 'preprocessing',
            label: 'Scaler',
            desc: 'Normalize features',
            icon: <Wand2 size={20} />,
            color: '#FBBC05',
        },
        {
            type: 'model',
            label: 'Trainer',
            desc: 'Train ML model',
            icon: <BrainCircuit size={20} />,
            color: '#EA4335',
        },
        {
            type: 'result',
            label: 'Results',
            desc: 'View metrics',
            icon: <BarChart3 size={20} />,
            color: '#34A853',
        }
    ];

    const filteredNodes = nodes.filter(node =>
        node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <aside className="w-full h-full bg-white flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Components</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4285F4]/20 focus:border-[#4285F4] transition-all"
                    />
                </div>
            </div>

            {/* Tip */}
            <div className="mx-4 mt-4 px-4 py-2.5 bg-blue-50 rounded-xl">
                <p className="text-xs text-[#4285F4] font-medium text-center">
                    Drag components to the canvas →
                </p>
            </div>

            {/* Nodes List */}
            <div className="flex-1 overflow-y-auto sidebar-scrollbar p-4 space-y-2">
                {filteredNodes.length > 0 ? (
                    filteredNodes.map((node, idx) => (
                        <div
                            key={idx}
                            className="group flex items-center gap-4 p-3 rounded-xl bg-white border border-gray-100 cursor-grab active:cursor-grabbing transition-all duration-200 hover:border-gray-200 hover:shadow-md hover:shadow-gray-100"
                            onDragStart={(event) => onDragStart(event, node.type)}
                            draggable
                        >
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                                style={{ backgroundColor: `${node.color}15`, color: node.color }}
                            >
                                {node.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 group-hover:text-[#4285F4] transition-colors">
                                    {node.label}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                    {node.desc}
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Search size={24} className="mb-2 opacity-50" />
                        <p className="text-sm">No components found</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                    {nodes.length} components available
                </p>
            </div>
        </aside>
    );
}
