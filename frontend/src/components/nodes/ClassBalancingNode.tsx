import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Scale, X } from 'lucide-react';
import StepPreview from './StepPreview';

interface ClassBalancingNodeProps {
    id: string;
    data: any;
}

function ClassBalancingNode({ id, data }: ClassBalancingNodeProps) {
    const method = data.classBalancing || 'oversample';

    const onChange = (value: string) => {
        data.onChange?.(id, { ...data, classBalancing: value });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-fuchsia-200 min-w-[220px] overflow-hidden hover:shadow-xl transition-all duration-200">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-500 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Scale size={16} className="text-white" />
                    <span className="text-white font-semibold text-sm">Class Balancing</span>
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
                        Balancing Method
                    </label>
                    <select
                        value={method}
                        onChange={(e) => onChange(e.target.value)}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        className="nodrag nopan w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
                    >
                        <option value="oversample">Random Oversampling</option>
                        <option value="undersample">Random Undersampling</option>
                        <option value="smote">SMOTE</option>
                        <option value="class_weight">Class Weights</option>
                        <option value="none">None (Skip)</option>
                    </select>
                </div>

                <div className="text-xs text-slate-400 italic pt-1">
                    {method === 'oversample' && 'Duplicates minority class samples to match majority'}
                    {method === 'undersample' && 'Reduces majority class samples to match minority'}
                    {method === 'smote' && 'Generates synthetic minority samples (requires imbalanced-learn)'}
                    {method === 'class_weight' && 'Adjusts model weights to penalize majority class errors'}
                    {method === 'none' && 'No balancing applied — may bias toward majority class'}
                </div>

                {data.stepPreview && <StepPreview stepPreview={data.stepPreview} accentColor="#a855f7" />}
            </div>

            <Handle type="target" position={Position.Left} className="!bg-fuchsia-500 !w-3 !h-3 !border-2 !border-white" />
            <Handle type="source" position={Position.Right} className="!bg-fuchsia-500 !w-3 !h-3 !border-2 !border-white" />
        </div>
    );
}

export default memo(ClassBalancingNode);
