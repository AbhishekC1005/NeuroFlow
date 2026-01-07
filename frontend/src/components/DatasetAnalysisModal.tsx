
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
    X, BarChart3, Activity, Loader2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { API_URL } from '../config';
import { getAuthHeaders } from './AuthContext';

interface DatasetAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileId: string; // Filename or ID
}

export default function DatasetAnalysisModal({ isOpen, onClose, fileId }: DatasetAnalysisModalProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'distribution' | 'correlation'>('distribution');

    useEffect(() => {
        if (isOpen && fileId) {
            fetchAnalysis();
        }
    }, [isOpen, fileId]);

    const fetchAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(
                `${API_URL}/analyze`,
                { file_id: fileId },
                { headers: getAuthHeaders() }
            );
            setData(response.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to analyze dataset");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Render Portal
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">

                {/* Header */}
                <div className="bg-[#4285F4] px-8 py-5 flex items-center justify-between shrink-0 shadow-md z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white/20 rounded-xl text-white backdrop-blur-md">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h2 className="font-black text-white text-3xl tracking-tight">Dataset X-Ray</h2>
                            <p className="text-blue-100 font-medium text-base text-opacity-90">Deep dive analysis for {fileId}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"
                    >
                        <X size={28} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-slate-50 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 size={48} className="animate-spin mb-4 text-[#4285F4]" />
                            <p className="text-lg font-medium">Scanning Dataset...</p>
                        </div>
                    ) : error ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500">
                            <Activity size={48} className="mb-4 opacity-50" />
                            <p className="text-xl font-bold">Analysis Failed</p>
                            <p className="text-slate-500 mt-2">{error}</p>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            {/* Tabs */}
                            <div className="flex items-center justify-center gap-4 p-6 shrink-0">
                                <button
                                    onClick={() => setActiveTab('distribution')}
                                    className={`px-6 py-2.5 rounded-full font-semibold transition-all flex items-center gap-2 ${activeTab === 'distribution'
                                        ? 'bg-[#4285F4] text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <BarChart3 size={18} />
                                    Distributions
                                </button>
                                <button
                                    onClick={() => setActiveTab('correlation')}
                                    className={`px-6 py-2.5 rounded-full font-semibold transition-all flex items-center gap-2 ${activeTab === 'correlation'
                                        ? 'bg-[#4285F4] text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <Activity size={18} />
                                    Correlations
                                </button>
                            </div>

                            {/* Scrollable Area */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                                {/* DISTRIBUTIONS */}
                                {activeTab === 'distribution' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                                        {data.histograms.map((hist: any, i: number) => (
                                            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                                                    <div className="w-1 h-6 bg-[#4285F4] rounded-full" />
                                                    {hist.column}
                                                </h3>
                                                <div className="h-48 w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={hist.data}>
                                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                                                            <XAxis dataKey="bin" hide />
                                                            <Tooltip
                                                                cursor={{ fill: '#f1f5f9' }}
                                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                            />
                                                            <Bar dataKey="count" fill="#4285F4" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
                                                    <span>Min: {hist.data[0]?.bin.split(' - ')[0]}</span>
                                                    <span>Max: {hist.data[hist.data.length - 1]?.bin.split(' - ')[1]}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* CORRELATIONS */}
                                {activeTab === 'correlation' && data.correlation_matrix && (
                                    <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                                        <div className="overflow-x-auto">
                                            <CorrelationHeatmap matrix={data.correlation_matrix} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// Sub-component for heatmap
function CorrelationHeatmap({ matrix }: { matrix: any }) {
    const cols = matrix.columns;
    const values = matrix.values; // 2D array

    // Get color based on correlation (-1 to 1)
    const getColor = (val: number) => {
        // Red for neg, Blue for pos
        const intensity = Math.abs(val);
        if (val > 0) return `rgba(66, 133, 244, ${intensity})`; // Blue
        return `rgba(234, 67, 53, ${intensity})`; // Red
    };

    return (
        <div className="inline-block min-w-full">
            <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${cols.length}, minmax(40px, 1fr))` }}>
                {/* Header Row */}
                <div /> {/* Empty Corner */}
                {cols.map((col: string, i: number) => (
                    <div key={i} className="text-xs font-bold text-slate-400 -rotate-45 origin-bottom-left h-24 flex items-end translate-x-4">
                        {col}
                    </div>
                ))}

                {/* Rows */}
                {values.map((row: number[], i: number) => (
                    <>
                        {/* Row Header */}
                        <div className="text-xs font-bold text-slate-500 flex items-center justify-end pr-3">
                            {cols[i]}
                        </div>
                        {/* Cells */}
                        {row.map((val: number, j: number) => (
                            <div
                                key={`${i}-${j}`}
                                className="aspect-square rounded flex items-center justify-center text-[10px] font-medium transition-transform hover:scale-110 cursor-default"
                                style={{ backgroundColor: getColor(val), color: Math.abs(val) > 0.5 ? 'white' : 'transparent' }}
                                title={`${cols[i]} vs ${cols[j]}: ${val.toFixed(2)}`}
                            >
                                {val.toFixed(1)}
                            </div>
                        ))}
                    </>
                ))}
            </div>
        </div>
    );
}
