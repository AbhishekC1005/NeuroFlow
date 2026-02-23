import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Pipette, X } from 'lucide-react';
import StepPreview from './StepPreview';

interface ImputationNodeProps {
    id: string;
    data: any;
}

function ImputationNode({ id, data }: ImputationNodeProps) {
    const strategy = data.strategy || 'mean';

    const onChange = (value: string) => {
        data.onChange?.(id, { ...data, strategy: value });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-200 min-w-[220px] overflow-hidden hover:shadow-xl transition-all duration-200">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Pipette size={16} className="text-white" />
                    <span className="text-white font-semibold text-sm">Missing Values</span>
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
                        Imputation Strategy
                    </label>
                    <select
                        value={strategy}
                        onChange={(e) => onChange(e.target.value)}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        className="nodrag nopan w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                    >
                        <option value="mean">Mean (Average)</option>
                        <option value="median">Median (Middle Value)</option>
                        <option value="most_frequent">Most Frequent (Mode)</option>
                        <option value="constant">Zero (Constant 0)</option>
                        <option value="drop">Drop Rows</option>
                    </select>
                </div>

                <div className="text-xs text-slate-400 italic pt-1">
                    {strategy === 'mean' && 'Fills gaps with column average'}
                    {strategy === 'median' && 'Fills gaps with middle value'}
                    {strategy === 'most_frequent' && 'Fills gaps with most common value'}
                    {strategy === 'constant' && 'Fills all missing values with 0'}
                    {strategy === 'drop' && 'Removes rows with any missing values'}
                </div>

                {data.stepPreview && <StepPreview stepPreview={data.stepPreview} accentColor="#F97316" />}
            </div>

            <Handle type="target" position={Position.Left} className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white" />
            <Handle type="source" position={Position.Right} className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white" />
        </div>
    );
}

export default memo(ImputationNode);
