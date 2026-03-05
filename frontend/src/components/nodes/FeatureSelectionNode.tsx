import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Filter, X } from 'lucide-react';


interface FeatureSelectionNodeProps {
    id: string;
    data: any;
}

function FeatureSelectionNode({ id, data }: FeatureSelectionNodeProps) {
    const method = data.featureSelectionMethod || 'variance';
    const varianceThreshold = data.varianceThreshold ?? 0.01;
    const correlationThreshold = data.correlationThreshold ?? 0.95;

    const onChange = (field: string, value: any) => {
        data.onChange?.(id, { ...data, [field]: value });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-teal-200 min-w-[240px] overflow-hidden hover:shadow-xl transition-all duration-200">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-white" />
                    <span className="text-white font-semibold text-sm">Feature Selection</span>
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
                        Method
                    </label>
                    <select
                        value={method}
                        onChange={(e) => onChange('featureSelectionMethod', e.target.value)}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        className="nodrag nopan w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                    >
                        <option value="variance">Variance Threshold</option>
                        <option value="correlation">Correlation Filter</option>
                        <option value="both">Both</option>
                        <option value="none">None (Skip)</option>
                    </select>
                </div>

                {(method === 'variance' || method === 'both') && (
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                            Variance Threshold: {varianceThreshold}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="0.5"
                            step="0.01"
                            value={varianceThreshold}
                            onChange={(e) => onChange('varianceThreshold', parseFloat(e.target.value))}
                            className="nodrag w-full accent-teal-500"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                            <span>0 (keep all)</span>
                            <span>0.5 (strict)</span>
                        </div>
                    </div>
                )}

                {(method === 'correlation' || method === 'both') && (
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                            Correlation Threshold: {correlationThreshold}
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="1.0"
                            step="0.05"
                            value={correlationThreshold}
                            onChange={(e) => onChange('correlationThreshold', parseFloat(e.target.value))}
                            className="nodrag w-full accent-teal-500"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                            <span>0.5 (strict)</span>
                            <span>1.0 (lenient)</span>
                        </div>
                    </div>
                )}


            </div>

            <Handle type="target" position={Position.Left} className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white" />
            <Handle type="source" position={Position.Right} className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white" />
        </div>
    );
}

export default memo(FeatureSelectionNode);
