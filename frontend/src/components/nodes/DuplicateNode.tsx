import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Copy, X } from 'lucide-react';


interface DuplicateNodeProps {
    id: string;
    data: any;
}

function DuplicateNode({ id, data }: DuplicateNodeProps) {
    const strategy = data.duplicateHandling || 'first';

    const onChange = (value: string) => {
        data.onChange?.(id, { ...data, duplicateHandling: value });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-rose-200 min-w-[220px] overflow-hidden hover:shadow-xl transition-all duration-200">
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Copy size={16} className="text-white" />
                    <span className="text-white font-semibold text-sm">Duplicate Removal</span>
                </div>
                <button
                    onClick={() => data.onDelete?.(id)}
                    className="text-white/70 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="p-4 space-y-3">
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                        Strategy
                    </label>
                    <select
                        value={strategy}
                        onChange={(e) => onChange(e.target.value)}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        className="nodrag nopan w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                    >
                        <option value="first">Keep First Occurrence</option>
                        <option value="last">Keep Last Occurrence</option>
                        <option value="all">Remove All Duplicates</option>
                        <option value="none">None (Skip)</option>
                    </select>
                </div>

                <div className="text-xs text-slate-400 italic">
                    {strategy === 'all' && '⚠️ Removes all rows that have duplicates'}
                    {strategy === 'first' && 'Keeps first occurrence, removes rest'}
                    {strategy === 'last' && 'Keeps last occurrence, removes rest'}
                    {strategy === 'none' && 'No duplicate handling applied'}
                </div>


            </div>

            <Handle type="target" position={Position.Left} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white" />
            <Handle type="source" position={Position.Right} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white" />
        </div>
    );
}

export default memo(DuplicateNode);
