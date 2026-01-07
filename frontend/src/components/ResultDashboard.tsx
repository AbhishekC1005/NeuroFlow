
import { useState } from 'react';
import {
    BarChart3, Table as TableIcon, Grid, TrendingUp,
    Activity, CheckCircle2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ResultDashboardProps {
    data: any;
    className?: string;
    viewMode?: 'compact' | 'expanded';
}

export default function ResultDashboard({ data, className = '', viewMode = 'compact' }: ResultDashboardProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'details'>('overview');

    const hasResults = data.accuracy !== undefined || data.r2_score !== undefined;
    const isExpanded = viewMode === 'expanded';

    // Helper to get color for heatmap
    const getHeatmapColor = (value: number, max: number) => {
        const intensity = Math.max(0.1, value / max);
        return `rgba(52, 168, 83, ${intensity})`; // Google Green opacity
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'details', label: 'Details', icon: TableIcon },
    ];

    if (!hasResults) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-10 text-center space-y-3 opacity-50">
                <div className="p-3 bg-slate-100 rounded-full">
                    <BarChart3 size={24} className="text-slate-400" />
                </div>
                <p className="text-base text-slate-500 font-medium">Run pipeline to view results</p>
            </div>
        );
    }

    // Dynamic height calculation for feature importance
    const featureCount = data.feature_importance?.length || 0;
    const chartHeight = Math.max(isExpanded ? 500 : 250, featureCount * (isExpanded ? 50 : 35));

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Navigation Tabs - Larger in Expanded Mode */}
            {!data.is_regression && (
                <div className={`flex p-1 bg-slate-100 rounded-lg ${isExpanded ? 'max-w-md mx-auto mb-8' : ''}`}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 ${isExpanded ? 'py-3 text-base' : 'py-1.5 text-sm'} font-semibold rounded-md transition-all ${activeTab === tab.id
                                    ? 'bg-white text-[#34A853] shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                <Icon size={isExpanded ? 18 : 14} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="pr-1">

                {/* --- OVERVIEW TAB --- */}
                {(activeTab === 'overview' || data.is_regression) && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                        {/* Primary Score & Grid Container */}
                        <div className={`grid ${isExpanded ? 'grid-cols-2 gap-6' : 'grid-cols-1 gap-4'}`}>

                            {/* Primary Score */}
                            <div className={`flex flex-col items-center justify-center bg-[#34A853]/5 border border-[#34A853]/20 rounded-2xl ${isExpanded ? 'p-8 aspect-video' : 'p-4'}`}>
                                <span className={`text-[#1e8e3e] font-semibold uppercase mb-2 block ${isExpanded ? 'text-base tracking-wider' : 'text-sm'}`}>
                                    {data.is_regression ? 'R² Score' : 'Model Accuracy'}
                                </span>
                                <div className={`font-bold text-[#34A853] ${isExpanded ? 'text-8xl' : 'text-5xl'}`}>
                                    {data.is_regression ? data.r2_score?.toFixed(3) : (data.accuracy * 100).toFixed(1)}%
                                </div>
                            </div>

                            {/* Secondary Metrics Grid */}
                            <div className={`grid ${isExpanded ? 'grid-cols-1 gap-4 content-center' : 'grid-cols-2 gap-3'}`}>
                                {data.is_regression ? (
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 h-full flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-1 text-slate-500">
                                            <TrendingUp size={isExpanded ? 20 : 12} />
                                            <span className={`${isExpanded ? 'text-base' : 'text-xs'} font-bold uppercase`}>Mean Squared Error</span>
                                        </div>
                                        <span className={`${isExpanded ? 'text-4xl' : 'text-xl'} font-bold text-slate-700`}>{data.mse?.toFixed(4)}</span>
                                    </div>
                                ) : (
                                    <>
                                        {['Precision', 'Recall', 'F1 Score'].map((metric, i) => {
                                            let val = 0;
                                            if (data.report && data.report['weighted avg']) {
                                                if (metric === 'Precision') val = data.report['weighted avg']['precision'];
                                                if (metric === 'Recall') val = data.report['weighted avg']['recall'];
                                                if (metric === 'F1 Score') val = data.report['weighted avg']['f1-score'];
                                            }
                                            return (
                                                <div key={metric} className={`p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-center ${i === 2 && !isExpanded ? 'col-span-2' : ''}`}>
                                                    <div className="flex items-center gap-2 mb-1 text-slate-500">
                                                        <CheckCircle2 size={isExpanded ? 18 : 12} />
                                                        <span className={`${isExpanded ? 'text-sm' : 'text-xs'} font-bold uppercase`}>{metric}</span>
                                                    </div>
                                                    <span className={`${isExpanded ? 'text-3xl' : 'text-xl'} font-bold text-slate-700`}>{(val * 100).toFixed(1)}%</span>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Feature Importance */}
                        {data.feature_importance && data.feature_importance.length > 0 && (
                            <div className={`bg-white rounded-2xl border border-slate-200 ${isExpanded ? 'p-6 mt-8 shadow-sm' : 'mt-4'}`}>
                                <div className="flex items-center gap-2 mb-4 text-slate-600">
                                    <BarChart3 size={isExpanded ? 20 : 16} />
                                    <span className={`${isExpanded ? 'text-lg' : 'text-sm'} font-semibold uppercase tracking-wide`}>Feature Importance</span>
                                </div>

                                {/* Dynamic Height based on feature count to ensure gaps and readability */}
                                <div style={{ height: chartHeight }} className="w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={data.feature_importance}
                                            layout="vertical"
                                            margin={isExpanded ? { left: 40, right: 40, top: 10, bottom: 10 } : { left: 10, right: 10 }}
                                            barSize={isExpanded ? 24 : 16}
                                            barGap={isExpanded ? 8 : 4}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={isExpanded ? 180 : 100}
                                                tick={{ fontSize: isExpanded ? 14 : 12, fill: '#475569', fontWeight: 500 }}
                                                axisLine={false}
                                                tickLine={false}
                                                interval={0} // Force showing all labels
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                            />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {data.feature_importance.map((_entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={index < 3 ? '#34A853' : '#94a3b8'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Confusion Matrix (Moved to Overview) */}
                        {!data.is_regression && data.confusion_matrix && (
                            <div className={`flex flex-col items-center justify-center py-4 bg-white rounded-2xl border border-slate-200 ${isExpanded ? 'p-8 mt-8 shadow-sm' : 'mt-4'}`}>
                                <div className="flex items-center gap-2 mb-6 text-slate-600 self-start px-4">
                                    <Grid size={isExpanded ? 20 : 16} />
                                    <span className={`${isExpanded ? 'text-lg' : 'text-sm'} font-semibold uppercase tracking-wide`}>Confusion Matrix</span>
                                </div>

                                <div className="relative">
                                    {/* Y Axis Label */}
                                    <div className={`absolute top-1/2 -translate-y-1/2 -rotate-90 font-bold text-slate-400 tracking-widest ${isExpanded ? '-left-12 text-base' : '-left-6 text-xs'}`}>
                                        TRUE
                                    </div>

                                    {/* X Axis Label */}
                                    <div className={`absolute left-1/2 -translate-x-1/2 font-bold text-slate-400 tracking-widest ${isExpanded ? '-top-10 text-base' : '-top-5 text-xs'}`}>
                                        PREDICTED
                                    </div>

                                    <div className={`grid gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm ${isExpanded ? 'gap-3 p-8' : ''}`}
                                        style={{ gridTemplateColumns: `repeat(${data.confusion_matrix.length}, minmax(0, 1fr))` }}>
                                        {data.confusion_matrix.map((row: number[], i: number) =>
                                            row.map((val: number, j: number) => {
                                                const maxVal = Math.max(...data.confusion_matrix.flat());
                                                return (
                                                    <div
                                                        key={`${i}-${j}`}
                                                        className={`flex flex-col items-center justify-center rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg border-2 border-white 
                                                        ${isExpanded ? 'w-24 h-24' : 'w-12 h-12'}`}
                                                        style={{ backgroundColor: getHeatmapColor(val, maxVal) }}
                                                        title={`True Class ${i}, Predicted Class ${j}: ${val}`}
                                                    >
                                                        <span className={`font-bold ${val / maxVal > 0.5 ? 'text-white' : 'text-slate-700'} ${isExpanded ? 'text-3xl' : 'text-sm'}`}>
                                                            {val}
                                                        </span>
                                                        {isExpanded && (
                                                            <span className={`text-xs uppercase font-medium mt-1 ${val / maxVal > 0.5 ? 'text-white/80' : 'text-slate-500'}`}>
                                                                {val} samples
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {/* --- DETAILS TAB --- */}
                {activeTab === 'details' && !data.is_regression && data.report && (
                    <div className={`animate-in fade-in slide-in-from-right-4 duration-300 ${isExpanded ? 'max-w-4xl mx-auto' : ''}`}>
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className={`w-full text-left ${isExpanded ? 'text-base' : 'text-xs'}`}>
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className={`${isExpanded ? 'px-6 py-4' : 'px-3 py-2'}`}>Class</th>
                                        <th className={`${isExpanded ? 'px-6 py-4' : 'px-3 py-2'}`}>Precision</th>
                                        <th className={`${isExpanded ? 'px-6 py-4' : 'px-3 py-2'}`}>Recall</th>
                                        <th className={`${isExpanded ? 'px-6 py-4' : 'px-3 py-2'}`}>F1-Score</th>
                                        <th className={`${isExpanded ? 'px-6 py-4' : 'px-3 py-2'} text-right`}>Support</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(data.report).map(([key, metrics]: [string, any]) => {
                                        if (typeof metrics !== 'object') return null;
                                        return (
                                            <tr key={key} className="hover:bg-slate-50 transition-colors">
                                                <td className={`${isExpanded ? 'px-6 py-4' : 'px-3 py-2'} font-bold text-slate-700`}>
                                                    {['accuracy', 'macro avg', 'weighted avg'].includes(key)
                                                        ? <span className="uppercase text-slate-400 tracking-wider text-sm">{key}</span>
                                                        : <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">{key}</span>
                                                    }
                                                </td>
                                                <td className={`${isExpanded ? 'px-6 py-4' : 'px-3 py-2'} text-slate-600`}>{(metrics.precision * 100).toFixed(1)}%</td>
                                                <td className={`${isExpanded ? 'px-6 py-4' : 'px-3 py-2'} text-slate-600`}>{(metrics.recall * 100).toFixed(1)}%</td>
                                                <td className={`${isExpanded ? 'px-6 py-4' : 'px-3 py-2'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-medium text-slate-700 w-12">{(metrics['f1-score'] * 100).toFixed(1)}%</span>
                                                        {isExpanded && (
                                                            <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-[#34A853]"
                                                                    style={{ width: `${metrics['f1-score'] * 100}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className={`${isExpanded ? 'px-6 py-4' : 'px-3 py-2'} text-right text-slate-400`}>{metrics.support}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </div >
    );
}
