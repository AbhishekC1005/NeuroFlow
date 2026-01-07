
import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import {
    BarChart3, Trash2, Plus, X, Maximize2
} from 'lucide-react';
import ResultDashboard from '../ResultDashboard';
import { createPortal } from 'react-dom';

export default function ResultNode({ data, id, selected }: any) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            {/* 
        Increased width to w-[500px] as requested.
        Added max-h-[600px] for better vertical scrolling space within the node.
      */}
            <div className={`bg-white rounded-xl shadow-lg border-2 border-[#34A853] w-[420px] flex flex-col overflow-hidden transition-all duration-300 group ${selected
                ? 'ring-2 ring-offset-2 ring-[#34A853] shadow-[0_0_20px_rgba(52,168,83,0.4)]'
                : 'hover:shadow-[#34A853]/20'
                }`}>
                {/* Target Handle */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-8 h-8">
                    <Handle
                        type="target"
                        position={Position.Left}
                        className="!w-8 !h-8 !opacity-0 !bg-transparent z-10 cursor-pointer"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-3 h-3 bg-[#34A853] border-2 border-white rounded-full transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 shadow-sm" />
                        <div className="absolute w-6 h-6 bg-[#34A853] rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                            <Plus size={14} strokeWidth={3} />
                        </div>
                    </div>
                </div>

                {/* Header */}
                <div className="bg-[#34A853] px-5 py-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg text-white backdrop-blur-sm">
                            <BarChart3 size={20} />
                        </div>
                        <span className="font-bold text-white text-lg tracking-wide">Evaluation Results</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                            className="group/btn relative text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                            title="Expand to Fullscreen"
                        >
                            <Maximize2 size={18} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
                            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                            title="Delete Node"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Node Content (Scrollable) 
            - Added h-[500px] constraint to ensure it doesn't grow indefinitely 
            - Custom scrollbar for better aesthetics
        */}
                <div className="p-0 bg-slate-50/50 flex-1 max-h-[500px] overflow-y-auto custom-scrollbar">
                    <div className="p-5">
                        <ResultDashboard data={data} viewMode="compact" />
                    </div>
                </div>
            </div>

            {/* Fullscreen Modal Portal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-[90vw] h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                        {/* Modal Header */}
                        <div className="bg-[#34A853] px-8 py-5 flex items-center justify-between shrink-0 shadow-md z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white/20 rounded-xl text-white backdrop-blur-md">
                                    <BarChart3 size={24} />
                                </div>
                                <div>
                                    <h2 className="font-black text-white text-3xl tracking-tight">Evaluation Report</h2>
                                    <p className="text-green-100 font-medium text-base text-opacity-90">Detailed performance metrics & visualization</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        {/* Modal Content - Passing viewMode="expanded" */}
                        <div className="px-8 py-10 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
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
