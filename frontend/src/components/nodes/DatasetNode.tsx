import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import axios from 'axios';
import { Upload, X, Table as TableIcon, ChevronDown, ChevronUp, Loader2, Activity, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import DatasetAnalysisModal from '../DatasetAnalysisModal';

interface DatasetNodeProps {
    id: string;
    data: any;
    selected?: boolean;
}

function DatasetNode({ data, id }: DatasetNodeProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'uploaded'>('idle');
    const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            toast.error(`File size exceeds 10 MB limit. Please upload a smaller file.`);
            event.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploadStatus('uploading');

        try {
            const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const token = localStorage.getItem('token');
            const response = await axios.post(`${BASE_URL}/upload`, formData, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (data.onChange) {
                // Bug 1 fix: use dataset_id (MongoDB ObjectId), NOT response.data.id (which is filename)
                data.onChange(id, {
                    ...data,
                    file: file.name,
                    file_id: response.data.dataset_id || response.data.id,
                    columns: response.data.columns,
                    preview: response.data.preview,
                    shape: response.data.shape
                });
            } else {
                toast.error('Node not fully initialized. Please try uploading again.');
            }
            setUploadStatus('uploaded');
            toast.success('File uploaded successfully!');
        } catch (error: any) {
            console.error('Upload failed', error);
            const msg = error.response?.data?.detail || error.message || 'Upload failed';
            toast.error(`Upload failed: ${msg}`);
            setUploadStatus('idle');
        }
    };


    return (
        <>
            <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 min-w-[280px] overflow-visible hover:shadow-xl transition-all duration-200">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Upload size={16} className="text-white" />
                        <span className="text-white font-semibold text-sm">Dataset</span>
                    </div>
                    <button
                        onClick={() => data.onDelete?.(id)}
                        className="text-white/70 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    {!data.file && (
                        <p className="text-[10px] text-center text-gray-400 pb-0.5">Drag a dataset from the sidebar, or upload a new file</p>
                    )}

                    <label className={`flex items-center justify-center gap-2 w-full py-2.5 cursor-pointer border border-dashed rounded-lg transition-all text-sm ${uploadStatus === 'uploading'
                            ? 'bg-blue-50 border-blue-300 cursor-wait'
                            : uploadStatus === 'uploaded' || data.file
                                ? 'bg-green-50 border-green-300'
                                : 'bg-slate-50 hover:bg-blue-50 border-slate-200 hover:border-blue-300'
                            }`}>
                            {uploadStatus === 'uploading' ? (
                                <>
                                    <Loader2 size={14} className="text-blue-500 animate-spin" />
                                    <span className="text-blue-600 font-medium">Uploading...</span>
                                </>
                            ) : (data.file) ? (
                                <div className="flex items-center justify-between w-full px-2">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet size={14} className="text-green-600" />
                                        <span className="text-green-700 truncate max-w-[140px] font-medium">
                                            {data.file}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (data.onChange) data.onChange(id, { ...data, file: null, file_id: null });
                                        }}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Upload size={14} className="text-slate-400" />
                                    <span className="text-slate-500 font-medium">
                                        Upload / Drag File
                                    </span>
                                </>
                            )}
                            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} disabled={uploadStatus === 'uploading'} />
                        </label>

                    {/* Shape Info */}
                    {data.shape && (
                        <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <span className="text-slate-500">Dimensions:</span>
                            <span className="font-mono font-medium text-slate-700">{data.shape[0]} × {data.shape[1]}</span>
                        </div>
                    )}

                    {/* Data Preview */}
                    {data.preview && data.preview.length > 0 && (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="w-full flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-medium text-slate-700"
                            >
                                <div className="flex items-center gap-1.5">
                                    <TableIcon size={10} className="text-blue-500" />
                                    <span>Preview</span>
                                </div>
                                {showPreview ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>

                            {showPreview && (
                                <div className="overflow-x-auto max-h-36 bg-white p-1.5">
                                    <table className="w-full text-[10px] text-left text-slate-600">
                                        <thead className="text-slate-700 uppercase bg-slate-50 sticky top-0">
                                            <tr>
                                                {data.columns.slice(0, 5).map((col: string) => (
                                                    <th key={col} className="px-1.5 py-1 font-medium whitespace-nowrap">{col}</th>
                                                ))}
                                                {data.columns.length > 5 && <th className="px-1.5 py-1">...</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.preview.map((row: any, i: number) => (
                                                <tr key={i} className="border-b border-slate-100">
                                                    {data.columns.slice(0, 5).map((col: string) => (
                                                        <td key={`${i}-${col}`} className="px-1.5 py-1 whitespace-nowrap">
                                                            {row[col]?.toString().substring(0, 12)}
                                                        </td>
                                                    ))}
                                                    {data.columns.length > 5 && <td className="px-1.5 py-1">...</td>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* X-Ray Analysis Button */}
                    {data.file && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsAnalyzeOpen(true); }}
                            className="w-full flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg text-xs font-medium transition-all shadow-md active:scale-95"
                        >
                            <Activity size={12} />
                            Run X-Ray Analysis
                        </button>
                    )}
                </div>

                <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white" />
            </div>

            <DatasetAnalysisModal
                isOpen={isAnalyzeOpen}
                onClose={() => setIsAnalyzeOpen(false)}
                fileId={data.file_id || ""}
            />
        </>
    );
}

export default memo(DatasetNode);
