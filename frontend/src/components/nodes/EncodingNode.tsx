import React from 'react';
import { Handle, Position } from 'reactflow';
import { Binary, Trash2, Plus } from 'lucide-react';

export default function EncodingNode({ data, id, selected }: any) {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        data.onChange(id, { ...data, strategy: e.target.value });
    };

    return (
        <div className={`bg-white rounded-xl shadow-lg border-2 border-[#8B5CF6] w-64 overflow-hidden transition-all group ${selected ? 'ring-2 ring-offset-2 ring-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.4)]' : 'hover:shadow-[#8B5CF6]/20'}`}>
            {/* Custom Target Handle (Left) */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-8 h-8">
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-8 !h-8 !opacity-0 !rounded-full !bg-transparent z-10 cursor-crosshair"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3 h-3 bg-[#8B5CF6] border-2 border-white rounded-full transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 shadow-sm" />
                    <div className="absolute w-6 h-6 bg-[#8B5CF6] rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                        <Plus size={14} strokeWidth={3} />
                    </div>
                </div>
            </div>

            <div className="bg-[#8B5CF6] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-md text-white">
                        <Binary size={14} />
                    </div>
                    <span className="font-semibold text-white text-sm">Categorical Encoding</span>
                </div>
                <button
                    onClick={() => data.onDelete(id)}
                    className="text-white/70 hover:text-white transition-colors p-1 rounded hover:bg-white/20"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="p-4">
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Encoding Strategy</label>
                <div className="relative group/select">
                    <select
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-[#8B5CF6] focus:border-[#8B5CF6] block p-2.5 appearance-none cursor-pointer transition-all hover:border-[#8B5CF6]"
                        value={data.strategy || 'onehot'}
                        onChange={handleChange}
                    >
                        <option value="onehot">One-Hot Encoding</option>
                        <option value="label">Label Encoding</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 group-hover/select:text-[#8B5CF6] transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
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
                    <div className="w-3 h-3 bg-[#8B5CF6] border-2 border-white rounded-full transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 shadow-sm" />
                    <div className="absolute w-6 h-6 bg-[#8B5CF6] rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                        <Plus size={14} strokeWidth={3} />
                    </div>
                </div>
            </div>
        </div>
    );
}
