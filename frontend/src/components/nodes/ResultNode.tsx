import React from 'react';
import { Handle, Position } from 'reactflow';
import { BarChart3, Trash2 } from 'lucide-react';

export default function ResultNode({ data, id }: any) {
    return (
        <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 w-80 overflow-hidden transition-all hover:shadow-emerald-500/20 hover:border-emerald-500/50 group">
            {/* Custom Target Handle */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50">
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-900 !rounded-full after:absolute after:-inset-4 after:content-[''] after:bg-transparent"
                />
            </div>

            <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-500">
                        <BarChart3 size={14} />
                    </div>
                    <span className="font-semibold text-slate-200 text-sm">Evaluation Results</span>
                </div>
                <button
                    onClick={() => data.onDelete(id)}
                    className="text-slate-500 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-700/50"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="p-4 space-y-4">
                {data.accuracy ? (
                    <>
                        <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <span className="text-sm text-emerald-200">Accuracy</span>
                            <span className="text-lg font-bold text-emerald-400">{(data.accuracy * 100).toFixed(2)}%</span>
                        </div>

                        {data.report && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Classification Report</h4>
                                <pre className="text-[10px] font-mono bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 overflow-x-auto custom-scrollbar">
                                    {JSON.stringify(data.report, null, 2)}
                                </pre>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-6 text-slate-500 text-sm">
                        Run pipeline to see results
                    </div>
                )}
            </div>
        </div>
    );
}
