import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';
import {
    ArrowLeft, ArrowRight, LayoutTemplate, Database, LineChart,
    BrainCircuit, AlertTriangle, Scale, Filter, Repeat,
    Minimize2, Wrench, Search
} from 'lucide-react';
import logo from '../assets/image.png';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

// Import actual nodes for realistic preview
import DatasetNode from './nodes/DatasetNode';
import PreprocessingNode from './nodes/PreprocessingNode';
import ImputationNode from './nodes/ImputationNode';
import EncodingNode from './nodes/EncodingNode';
import SplitNode from './nodes/SplitNode';
import ModelNode from './nodes/ModelNode';
import ResultNode from './nodes/ResultNode';
import OutlierNode from './nodes/OutlierNode';
import FeatureSelectionNode from './nodes/FeatureSelectionNode';
import DuplicateNode from './nodes/DuplicateNode';
import CrossValidationNode from './nodes/CrossValidationNode';
import PCANode from './nodes/PCANode';
import FeatureEngineeringNode from './nodes/FeatureEngineeringNode';
import ClassBalancingNode from './nodes/ClassBalancingNode';

const nodeTypes = {
    dataset: DatasetNode,
    imputation: ImputationNode,
    encoding: EncodingNode,
    preprocessing: PreprocessingNode,
    split: SplitNode,
    model: ModelNode,
    result: ResultNode,
    outlier: OutlierNode,
    featureSelection: FeatureSelectionNode,
    duplicate: DuplicateNode,
    crossValidation: CrossValidationNode,
    pca: PCANode,
    featureEngineering: FeatureEngineeringNode,
    classBalancing: ClassBalancingNode,
};

// ─────────────────────────────────────────────
//  CATEGORIES
// ─────────────────────────────────────────────
const categories = [
    { id: 'all', label: 'All Templates', icon: LayoutTemplate },
    { id: 'beginner', label: 'Beginner', icon: LineChart },
    { id: 'classification', label: 'Classification', icon: BrainCircuit },
    { id: 'regression', label: 'Regression', icon: LineChart },
    { id: 'data-quality', label: 'Data Quality', icon: Database },
    { id: 'advanced', label: 'Advanced', icon: Wrench },
];

