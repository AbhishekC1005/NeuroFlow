import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    X, ArrowUpDown, ArrowUp, ArrowDown, Search, Download,
    Hash, Type, Calendar, ChevronRight, BarChart2, AlertCircle, CheckCircle2
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ColStat {
    name: string;
    type: 'numeric' | 'text' | 'datetime';
    dtype: string;
    nulls: number;
    unique: number;
    min?: number | null;
    max?: number | null;
    mean?: number | null;
}

export interface PreviewResult {
    rows: number;
    cols: number;
    columns: string[];
    col_stats: ColStat[];
    data: Record<string, any>[];
    total_rows_in_dataset: number;
}

interface DataTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: PreviewResult | null;
    title?: string;
}

type SortDir = 'asc' | 'desc' | null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCell(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') {
        if (Number.isInteger(val)) return String(val);
        return val.toFixed(4).replace(/\.?0+$/, '');
    }
    return String(val).slice(0, 120);
}

function isMissing(val: any): boolean {
    return val === null || val === undefined || val === '';
}

function escapeCSV(val: any): string {
    const s = formatCell(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeBadge({ type, dtype }: { type: ColStat['type']; dtype: string }) {
    if (type === 'numeric') return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">
            <Hash size={9} />{dtype}
        </span>
    );
    if (type === 'datetime') return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-600">
            <Calendar size={9} />{dtype}
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600">
            <Type size={9} />{dtype}
        </span>
    );
}

