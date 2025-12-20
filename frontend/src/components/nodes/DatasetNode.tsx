import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import axios from 'axios';
import { Upload, Trash2, Table as TableIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

export default function DatasetNode({ data, id, selected }: any) {
    const [showPreview, setShowPreview] = useState(false);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check file size limit (10 MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes
        if (file.size > MAX_FILE_SIZE) {
            toast.error(`File size exceeds 10 MB limit. Please upload a smaller file.`);
            event.target.value = ''; // Reset the input
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const BASE_URL = import.meta.env.VITE_API_URL || 'https://neuroflow-489y.onrender.com';
            const response = await axios.post(`${BASE_URL}/upload`, formData);
            // Response: { id, preview, columns, shape }
            data.onChange(id, {
                ...data,
                file: file.name,
                file_id: response.data.id,
                columns: response.data.columns,
                preview: response.data.preview,
                shape: response.data.shape
            });
        } catch (error: any) {
            console.error('Upload failed', error);
            const msg = error.response?.data?.detail || error.message || 'Upload failed';
            toast.error(`Upload failed: ${msg}`);
        }
    };

    return (
        <div className={`bg-white rounded-xl shadow-lg border-2 border-[#4285F4] w-80 overflow-hidden transition-all group ${selected ? 'ring-2 ring-offset-2 ring-[#4285F4] shadow-[0_0_20px_rgba(66,133,244,0.4)]' : 'hover:shadow-[#4285F4]/20'}`}>
            <div className="bg-[#4285F4] px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg text-white">
                        <Upload size={18} />
                    </div>
                    <span className="font-semibold text-white text-base">Dataset Input</span>
                </div>
                <button
                    onClick={() => data.onDelete(id)}
                    className="text-white/70 hover:text-white transition-colors p-1.5 rounded hover:bg-white/20"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <div className="p-5 space-y-4">
                <div>
                    <label className="flex items-center justify-center gap-3 w-full py-3 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-lg transition-all group-hover:border-[#4285F4]/50">
                        <Upload size={18} className="text-slate-500 group-hover:text-[#4285F4] transition-colors" />
                        <span className="text-sm text-slate-600 group-hover:text-slate-900 truncate max-w-[200px] font-medium">
                            {data.file || "Upload CSV/Excel"}
                        </span>
                        <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                    </label>
                </div>

                {data.shape && (
                    <div className="flex items-center justify-between text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-500">Dimensions:</span>
                        <span className="font-mono font-medium text-slate-700">{data.shape[0]} rows × {data.shape[1]} cols</span>
                    </div>
                )}

                {data.preview && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="w-full flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-medium text-slate-700"
                        >
                            <div className="flex items-center gap-2">
                                <TableIcon size={12} className="text-[#4285F4]" />
                                <span>Data Preview</span>
                            </div>
                            {showPreview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {showPreview && (
                            <div className="overflow-x-auto max-h-48 custom-scrollbar bg-white p-2">
                                <table className="w-full text-[10px] text-left text-slate-600">
                                    <thead className="text-slate-700 uppercase bg-slate-50 sticky top-0">
                                        <tr>
                                            {data.columns.slice(0, 5).map((col: string) => (
                                                <th key={col} className="px-2 py-1.5 font-medium whitespace-nowrap">
                                                    {col}
                                                </th>
                                            ))}
                                            {data.columns.length > 5 && <th className="px-2 py-1">...</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.preview.map((row: any, i: number) => (
                                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                                {data.columns.slice(0, 5).map((col: string) => (
                                                    <td key={`${i}-${col}`} className="px-2 py-1.5 whitespace-nowrap">
                                                        {row[col]?.toString().substring(0, 15)}
                                                    </td>
                                                ))}
                                                {data.columns.length > 5 && <td className="px-2 py-1">...</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Custom Source Handle */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50">
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-4 !h-4 !bg-[#4285F4] !border-2 !border-white !rounded-full cursor-crosshair"
                />
            </div>
        </div>
    );
}
