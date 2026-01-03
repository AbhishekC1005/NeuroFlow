export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const NODE_COLORS: Record<string, string> = {
    dataset: '#06b6d4',
    imputation: '#F97316',
    encoding: '#8B5CF6',
    preprocessing: '#eab308',
    split: '#d946ef',
    model: '#f43f5e',
    result: '#10b981',
    default: '#64748b'
};

export const DEFAULT_EDGE_STYLE = {
    stroke: '#bdc1c6',
    strokeWidth: 2
};
