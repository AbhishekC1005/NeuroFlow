import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { BarChart3, X, Maximize2, Play } from 'lucide-react';
import ResultDashboard from '../ResultDashboard';
import { createPortal } from 'react-dom';

interface ResultNodeProps {
    id: string;
    data: any;
    selected?: boolean;
}

function ResultNode({ data, id }: ResultNodeProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const hasResults = data.accuracy !== undefined || data.r2_score !== undefined;
    const colorScore = data.is_regression
        ? (data.r2_score ?? 0) * 100
        : (data.accuracy ?? 0) * 100;

    const getStatusColor = () => {
        if (colorScore >= 90) return 'text-emerald-500';
        if (colorScore >= 75) return 'text-blue-500';
        if (colorScore >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <>
            <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-200 min-w-[260px] overflow-hidden hover:shadow-xl transition-all duration-200">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 size={16} className="text-white" />
                        <div>
                            <span className="text-white font-semibold text-sm block">Evaluation</span>
                            <span className="text-emerald-100 text-[10px] font-medium uppercase tracking-wider">
                                {data.model_type || 'Model Performance'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onDelete?.(id); }}
                        className="text-white/70 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Score Display */}
                {hasResults ? (
                    <div className="p-6 flex flex-col items-center justify-center space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {data.is_regression ? 'R² Score' : 'Accuracy'}
                        </span>
                        <div className="flex items-baseline gap-1">
                            {data.is_regression ? (
                                <span className={`text-5xl font-black ${getStatusColor()} tracking-tighter`}>
                                    {(data.r2_score ?? 0).toFixed(3)}
                                </span>
                            ) : (
                                <>
                                    <span className={`text-5xl font-black ${getStatusColor()} tracking-tighter`}>
                                        {((data.accuracy ?? 0) * 100).toFixed(1)}
                                    </span>
                                    <span className="text-xl font-bold text-slate-300">%</span>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-6 flex flex-col items-center justify-center space-y-2 text-slate-400">
                        <Play size={24} className="opacity-30" />
                        <span className="text-xs font-medium text-center text-slate-400">Run pipeline to see results</span>
                    </div>
                )}

                {/* Full Report Button */}
                {hasResults && (
                    <div className="px-4 pb-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                            className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-all shadow-lg active:scale-95"
                        >
                            <Maximize2 size={12} />
                            Full Report
                        </button>
                    </div>
                )}

                <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white" />
            </div>

            {/* Fullscreen Modal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-[90vw] h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                        {/* Modal Header */}
                        <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between shrink-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <BarChart3 size={24} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 text-2xl tracking-tight">Evaluation Report</h2>
                                    <p className="text-slate-500 font-medium text-sm">Detailed performance metrics & visualization</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 hover:bg-slate-50 p-2 rounded-full transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="px-8 py-10 overflow-y-auto bg-slate-50/50 flex-1 custom-scrollbar">
                            <div className="max-w-6xl mx-auto h-full">
                                <ResultDashboard data={data} className="scale-100" viewMode="expanded" />
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default memo(ResultNode);
