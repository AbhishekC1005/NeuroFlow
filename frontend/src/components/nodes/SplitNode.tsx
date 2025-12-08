import React from 'react';
import { Handle, Position } from 'reactflow';
import { Split, Trash2, Plus } from 'lucide-react';

export default function SplitNode({ data, id }: any) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        data.onChange(id, { ...data, testSize: parseFloat(e.target.value) });
    };

    return (
        <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 w-64 overflow-hidden transition-all hover:shadow-purple-500/20 hover:border-purple-500/50 group">
            {/* Custom Target Handle */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50">
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-3 !h-3 !bg-purple-500 !border-2 !border-slate-900 !rounded-full after:absolute after:-inset-4 after:content-[''] after:bg-transparent"
                />
            </div>

            <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 rounded-md text-purple-500">
                        <Split size={14} />
                    </div>
                    <span className="font-semibold text-slate-200 text-sm">Train-Test Split</span>
                </div>
                <button
                    onClick={() => data.onDelete(id)}
                    className="text-slate-500 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-700/50"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="p-4">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Test Size: {data.testSize || 0.2}</label>
                <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    defaultValue={data.testSize || 0.2}
                    onChange={handleChange}
                    className="nodrag w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>10%</span>
                    <span>90%</span>
                </div>
            </div>

            {/* Custom Source Handle */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50">
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-3 !h-3 !bg-purple-500 !border-2 !border-slate-900 !rounded-full cursor-crosshair after:absolute after:-inset-4 after:content-[''] after:bg-transparent"
                />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-purple-500 rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform pointer-events-none">
                    <Plus size={14} strokeWidth={3} />
                </div>
            </div>
        </div>
    );
}
