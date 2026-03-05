import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Eye, X, Table2, Loader2, AlertCircle, Rows3, Columns3, Hash } from 'lucide-react';
import { toast } from 'sonner';
import DataTableModal from '../DataTableModal';
import type { PreviewResult } from '../DataTableModal';

interface ViewDatasetNodeProps {
    id: string;
    data: any;
}

function ViewDatasetNode({ id, data }: ViewDatasetNodeProps) {
    const [isPeeking, setIsPeeking] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    const previewResult: PreviewResult | null = data.previewResult || null;

    const handlePeek = async () => {
        if (!data.onPeek) {
            toast.error('Node not ready. Drop it on the canvas first.');
            return;
        }
        setIsPeeking(true);
        try {
            await data.onPeek(id);
            setModalOpen(true);
        } catch {
            // error is already toasted by App.tsx handlePeek
        } finally {
            setIsPeeking(false);
        }
    };

    const totalNulls = previewResult
        ? previewResult.col_stats.reduce((s, c) => s + c.nulls, 0)
        : null;

    return (
        <>
            {/* ── Node Card ──────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-teal-200 min-w-[240px] overflow-hidden hover:shadow-xl transition-all duration-200">

                {/* Left (input) handle */}
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-3 !h-3 !bg-teal-400 !border-2 !border-white"
                />

                {/* Right (output / pass-through) handle */}
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-3 !h-3 !bg-teal-400 !border-2 !border-white"
                />

                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Table2 size={16} className="text-white" />
                        <span className="text-white font-semibold text-sm">View Dataset</span>
                        {/* Pass-through badge */}
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white/90 uppercase tracking-wide">
                            pass-through
                        </span>
                    </div>
                    <button
                        onClick={() => data.onDelete?.(id)}
                        className="text-white/70 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                    {/* Info banner */}
                    <div className="flex items-start gap-2 text-[11px] text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
                        <Eye size={12} className="shrink-0 mt-0.5" />
                        <span>Insert anywhere in your pipeline to probe the data at that exact point.</span>
                    </div>

                    {/* Stats section — shown after a successful peek */}
                    {previewResult ? (
                        <div className="space-y-2">
                            {/* Shape */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50 rounded-lg px-2 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
                                        <Rows3 size={11} />
                                        <span className="text-[10px]">Rows</span>
                                    </div>
                                    <div className="font-bold text-sm text-slate-800">
                                        {previewResult.total_rows_in_dataset.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-lg px-2 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
                                        <Columns3 size={11} />
                                        <span className="text-[10px]">Cols</span>
                                    </div>
                                    <div className="font-bold text-sm text-slate-800">
                                        {previewResult.cols}
                                    </div>
                                </div>
                                <div className={`rounded-lg px-2 py-2 text-center ${totalNulls! > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                                    <div className={`flex items-center justify-center gap-1 mb-0.5 ${totalNulls! > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        <AlertCircle size={11} />
                                        <span className="text-[10px]">Nulls</span>
                                    </div>
                                    <div className={`font-bold text-sm ${totalNulls! > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {totalNulls!.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Column list (first 6) */}
                            <div>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Columns</p>
                                <div className="flex flex-wrap gap-1">
                                    {previewResult.columns.slice(0, 6).map(col => (
                                        <span key={col} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-medium">
                                            <Hash size={8} />
                                            {col.length > 14 ? col.slice(0, 14) + '…' : col}
                                        </span>
                                    ))}
                                    {previewResult.columns.length > 6 && (
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-medium">
                                            +{previewResult.columns.length - 6} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Open Table button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
                                className="nodrag nopan w-full py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Table2 size={13} />
                                Open Full Table
                            </button>
                        </div>
                    ) : (
                        /* No data yet — show Preview button */
                        <div className="flex flex-col items-center gap-3 py-2">
                            <div className="text-center">
                                <p className="text-xs text-slate-400">No preview yet</p>
                                <p className="text-[10px] text-slate-300 mt-0.5">Connect nodes and click Preview</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePeek(); }}
                                disabled={isPeeking}
                                className="nodrag nopan w-full py-2 rounded-lg bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            >
                                {isPeeking
                                    ? <><Loader2 size={13} className="animate-spin" /> Fetching…</>
                                    : <><Eye size={13} /> Preview Data</>
                                }
                            </button>
                        </div>
                    )}

                    {/* Refresh button when data exists */}
                    {previewResult && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePeek(); }}
                            disabled={isPeeking}
                            className="nodrag nopan w-full py-1.5 rounded-lg border border-teal-200 hover:bg-teal-50 disabled:opacity-50 text-teal-600 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                            {isPeeking
                                ? <><Loader2 size={11} className="animate-spin" /> Refreshing…</>
                                : <><Eye size={11} /> Refresh Preview</>
                            }
                        </button>
                    )}
                </div>
            </div>

            {/* ── Full Table Modal ────────────────────────────────────────────── */}
            <DataTableModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                result={previewResult}
                title="Dataset State at This Point"
            />
        </>
    );
}

export default memo(ViewDatasetNode);
