import React from 'react';
import { Handle, Position } from 'reactflow';
import { Settings, Trash2, Plus } from 'lucide-react';

export default function PreprocessingNode({ data, id }: any) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    data.onChange(id, { ...data, scaler: e.target.value });
  };

  return (
    <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 w-64 overflow-hidden transition-all hover:shadow-yellow-500/20 hover:border-yellow-500/50 group">
      {/* Custom Target Handle */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50">
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-slate-900 !rounded-full after:absolute after:-inset-4 after:content-[''] after:bg-transparent"
        />
      </div>

      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-yellow-500/10 rounded-md text-yellow-500">
            <Settings size={14} />
          </div>
          <span className="font-semibold text-slate-200 text-sm">Preprocessing</span>
        </div>
        <button
          onClick={() => data.onDelete(id)}
          className="text-slate-500 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-700/50"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="p-4">
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Scaler Type</label>
        <div className="relative">
          <select
            className="w-full appearance-none bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block p-2.5 outline-none transition-colors"
            onChange={handleChange}
            defaultValue={data.scaler || 'None'}
          >
            <option value="None">None</option>
            <option value="StandardScaler">Standard Scaler</option>
            <option value="MinMaxScaler">MinMax Scaler</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
          </div>
        </div>
      </div>

      {/* Custom Source Handle */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50">
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-slate-900 !rounded-full cursor-crosshair after:absolute after:-inset-4 after:content-[''] after:bg-transparent"
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-yellow-500 rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform pointer-events-none">
          <Plus size={14} strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}
