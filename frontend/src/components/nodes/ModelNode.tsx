import React from 'react';
import { Handle, Position } from 'reactflow';
import { BrainCircuit, Trash2, Plus } from 'lucide-react';

export default function ModelNode({ data, id, selected }: any) {
    const handleTargetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        data.onChange(id, { ...data, targetColumn: e.target.value });
    };

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        data.onChange(id, { ...data, modelType: e.target.value });
    };

    return (
        <div className={`bg-white rounded-xl shadow-lg border-2 border-[#EA4335] w-60 overflow-hidden transition-all group ${selected ? 'ring-2 ring-offset-2 ring-[#EA4335] shadow-[0_0_20px_rgba(234,67,53,0.4)]' : 'hover:shadow-[#EA4335]/20'}`}>
            {/* Custom Target Handle (Left) */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-8 h-8">
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-8 !h-8 !opacity-0 !rounded-full !bg-transparent z-10 cursor-crosshair"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3 h-3 bg-[#EA4335] border-2 border-white rounded-full transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 shadow-sm" />
                    <div className="absolute w-6 h-6 bg-[#EA4335] rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                        <Plus size={14} strokeWidth={3} />
                    </div>
                </div>
            </div>

            <div className="bg-[#EA4335] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-md text-white">
                        <BrainCircuit size={14} />
                    </div>
                    <span className="font-semibold text-white text-sm">Model Training</span>
                </div>
                <button
                    onClick={() => data.onDelete(id)}
                    className="text-white/70 hover:text-white transition-colors p-1 rounded hover:bg-white/20"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="p-4 space-y-3">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Target Column</label>
                    <div className="relative">
                        <select
                            className="w-full appearance-none bg-slate-50 border border-gray-200 text-slate-700 text-sm rounded-lg focus:ring-[#EA4335] focus:border-[#EA4335] block p-2.5 outline-none transition-colors"
                            onChange={handleTargetChange}
                            defaultValue={data.targetColumn || ''}
                        >
                            <option value="" disabled>Select Target</option>
                            {data.columns?.map((col: string) => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Algorithm</label>
                    <div className="relative">
                        <select
                            className="w-full appearance-none bg-slate-50 border border-gray-200 text-slate-700 text-sm rounded-lg focus:ring-[#EA4335] focus:border-[#EA4335] block p-2.5 outline-none transition-colors"
                            onChange={handleModelChange}
                            defaultValue={data.modelType || 'Logistic Regression'}
                        >
                            <option value="Logistic Regression">Logistic Regression (Classification)</option>
                            <option value="Decision Tree">Decision Tree (Classification)</option>
                            <option value="Random Forest">Random Forest (Classification)</option>
                            <option value="Linear Regression">Linear Regression (Regression)</option>
                            <option value="Random Forest Regressor">Random Forest Regressor (Regression)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
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
                    <div className="w-3 h-3 bg-[#EA4335] border-2 border-white rounded-full transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 shadow-sm" />
                    <div className="absolute w-6 h-6 bg-[#EA4335] rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                        <Plus size={14} strokeWidth={3} />
                    </div>
                </div>
            </div>
        </div>
    );
}
