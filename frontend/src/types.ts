export interface PipelineResult {
    is_regression?: boolean;
    accuracy?: number;
    r2_score?: number;
    mse?: number;
    mae?: number;
    classification_report?: any;
    confusion_matrix?: any;
    feature_importance?: { name: string; value: number }[];
    error?: string;
    [key: string]: any;
}

export interface NodeData {
    label: string;
    onChange: (id: string, data: any) => void;
    onDelete: (id: string) => void;

    // Specific fields
    file?: File | null;
    file_id?: string;
    columns?: string[];
    targetColumn?: string;
    testSize?: number;
    modelType?: string;
    scaler?: string;
    strategy?: string; // Imputer strategy

    // Results
    results?: PipelineResult;

    [key: string]: any;
}