// ─────────────────────────────────────────────
//  TEMPLATE DATA
// ─────────────────────────────────────────────
const templates = [
    // ── 1. BEGINNER: Simple Linear Regression ──
    {
        id: 'simple-linear',
        name: 'Simple Linear Regression',
        description: 'The simplest pipeline: load a dataset, split, train, and evaluate. Great for your first experiment.',
        category: 'beginner',
        difficulty: 'Easy',
        nodes: [
            { id: 't1-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Housing Data' } },
            { id: 't1-2', type: 'split', position: { x: 400, y: 100 }, data: { label: 'Train/Test Split', testSize: 0.2 } },
            { id: 't1-3', type: 'model', position: { x: 800, y: 100 }, data: { label: 'Linear Regression', modelType: 'Linear Regression' } },
            { id: 't1-4', type: 'result', position: { x: 1200, y: 100 }, data: { label: 'Results' } },
        ],
        edges: [
            { id: 'e1-1', source: 't1-1', target: 't1-2' },
            { id: 'e1-2', source: 't1-2', target: 't1-3' },
            { id: 'e1-3', source: 't1-3', target: 't1-4' },
        ],
        icon: <LineChart className="text-blue-500" size={24} />,
        color: 'blue'
    },

    // ── 2. BEGINNER: Classification Starter ──
    {
        id: 'classification-starter',
        name: 'Classification Starter',
        description: 'Basic classification pipeline with encoding for categorical features. Perfect for datasets like Titanic or Iris.',
        category: 'beginner',
        difficulty: 'Easy',
        nodes: [
            { id: 't2-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Iris Dataset' } },
            { id: 't2-2', type: 'encoding', position: { x: 400, y: 100 }, data: { label: 'Encode Categories', strategy: 'onehot' } },
            { id: 't2-3', type: 'split', position: { x: 800, y: 100 }, data: { label: 'Split Data', testSize: 0.2 } },
            { id: 't2-4', type: 'model', position: { x: 1200, y: 100 }, data: { label: 'Logistic Regression', modelType: 'Logistic Regression' } },
            { id: 't2-5', type: 'result', position: { x: 1600, y: 100 }, data: { label: 'Accuracy Report' } },
        ],
        edges: [
            { id: 'e2-1', source: 't2-1', target: 't2-2' },
            { id: 'e2-2', source: 't2-2', target: 't2-3' },
            { id: 'e2-3', source: 't2-3', target: 't2-4' },
            { id: 'e2-4', source: 't2-4', target: 't2-5' },
        ],
        icon: <BrainCircuit className="text-green-500" size={24} />,
        color: 'green'
    },

    // ── 3. DATA QUALITY: Full Data Cleaning Pipeline ──
    {
        id: 'full-data-cleaning',
        name: 'Full Data Cleaning Pipeline',
        description: 'Complete data quality pipeline: remove duplicates, handle missing values, detect outliers, and scale features.',
        category: 'data-quality',
        difficulty: 'Medium',
        nodes: [
            { id: 't3-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Raw Survey Data' } },
            { id: 't3-2', type: 'duplicate', position: { x: 350, y: 100 }, data: { label: 'Remove Duplicates', duplicateHandling: 'first' } },
            { id: 't3-3', type: 'imputation', position: { x: 700, y: 100 }, data: { label: 'Fill Missing Values', strategy: 'median' } },
            { id: 't3-4', type: 'outlier', position: { x: 1050, y: 100 }, data: { label: 'Handle Outliers', outlierMethod: 'iqr', outlierAction: 'clip' } },
            { id: 't3-5', type: 'preprocessing', position: { x: 1400, y: 100 }, data: { label: 'Scale Features', scaler: 'StandardScaler' } },
            { id: 't3-6', type: 'split', position: { x: 1750, y: 100 }, data: { label: 'Split', testSize: 0.2 } },
            { id: 't3-7', type: 'model', position: { x: 2100, y: 100 }, data: { label: 'Random Forest', modelType: 'Random Forest' } },
            { id: 't3-8', type: 'result', position: { x: 2450, y: 100 }, data: { label: 'Results' } },
        ],
        edges: [
            { id: 'e3-1', source: 't3-1', target: 't3-2' },
            { id: 'e3-2', source: 't3-2', target: 't3-3' },
            { id: 'e3-3', source: 't3-3', target: 't3-4' },
            { id: 'e3-4', source: 't3-4', target: 't3-5' },
            { id: 'e3-5', source: 't3-5', target: 't3-6' },
            { id: 'e3-6', source: 't3-6', target: 't3-7' },
            { id: 'e3-7', source: 't3-7', target: 't3-8' },
        ],
        icon: <Database className="text-purple-500" size={24} />,
        color: 'purple'
    },

    // ── 4. CLASSIFICATION: Random Forest with Cross-Validation ──
    {
        id: 'rf-crossval',
        name: 'Random Forest + Cross-Validation',
        description: 'Robust classification with K-fold cross-validation for reliable performance estimates. Includes encoding and scaling.',
        category: 'classification',
        difficulty: 'Medium',
        nodes: [
            { id: 't4-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Customer Churn' } },
            { id: 't4-2', type: 'encoding', position: { x: 350, y: 100 }, data: { label: 'Encode', strategy: 'onehot' } },
            { id: 't4-3', type: 'preprocessing', position: { x: 700, y: 100 }, data: { label: 'Scale', scaler: 'StandardScaler' } },
            { id: 't4-4', type: 'split', position: { x: 1050, y: 100 }, data: { label: 'Stratified Split', testSize: 0.2, stratified: true } },
            { id: 't4-5', type: 'crossValidation', position: { x: 1400, y: 100 }, data: { label: 'Cross-Validate', cvFolds: 5, cvStratified: true } },
            { id: 't4-6', type: 'model', position: { x: 1750, y: 100 }, data: { label: 'Random Forest', modelType: 'Random Forest' } },
            { id: 't4-7', type: 'result', position: { x: 2100, y: 100 }, data: { label: 'CV Results' } },
        ],
        edges: [
            { id: 'e4-1', source: 't4-1', target: 't4-2' },
            { id: 'e4-2', source: 't4-2', target: 't4-3' },
            { id: 'e4-3', source: 't4-3', target: 't4-4' },
            { id: 'e4-4', source: 't4-4', target: 't4-5' },
            { id: 'e4-5', source: 't4-5', target: 't4-6' },
            { id: 'e4-6', source: 't4-6', target: 't4-7' },
        ],
        icon: <Repeat className="text-indigo-500" size={24} />,
        color: 'indigo'
    },

    // ── 5. CLASSIFICATION: Imbalanced Data (SMOTE) ──
    {
        id: 'imbalanced-smote',
        name: 'Handling Imbalanced Classes',
        description: 'Learn to handle class imbalance (e.g., fraud detection). Uses SMOTE oversampling with Gradient Boosting.',
        category: 'classification',
        difficulty: 'Medium',
        nodes: [
            { id: 't5-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Fraud Detection' } },
            { id: 't5-2', type: 'imputation', position: { x: 350, y: 100 }, data: { label: 'Fill Missing', strategy: 'median' } },
            { id: 't5-3', type: 'encoding', position: { x: 700, y: 100 }, data: { label: 'Encode', strategy: 'label' } },
            { id: 't5-4', type: 'split', position: { x: 1050, y: 100 }, data: { label: 'Stratified Split', testSize: 0.3, stratified: true } },
            { id: 't5-5', type: 'classBalancing', position: { x: 1400, y: 100 }, data: { label: 'SMOTE Balance', classBalancing: 'smote' } },
            { id: 't5-6', type: 'model', position: { x: 1750, y: 100 }, data: { label: 'Gradient Boosting', modelType: 'Gradient Boosting' } },
            { id: 't5-7', type: 'result', position: { x: 2100, y: 100 }, data: { label: 'Results' } },
        ],
        edges: [
            { id: 'e5-1', source: 't5-1', target: 't5-2' },
            { id: 'e5-2', source: 't5-2', target: 't5-3' },
            { id: 'e5-3', source: 't5-3', target: 't5-4' },
            { id: 'e5-4', source: 't5-4', target: 't5-5' },
            { id: 'e5-5', source: 't5-5', target: 't5-6' },
            { id: 'e5-6', source: 't5-6', target: 't5-7' },
        ],
        icon: <Scale className="text-fuchsia-500" size={24} />,
        color: 'fuchsia'
    },

    // ── 6. CLASSIFICATION: SVM Pipeline ──
    {
        id: 'svm-pipeline',
        name: 'SVM Classification Pipeline',
        description: 'Support Vector Machine pipeline with feature scaling — essential for SVMs. Great for image or text classification datasets.',
        category: 'classification',
        difficulty: 'Medium',
        nodes: [
            { id: 't6-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Classification Data' } },
            { id: 't6-2', type: 'imputation', position: { x: 350, y: 100 }, data: { label: 'Fill Missing', strategy: 'mean' } },
            { id: 't6-3', type: 'preprocessing', position: { x: 700, y: 100 }, data: { label: 'Standard Scale', scaler: 'StandardScaler' } },
            { id: 't6-4', type: 'split', position: { x: 1050, y: 100 }, data: { label: 'Split', testSize: 0.25 } },
            { id: 't6-5', type: 'model', position: { x: 1400, y: 100 }, data: { label: 'SVM', modelType: 'SVM' } },
            { id: 't6-6', type: 'result', position: { x: 1750, y: 100 }, data: { label: 'Results' } },
        ],
        edges: [
            { id: 'e6-1', source: 't6-1', target: 't6-2' },
            { id: 'e6-2', source: 't6-2', target: 't6-3' },
            { id: 'e6-3', source: 't6-3', target: 't6-4' },
            { id: 'e6-4', source: 't6-4', target: 't6-5' },
            { id: 'e6-5', source: 't6-5', target: 't6-6' },
        ],
        icon: <BrainCircuit className="text-rose-500" size={24} />,
        color: 'rose'
    },

    // ── 7. REGRESSION: Advanced Regression (Feature Eng + Ridge) ──
    {
        id: 'advanced-regression',
        name: 'Feature Engineering + Ridge Regression',
        description: 'Build polynomial features to capture non-linear relationships, then use Ridge regression to prevent overfitting.',
        category: 'regression',
        difficulty: 'Hard',
        nodes: [
            { id: 't7-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Sales Data' } },
            { id: 't7-2', type: 'imputation', position: { x: 350, y: 100 }, data: { label: 'Impute', strategy: 'median' } },
            { id: 't7-3', type: 'featureEngineering', position: { x: 700, y: 100 }, data: { label: 'Polynomial Features', featureEngineeringMethod: 'polynomial', polynomialDegree: 2 } },
            { id: 't7-4', type: 'preprocessing', position: { x: 1050, y: 100 }, data: { label: 'Scale', scaler: 'StandardScaler' } },
            { id: 't7-5', type: 'split', position: { x: 1400, y: 100 }, data: { label: 'Split', testSize: 0.2 } },
            { id: 't7-6', type: 'model', position: { x: 1750, y: 100 }, data: { label: 'Ridge Regression', modelType: 'Ridge Regression' } },
            { id: 't7-7', type: 'result', position: { x: 2100, y: 100 }, data: { label: 'Results' } },
        ],
        edges: [
            { id: 'e7-1', source: 't7-1', target: 't7-2' },
            { id: 'e7-2', source: 't7-2', target: 't7-3' },
            { id: 'e7-3', source: 't7-3', target: 't7-4' },
            { id: 'e7-4', source: 't7-4', target: 't7-5' },
            { id: 'e7-5', source: 't7-5', target: 't7-6' },
            { id: 'e7-6', source: 't7-6', target: 't7-7' },
        ],
        icon: <Wrench className="text-lime-500" size={24} />,
        color: 'lime'
    },

    // ── 8. ADVANCED: PCA Dimensionality Reduction ──
    {
        id: 'pca-pipeline',
        name: 'PCA Dimensionality Reduction',
        description: 'Reduce high-dimensional data with PCA before training. Ideal for datasets with many correlated features.',
        category: 'advanced',
        difficulty: 'Hard',
        nodes: [
            { id: 't8-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'High-Dim Dataset' } },
            { id: 't8-2', type: 'imputation', position: { x: 350, y: 100 }, data: { label: 'Impute', strategy: 'mean' } },
            { id: 't8-3', type: 'preprocessing', position: { x: 700, y: 100 }, data: { label: 'Standard Scale', scaler: 'StandardScaler' } },
            { id: 't8-4', type: 'pca', position: { x: 1050, y: 100 }, data: { label: 'PCA (5 comp)', pcaComponents: 5 } },
            { id: 't8-5', type: 'split', position: { x: 1400, y: 100 }, data: { label: 'Split', testSize: 0.2 } },
            { id: 't8-6', type: 'model', position: { x: 1750, y: 100 }, data: { label: 'KNN', modelType: 'KNN' } },
            { id: 't8-7', type: 'result', position: { x: 2100, y: 100 }, data: { label: 'Results' } },
        ],
        edges: [
            { id: 'e8-1', source: 't8-1', target: 't8-2' },
            { id: 'e8-2', source: 't8-2', target: 't8-3' },
            { id: 'e8-3', source: 't8-3', target: 't8-4' },
            { id: 'e8-4', source: 't8-4', target: 't8-5' },
            { id: 'e8-5', source: 't8-5', target: 't8-6' },
            { id: 'e8-6', source: 't8-6', target: 't8-7' },
        ],
        icon: <Minimize2 className="text-sky-500" size={24} />,
        color: 'sky'
    },

    // ── 9. ADVANCED: Full Feature Pipeline (Feature Selection + XGBoost) ──
    {
        id: 'feature-selection-xgboost',
        name: 'Feature Selection + XGBoost',
        description: 'Remove irrelevant features, then train with XGBoost — a competition-winning algorithm. Includes outlier handling.',
        category: 'advanced',
        difficulty: 'Hard',
        nodes: [
            { id: 't9-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Tabular Dataset' } },
            { id: 't9-2', type: 'duplicate', position: { x: 300, y: 100 }, data: { label: 'Dedup', duplicateHandling: 'first' } },
            { id: 't9-3', type: 'outlier', position: { x: 600, y: 100 }, data: { label: 'Outliers', outlierMethod: 'iqr', outlierAction: 'clip' } },
            { id: 't9-4', type: 'encoding', position: { x: 900, y: 100 }, data: { label: 'Encode', strategy: 'label' } },
            { id: 't9-5', type: 'featureSelection', position: { x: 1200, y: 100 }, data: { label: 'Feature Select', featureSelectionMethod: 'both', varianceThreshold: 0.01, correlationThreshold: 0.9 } },
            { id: 't9-6', type: 'split', position: { x: 1500, y: 100 }, data: { label: 'Split', testSize: 0.2, stratified: true } },
            { id: 't9-7', type: 'model', position: { x: 1800, y: 100 }, data: { label: 'XGBoost', modelType: 'XGBoost' } },
            { id: 't9-8', type: 'result', position: { x: 2100, y: 100 }, data: { label: 'Results' } },
        ],
        edges: [
            { id: 'e9-1', source: 't9-1', target: 't9-2' },
            { id: 'e9-2', source: 't9-2', target: 't9-3' },
            { id: 'e9-3', source: 't9-3', target: 't9-4' },
            { id: 'e9-4', source: 't9-4', target: 't9-5' },
            { id: 'e9-5', source: 't9-5', target: 't9-6' },
            { id: 'e9-6', source: 't9-6', target: 't9-7' },
            { id: 'e9-7', source: 't9-7', target: 't9-8' },
        ],
        icon: <Filter className="text-teal-500" size={24} />,
        color: 'teal'
    },

    // ── 10. ADVANCED: The Full Kitchen Sink ──
    {
        id: 'kitchen-sink',
        name: 'The Complete ML Pipeline',
        description: 'Everything in one pipeline: duplicates → imputation → outliers → encoding → feature selection → scaling → split → balance → cross-val → model → results.',
        category: 'advanced',
        difficulty: 'Expert',
        nodes: [
            { id: 'tk-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Raw Data' } },
            { id: 'tk-2', type: 'duplicate', position: { x: 280, y: 100 }, data: { label: 'Dedup', duplicateHandling: 'first' } },
            { id: 'tk-3', type: 'imputation', position: { x: 560, y: 100 }, data: { label: 'Impute', strategy: 'median' } },
            { id: 'tk-4', type: 'outlier', position: { x: 840, y: 100 }, data: { label: 'Outliers', outlierMethod: 'iqr', outlierAction: 'clip' } },
            { id: 'tk-5', type: 'encoding', position: { x: 1120, y: 100 }, data: { label: 'Encode', strategy: 'onehot' } },
            { id: 'tk-6', type: 'featureSelection', position: { x: 1400, y: 100 }, data: { label: 'Select Features', featureSelectionMethod: 'correlation', correlationThreshold: 0.95 } },
            { id: 'tk-7', type: 'preprocessing', position: { x: 1680, y: 100 }, data: { label: 'Scale', scaler: 'RobustScaler' } },
            { id: 'tk-8', type: 'split', position: { x: 1960, y: 100 }, data: { label: 'Stratified Split', testSize: 0.2, stratified: true } },
            { id: 'tk-9', type: 'classBalancing', position: { x: 2240, y: 100 }, data: { label: 'Balance', classBalancing: 'smote' } },
            { id: 'tk-10', type: 'crossValidation', position: { x: 2520, y: 100 }, data: { label: '10-Fold CV', cvFolds: 10, cvStratified: true } },
            { id: 'tk-11', type: 'model', position: { x: 2800, y: 100 }, data: { label: 'Gradient Boosting', modelType: 'Gradient Boosting' } },
            { id: 'tk-12', type: 'result', position: { x: 3080, y: 100 }, data: { label: 'Full Report' } },
        ],
        edges: [
            { id: 'ek-1', source: 'tk-1', target: 'tk-2' },
            { id: 'ek-2', source: 'tk-2', target: 'tk-3' },
            { id: 'ek-3', source: 'tk-3', target: 'tk-4' },
            { id: 'ek-4', source: 'tk-4', target: 'tk-5' },
            { id: 'ek-5', source: 'tk-5', target: 'tk-6' },
            { id: 'ek-6', source: 'tk-6', target: 'tk-7' },
            { id: 'ek-7', source: 'tk-7', target: 'tk-8' },
            { id: 'ek-8', source: 'tk-8', target: 'tk-9' },
            { id: 'ek-9', source: 'tk-9', target: 'tk-10' },
            { id: 'ek-10', source: 'tk-10', target: 'tk-11' },
            { id: 'ek-11', source: 'tk-11', target: 'tk-12' },
        ],
        icon: <LayoutTemplate className="text-orange-500" size={24} />,
        color: 'orange'
    },

    // ── 11. REGRESSION: House Price Prediction ──
    {
        id: 'house-price',
        name: 'House Price Prediction',
        description: 'End-to-end regression pipeline for real estate data. Handles outliers, encodes categories, and uses ElasticNet.',
        category: 'regression',
        difficulty: 'Medium',
        nodes: [
            { id: 'th-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'House Prices' } },
            { id: 'th-2', type: 'imputation', position: { x: 350, y: 100 }, data: { label: 'Impute', strategy: 'median' } },
            { id: 'th-3', type: 'outlier', position: { x: 700, y: 100 }, data: { label: 'Clip Outliers', outlierMethod: 'iqr', outlierAction: 'clip' } },
            { id: 'th-4', type: 'encoding', position: { x: 1050, y: 100 }, data: { label: 'Target Encode', strategy: 'target' } },
            { id: 'th-5', type: 'preprocessing', position: { x: 1400, y: 100 }, data: { label: 'Robust Scale', scaler: 'RobustScaler' } },
            { id: 'th-6', type: 'split', position: { x: 1750, y: 100 }, data: { label: 'Split (80/20)', testSize: 0.2 } },
            { id: 'th-7', type: 'model', position: { x: 2100, y: 100 }, data: { label: 'ElasticNet', modelType: 'ElasticNet' } },
            { id: 'th-8', type: 'result', position: { x: 2450, y: 100 }, data: { label: 'Results' } },
        ],
        edges: [
            { id: 'eh-1', source: 'th-1', target: 'th-2' },
            { id: 'eh-2', source: 'th-2', target: 'th-3' },
            { id: 'eh-3', source: 'th-3', target: 'th-4' },
            { id: 'eh-4', source: 'th-4', target: 'th-5' },
            { id: 'eh-5', source: 'th-5', target: 'th-6' },
            { id: 'eh-6', source: 'th-6', target: 'th-7' },
            { id: 'eh-7', source: 'th-7', target: 'th-8' },
        ],
        icon: <LineChart className="text-amber-500" size={24} />,
        color: 'amber'
    },

    // ── 12. DATA QUALITY: Outlier Detection Pipeline ──
    {
        id: 'outlier-detection',
        name: 'Outlier Detection & Analysis',
        description: 'Focus on detecting and handling outliers using different methods. Compare IQR clipping vs. removal effects on model performance.',
        category: 'data-quality',
        difficulty: 'Medium',
        nodes: [
            { id: 'to-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Sensor Data' } },
            { id: 'to-2', type: 'imputation', position: { x: 350, y: 100 }, data: { label: 'Fill Missing', strategy: 'mean' } },
            { id: 'to-3', type: 'outlier', position: { x: 700, y: 100 }, data: { label: 'Z-Score Detection', outlierMethod: 'zscore', outlierAction: 'clip' } },
            { id: 'to-4', type: 'preprocessing', position: { x: 1050, y: 100 }, data: { label: 'Normalize', scaler: 'Normalizer' } },
            { id: 'to-5', type: 'split', position: { x: 1400, y: 100 }, data: { label: 'Split', testSize: 0.2 } },
            { id: 'to-6', type: 'model', position: { x: 1750, y: 100 }, data: { label: 'KNN', modelType: 'KNN' } },
            { id: 'to-7', type: 'result', position: { x: 2100, y: 100 }, data: { label: 'Results' } },
        ],
        edges: [
            { id: 'eo-1', source: 'to-1', target: 'to-2' },
            { id: 'eo-2', source: 'to-2', target: 'to-3' },
            { id: 'eo-3', source: 'to-3', target: 'to-4' },
            { id: 'eo-4', source: 'to-4', target: 'to-5' },
            { id: 'eo-5', source: 'to-5', target: 'to-6' },
            { id: 'eo-6', source: 'to-6', target: 'to-7' },
        ],
        icon: <AlertTriangle className="text-amber-500" size={24} />,
        color: 'amber'
    },
];

