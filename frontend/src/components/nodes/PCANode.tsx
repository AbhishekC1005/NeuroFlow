import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Minimize2, X } from 'lucide-react';


interface PCANodeProps {
    id: string;
    data: any;
}

function PCANode({ id, data }: PCANodeProps) {
    const components = data.pcaComponents ?? 2;

    const onChange = (value: number) => {
        data.onChange?.(id, { ...data, pcaComponents: value });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-sky-200 min-w-[220px] overflow-hidden hover:shadow-xl transition-all duration-200">
            <div className="bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Minimize2 size={16} className="text-white" />
                    <span className="text-white font-semibold text-sm">PCA</span>
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
                        Components: {components}
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        step="1"
                        value={components}
                        onChange={(e) => onChange(parseInt(e.target.value))}
                        className="nodrag w-full accent-sky-500"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                        <span>1</span>
                        <span>20</span>
                    </div>
                </div>

                <div className="text-xs text-slate-400 italic pt-1">
                    Reduces dimensions to {components} principal component{components > 1 ? 's' : ''}
                </div>


            </div>

            <Handle type="target" position={Position.Left} className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white" />
            <Handle type="source" position={Position.Right} className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white" />
        </div>
    );
}

export default memo(PCANode);
