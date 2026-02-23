import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { AlertTriangle, X } from 'lucide-react';
import StepPreview from './StepPreview';

interface OutlierNodeProps {
    id: string;
    data: any;
}

function OutlierNode({ id, data }: OutlierNodeProps) {
    const method = data.outlierMethod || 'iqr';
    const action = data.outlierAction || 'clip';

    const onChange = (field: string, value: string) => {
        data.onChange?.(id, { ...data, [field]: value });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-amber-200 min-w-[220px] overflow-hidden hover:shadow-xl transition-all duration-200">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-white" />
                    <span className="text-white font-semibold text-sm">Outlier Handler</span>
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
                        Detection Method
                    </label>
                    <select
                        value={method}
                        onChange={(e) => onChange('outlierMethod', e.target.value)}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        className="nodrag nopan w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                    >
                        <option value="iqr">IQR Method</option>
                        <option value="zscore">Z-Score Method</option>
                        <option value="none">None (Skip)</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                        Action
                    </label>
                    <select
                        value={action}
                        onChange={(e) => onChange('outlierAction', e.target.value)}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        className="nodrag nopan w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                    >
                        <option value="clip">Clip to Bounds</option>
                        <option value="remove">Remove Rows</option>
                        <option value="none">Do Nothing</option>
                    </select>
                </div>

                {method !== 'none' && (
                    <div className="text-xs text-slate-400 italic pt-1">
                        {method === 'iqr' ? 'Uses Q1-1.5×IQR to Q3+1.5×IQR' : 'Uses mean ± 3σ range'}
                    </div>
                )}

                {data.stepPreview && <StepPreview stepPreview={data.stepPreview} accentColor="#f59e0b" />}
            </div>

            <Handle type="target" position={Position.Left} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white" />
            <Handle type="source" position={Position.Right} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white" />
        </div>
    );
}

export default memo(OutlierNode);
