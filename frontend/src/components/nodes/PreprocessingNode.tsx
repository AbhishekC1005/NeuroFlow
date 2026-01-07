
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Settings, Trash2, Plus } from 'lucide-react';

export default function PreprocessingNode({ data, id, selected }: any) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    data.onChange(id, { ...data, scaler: e.target.value });
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border-2 border-[#FBBC05] w-72 overflow-hidden transition-all group ${selected ? 'ring-2 ring-offset-2 ring-[#FBBC05] shadow-[0_0_20px_rgba(251,188,5,0.4)]' : 'hover:shadow-[#FBBC05]/20'}`}>
      {/* Custom Target Handle (Left) */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-8 h-8">
        <Handle
          type="target"
          position={Position.Left}
          className="!w-8 !h-8 !opacity-0 !rounded-full !bg-transparent z-10 cursor-crosshair"
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3 h-3 bg-[#FBBC05] border-2 border-white rounded-full transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 shadow-sm" />
          <div className="absolute w-6 h-6 bg-[#FBBC05] rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
            <Plus size={14} strokeWidth={3} />
          </div>
        </div>
      </div>

      <div className="bg-[#FBBC05] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg text-white">
            <Settings size={18} />
          </div>
          <span className="font-semibold text-white text-lg">Preprocessing</span>
        </div>
        <button
          onClick={() => data.onDelete(id)}
          className="text-white/70 hover:text-white transition-colors p-1.5 rounded hover:bg-white/20"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="p-4">
        <label className="block text-sm font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Scaler Type</label>
        <div className="relative">
          <select
            className="w-full appearance-none bg-slate-50 border border-gray-200 text-slate-700 text-base rounded-lg focus:ring-[#FBBC05] focus:border-[#FBBC05] block p-2.5 outline-none transition-colors"
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

      {/* Custom Source Handle (Right) */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50 flex items-center justify-center w-8 h-8">
        <Handle
          type="source"
          position={Position.Right}
          className="!w-8 !h-8 !opacity-0 !rounded-full !bg-transparent z-10 cursor-crosshair"
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3 h-3 bg-[#FBBC05] border-2 border-white rounded-full transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 shadow-sm" />
          <div className="absolute w-6 h-6 bg-[#FBBC05] rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
            <Plus size={14} strokeWidth={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
