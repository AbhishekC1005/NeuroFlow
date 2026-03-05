import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Wrench, X } from 'lucide-react';


interface FeatureEngineeringNodeProps {
    id: string;
    data: any;
}

function FeatureEngineeringNode({ id, data }: FeatureEngineeringNodeProps) {
    const method = data.featureEngineeringMethod || 'polynomial';
    const degree = data.polynomialDegree ?? 2;

    const onChange = (field: string, value: any) => {
        data.onChange?.(id, { ...data, [field]: value });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-lime-200 min-w-[220px] overflow-hidden hover:shadow-xl transition-all duration-200">
            <div className="bg-gradient-to-r from-lime-500 to-green-500 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-white" />
                    <span className="text-white font-semibold text-sm">Feature Engineering</span>
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
                        Transform Method
                    </label>
                    <select
                        value={method}
                        onChange={(e) => onChange('featureEngineeringMethod', e.target.value)}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        className="nodrag nopan w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all"
                    >
                        <option value="polynomial">Polynomial Features</option>
                        <option value="log">Log Transform</option>
                        <option value="sqrt">Square Root Transform</option>
                        <option value="none">None (Skip)</option>
                    </select>
                </div>

                {method === 'polynomial' && (
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                            Degree: {degree}
                        </label>
                        <div className="flex gap-2">
                            {[2, 3, 4].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => onChange('polynomialDegree', d)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${degree === d
                                        ? 'bg-lime-500 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-xs text-slate-400 italic pt-1">
                    {method === 'polynomial' && `Creates interaction & polynomial terms (degree ${degree})`}
                    {method === 'log' && 'Applies log(1+x) to reduce skewness'}
                    {method === 'sqrt' && 'Applies √x to compress large values'}
                    {method === 'none' && 'No transformation applied'}
                </div>


            </div>

            <Handle type="target" position={Position.Left} className="!bg-lime-500 !w-3 !h-3 !border-2 !border-white" />
            <Handle type="source" position={Position.Right} className="!bg-lime-500 !w-3 !h-3 !border-2 !border-white" />
        </div>
    );
}

export default memo(FeatureEngineeringNode);
