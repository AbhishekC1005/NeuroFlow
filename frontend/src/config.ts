export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const NODE_COLORS: Record<string, string> = {
    dataset: '#06b6d4',
    imputation: '#F97316',
    encoding: '#8B5CF6',
    preprocessing: '#eab308',
    split: '#d946ef',
    model: '#f43f5e',
    result: '#10b981',
    outlier: '#f59e0b',
    featureSelection: '#14b8a6',
    duplicate: '#f43f5e',
    crossValidation: '#6366f1',
    pca: '#0ea5e9',
    featureEngineering: '#84cc16',
    classBalancing: '#d946ef',
    default: '#64748b'
};

export const DEFAULT_EDGE_STYLE = {
    stroke: '#bdc1c6',
    strokeWidth: 2
};
