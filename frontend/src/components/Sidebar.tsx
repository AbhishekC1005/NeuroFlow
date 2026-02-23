import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Database,
    Wand2,
    Split,
    BrainCircuit,
    BarChart3,
    Search,
    Pipette,
    Binary,
    X,
    AlertTriangle,
    Filter,
    Copy,
    Repeat,
    Minimize2,
    Wrench,
    Scale,
    GripVertical,
    ChevronDown,
    ChevronRight,
    Sparkles
} from 'lucide-react';

interface NodeItem {
    type: string;
    label: string;
    desc: string;
    tooltip: string;
    icon: React.ReactNode;
    color: string;
    gradient: string;
}

interface NodeCategory {
    id: string;
    title: string;
    subtitle: string;
    emoji: string;
    nodes: NodeItem[];
}

const categories: NodeCategory[] = [
    {
        id: 'input',
        title: 'Data Input',
        subtitle: 'Start here',
        emoji: '①',
        nodes: [
            {
                type: 'dataset',
                label: 'Dataset',
                desc: 'Upload CSV or Excel file',
                tooltip: 'Load your data from CSV or Excel files. This is always the first step in your pipeline.',
                icon: <Database size={16} />,
                color: '#4285F4',
                gradient: 'from-blue-500 to-indigo-500',
            },
        ]
    },
    {
        id: 'cleaning',
        title: 'Data Cleaning',
        subtitle: 'Fix data issues',
        emoji: '②',
        nodes: [
            {
                type: 'duplicate',
                label: 'Remove Duplicates',
                desc: 'Drop duplicate rows',
                tooltip: 'Remove duplicate rows from your dataset. Choose to keep first, last, or remove all duplicates.',
                icon: <Copy size={16} />,
                color: '#f43f5e',
                gradient: 'from-rose-500 to-pink-500',
            },
            {
                type: 'imputation',
                label: 'Handle Missing',
                desc: 'Fill or drop empty values',
                tooltip: 'Fill missing values using mean, median, mode, or constant. Or drop rows with missing data.',
                icon: <Pipette size={16} />,
                color: '#F97316',
                gradient: 'from-orange-500 to-amber-500',
            },
            {
                type: 'outlier',
                label: 'Outlier Handler',
                desc: 'Detect & fix extreme values',
                tooltip: 'Detect outliers using IQR or Z-Score methods. Clip to bounds or remove extreme values.',
                icon: <AlertTriangle size={16} />,
                color: '#f59e0b',
                gradient: 'from-amber-500 to-yellow-500',
            },
        ]
    },
    {
        id: 'features',
        title: 'Feature Processing',
        subtitle: 'Transform & select',
        emoji: '③',
        nodes: [
            {
                type: 'encoding',
                label: 'Encode Categories',
                desc: 'Convert text → numbers',
                tooltip: 'Convert categorical text data into numbers using One-Hot, Label, Target, or Frequency encoding.',
                icon: <Binary size={16} />,
                color: '#8B5CF6',
                gradient: 'from-violet-500 to-purple-500',
            },
            {
                type: 'preprocessing',
                label: 'Scale Features',
                desc: 'Normalize numeric range',
                tooltip: 'Standardize or normalize numerical features using Standard, MinMax, Robust, or Normalizer.',
                icon: <Wand2 size={16} />,
                color: '#FBBC05',
                gradient: 'from-yellow-500 to-amber-500',
            },
            {
                type: 'featureSelection',
                label: 'Select Features',
                desc: 'Keep only useful columns',
                tooltip: 'Remove low-variance or highly correlated features to simplify your model.',
                icon: <Filter size={16} />,
                color: '#14b8a6',
                gradient: 'from-teal-500 to-emerald-500',
            },
            {
                type: 'featureEngineering',
                label: 'Engineer Features',
                desc: 'Create new features',
                tooltip: 'Create new features using polynomial, log, or sqrt transformations.',
                icon: <Wrench size={16} />,
                color: '#84cc16',
                gradient: 'from-lime-500 to-green-500',
            },
            {
                type: 'pca',
                label: 'PCA',
                desc: 'Reduce dimensions',
                tooltip: 'Reduce feature dimensions using Principal Component Analysis. Set number of components.',
                icon: <Minimize2 size={16} />,
                color: '#0ea5e9',
                gradient: 'from-sky-500 to-cyan-500',
            },
        ]
    },
    {
        id: 'modeling',
        title: 'Modeling',
        subtitle: 'Train & validate',
        emoji: '④',
        nodes: [
            {
                type: 'split',
                label: 'Split Data',
                desc: 'Train / test division',
                tooltip: 'Divide data into training and testing sets. Supports stratified splitting and custom ratios.',
                icon: <Split size={16} />,
                color: '#d946ef',
                gradient: 'from-fuchsia-500 to-pink-500',
            },
            {
                type: 'classBalancing',
                label: 'Balance Classes',
                desc: 'Fix imbalanced data',
                tooltip: 'Handle imbalanced classes using SMOTE, oversampling, undersampling, or class weights.',
                icon: <Scale size={16} />,
                color: '#a855f7',
                gradient: 'from-purple-500 to-violet-500',
            },
            {
                type: 'model',
                label: 'Train Model',
                desc: '18 ML algorithms',
                tooltip: 'Train ML models: Random Forest, SVM, KNN, XGBoost, MLP, Ridge, Lasso, and more.',
                icon: <BrainCircuit size={16} />,
                color: '#EA4335',
                gradient: 'from-red-500 to-rose-500',
            },
            {
                type: 'crossValidation',
                label: 'Cross-Validate',
                desc: 'K-fold evaluation',
                tooltip: 'Evaluate model across K data folds for more reliable and unbiased performance scores.',
                icon: <Repeat size={16} />,
                color: '#6366f1',
                gradient: 'from-indigo-500 to-blue-500',
            },
        ]
    },
    {
        id: 'evaluation',
        title: 'Evaluation',
        subtitle: 'See results',
        emoji: '⑤',
        nodes: [
            {
                type: 'result',
                label: 'Results',
                desc: 'Accuracy, F1, confusion matrix',
                tooltip: 'View model performance: Accuracy, F1-Score, Confusion Matrix, feature importance, and overfitting detection.',
                icon: <BarChart3 size={16} />,
                color: '#34A853',
                gradient: 'from-emerald-500 to-teal-500',
            },
        ]
    }
];

