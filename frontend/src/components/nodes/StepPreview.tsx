import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, X, TrendingDown, TrendingUp, Minus, Table as TableIcon, Columns, ArrowRight } from 'lucide-react';

interface StepPreviewProps {
    stepPreview: {
        step: string;
        rows: number;
        cols: number;
        columns: string[];
        sample: Record<string, any>[];
        delta?: {
            rows: number;
            cols: number;
        };
    };
    accentColor?: string;
}

const stepLabels: Record<string, string> = {
    dataset: 'After Loading Dataset',
    split: 'After Train-Test Split',
    duplicate: 'After Duplicate Removal',
    outlier: 'After Outlier Handling',
    imputation: 'After Missing Value Imputation',
    encoding: 'After Categorical Encoding',
    preprocessing: 'After Feature Scaling',
    featureSelection: 'After Feature Selection',
    featureEngineering: 'After Feature Engineering',
    pca: 'After PCA Reduction',
    classBalancing: 'After Class Balancing',
    model: 'Data Entering Model Training',
};

function StepPreview({ stepPreview, accentColor = '#4285F4' }: StepPreviewProps) {
    const [modalOpen, setModalOpen] = useState(false);

    if (!stepPreview) return null;

    const { step, rows, cols, columns, sample, delta } = stepPreview;

    const getDeltaBadge = (val: number, label: string) => {
        if (val === 0) return null;
        const isPositive = val > 0;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {isPositive ? '+' : ''}{val} {label}
            </span>
        );
    };

    return (
        <>
            {/* Compact bar with eye button */}
            <div className="border-t border-dashed border-slate-200 mt-2 pt-2">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <div
                            className="w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{ backgroundColor: accentColor }}
                        />
                        <span className="font-mono">{rows} × {cols}</span>
                        {delta && delta.rows !== 0 && (
                            <span className={`text-[10px] font-bold ${delta.rows > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                ({delta.rows > 0 ? '+' : ''}{delta.rows})
                            </span>
                        )}
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        title="View full data preview"
                    >
                        <Eye size={14} />
                    </button>
                </div>
            </div>

            {/* Full Preview Modal */}
            {modalOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-6 animate-in fade-in duration-150"
                    onClick={() => setModalOpen(false)}
                >
                    <div
                        className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div
                            className="px-6 py-4 flex items-center justify-between shrink-0"
                            style={{ background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)` }}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                                >
                                    <TableIcon size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">
                                        {stepLabels[step] || `Step: ${step}`}
                                    </h3>
                                    <p className="text-slate-500 text-sm">
                                        Training data snapshot • {rows} rows × {cols} columns
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Stats Bar */}
                        <div className="px-6 py-3 bg-slate-50 border-y border-slate-100 flex items-center gap-4 flex-wrap shrink-0">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="font-medium">{rows.toLocaleString()}</span>
                                <span className="text-slate-400">rows</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Columns size={14} className="text-slate-400" />
                                <span className="font-medium">{cols}</span>
                                <span className="text-slate-400">features</span>
                            </div>
                            {delta && (
                                <>
                                    <div className="w-px h-4 bg-slate-200" />
                                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                        <ArrowRight size={12} />
                                        <span>Changes:</span>
                                    </div>
                                    {delta.rows !== 0 && getDeltaBadge(delta.rows, 'rows')}
                                    {delta.cols !== 0 && getDeltaBadge(delta.cols, 'cols')}
                                    {delta.rows === 0 && delta.cols === 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                            <Minus size={12} />
                                            No shape change
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Column Chips */}
                        <div className="px-6 py-3 shrink-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Column Names</p>
                            <div className="flex flex-wrap gap-1.5">
                                {columns.map((col, i) => (
                                    <span
                                        key={col}
                                        className="text-xs px-2.5 py-1 rounded-lg font-mono font-medium border transition-colors"
                                        style={{
                                            backgroundColor: `${accentColor}08`,
                                            borderColor: `${accentColor}25`,
                                            color: accentColor
                                        }}
                                    >
                                        {col}
                                    </span>
                                ))}
                                {columns.length === 20 && (
                                    <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 font-medium">
                                        + more...
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="flex-1 overflow-auto px-6 pb-6">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sample Data (3 rows)</p>
                            {sample && sample.length > 0 ? (
                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50">
                                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-10">#</th>
                                                    {Object.keys(sample[0]).map((key) => (
                                                        <th
                                                            key={key}
                                                            className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap"
                                                        >
                                                            {key}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sample.map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-2.5 text-xs font-mono text-slate-300 border-b border-slate-100">{i + 1}</td>
                                                        {Object.values(row).map((val, j) => (
                                                            <td key={j} className="px-4 py-2.5 border-b border-slate-100 whitespace-nowrap">
                                                                {val === null ? (
                                                                    <span className="px-2 py-0.5 bg-red-50 text-red-400 rounded text-xs font-mono italic">null</span>
                                                                ) : typeof val === 'number' ? (
                                                                    <span className="font-mono text-blue-600 font-medium">{val}</span>
                                                                ) : (
                                                                    <span className="text-slate-700">{String(val)}</span>
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    No sample data available
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default memo(StepPreview);
