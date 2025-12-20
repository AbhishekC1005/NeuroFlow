
import { Handle, Position } from 'reactflow';
import { BarChart3, Trash2, Table as TableIcon, Grid, TrendingUp, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ResultNode({ data, id, selected }: any) {
    return (
        <div className={`bg-white rounded-xl shadow-lg border-2 border-[#34A853] w-96 overflow-hidden transition-all group ${selected ? 'ring-2 ring-offset-2 ring-[#34A853] shadow-[0_0_20px_rgba(52,168,83,0.4)]' : 'hover:shadow-[#34A853]/20'}`}>
            {/* Custom Target Handle (Left) */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-8 h-8">
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-8 !h-8 !opacity-0 !rounded-full !bg-transparent z-10 cursor-crosshair"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3 h-3 bg-[#34A853] border-2 border-white rounded-full transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 shadow-sm" />
                    <div className="absolute w-6 h-6 bg-[#34A853] rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                        <Plus size={14} strokeWidth={3} />
                    </div>
                </div>
            </div>

            <div className="bg-[#34A853] px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg text-white">
                        <BarChart3 size={18} />
                    </div>
                    <span className="font-semibold text-white text-base">Evaluation Results</span>
                </div>
                <button
                    onClick={() => data.onDelete(id)}
                    className="text-white/70 hover:text-white transition-colors p-1.5 rounded hover:bg-white/20"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <div className="p-5 space-y-5 max-h-[550px] overflow-y-auto custom-scrollbar">
                {(data.accuracy !== undefined || data.r2_score !== undefined) ? (
                    <>
                        {/* Metrics Section */}
                        {data.is_regression ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-[#34A853]/10 border border-[#34A853]/20 rounded-lg">
                                    <span className="text-xs text-[#1e8e3e] block mb-1">R² Score</span>
                                    <span className="text-lg font-bold text-[#34A853]">{data.r2_score?.toFixed(3)}</span>
                                </div>
                                <div className="p-3 bg-slate-50 border border-gray-200 rounded-lg">
                                    <span className="text-xs text-slate-500 block mb-1">MSE</span>
                                    <span className="text-lg font-bold text-slate-700">{data.mse?.toFixed(3)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-[#34A853]/10 border border-[#34A853]/20 rounded-lg">
                                <span className="text-sm text-[#1e8e3e]">Accuracy</span>
                                <span className="text-lg font-bold text-[#34A853]">{(data.accuracy * 100).toFixed(2)}%</span>
                            </div>
                        )}

                        {/* Feature Importance Chart */}
                        {data.feature_importance && data.feature_importance.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    <TrendingUp size={12} />
                                    <span>Feature Importance</span>
                                </div>
                                <div className="h-48 w-full bg-slate-50 rounded-lg p-2 border border-gray-200 shadow-inner">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.feature_importance} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" horizontal={true} vertical={false} opacity={0.5} />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={90}
                                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', fontSize: '12px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                                itemStyle={{ color: '#1e293b' }}
                                                cursor={{ fill: '#e2e8f0', opacity: 0.5 }}
                                                formatter={(value: any) => [value.toFixed(4), 'Importance']}
                                            />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                                                {data.feature_importance.map((_entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={index < 3 ? '#34A853' : '#94a3b8'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Classification Specifics */}
                        {!data.is_regression && (
                            <>
                                {data.confusion_matrix && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            <Grid size={12} />
                                            <span>Confusion Matrix</span>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded border border-gray-200 flex flex-col items-center justify-center gap-1">
                                            {data.confusion_matrix.map((row: number[], i: number) => (
                                                <div key={i} className="flex gap-1">
                                                    {row.map((cell: number, j: number) => (
                                                        <div
                                                            key={`${i}-${j}`}
                                                            className="w-10 h-10 flex items-center justify-center text-xs font-mono bg-white text-slate-700 rounded hover:bg-slate-100 transition-colors border border-gray-200 shadow-sm"
                                                            title={`True: ${i}, Pred: ${j}`}
                                                        >
                                                            {cell}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {data.report && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            <TableIcon size={12} />
                                            <span>Classification Report</span>
                                        </div>
                                        <div className="overflow-x-auto bg-white rounded border border-gray-200">
                                            <table className="w-full text-[10px] text-left text-slate-600">
                                                <thead className="text-slate-700 uppercase bg-slate-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-2 py-1.5">Class</th>
                                                        <th className="px-2 py-1.5">Precision</th>
                                                        <th className="px-2 py-1.5">Recall</th>
                                                        <th className="px-2 py-1.5">F1</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(data.report).map(([key, metrics]: [string, any]) => {
                                                        if (typeof metrics !== 'object') return null; // Skip 'accuracy' key
                                                        return (
                                                            <tr key={key} className="border-b border-gray-100 hover:bg-slate-50">
                                                                <td className="px-2 py-1 font-medium text-slate-800">{key}</td>
                                                                <td className="px-2 py-1">{metrics.precision?.toFixed(2)}</td>
                                                                <td className="px-2 py-1">{metrics.recall?.toFixed(2)}</td>
                                                                <td className="px-2 py-1">{metrics['f1-score']?.toFixed(2)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <div className="text-center py-10 text-slate-400 text-sm flex flex-col items-center gap-3">
                        <BarChart3 className="opacity-20 text-[#34A853]" size={40} />
                        <p>Run pipeline to see results</p>
                    </div>
                )}
            </div>
        </div>
    );
}