function NullBadge({ nulls, total }: { nulls: number; total: number }) {
    if (nulls === 0) return (
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
            <CheckCircle2 size={10} />0
        </span>
    );
    const pct = total > 0 ? Math.round((nulls / total) * 100) : 0;
    const color = pct > 20 ? 'text-red-500' : 'text-amber-500';
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${color}`}>
            <AlertCircle size={10} />{nulls} ({pct}%)
        </span>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DataTableModal({ isOpen, onClose, result, title }: DataTableModalProps) {
    const [search, setSearch] = useState('');
    const [sortCol, setSortCol] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);
    const [showStats, setShowStats] = useState(false);
    const [pageSize] = useState(100);

    // ── ALL hooks must run before any early return (Rules of Hooks) ───────────
    const columns = result?.columns ?? [];
    const col_stats = result?.col_stats ?? [];
    const data = result?.data ?? [];
    const rows = result?.rows ?? 0;
    const cols = result?.cols ?? 0;
    const total_rows_in_dataset = result?.total_rows_in_dataset ?? 0;

    // ── Sort handler ──────────────────────────────────────────────────────────
    const handleSort = useCallback((col: string) => {
        if (sortCol !== col) { setSortCol(col); setSortDir('asc'); return; }
        if (sortDir === 'asc') { setSortDir('desc'); return; }
        setSortCol(null); setSortDir(null);
    }, [sortCol, sortDir]);

    // ── Filtered + sorted data ────────────────────────────────────────────────
    const processed = useMemo(() => {
        let d = data;
        if (search.trim()) {
            const q = search.toLowerCase();
            d = d.filter(row =>
                columns.some(col => String(row[col] ?? '').toLowerCase().includes(q))
            );
        }
        if (sortCol && sortDir) {
            d = [...d].sort((a, b) => {
                const av = a[sortCol], bv = b[sortCol];
                if (av === null || av === undefined) return 1;
                if (bv === null || bv === undefined) return -1;
                const cmp = av < bv ? -1 : av > bv ? 1 : 0;
                return sortDir === 'asc' ? cmp : -cmp;
            });
        }
        return d;
    }, [data, search, sortCol, sortDir, columns]);

    const displayed = processed.slice(0, pageSize);

    // ── Export CSV ────────────────────────────────────────────────────────────
    const exportCSV = useCallback(() => {
        const header = columns.map(escapeCSV).join(',');
        const body = processed.map(row =>
            columns.map(col => escapeCSV(row[col])).join(',')
        ).join('\n');
        const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dataset_preview_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [columns, processed]);

    // ── Find col stat quickly ─────────────────────────────────────────────────
    const statMap = useMemo(() => {
        const m: Record<string, ColStat> = {};
        col_stats.forEach(s => { m[s.name] = s; });
        return m;
    }, [col_stats]);

    const totalNulls = col_stats.reduce((s, c) => s + c.nulls, 0);

    // Early return AFTER all hooks
    if (!isOpen || !result) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-[95vw] max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="px-5 py-3.5 flex items-center justify-between bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
                            <BarChart2 size={18} className="text-teal-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base leading-tight">
                                {title || 'Dataset Preview'}
                            </h3>
                            <p className="text-slate-500 text-xs">
                                {total_rows_in_dataset.toLocaleString()} rows × {cols} columns
                                {totalNulls > 0 &&
                                    <span className="ml-2 text-amber-500 font-medium">
                                        · {totalNulls} nulls
                                    </span>
                                }
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowStats(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${showStats ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}
                        >
                            <BarChart2 size={13} />
                            Column Stats
                            <ChevronRight size={12} className={`transition-transform ${showStats ? 'rotate-90' : ''}`} />
                        </button>
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 text-white hover:bg-teal-600 transition-colors"
                        >
                            <Download size={13} />
                            Export CSV
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Column Stats Panel (collapsible) ───────────────────────── */}
                {showStats && (
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 shrink-0 overflow-x-auto">
                        <div className="flex gap-3 min-w-max">
                            {col_stats.map(stat => (
                                <div key={stat.name} className="bg-white border border-slate-200 rounded-xl p-3 min-w-[160px]">
                                    <div className="font-semibold text-xs text-slate-800 truncate mb-1.5" title={stat.name}>
                                        {stat.name}
                                    </div>
                                    <TypeBadge type={stat.type} dtype={stat.dtype} />
                                    <div className="mt-2 space-y-1">
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-slate-400">Nulls</span>
                                            <NullBadge nulls={stat.nulls} total={rows} />
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-slate-400">Unique</span>
                                            <span className="font-semibold text-slate-600">{stat.unique.toLocaleString()}</span>
                                        </div>
                                        {stat.type === 'numeric' && (
                                            <>
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-slate-400">Min</span>
                                                    <span className="font-mono text-slate-600">{stat.min ?? '—'}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-slate-400">Max</span>
                                                    <span className="font-mono text-slate-600">{stat.max ?? '—'}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-slate-400">Mean</span>
                                                    <span className="font-mono text-slate-600">{stat.mean ?? '—'}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Toolbar ─────────────────────────────────────────────────── */}
                <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-3 shrink-0">
                    <div className="relative flex-1 max-w-xs">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search all cells…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-8 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 bg-slate-50"
                        />
                    </div>
                    <span className="text-xs text-slate-400 font-medium ml-auto">
                        Showing {displayed.length.toLocaleString()} of {processed.length.toLocaleString()} rows
                        {processed.length < data.length && <span className="text-amber-500 ml-1">(filtered)</span>}
                    </span>
                </div>

                {/* ── Table ───────────────────────────────────────────────────── */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs border-collapse">
                        {/* Column Headers */}
                        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                            <tr>
                                {/* Row number column */}
                                <th className="px-2 py-2 text-center text-slate-400 font-medium w-10 border-r border-slate-100">
                                    #
                                </th>
                                {columns.map(col => {
                                    const stat = statMap[col];
                                    const isActive = sortCol === col;
                                    return (
                                        <th
                                            key={col}
                                            className="px-3 py-2 text-left font-semibold text-slate-700 cursor-pointer select-none whitespace-nowrap border-r border-slate-100 hover:bg-slate-100 transition-colors group"
                                            onClick={() => handleSort(col)}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span className="truncate max-w-[120px]" title={col}>{col}</span>
                                                {stat && <TypeBadge type={stat.type} dtype={stat.dtype} />}
                                                <span className="opacity-0 group-hover:opacity-100 ml-auto transition-opacity">
                                                    {isActive && sortDir === 'asc' && <ArrowUp size={11} className="text-teal-500" />}
                                                    {isActive && sortDir === 'desc' && <ArrowDown size={11} className="text-teal-500" />}
                                                    {!isActive && <ArrowUpDown size={11} className="text-slate-300" />}
                                                </span>
                                            </div>
                                            {stat && stat.nulls > 0 && (
                                                <div className="text-[9px] text-amber-400 font-normal mt-0.5">
                                                    {stat.nulls} nulls
                                                </div>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        {/* Body */}
                        <tbody>
                            {displayed.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center py-16 text-slate-400">
                                        <Search size={24} className="mx-auto mb-2 opacity-30" />
                                        No rows match "{search}"
                                    </td>
                                </tr>
                            ) : (
                                displayed.map((row, ri) => (
                                    <tr
                                        key={ri}
                                        className="border-b border-slate-50 hover:bg-teal-50/30 transition-colors"
                                    >
                                        <td className="px-2 py-1.5 text-center text-slate-300 font-mono border-r border-slate-100 w-10">
                                            {ri + 1}
                                        </td>
                                        {columns.map(col => {
                                            const val = row[col];
                                            const missing = isMissing(val);
                                            const stat = statMap[col];
                                            return (
                                                <td
                                                    key={col}
                                                    className={`px-3 py-1.5 border-r border-slate-50 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis ${missing ? 'text-rose-300 italic' : stat?.type === 'numeric' ? 'font-mono text-slate-700' : 'text-slate-700'}`}
                                                    title={missing ? 'null / missing' : formatCell(val)}
                                                >
                                                    {missing ? <span className="opacity-50">null</span> : formatCell(val)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {processed.length > pageSize && (
                        <div className="py-3 text-center text-xs text-slate-400 border-t border-slate-50">
                            Showing first {pageSize} of {processed.length.toLocaleString()} rows.
                            Use Export CSV to get all data.
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
