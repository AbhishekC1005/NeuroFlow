import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Split, X } from 'lucide-react';


interface SplitNodeProps {
    id: string;
    data: any;
}

function SplitNode({ id, data }: SplitNodeProps) {
    const testSize = data.testSize || 0.2;
    const stratified = data.stratified ?? false;
    const shuffle = data.shuffle ?? true;
    const randomState = data.randomState ?? 42;

    const onChange = (field: string, value: any) => {
        data.onChange?.(id, { ...data, [field]: value });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-fuchsia-200 min-w-[240px] overflow-hidden hover:shadow-xl transition-all duration-200">
            <div className="bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Split size={16} className="text-white" />
                    <span className="text-white font-semibold text-sm">Train-Test Split</span>
                </div>
                <button
                    onClick={() => data.onDelete?.(id)}
                    className="text-white/70 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="p-4 space-y-3">
                {/* Split Ratio */}
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Split Ratio
                        </label>
                        <span className="text-xs font-bold text-fuchsia-600">
                            {Math.round(testSize * 100)}% Test
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.05"
                        max="0.95"
                        step="0.01"
                        value={testSize}
                        onChange={(e) => onChange('testSize', parseFloat(e.target.value))}
                        style={{
                            background: `linear-gradient(to right, #d946ef 0%, #d946ef ${testSize * 100}%, #e2e8f0 ${testSize * 100}%, #e2e8f0 100%)`
                        }}
                        className="nodrag w-full h-1.5 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-fuchsia-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                        <span>Train: {100 - Math.round(testSize * 100)}%</span>
                        <span>Test: {Math.round(testSize * 100)}%</span>
                    </div>
                </div>

                {/* Stratified Toggle */}
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => onChange('stratified', !stratified)}
                >
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer">
                        Stratified
                    </label>
                    <div className={`w-8 h-4 rounded-full transition-all duration-200 ${stratified ? 'bg-fuchsia-500' : 'bg-slate-300'} relative`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all duration-200 ${stratified ? 'left-4' : 'left-0.5'}`} />
                    </div>
                </div>

                {/* Shuffle Toggle */}
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => onChange('shuffle', !shuffle)}
                >
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer">
                        Shuffle
                    </label>
                    <div className={`w-8 h-4 rounded-full transition-all duration-200 ${shuffle ? 'bg-fuchsia-500' : 'bg-slate-300'} relative`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all duration-200 ${shuffle ? 'left-4' : 'left-0.5'}`} />
                    </div>
                </div>

                {/* Random State */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                        Random State
                    </label>
                    <input
                        type="number"
                        value={randomState}
                        onChange={(e) => onChange('randomState', parseInt(e.target.value) || 42)}
                        className="nodrag w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
                        placeholder="42"
                    />
                </div>

                <div className="text-xs text-slate-400 italic pt-1">
                    Splits data into training and testing sets
                </div>


            </div>

            <Handle type="target" position={Position.Left} className="!bg-fuchsia-500 !w-3 !h-3 !border-2 !border-white" />
            <Handle type="source" position={Position.Right} className="!bg-fuchsia-500 !w-3 !h-3 !border-2 !border-white" />
        </div>
    );
}

export default memo(SplitNode);
