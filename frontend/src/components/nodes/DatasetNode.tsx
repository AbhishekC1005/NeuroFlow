import React from 'react';
import { Handle, Position } from 'reactflow';
import axios from 'axios';
import { Upload, Trash2, Plus } from 'lucide-react';

export default function DatasetNode({ data, id }: any) {
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:8000/upload', formData);
            data.onChange(id, {
                ...data,
                file: file.name,
                columns: response.data.columns,
                preview: response.data.preview,
                shape: response.data.shape
            });
        } catch (error) {
            console.error('Upload failed', error);
            alert('Upload failed');
        }
    };

    return (
        <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 w-72 overflow-hidden transition-all hover:shadow-blue-500/20 hover:border-blue-500/50">
            <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-md text-blue-500">
                        <Upload size={14} />
                    </div>
                    <span className="font-semibold text-slate-200 text-sm">Dataset Input</span>
                </div>
                <button
                    onClick={() => data.onDelete(id)}
                    className="text-slate-500 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-700/50"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="p-4">
                <div className="mb-3">
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">File Source</label>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-colors group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-6 h-6 text-slate-500 group-hover:text-blue-400 mb-2 transition-colors" />
                            <p className="text-xs text-slate-500 text-center px-2 truncate w-full group-hover:text-slate-300 transition-colors">
                                {data.file ? <span className="text-blue-400 font-medium">{data.file}</span> : "Click to upload CSV/Excel"}
                            </p>
                        </div>
                        <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                    </label>
                </div>

                {data.shape && (
                    <div className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded border border-slate-800">
                        <span className="text-slate-500">Dimensions:</span>
                        <span className="font-mono font-medium text-slate-300">{data.shape[0]} rows × {data.shape[1]} cols</span>
                    </div>
                )}
            </div>

            {/* Custom Source Handle */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50">
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900 !rounded-full cursor-crosshair after:absolute after:-inset-4 after:content-[''] after:bg-transparent"
                />

                {/* Visual Plus Icon (appears on hover) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform pointer-events-none">
                    <Plus size={14} strokeWidth={3} />
                </div>
            </div>
        </div>
    );
}