export default function Sidebar({ onClose, onAddNode }: { onClose: () => void; onAddNode?: (type: string) => void }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [hoveredNode, setHoveredNode] = useState<{ desc: string; x: number; y: number } | null>(null);

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const toggleCategory = (id: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Flat list for searching
    const allNodes = categories.flatMap(c => c.nodes);

    const filteredNodes = searchTerm
        ? allNodes.filter(node =>
            node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            node.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
            node.tooltip.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : null; // null = show categories

    return (
        <aside className="w-full h-full bg-white flex flex-col">
            {/* Header */}
            <div className="p-4 pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-blue-500" />
                        <h2 className="text-base font-semibold text-gray-900">Pipeline Nodes</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search nodes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                </div>
            </div>

            {/* Tip Banner */}
            <div className="mx-3 mt-3 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1.5">
                    <GripVertical size={12} className="opacity-60" />
                    Drag nodes onto the canvas or click to add
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto sidebar-scrollbar px-3 py-2">
                {filteredNodes ? (
                    /* Search results — flat list */
                    <div className="space-y-1.5 py-1">
                        {filteredNodes.length > 0 ? (
                            filteredNodes.map((node) => (
                                <NodeCard
                                    key={node.type}
                                    node={node}
                                    onDragStart={onDragStart}
                                    onAddNode={onAddNode}
                                    setHoveredNode={setHoveredNode}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                <Search size={20} className="mb-2 opacity-50" />
                                <p className="text-xs">No nodes match "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Categorized view */
                    <div className="space-y-1 py-1">
                        {categories.map((category) => {
                            const isCollapsed = collapsedCategories.has(category.id);
                            return (
                                <div key={category.id}>
                                    {/* Category Header */}
                                    <button
                                        onClick={() => toggleCategory(category.id)}
                                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                                    >
                                        <span className="text-sm font-bold text-blue-500 w-5 text-center">{category.emoji}</span>
                                        <div className="flex-1 text-left">
                                            <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">{category.title}</span>
                                            <span className="text-[10px] text-gray-400 ml-1.5 font-medium">— {category.subtitle}</span>
                                        </div>
                                        {isCollapsed
                                            ? <ChevronRight size={14} className="text-gray-300" />
                                            : <ChevronDown size={14} className="text-gray-300" />
                                        }
                                    </button>

                                    {/* Category Nodes */}
                                    {!isCollapsed && (
                                        <div className="ml-2 pl-4 border-l-2 border-gray-100 space-y-1 pb-2">
                                            {category.nodes.map((node) => (
                                                <NodeCard
                                                    key={node.type}
                                                    node={node}
                                                    onDragStart={onDragStart}
                                                    onAddNode={onAddNode}
                                                    setHoveredNode={setHoveredNode}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                <p className="text-[10px] text-gray-400 text-center font-medium">
                    {allNodes.length} nodes across {categories.length} stages
                </p>
            </div>

            {/* Tooltip Portal */}
            {hoveredNode && createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        left: hoveredNode.x,
                        top: hoveredNode.y,
                        transform: 'translateY(-50%)'
                    }}
                >
                    <div className="bg-gray-900 text-white text-[11px] leading-relaxed px-3 py-2 rounded-lg shadow-xl max-w-[220px] relative">
                        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        {hoveredNode.desc}
                    </div>
                </div>,
                document.body
            )}
        </aside>
    );
}

/* ── Node Card Component ──────────────────────────── */
function NodeCard({
    node,
    onDragStart,
    onAddNode,
    setHoveredNode,
}: {
    node: NodeItem;
    onDragStart: (e: React.DragEvent, type: string) => void;
    onAddNode?: (type: string) => void;
    setHoveredNode: (v: { desc: string; x: number; y: number } | null) => void;
}) {
    return (
        <div
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-100 cursor-grab active:cursor-grabbing transition-all duration-150 hover:shadow-md hover:border-gray-200"
            onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredNode({
                    desc: node.tooltip,
                    x: rect.right + 10,
                    y: rect.top + rect.height / 2,
                });
            }}
            onMouseLeave={() => setHoveredNode(null)}
            onDragStart={(e) => onDragStart(e, node.type)}
            onClick={() => onAddNode?.(node.type)}
            draggable
        >
            {/* Color dot + icon */}
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${node.color}15`, color: node.color }}
            >
                {node.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-gray-800 leading-tight group-hover:text-gray-900 transition-colors">
                    {node.label}
                </div>
                <div className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">
                    {node.desc}
                </div>
            </div>

            {/* Drag indicator */}
            <GripVertical size={12} className="text-gray-200 group-hover:text-gray-400 transition-colors shrink-0" />
        </div>
    );
}