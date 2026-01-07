
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Split, Trash2, Plus } from 'lucide-react';

export default function SplitNode({ data, id, selected }: any) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        data.onChange(id, { ...data, testSize: parseFloat(e.target.value) });
    };

    return (
        <div className={`bg-white rounded-xl shadow-lg border-2 border-[#d946ef] w-72 overflow-hidden transition-all group ${selected ? 'ring-2 ring-offset-2 ring-[#d946ef] shadow-[0_0_20px_rgba(217,70,239,0.4)]' : 'hover:shadow-[#d946ef]/20'}`}>
            {/* Custom Target Handle (Left) */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-8 h-8">
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-8 !h-8 !opacity-0 !rounded-full !bg-transparent z-10 cursor-crosshair"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3 h-3 bg-[#d946ef] border-2 border-white rounded-full transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 shadow-sm" />
                    <div className="absolute w-6 h-6 bg-[#d946ef] rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                        <Plus size={14} strokeWidth={3} />
                    </div>
                </div>
            </div>

            <div className="bg-[#d946ef] px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg text-white">
                        <Split size={18} />
                    </div>
                    <span className="font-semibold text-white text-lg">Train-Test Split</span>
                </div>
                <button
                    onClick={() => data.onDelete(id)}
                    className="text-white/70 hover:text-white transition-colors p-1.5 rounded hover:bg-white/20"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <div className="p-5">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-base font-medium text-slate-500 uppercase tracking-wide">Split Ratio</label>
                    <span className="text-base font-bold text-[#d946ef]">{Math.round((data.testSize || 0.2) * 100)}% Test</span>
                </div>

                <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.01"
                    value={data.testSize || 0.2}
                    onChange={handleChange}
                    style={{
                        background: `linear-gradient(to right, #d946ef 0%, #d946ef ${(data.testSize || 0.2) * 100}%, #e2e8f0 ${(data.testSize || 0.2) * 100}%, #e2e8f0 100%)`
                    }}
                    className="nodrag w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#d946ef] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                />

                <div className="flex justify-between text-sm text-slate-400 mt-3 font-medium">
                    <span>Train: {100 - Math.round((data.testSize || 0.2) * 100)}%</span>
                    <span>Test: {Math.round((data.testSize || 0.2) * 100)}%</span>
                </div>
            </div>

            {/* Custom Source Handle (Right) */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50 flex items-center justify-center w-8 h-8">
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-8 !h-8 !opacity-0 !rounded-full !bg-transparent z-10 cursor-crosshair"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3 h-3 bg-[#d946ef] border-2 border-white rounded-full transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 shadow-sm" />
                    <div className="absolute w-6 h-6 bg-[#d946ef] rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                        <Plus size={14} strokeWidth={3} />
                    </div>
                </div>
            </div>
        </div>
    );
}
