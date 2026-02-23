import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { BrainCircuit, X } from 'lucide-react';
import StepPreview from './StepPreview';

interface ModelNodeProps {
    id: string;
    data: any;
}

function ModelNode({ id, data }: ModelNodeProps) {
    const targetColumn = data.targetColumn || '';
    const modelType = data.modelType || 'Logistic Regression';

    const onChange = (field: string, value: string) => {
        data.onChange?.(id, { ...data, [field]: value });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-red-200 min-w-[240px] overflow-hidden hover:shadow-xl transition-all duration-200">
            <div className="bg-gradient-to-r from-red-500 to-rose-500 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BrainCircuit size={16} className="text-white" />
                    <span className="text-white font-semibold text-sm">Model Training</span>
                </div>
                <button
                    onClick={() => data.onDelete?.(id)}
                    className="text-white/70 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="p-4 space-y-3">
                {/* Target Column */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                        Target Column
                    </label>
                    <select
                        value={targetColumn}
                        onChange={(e) => onChange('targetColumn', e.target.value)}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        className="nodrag nopan w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
                    >
                        <option value="" disabled>Select Target</option>
                        {data.columns?.map((col: string) => (
                            <option key={col} value={col}>{col}</option>
                        ))}
                    </select>
                </div>

                {/* Algorithm */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                        Algorithm
                    </label>
                    <select
                        value={modelType}
                        onChange={(e) => onChange('modelType', e.target.value)}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                        className="nodrag nopan w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
                    >
                        <optgroup label="Classification">
                            <option value="Logistic Regression">Logistic Regression</option>
                            <option value="Decision Tree">Decision Tree</option>
                            <option value="Random Forest">Random Forest</option>
                            <option value="SVM">SVM</option>
                            <option value="KNN">KNN</option>
                            <option value="Gradient Boosting">Gradient Boosting</option>
                            <option value="XGBoost">XGBoost</option>
                            <option value="MLP Classifier">MLP Classifier</option>
                        </optgroup>
                        <optgroup label="Regression">
                            <option value="Linear Regression">Linear Regression</option>
                            <option value="Random Forest Regressor">RF Regressor</option>
                            <option value="Ridge Regression">Ridge Regression</option>
                            <option value="Lasso Regression">Lasso Regression</option>
                            <option value="ElasticNet">ElasticNet</option>
                            <option value="SVR">SVR</option>
                            <option value="KNN Regressor">KNN Regressor</option>
                            <option value="Gradient Boosting Regressor">GB Regressor</option>
                            <option value="XGBoost Regressor">XGBoost Regressor</option>
                            <option value="MLP Regressor">MLP Regressor</option>
                        </optgroup>
                    </select>
                </div>

                <div className="text-xs text-slate-400 italic pt-1">
                    {targetColumn ? `Predicting: ${targetColumn}` : 'Upload data to select target column'}
                </div>

                {data.stepPreview && <StepPreview stepPreview={data.stepPreview} accentColor="#EA4335" />}
            </div>

            <Handle type="target" position={Position.Left} className="!bg-red-500 !w-3 !h-3 !border-2 !border-white" />
            <Handle type="source" position={Position.Right} className="!bg-red-500 !w-3 !h-3 !border-2 !border-white" />
        </div>
    );
}

export default memo(ModelNode);
