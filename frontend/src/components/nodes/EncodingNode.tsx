import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Binary, X } from 'lucide-react';
import StepPreview from './StepPreview';

interface EncodingNodeProps {
    id: string;
    data: any;
}

function EncodingNode({ id, data }: EncodingNodeProps) {
    const strategy = data.strategy || 'onehot';

    const onChange = (value: string) => {
        data.onChange?.(id, { ...data, strategy: value });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-violet-200 min-w-[220px] overflow-hidden hover:shadow-xl transition-all duration-200">
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Binary size={16} className="text-white" />
                    <span className="text-white font-semibold text-sm">Encoding</span>
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
                        Encoding Strategy
                    </label>
                    <select
                        value={strategy}
                        onChange={(e) => onChange(e.target.value)}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        className="nodrag nopan w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
                    >
                        <option value="onehot">One-Hot Encoding</option>
                        <option value="label">Label Encoding</option>
                        <option value="target">Target Encoding</option>
                        <option value="frequency">Frequency Encoding</option>
                    </select>
                </div>

                <div className="text-xs text-slate-400 italic pt-1">
                    {strategy === 'onehot' && 'Creates binary columns for each category'}
                    {strategy === 'label' && 'Assigns integer labels to categories'}
                    {strategy === 'target' && 'Encodes using target variable mean'}
                    {strategy === 'frequency' && 'Encodes using category frequency'}
                </div>

                {data.stepPreview && <StepPreview stepPreview={data.stepPreview} accentColor="#8B5CF6" />}
            </div>

            <Handle type="target" position={Position.Left} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white" />
            <Handle type="source" position={Position.Right} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white" />
        </div>
    );
}

export default memo(EncodingNode);
