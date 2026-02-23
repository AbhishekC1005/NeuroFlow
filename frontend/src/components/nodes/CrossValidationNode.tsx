import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Repeat, X } from 'lucide-react';

interface CrossValidationNodeProps {
    id: string;
    data: any;
}

function CrossValidationNode({ id, data }: CrossValidationNodeProps) {
    const folds = data.cvFolds ?? 5;
    const stratified = data.cvStratified ?? true;

    const onChange = (field: string, value: any) => {
        data.onChange?.(id, { ...data, [field]: value });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-200 min-w-[220px] overflow-hidden hover:shadow-xl transition-all duration-200">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Repeat size={16} className="text-white" />
                    <span className="text-white font-semibold text-sm">Cross-Validation</span>
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
                        K-Folds: {folds}
                    </label>
                    <div className="flex gap-2">
                        {[3, 5, 10].map((k) => (
                            <button
                                key={k}
                                onClick={() => onChange('cvFolds', k)}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${folds === k
                                        ? 'bg-indigo-500 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {k}
                            </button>
                        ))}
                    </div>
                </div>

                <div
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => onChange('cvStratified', !stratified)}
                >
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer">
                        Stratified
                    </label>
                    <div className={`w-10 h-5 rounded-full transition-all duration-200 ${stratified ? 'bg-indigo-500' : 'bg-slate-300'
                        } relative`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${stratified ? 'left-5' : 'left-0.5'
                            }`} />
                    </div>
                </div>

                <div className="text-xs text-slate-400 italic pt-1">
                    Evaluates model across {folds} data folds for more reliable scores
                </div>
            </div>

            <Handle type="target" position={Position.Left} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white" />
            <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white" />
        </div>
    );
}

export default memo(CrossValidationNode);
