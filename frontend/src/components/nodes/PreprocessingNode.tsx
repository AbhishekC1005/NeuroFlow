import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Settings, X } from 'lucide-react';
import StepPreview from './StepPreview';

interface PreprocessingNodeProps {
  id: string;
  data: any;
}

function PreprocessingNode({ id, data }: PreprocessingNodeProps) {
  const scaler = data.scaler || 'None';

  const onChange = (value: string) => {
    data.onChange?.(id, { ...data, scaler: value });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-yellow-200 min-w-[220px] overflow-hidden hover:shadow-xl transition-all duration-200">
      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-white" />
          <span className="text-white font-semibold text-sm">Preprocessing</span>
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
            Scaler Type
          </label>
          <select
            value={scaler}
            onChange={(e) => onChange(e.target.value)}
            onPointerDownCapture={(e) => e.stopPropagation()}
            className="nodrag nopan w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
          >
            <option value="None">None</option>
            <option value="StandardScaler">Standard Scaler</option>
            <option value="MinMaxScaler">MinMax Scaler</option>
            <option value="RobustScaler">Robust Scaler</option>
            <option value="Normalizer">Normalizer</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 italic pt-1">
          {scaler === 'None' && 'No scaling applied to features'}
          {scaler === 'StandardScaler' && 'Zero mean, unit variance (z-score)'}
          {scaler === 'MinMaxScaler' && 'Scales features to [0, 1] range'}
          {scaler === 'RobustScaler' && 'Uses median & IQR, robust to outliers'}
          {scaler === 'Normalizer' && 'Scales each sample to unit norm'}
        </div>

        {data.stepPreview && <StepPreview stepPreview={data.stepPreview} accentColor="#FBBC05" />}
      </div>

      <Handle type="target" position={Position.Left} className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white" />
      <Handle type="source" position={Position.Right} className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}

export default memo(PreprocessingNode);
