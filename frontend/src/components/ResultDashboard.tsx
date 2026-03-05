
import { useState } from 'react';
import {
    BarChart3, Table as TableIcon, Grid, TrendingUp,
    Activity, CheckCircle2, AlertTriangle, Repeat, Info
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ResultDashboardProps {
    data: any;
    className?: string;
    viewMode?: 'compact' | 'expanded' | 'micro';
}

export default function ResultDashboard({ data, className = '', viewMode = 'compact' }: ResultDashboardProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'details'>('overview');

    const hasResults = data.accuracy !== undefined || data.r2_score !== undefined;
    const isExpanded = viewMode === 'expanded';
    const isMicro = viewMode === 'micro';

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
    const chartHeight = isMicro ? 120 : Math.max(isExpanded ? 500 : 250, featureCount * (isExpanded ? 50 : 35));

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header / Tabs - Only show in expanded non-regression (or if needed) */}
            {!isMicro && !data.is_regression && !isExpanded && (
                <div className="flex p-1 bg-slate-100 rounded-lg">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === tab.id
                                    ? 'bg-white text-[#34A853] shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                <Icon size={14} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className={`pr-1 ${isExpanded ? 'h-full flex flex-col gap-8' : ''}`}>

                {/* === EXPANDED REPORT VIEW === */}
                {isExpanded ? (
                    <>
                        {/* 1. KPI Grid */}
                        <div className="grid grid-cols-4 gap-4">
                            {/* Main Metric */}
                            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center gap-2 text-slate-500 mb-2">
                                    <Activity size={18} className="text-[#34A853]" />
                                    <span className="font-bold text-xs uppercase tracking-wider">{data.is_regression ? 'R² SCORE' : 'ACCURACY'}</span>
                                </div>
                                <div className="text-5xl font-black text-slate-800">
                                    {/* Bug 3 fix: R² is unitless, only accuracy gets % */}
                                    {data.is_regression
                                        ? data.r2_score?.toFixed(3)
                                        : <>{(data.accuracy * 100).toFixed(1)}<span className="text-2xl text-slate-400 font-bold ml-1">%</span></>}
                                </div>
                            </div>

                            {/* Secondary Metrics */}
                            {!data.is_regression ? (
                                ['Precision', 'Recall', 'F1 Score'].map((metric, _i) => {
                                    let val = 0;
                                    if (data.report && data.report['weighted avg']) {
                                        if (metric === 'Precision') val = data.report['weighted avg']['precision'];
                                        if (metric === 'Recall') val = data.report['weighted avg']['recall'];
                                        if (metric === 'F1 Score') val = data.report['weighted avg']['f1-score'];
                                    }
                                    return (
                                        <div key={metric} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                <CheckCircle2 size={18} className="text-blue-500" />
                                                <span className="font-bold text-xs uppercase tracking-wider">{metric}</span>
                                            </div>
                                            <div className="text-4xl font-bold text-slate-700">
                                                {(val * 100).toFixed(1)}<span className="text-xl text-slate-400 ml-1">%</span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-3 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                                        <TrendingUp size={18} className="text-blue-500" />
                                        <span className="font-bold text-xs uppercase tracking-wider">MEAN SQUARED ERROR</span>
                                    </div>
                                    <div className="text-4xl font-bold text-slate-700">
                                        {data.mse?.toFixed(4)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Charts Row (Split View) */}
                        <div className={`grid ${!data.is_regression && data.confusion_matrix ? 'grid-cols-2' : 'grid-cols-1'} gap-8 min-h-[400px]`}>
                            {/* Feature Importance */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={20} /></div>
                                        <h3 className="font-bold text-slate-800 text-lg">Feature Importance</h3>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={data.feature_importance}
                                            layout="vertical"
                                            margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
                                            barSize={20}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.5} />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={140}
                                                tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#f1f5f9' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {data.feature_importance.map((_entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={index < 3 ? '#34A853' : '#cbd5e1'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Confusion Matrix */}
                            {!data.is_regression && data.confusion_matrix && (
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Grid size={20} /></div>
                                            <h3 className="font-bold text-slate-800 text-lg">Confusion Matrix</h3>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex items-center justify-center relative">
                                        {/* Labels */}
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-slate-400 tracking-widest">TRUE LABEL</div>
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 tracking-widest">PREDICTED</div>

                                        <div className="grid gap-2 p-4"
                                            style={{ gridTemplateColumns: `repeat(${data.confusion_matrix.length}, minmax(0, 1fr))` }}>
                                            {data.confusion_matrix.map((row: number[], i: number) =>
                                                row.map((val: number, j: number) => {
                                                    const maxVal = Math.max(...data.confusion_matrix.flat());
                                                    return (
                                                        <div
                                                            key={`${i}-${j}`}
                                                            className="w-20 h-20 flex flex-col items-center justify-center rounded-xl transition-all hover:scale-105"
                                                            style={{ backgroundColor: getHeatmapColor(val, maxVal) }}
                                                            title={`True: ${i}, Pred: ${j}`}
                                                        >
                                                            <span className={`font-bold text-2xl ${val / maxVal > 0.5 ? 'text-white' : 'text-slate-700'}`}>{val}</span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. Detailed Table */}
                        {!data.is_regression && data.report && (
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><TableIcon size={20} /></div>
                                    <h3 className="font-bold text-slate-800 text-lg">Classification Report</h3>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                                            <tr>
                                                <th className="px-8 py-4">Class</th>
                                                <th className="px-8 py-4">Precision</th>
                                                <th className="px-8 py-4">Recall</th>
                                                <th className="px-8 py-4">F1-Score</th>
                                                <th className="px-8 py-4 text-right">Support</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {Object.entries(data.report).map(([key, metrics]: [string, any]) => {
                                                if (typeof metrics !== 'object') return null;
                                                return (
                                                    <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-8 py-4 font-bold text-slate-700">
                                                            {['accuracy', 'macro avg', 'weighted avg'].includes(key)
                                                                ? <span className="uppercase text-slate-400 tracking-wider text-xs">{key}</span>
                                                                : <span className="bg-slate-100 px-3 py-1 rounded text-slate-600 text-sm">{key}</span>
                                                            }
                                                        </td>
                                                        <td className="px-8 py-4 text-slate-600">{(metrics.precision * 100).toFixed(1)}%</td>
                                                        <td className="px-8 py-4 text-slate-600">{(metrics.recall * 100).toFixed(1)}%</td>
                                                        <td className="px-8 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-medium text-slate-700 w-12">{(metrics['f1-score'] * 100).toFixed(1)}%</span>
                                                                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-[#34A853]" style={{ width: `${metrics['f1-score'] * 100}%` }} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-4 text-right text-slate-400 font-mono">{metrics.support}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {/* 4. Overfitting Analysis (Expanded) */}
                        {data.overfitting_analysis && (
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2 rounded-lg ${data.overfitting_analysis.status === 'good' ? 'bg-green-50 text-green-600' :
                                        data.overfitting_analysis.status === 'moderate' ? 'bg-yellow-50 text-yellow-600' :
                                            'bg-red-50 text-red-600'
                                        }`}>
                                        <AlertTriangle size={20} />
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-lg">Overfitting Analysis</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Train Score</div>
                                        <div className="text-2xl font-bold text-slate-700">
                                            {data.is_regression
                                                ? data.overfitting_analysis.train_score?.toFixed(3)
                                                : `${(data.overfitting_analysis.train_score * 100).toFixed(1)}%`}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Test Score</div>
                                        <div className="text-2xl font-bold text-slate-700">
                                            {data.is_regression
                                                ? data.overfitting_analysis.test_score?.toFixed(3)
                                                : `${(data.overfitting_analysis.test_score * 100).toFixed(1)}%`}
                                        </div>
                                    </div>
                                    <div className={`p-4 rounded-xl ${data.overfitting_analysis.status === 'good' ? 'bg-green-50' :
                                        data.overfitting_analysis.status === 'moderate' ? 'bg-yellow-50' :
                                            'bg-red-50'
                                        }`}>
                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Gap</div>
                                        <div className={`text-2xl font-bold ${data.overfitting_analysis.status === 'good' ? 'text-green-600' :
                                            data.overfitting_analysis.status === 'moderate' ? 'text-yellow-600' :
                                                'text-red-600'
                                            }`}>
                                            {data.is_regression
                                                ? data.overfitting_analysis.gap?.toFixed(3)
                                                : `${(data.overfitting_analysis.gap * 100).toFixed(1)}%`}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600">{data.overfitting_analysis.message}</p>
                            </div>
                        )}

                        {/* 5. Cross-Validation Results (Expanded) */}
                        {data.cross_validation && (
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Repeat size={20} /></div>
                                    <h3 className="font-bold text-slate-800 text-lg">Cross-Validation ({data.cross_validation.folds}-Fold)</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="p-4 bg-indigo-50 rounded-xl">
                                        <div className="text-xs font-bold text-indigo-400 uppercase mb-1">Mean Score</div>
                                        <div className="text-3xl font-bold text-indigo-700">
                                            {data.is_regression
                                                ? data.cross_validation.mean?.toFixed(3)
                                                : `${(data.cross_validation.mean * 100).toFixed(1)}%`}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Std Deviation</div>
                                        <div className="text-3xl font-bold text-slate-700">
                                            {data.is_regression
                                                ? `±${data.cross_validation.std?.toFixed(3)}`
                                                : `±${(data.cross_validation.std * 100).toFixed(2)}%`}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {data.cross_validation.scores?.map((score: number, i: number) => (
                                        <div key={i} className="flex-1 p-2 bg-slate-50 rounded-lg text-center">
                                            <div className="text-xs text-slate-400 mb-0.5">Fold {i + 1}</div>
                                            <div className="text-sm font-bold text-slate-700">
                                                {data.is_regression
                                                    ? score.toFixed(3)
                                                    : `${(score * 100).toFixed(1)}%`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 6. Pipeline Warnings (Expanded) */}
                        {data.warnings && data.warnings.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Info size={16} className="text-amber-600" />
                                    <span className="font-bold text-amber-700 text-sm">Pipeline Warnings</span>
                                </div>
                                <ul className="space-y-1">
                                    {data.warnings.map((w: string, i: number) => (
                                        <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                                            <span className="text-amber-400 mt-0.5">•</span>
                                            {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* --- COMPACT / MICRO VIEW (UNCHANGED LOGIC) --- */}
                        {(activeTab === 'overview' || data.is_regression) && (
                            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                                {/* Primary Score & Grid Container */}
                                {!isMicro && (
                                    <div className="grid grid-cols-1 gap-4">

                                        {/* Primary Score */}
                                        <div className="flex flex-col items-center justify-center bg-[#34A853]/5 border border-[#34A853]/20 rounded-2xl p-4">
                                            <span className="text-[#1e8e3e] font-semibold uppercase mb-2 block text-sm">
                                                {data.is_regression ? 'R² Score' : 'Model Accuracy'}
                                            </span>
                                            <div className="font-bold text-[#34A853] text-5xl">
                                                {/* Bug 3 fix: R² is unitless */}
                                                {data.is_regression
                                                    ? data.r2_score?.toFixed(3)
                                                    : `${(data.accuracy * 100).toFixed(1)}%`}
                                            </div>
                                        </div>

                                        {/* Secondary Metrics Grid */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {data.is_regression ? (
                                                // Bug 7 fix: show MSE, RMSE, MAE, R² Train in compact regression view
                                                <>
                                                    {[
                                                        { label: 'MSE', value: data.mse?.toFixed(4) },
                                                        { label: 'RMSE', value: data.rmse?.toFixed(4) },
                                                        { label: 'MAE', value: data.mae?.toFixed(4) },
                                                        { label: 'Train R²', value: data.train_r2?.toFixed(3) },
                                                    ].map(({ label, value }) => (
                                                        <div key={label} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-center">
                                                            <div className="flex items-center gap-2 mb-1 text-slate-500">
                                                                <TrendingUp size={12} />
                                                                <span className="text-xs font-bold uppercase">{label}</span>
                                                            </div>
                                                            <span className="text-xl font-bold text-slate-700">{value ?? 'N/A'}</span>
                                                        </div>
                                                    ))}
                                                </>
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
                                                            <div key={metric} className={`p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-center ${i === 2 ? 'col-span-2' : ''}`}>
                                                                <div className="flex items-center gap-2 mb-1 text-slate-500">
                                                                    <CheckCircle2 size={12} />
                                                                    <span className="text-xs font-bold uppercase">{metric}</span>
                                                                </div>
                                                                <span className="text-xl font-bold text-slate-700">{(val * 100).toFixed(1)}%</span>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Feature Importance */}
                                {data.feature_importance && data.feature_importance.length > 0 && (
                                    <div className={`${isMicro ? '' : 'bg-white rounded-2xl border border-slate-200 mt-4'}`}>
                                        {!isMicro && (
                                            <div className="flex items-center gap-2 mb-4 text-slate-600">
                                                <BarChart3 size={16} />
                                                <span className="text-sm font-semibold uppercase tracking-wide">Feature Importance</span>
                                            </div>
                                        )}

                                        {/* Dynamic Height based on feature count to ensure gaps and readability */}
                                        <div style={{ height: chartHeight }} className="w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={isMicro ? data.feature_importance.slice(0, 5) : data.feature_importance}
                                                    layout="vertical"
                                                    margin={{ left: 10, right: 10 }}
                                                    barSize={isMicro ? 12 : 16}
                                                    barGap={4}
                                                >
                                                    {!isMicro && <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />}
                                                    <XAxis type="number" hide />
                                                    <YAxis
                                                        dataKey="name"
                                                        type="category"
                                                        width={isMicro ? 80 : 100}
                                                        tick={{ fontSize: 10, fill: '#475569', fontWeight: 500 }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        interval={0} // Force showing all labels
                                                    />
                                                    {!isMicro && (
                                                        <Tooltip
                                                            cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                        />
                                                    )}
                                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                        {data.feature_importance.slice(0, isMicro ? 5 : undefined).map((_entry: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={index < 3 ? '#34A853' : '#94a3b8'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {/* Confusion Matrix (Compact) */}
                                {!data.is_regression && data.confusion_matrix && (
                                    <div className={`${isMicro ? '' : 'flex flex-col items-center justify-center py-4 bg-white rounded-2xl border border-slate-200 mt-4'}`}>
                                        {!isMicro && (
                                            <div className="flex items-center gap-2 mb-6 text-slate-600 self-start px-4">
                                                <Grid size={16} />
                                                <span className="text-sm font-semibold uppercase tracking-wide">Confusion Matrix</span>
                                            </div>
                                        )}

                                        <div className="relative">
                                            {/* Y Axis Label */}
                                            {!isMicro && (
                                                <div className="absolute top-1/2 -translate-y-1/2 -rotate-90 font-bold text-slate-400 tracking-widest -left-6 text-xs">
                                                    TRUE
                                                </div>
                                            )}

                                            {/* X Axis Label */}
                                            {!isMicro && (
                                                <div className="absolute left-1/2 -translate-x-1/2 font-bold text-slate-400 tracking-widest -top-5 text-xs">
                                                    PREDICTED
                                                </div>
                                            )}

                                            <div className={`grid gap-1 bg-slate-50/0 ${isMicro ? 'gap-0.5' : 'p-4 rounded-2xl border border-slate-200 shadow-sm gap-2'}`}
                                                style={{ gridTemplateColumns: `repeat(${data.confusion_matrix.length}, minmax(0, 1fr))` }}>
                                                {data.confusion_matrix.map((row: number[], i: number) =>
                                                    row.map((val: number, j: number) => {
                                                        const maxVal = Math.max(...data.confusion_matrix.flat());
                                                        return (
                                                            <div
                                                                key={`${i}-${j}`}
                                                                className={`flex flex-col items-center justify-center rounded-sm transition-all duration-300 ${!isMicro && 'hover:scale-110 hover:shadow-lg border-2 border-white'}
                                                        ${isMicro ? 'w-6 h-6' : 'w-12 h-12'}`}
                                                                style={{ backgroundColor: getHeatmapColor(val, maxVal) }}
                                                                title={`True Class ${i}, Predicted Class ${j}: ${val}`}
                                                            >
                                                                {!isMicro && (
                                                                    <span className={`font-bold ${val / maxVal > 0.5 ? 'text-white' : 'text-slate-700'} text-sm`}>
                                                                        {val}
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

                        {/* --- DETAILS TAB (Legacy/Compact) --- */}
                        {activeTab === 'details' && !data.is_regression && data.report && !isExpanded && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* ... (Existing compact table logic if needed, largely replaced by Expanded View) ... */}
                                <div className="p-4 text-center text-slate-400 text-sm">
                                    View full report for details.
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div >
    );
}