const difficultyColors: Record<string, string> = {
    Easy: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Hard: 'bg-orange-100 text-orange-700',
    Expert: 'bg-red-100 text-red-700',
};

interface TemplatesPageProps {
    isModal?: boolean;
    onSelectTemplate?: (template: any) => void;
    onClose?: () => void;
}

export default function TemplatesPage({ isModal, onSelectTemplate, onClose: _onClose }: TemplatesPageProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = useAuth();
    const fromWorkspace = location.state?.from === 'workspace';
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [_loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

    const handleTryTemplate = async (template: any) => {
        const { icon, ...sanitizedTemplate } = template;
        if (isModal && onSelectTemplate) {
            onSelectTemplate(sanitizedTemplate);
        } else {
            // Create a new workspace and populate with template
            setLoadingTemplate(template.id);
            try {
                const res = await axios.post(
                    `${API_URL}/workspaces`,
                    { name: template.name },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const newId = res.data.id;
                // Save template nodes/edges into the new workspace
                await axios.put(
                    `${API_URL}/workspaces/${newId}`,
                    { nodes_json: sanitizedTemplate.nodes || [], edges_json: sanitizedTemplate.edges || [] },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                navigate(`/workspace/${newId}`);
            } catch {
                toast.error('Failed to create workspace from template');
            } finally {
                setLoadingTemplate(null);
            }
        }
    };

    const filteredTemplates = templates.filter(t => {
        const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
        const matchesSearch = !searchTerm ||
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50 font-['Outfit',_'Inter',_sans-serif]">
            {/* Navbar */}
            {!isModal && (
                <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />
                    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                <img src={logo} alt="FlowML" className="h-8 w-auto" />
                                <div className="hidden sm:block">
                                    <span className="text-xl font-medium text-gray-800">
                                        <span className="text-[#4285F4]">Flow</span>
                                        <span className="text-[#34A853]">ML</span>
                                    </span>
                                    <span className="ml-2 text-sm text-gray-400 font-normal border-l border-gray-200 pl-2">Templates</span>
                                </div>
                            </Link>
                        </div>
                    </div>
                </nav>
            )}

            <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
                {!isModal ? (
                    fromWorkspace ? (
                        <Link to="/workspace" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8">
                            <ArrowLeft size={18} />
                            <span className="text-sm font-medium">Back to Workspace</span>
                        </Link>
                    ) : (
                        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8">
                            <ArrowLeft size={18} />
                            <span className="text-sm font-medium">Back to Home</span>
                        </Link>
                    )
                ) : null}

                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Start with a Blueprint</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        {templates.length} pre-built pipelines covering beginner to advanced ML workflows. Each template is a fully interactive preview!
                    </p>
                </div>

                {/* Search + Category Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
                    <div className="relative flex-1 max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-full py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4285F4]/20 focus:border-[#4285F4] transition-all"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat.id
                                        ? 'bg-[#4285F4] text-white shadow-md'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon size={14} />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Template Cards */}
                {filteredTemplates.length > 0 ? (
                    <div className="space-y-12">
                        {filteredTemplates.map((template) => (
                            <div key={template.id} className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">

                                {/* Header */}
                                <div className="px-8 py-5 border-b border-gray-100 bg-white flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl bg-${template.color}-50 text-${template.color}-600`}>
                                            {template.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-bold text-gray-900">{template.name}</h3>
                                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${difficultyColors[template.difficulty]}`}>
                                                    {template.difficulty}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-sm mt-0.5">{template.description}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleTryTemplate(template)}
                                        className="py-2.5 px-6 bg-[#4285F4] hover:bg-[#3367D6] text-white font-medium rounded-full transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md shrink-0"
                                    >
                                        Try this
                                        <ArrowRight size={16} />
                                    </button>
                                </div>

                                {/* ReactFlow Preview */}
                                <div className="h-[400px] w-full bg-gray-50/50 relative">
                                    <div className="absolute inset-0 pointer-events-none">
                                        <ReactFlow
                                            nodes={template.nodes}
                                            edges={template.edges}
                                            nodeTypes={nodeTypes}
                                            fitView
                                            fitViewOptions={{ padding: 0.3 }}
                                            minZoom={0.1}
                                            proOptions={{ hideAttribution: true }}
                                            nodesDraggable={false}
                                            nodesConnectable={false}
                                            panOnDrag={false}
                                            panOnScroll={false}
                                            zoomOnScroll={false}
                                            zoomOnPinch={false}
                                            zoomOnDoubleClick={false}
                                            preventScrolling={false}
                                            attributionPosition="bottom-right"
                                        >
                                            <Background color="#f1f3f4" gap={20} size={1} />
                                        </ReactFlow>
                                    </div>
                                    <div className="absolute inset-0 bg-transparent" />
                                </div>

                                {/* Footer with node count */}
                                <div className="px-8 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
                                    <span>{template.nodes.length} nodes</span>
                                    <span>•</span>
                                    <span>{template.edges.length} connections</span>
                                    <span>•</span>
                                    <span className="capitalize">{template.category.replace('-', ' ')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Search size={32} className="mb-3 opacity-50" />
                        <p className="text-lg font-medium">No templates match your search</p>
                        <p className="text-sm mt-1">Try a different search term or category</p>
                    </div>
                )}
            </main>
        </div>
    );
}
