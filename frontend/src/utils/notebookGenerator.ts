import type { Node, Edge } from 'reactflow';

interface NotebookCell {
    cell_type: 'code' | 'markdown';
    source: string[];
    metadata: Record<string, unknown>;
    execution_count?: number | null;
    outputs?: unknown[];
}

interface JupyterNotebook {
    nbformat: number;
    nbformat_minor: number;
    metadata: {
        kernelspec: { display_name: string; language: string; name: string };
        language_info: { name: string; version: string };
    };
    cells: NotebookCell[];
}

// ─── Cell helpers ────────────────────────────────────────────────────────────

const codeCell = (source: string): NotebookCell => ({
    cell_type: 'code',
    source: source.split('\n').map((l, i, a) => (i < a.length - 1 ? l + '\n' : l)),
    metadata: {},
    execution_count: null,
    outputs: [],
});

const markdownCell = (source: string): NotebookCell => ({
    cell_type: 'markdown',
    source: source.split('\n').map((l, i, a) => (i < a.length - 1 ? l + '\n' : l)),
    metadata: {},
});

// ─── Regression model set (exact strings from ModelNode dropdown values) ─────

const REGRESSION_MODELS = new Set([
    'Linear Regression', 'Decision Tree Regressor', 'Random Forest Regressor',
    'Ridge Regression', 'Lasso Regression', 'ElasticNet', 'SVR',
    'KNN Regressor', 'Gradient Boosting Regressor', 'XGBoost Regressor', 'MLP Regressor',
]);

// ─── Model → sklearn mapping (keyed by exact ModelNode option values) ─────────

interface ModelInfo {
    importLine: string;
    instantiation: (cwArg: string) => string;
    hasFeatureImportance: 'tree' | 'linear' | 'none';
}

const MODEL_INFO: Record<string, ModelInfo> = {
    'Logistic Regression': {
        importLine: 'from sklearn.linear_model import LogisticRegression',
        instantiation: (cw) => `LogisticRegression(max_iter=1000${cw})`,
        hasFeatureImportance: 'linear',
    },
    'Decision Tree': {
        importLine: 'from sklearn.tree import DecisionTreeClassifier',
        instantiation: (cw) => `DecisionTreeClassifier(random_state=42${cw})`,
        hasFeatureImportance: 'tree',
    },
    'Random Forest': {
        importLine: 'from sklearn.ensemble import RandomForestClassifier',
        instantiation: (cw) => `RandomForestClassifier(n_estimators=100, random_state=42${cw})`,
        hasFeatureImportance: 'tree',
    },
    'SVM': {
        importLine: 'from sklearn.svm import SVC',
        instantiation: (cw) => `SVC(probability=True${cw})`,
        hasFeatureImportance: 'none',
    },
    'KNN': {
        importLine: 'from sklearn.neighbors import KNeighborsClassifier',
        instantiation: (_) => `KNeighborsClassifier()`,
        hasFeatureImportance: 'none',
    },
    'Gradient Boosting': {
        importLine: 'from sklearn.ensemble import GradientBoostingClassifier',
        instantiation: (_) => `GradientBoostingClassifier(n_estimators=100, random_state=42)`,
        hasFeatureImportance: 'tree',
    },
    'XGBoost': {
        importLine: 'from xgboost import XGBClassifier',
        instantiation: (_) => `XGBClassifier(n_estimators=100, random_state=42, eval_metric='logloss')`,
        hasFeatureImportance: 'tree',
    },
    'MLP Classifier': {
        importLine: 'from sklearn.neural_network import MLPClassifier',
        instantiation: (_) => `MLPClassifier(max_iter=500, random_state=42)`,
        hasFeatureImportance: 'none',
    },
    'Linear Regression': {
        importLine: 'from sklearn.linear_model import LinearRegression',
        instantiation: (_) => `LinearRegression()`,
        hasFeatureImportance: 'linear',
    },
    'Decision Tree Regressor': {
        importLine: 'from sklearn.tree import DecisionTreeRegressor',
        instantiation: (_) => `DecisionTreeRegressor(random_state=42)`,
        hasFeatureImportance: 'tree',
    },
    'Random Forest Regressor': {
        importLine: 'from sklearn.ensemble import RandomForestRegressor',
        instantiation: (_) => `RandomForestRegressor(n_estimators=100, random_state=42)`,
        hasFeatureImportance: 'tree',
    },
    'Ridge Regression': {
        importLine: 'from sklearn.linear_model import Ridge',
        instantiation: (_) => `Ridge()`,
        hasFeatureImportance: 'linear',
    },
    'Lasso Regression': {
        importLine: 'from sklearn.linear_model import Lasso',
        instantiation: (_) => `Lasso()`,
        hasFeatureImportance: 'linear',
    },
    'ElasticNet': {
        importLine: 'from sklearn.linear_model import ElasticNet',
        instantiation: (_) => `ElasticNet()`,
        hasFeatureImportance: 'linear',
    },
    'SVR': {
        importLine: 'from sklearn.svm import SVR',
        instantiation: (_) => `SVR()`,
        hasFeatureImportance: 'none',
    },
    'KNN Regressor': {
        importLine: 'from sklearn.neighbors import KNeighborsRegressor',
        instantiation: (_) => `KNeighborsRegressor()`,
        hasFeatureImportance: 'none',
    },
    'Gradient Boosting Regressor': {
        importLine: 'from sklearn.ensemble import GradientBoostingRegressor',
        instantiation: (_) => `GradientBoostingRegressor(n_estimators=100, random_state=42)`,
        hasFeatureImportance: 'tree',
    },
    'XGBoost Regressor': {
        importLine: 'from xgboost import XGBRegressor',
        instantiation: (_) => `XGBRegressor(n_estimators=100, random_state=42)`,
        hasFeatureImportance: 'tree',
    },
    'MLP Regressor': {
        importLine: 'from sklearn.neural_network import MLPRegressor',
        instantiation: (_) => `MLPRegressor(max_iter=500, random_state=42)`,
        hasFeatureImportance: 'none',
    },
};

// ─── Fallback empty notebook ──────────────────────────────────────────────────

function emptyNotebook(): JupyterNotebook {
    return {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {
            kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
            language_info: { name: 'python', version: '3.10.0' },
        },
        cells: [
            markdownCell(
                '# No pipeline found\n\n' +
                'Please connect a complete pipeline (Dataset → … → Model → Result) before exporting.'
            ),
        ],
    };
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateNotebook(nodes: Node[], edges: Edge[]): JupyterNotebook {

    // ── Resolve pipeline chain by walking edges backwards from result node ──
    const parentOf = new Map<string, string>();
    for (const e of edges) parentOf.set(e.target, e.source);

    const resultNode = nodes.find((n) => n.type === 'result');
    if (!resultNode) return emptyNotebook();

    const chain: Node[] = [];
    let cur: Node | undefined = resultNode;
    while (cur) {
        chain.unshift(cur);
        const pid = parentOf.get(cur.id);
        cur = pid ? nodes.find((n) => n.id === pid) : undefined;
    }

    const getNode = (type: string) => chain.find((n) => n.type === type);

    const datasetNode    = getNode('dataset');
    const duplicateNode  = getNode('duplicate');
    const outlierNode    = getNode('outlier');
    const imputationNode = getNode('imputation');
    const encodingNode   = getNode('encoding');
    const preprocessNode = getNode('preprocessing');
    const featureSelNode = getNode('featureSelection');
    const featureEngNode = getNode('featureEngineering');
    const pcaNode        = getNode('pca');
    const classBalNode   = getNode('classBalancing');
    const splitNode      = getNode('split');
    const modelNode      = getNode('model');
    const cvNode         = getNode('crossValidation');

    if (!modelNode || !datasetNode) return emptyNotebook();

    // ── Read all node params (exact field names matching each node component) ──

    const modelType    = (modelNode.data.modelType  as string)  || 'Logistic Regression';
    const isRegression = REGRESSION_MODELS.has(modelType);
    const targetColumn = (modelNode.data.targetColumn as string) || 'target';

    // SplitNode
    const testSize    = (splitNode?.data.testSize    as number)  ?? 0.2;
    const stratified  = (splitNode?.data.stratified  as boolean) ?? false;
    const shuffle     = (splitNode?.data.shuffle     as boolean) ?? true;
    const randomState = (splitNode?.data.randomState as number)  ?? 42;

    // ImputationNode
    const imputeStrategy = (imputationNode?.data.strategy as string) || 'mean';

    // EncodingNode
    const encodeStrategy = (encodingNode?.data.strategy as string) || 'onehot';

    // PreprocessingNode
    const scalerType = (preprocessNode?.data.scaler as string) || 'None';

    // FeatureSelectionNode
    const fsMeth   = (featureSelNode?.data.featureSelectionMethod as string) || 'none';
    const fsVarThr = (featureSelNode?.data.varianceThreshold      as number) ?? 0.01;
    const fsCorThr = (featureSelNode?.data.correlationThreshold   as number) ?? 0.95;

    // FeatureEngineeringNode
    const feMeth   = (featureEngNode?.data.featureEngineeringMethod as string) || 'none';
    const feDegree = (featureEngNode?.data.polynomialDegree         as number) ?? 2;

    // PCANode
    const pcaComponents = (pcaNode?.data.pcaComponents as number) ?? 2;

    // ClassBalancingNode
    const classBalMethod = (classBalNode?.data.classBalancing as string) || 'none';
    const cwArg = classBalMethod === 'class_weight' ? ", class_weight='balanced'" : '';

    // DuplicateNode
    const dupStrategy = (duplicateNode?.data.duplicateHandling as string) || 'first';

    // OutlierNode
    const outlierMethod = (outlierNode?.data.outlierMethod as string) || 'iqr';
    const outlierAction = (outlierNode?.data.outlierAction as string) || 'clip';

    // CrossValidationNode
    const cvFolds      = (cvNode?.data.cvFolds      as number)  ?? 5;
    const cvStratified = (cvNode?.data.cvStratified as boolean) ?? true;

    // DatasetNode — field is `file` (fixed in DatasetNode.tsx)
    const dataFileName = (datasetNode.data.file as string) || 'data.csv';
    const ext = dataFileName.split('.').pop()?.toLowerCase();

    // Model info
    const modelInfo = MODEL_INFO[modelType] ?? MODEL_INFO['Logistic Regression'];

    // ── Build cells in same order as backend run_pipeline ────────────────────

    const cells: NotebookCell[] = [];

    // ── Title ─────────────────────────────────────────────────────────────────
    cells.push(markdownCell(
        `# FlowML — Generated Pipeline\n\n` +
        `> This notebook was auto-generated by **FlowML** and reproduces the exact pipeline you built visually.\n` +
        `> Run each cell **top-to-bottom** in a Python 3.10+ environment.\n\n` +
        `| Property | Value |\n` +
        `|-----------|-------|\n` +
        `| **Model** | ${modelType} |\n` +
        `| **Task type** | ${isRegression ? 'Regression' : 'Classification'} |\n` +
        `| **Target column** | \`${targetColumn}\` |\n` +
        `| **Dataset file** | \`${dataFileName}\` |\n` +
        `| **Test split** | ${Math.round(testSize * 100)}% |\n` +
        `| **Random state** | ${randomState} |`
    ));

    // ── Imports ───────────────────────────────────────────────────────────────
    cells.push(markdownCell(
        `## ⚙️ Setup & Imports\n\n` +
        `Install any missing packages first:\n\n` +
        `\`\`\`bash\n` +
        `pip install pandas numpy scikit-learn xgboost imbalanced-learn matplotlib\n` +
        `\`\`\``
    ));
    const importLines: string[] = [
        'import pandas as pd',
        'import numpy as np',
        'import warnings',
        "warnings.filterwarnings('ignore')",
        '',
    ];

    // sklearn.model_selection
    const msImports = ['train_test_split'];
    if (cvNode) {
        msImports.push('cross_val_score');
        if (!isRegression && cvStratified) msImports.push('StratifiedKFold');
        else msImports.push('KFold');
    }
    importLines.push(`from sklearn.model_selection import ${msImports.join(', ')}`);
    importLines.push('from sklearn.impute import SimpleImputer');
    importLines.push('from sklearn.preprocessing import LabelEncoder');
    if (encodeStrategy === 'onehot') importLines.push('from sklearn.preprocessing import OneHotEncoder');
    if (scalerType !== 'None') importLines.push(`from sklearn.preprocessing import ${scalerType}`);
    if (featureSelNode && (fsMeth === 'variance' || fsMeth === 'both'))
        importLines.push('from sklearn.feature_selection import VarianceThreshold');
    if (pcaNode) importLines.push('from sklearn.decomposition import PCA');
    if (featureEngNode && feMeth === 'polynomial')
        importLines.push('from sklearn.preprocessing import PolynomialFeatures');
    importLines.push(modelInfo.importLine);
    importLines.push('');
    if (isRegression) {
        importLines.push('from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, explained_variance_score');
    } else {
        importLines.push('from sklearn.metrics import accuracy_score, classification_report, precision_score, recall_score, f1_score');
    }
    if (!isRegression && classBalMethod === 'smote')
        importLines.push('from imblearn.over_sampling import SMOTE');
    else if (!isRegression && classBalMethod === 'oversample')
        importLines.push('from imblearn.over_sampling import RandomOverSampler');
    else if (!isRegression && classBalMethod === 'undersample')
        importLines.push('from imblearn.under_sampling import RandomUnderSampler');
    cells.push(codeCell(importLines.join('\n')));

    // ── Step 1: Load data ─────────────────────────────────────────────────────
    cells.push(markdownCell(
        `## 📂 Step 1 — Load Dataset\n\n` +
        `Load **\`${dataFileName}\`** into a pandas DataFrame.  \n` +
        `Make sure the file is in the **same directory** as this notebook, or update the path below.`
    ));
    cells.push(codeCell([
        '# Step 1 — Load dataset',
        ext === 'csv'
            ? `df = pd.read_csv('${dataFileName}')`
            : `df = pd.read_excel('${dataFileName}')`,
        "print(f'Dataset shape: {df.shape}')",
        'df.head()',
    ].join('\n')));

    // ── Step 2: Separate features / target ────────────────────────────────────
    cells.push(markdownCell(
        `## 🎯 Step 2 — Separate Features & Target\n\n` +
        `- **Target column:** \`${targetColumn}\`\n` +
        `- Rows where the target is missing are dropped.` +
        (!isRegression ? `\n- The target is label-encoded automatically if it contains text values.` : '')
    ));
    const targetLines = [
        '# Step 2 — Separate features and target',
        `target_column = '${targetColumn}'`,
        'df = df.dropna(subset=[target_column])',
        'X = df.drop(columns=[target_column])',
        'y = df[target_column]',
        '',
    ];
    if (!isRegression) {
        targetLines.push(
            '# Auto-encode categorical target if needed',
            "if y.dtype == 'object' or str(y.dtype) == 'category':",
            '    target_le = LabelEncoder()',
            '    y = pd.Series(target_le.fit_transform(y), index=y.index, name=y.name)',
            "    print(f'Target classes: {list(target_le.classes_)}')",
            '',
        );
    }
    targetLines.push("print(f'Features: {X.shape[1]}, Samples: {X.shape[0]}')");
    cells.push(codeCell(targetLines.join('\n')));

    // ── Step 3: Train-Test Split ──────────────────────────────────────────────
    const stratifyArg = (stratified && !isRegression) ? 'y' : 'None';
    cells.push(markdownCell(
        `## ✂️ Step 3 — Train-Test Split\n\n` +
        `Split data **before** any preprocessing to prevent data leakage.\n\n` +
        `| Setting | Value |\n` +
        `|---------|-------|\n` +
        `| Test size | ${Math.round(testSize * 100)}% |\n` +
        `| Random state | ${randomState} |\n` +
        `| Shuffle | ${shuffle} |\n` +
        `| Stratified | ${stratified && !isRegression} |`
    ));
    cells.push(codeCell([
        '# Step 3 — Train-Test Split',
        'X_train, X_test, y_train, y_test = train_test_split(',
        '    X, y,',
        `    test_size=${testSize},`,
        `    random_state=${randomState},`,
        `    shuffle=${shuffle ? 'True' : 'False'},`,
        `    stratify=${stratifyArg}`,
        ')',
        '',
        "numeric_cols = X_train.select_dtypes(include=['float64', 'int64']).columns.tolist()",
        "cat_cols = X_train.select_dtypes(include=['object', 'category']).columns.tolist()",
        '',
        "print(f'Train: {len(X_train)}, Test: {len(X_test)}')",
        "print(f'Numeric: {len(numeric_cols)}, Categorical: {len(cat_cols)}')",
    ].join('\n')));

    // ── Step 4: Duplicate Removal (optional) ──────────────────────────────────
    if (duplicateNode && dupStrategy !== 'none') {
        const keepArg = dupStrategy === 'all' ? 'False' : `'${dupStrategy}'`;
        cells.push(markdownCell(
            `## 🗑️ Step 4 — Duplicate Removal\n\n` +
            `Remove duplicate rows from training (and test) data.  \n` +
            `**Strategy:** \`${dupStrategy}\`` +
            (dupStrategy === 'all' ? ' — removes every copy of a duplicate row.' :
             dupStrategy === 'first' ? ' — keeps the first occurrence.' :
             ' — keeps the last occurrence.')
        ));
        cells.push(codeCell([
            `# Step 4 — Duplicate Removal (strategy: ${dupStrategy})`,
            'train_before = len(X_train)',
            'train_combined = X_train.copy()',
            "train_combined['__target__'] = y_train.values",
            dupStrategy === 'all'
                ? 'train_combined = train_combined.drop_duplicates(keep=False)'
                : `train_combined = train_combined.drop_duplicates(keep=${keepArg})`,
            "y_train = train_combined['__target__']",
            "X_train = train_combined.drop(columns=['__target__'])",
            '',
            'test_combined = X_test.copy()',
            "test_combined['__target__'] = y_test.values",
            dupStrategy === 'all'
                ? 'test_combined = test_combined.drop_duplicates(keep=False)'
                : "test_combined = test_combined.drop_duplicates(keep='first')",
            "y_test = test_combined['__target__']",
            "X_test = test_combined.drop(columns=['__target__'])",
            '',
            'X_train = X_train.reset_index(drop=True)',
            'y_train = y_train.reset_index(drop=True)',
            'X_test  = X_test.reset_index(drop=True)',
            'y_test  = y_test.reset_index(drop=True)',
            "print(f'Removed {train_before - len(X_train)} duplicate rows from training')",
        ].join('\n')));
    }

    // ── Step 5: Outlier Handling (optional) ───────────────────────────────────
    if (outlierNode && outlierMethod !== 'none' && outlierAction !== 'none') {
        cells.push(markdownCell(
            `## 📊 Step 5 — Outlier Handling\n\n` +
            `Detect and handle outliers in **numeric** columns using the training set bounds.\n\n` +
            `| Setting | Value |\n` +
            `|---------|-------|\n` +
            `| Detection method | ${outlierMethod === 'iqr' ? 'IQR (Q1 − 1.5×IQR, Q3 + 1.5×IQR)' : 'Z-Score (mean ± 3σ)'} |\n` +
            `| Action | ${outlierAction === 'clip' ? 'Clip to boundary values' : 'Remove outlier rows from training set'} |`
        ));
        const outLines = [
            `# Step 5 — Outlier Handling (method: ${outlierMethod}, action: ${outlierAction})`,
            'for col in numeric_cols:',
            '    if col not in X_train.columns:',
            '        continue',
        ];
        if (outlierMethod === 'iqr') {
            outLines.push(
                '    Q1 = X_train[col].quantile(0.25)',
                '    Q3 = X_train[col].quantile(0.75)',
                '    IQR = Q3 - Q1',
                '    lower = Q1 - 1.5 * IQR',
                '    upper = Q3 + 1.5 * IQR',
            );
        } else {
            outLines.push(
                '    mean = X_train[col].mean()',
                '    std  = X_train[col].std()',
                '    lower = mean - 3 * std',
                '    upper = mean + 3 * std',
            );
        }
        if (outlierAction === 'clip') {
            outLines.push(
                '    X_train[col] = X_train[col].clip(lower, upper)',
                '    X_test[col]  = X_test[col].clip(lower, upper)',
            );
        } else {
            outLines.push(
                '    mask = (X_train[col] >= lower) & (X_train[col] <= upper)',
                '    X_train = X_train[mask]',
                '    y_train = y_train[mask]',
            );
        }
        if (outlierAction === 'remove') {
            outLines.push(
                '',
                'X_train = X_train.reset_index(drop=True)',
                'y_train = y_train.reset_index(drop=True)',
            );
        }
        outLines.push("print('Outlier handling complete')");
        cells.push(codeCell(outLines.join('\n')));
    }

    // ── Step 6: Imputation ────────────────────────────────────────────────────
    cells.push(markdownCell(
        `## 🔧 Step 6 — Missing Value Imputation\n\n` +
        `Fill missing values **using only training data statistics** to avoid leakage.\n\n` +
        `| Column type | Strategy |\n` +
        `|-------------|----------|\n` +
        (imputeStrategy === 'drop'
            ? `| All columns | Drop rows with any NaN |`
            : `| Numeric | ${imputeStrategy} |\n| Categorical | ${imputeStrategy === 'constant' ? "fill with 'missing'" : 'most frequent'} |`)
    ));
    const impLines: string[] = [`# Step 6 — Missing Value Imputation (strategy: ${imputeStrategy})`];
    if (imputeStrategy === 'drop') {
        impLines.push(
            'train_mask = X_train.notna().all(axis=1)',
            'X_train = X_train[train_mask]',
            'y_train = y_train[train_mask]',
            'test_mask = X_test.notna().all(axis=1)',
            'X_test = X_test[test_mask]',
            'y_test = y_test[test_mask]',
            'X_train = X_train.reset_index(drop=True)',
            'y_train = y_train.reset_index(drop=True)',
            'X_test  = X_test.reset_index(drop=True)',
            'y_test  = y_test.reset_index(drop=True)',
        );
    } else {
        const numStrategy = imputeStrategy === 'constant' ? 'constant' : imputeStrategy;
        const numExtra    = imputeStrategy === 'constant' ? ', fill_value=0' : '';
        impLines.push(
            'if numeric_cols:',
            '    num_cols_present = [c for c in numeric_cols if c in X_train.columns]',
            '    if num_cols_present:',
            `        imp_num = SimpleImputer(strategy='${numStrategy}'${numExtra})`,
            '        X_train[num_cols_present] = imp_num.fit_transform(X_train[num_cols_present])',
            '        X_test[num_cols_present]  = imp_num.transform(X_test[num_cols_present])',
            '',
            'if cat_cols:',
            '    cat_cols_present = [c for c in cat_cols if c in X_train.columns]',
            '    if cat_cols_present:',
            imputeStrategy === 'constant'
                ? "        imp_cat = SimpleImputer(strategy='constant', fill_value='missing')"
                : "        imp_cat = SimpleImputer(strategy='most_frequent')",
            '        X_train[cat_cols_present] = imp_cat.fit_transform(X_train[cat_cols_present])',
            '        X_test[cat_cols_present]  = imp_cat.transform(X_test[cat_cols_present])',
        );
    }
    impLines.push("print('Imputation complete')");
    cells.push(codeCell(impLines.join('\n')));

    // ── Step 7: Encoding ──────────────────────────────────────────────────────
    cells.push(markdownCell(
        `## 🔤 Step 7 — Categorical Encoding\n\n` +
        `Convert text/categorical columns to numbers.  \n` +
        `**Strategy:** ` +
        (encodeStrategy === 'onehot'    ? '**One-Hot Encoding** — creates a binary column for each category. Best for nominal (unordered) data.' :
         encodeStrategy === 'label'    ? '**Label Encoding** — assigns an integer to each category. Suitable for ordinal data or tree-based models.' :
         encodeStrategy === 'target'   ? '**Target Encoding** — replaces each category with the mean target value. Fit on training data only.' :
                                         '**Frequency Encoding** — replaces each category with its relative frequency in the training set.')
    ));
    const encLines: string[] = [`# Step 7 — Categorical Encoding (strategy: ${encodeStrategy})`];
    if (encodeStrategy === 'onehot') {
        encLines.push(
            'if cat_cols:',
            '    cat_cols_present = [c for c in cat_cols if c in X_train.columns]',
            '    if cat_cols_present:',
            "        encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')",
            '        encoded_train = encoder.fit_transform(X_train[cat_cols_present])',
            '        encoded_test  = encoder.transform(X_test[cat_cols_present])',
            '        encoded_cols  = encoder.get_feature_names_out(cat_cols_present)',
            '        X_train = X_train.drop(columns=cat_cols_present)',
            '        X_test  = X_test.drop(columns=cat_cols_present)',
            '        X_train = pd.concat([X_train.reset_index(drop=True), pd.DataFrame(encoded_train, columns=encoded_cols)], axis=1)',
            '        X_test  = pd.concat([X_test.reset_index(drop=True),  pd.DataFrame(encoded_test,  columns=encoded_cols)], axis=1)',
        );
    } else if (encodeStrategy === 'label') {
        encLines.push(
            'if cat_cols:',
            '    cat_cols_present = [c for c in cat_cols if c in X_train.columns]',
            '    for col in cat_cols_present:',
            '        le = LabelEncoder()',
            '        X_train[col] = le.fit_transform(X_train[col].astype(str))',
            "        X_test[col]  = X_test[col].astype(str).map(lambda x: le.transform([x])[0] if x in le.classes_ else -1)",
        );
    } else if (encodeStrategy === 'target') {
        encLines.push(
            'if cat_cols:',
            '    cat_cols_present = [c for c in cat_cols if c in X_train.columns]',
            '    for col in cat_cols_present:',
            '        tmp = X_train[[col]].copy()',
            '        tmp["__y__"] = y_train.values',
            '        target_means = tmp.groupby(col)["__y__"].mean()',
            '        global_mean  = y_train.mean()',
            '        X_train[col] = X_train[col].map(target_means).fillna(global_mean)',
            '        X_test[col]  = X_test[col].map(target_means).fillna(global_mean)',
        );
    } else if (encodeStrategy === 'frequency') {
        encLines.push(
            'if cat_cols:',
            '    cat_cols_present = [c for c in cat_cols if c in X_train.columns]',
            '    for col in cat_cols_present:',
            '        freq_map = X_train[col].value_counts(normalize=True)',
            '        X_train[col] = X_train[col].map(freq_map).fillna(0)',
            '        X_test[col]  = X_test[col].map(freq_map).fillna(0)',
        );
    }
    encLines.push("print('Encoding complete')");
    cells.push(codeCell(encLines.join('\n')));

    // ── Step 8: Scaling ───────────────────────────────────────────────────────
    if (scalerType !== 'None') {
        cells.push(markdownCell(
            `## ⚖️ Step 8 — Feature Scaling\n\n` +
            `Scale numeric features so they are on a comparable range. Scaler is **fit on training data only**.\n\n` +
            `**Scaler:** ` +
            (scalerType === 'StandardScaler' ? '**StandardScaler** — zero mean, unit variance. Good default for most models.' :
             scalerType === 'MinMaxScaler'   ? '**MinMaxScaler** — scales to [0, 1]. Useful when you need bounded values.' :
             scalerType === 'RobustScaler'   ? '**RobustScaler** — uses median & IQR. Robust to outliers.' :
                                               '**Normalizer** — scales each *sample* (row) to unit norm.')
        ));
        cells.push(codeCell([
            `# Step 8 — Feature Scaling (${scalerType})`,
            `scaler = ${scalerType}()`,
            "numeric_cols_now = X_train.select_dtypes(include=['float64', 'int64']).columns.tolist()",
            'if numeric_cols_now:',
            '    X_train[numeric_cols_now] = scaler.fit_transform(X_train[numeric_cols_now])',
            '    X_test[numeric_cols_now]  = scaler.transform(X_test[numeric_cols_now])',
            "print('Scaling complete')",
        ].join('\n')));
    }

    // ── Step 9: Feature Selection (optional) ──────────────────────────────────
    if (featureSelNode && fsMeth !== 'none') {
        cells.push(markdownCell(
            `## 🔍 Step 9 — Feature Selection\n\n` +
            `Remove uninformative or redundant features to reduce noise.\n\n` +
            `| Setting | Value |\n` +
            `|---------|-------|\n` +
            `| Method | ${fsMeth} |\n` +
            (fsMeth === 'variance' || fsMeth === 'both' ? `| Variance threshold | ${fsVarThr} |\n` : '') +
            (fsMeth === 'correlation' || fsMeth === 'both' ? `| Correlation threshold | ${fsCorThr} |` : '')
        ));
        const fsLines: string[] = [
            `# Step 9 — Feature Selection (method: ${fsMeth})`,
            'original_count = X_train.shape[1]',
        ];
        if (fsMeth === 'variance' || fsMeth === 'both') {
            fsLines.push(
                "numeric_cols_now = X_train.select_dtypes(include=[np.number]).columns.tolist()",
                'if numeric_cols_now:',
                `    selector = VarianceThreshold(threshold=${fsVarThr})`,
                '    selector.fit(X_train[numeric_cols_now])',
                '    low_var = X_train[numeric_cols_now].columns[~selector.get_support()].tolist()',
                '    if low_var:',
                '        X_train = X_train.drop(columns=low_var)',
                '        X_test  = X_test.drop(columns=low_var)',
                "        print(f'Removed low-variance features: {low_var}')",
            );
        }
        if (fsMeth === 'correlation' || fsMeth === 'both') {
            fsLines.push(
                "numeric_cols_now = X_train.select_dtypes(include=[np.number]).columns.tolist()",
                'if len(numeric_cols_now) > 1:',
                '    corr_matrix = X_train[numeric_cols_now].corr().abs()',
                '    upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))',
                `    high_corr = [col for col in upper.columns if any(upper[col] > ${fsCorThr})]`,
                '    if high_corr:',
                '        X_train = X_train.drop(columns=high_corr)',
                '        X_test  = X_test.drop(columns=high_corr)',
                "        print(f'Removed highly correlated features: {high_corr}')",
            );
        }
        fsLines.push("print(f'Features: {original_count} → {X_train.shape[1]}')");
        cells.push(codeCell(fsLines.join('\n')));
    }

    // ── Step 10: Feature Engineering (optional) ───────────────────────────────
    if (featureEngNode && feMeth !== 'none') {
        cells.push(markdownCell(
            `## 🛠️ Step 10 — Feature Engineering\n\n` +
            `Create new features from existing numeric columns.  \n` +
            `**Method:** ` +
            (feMeth === 'polynomial' ? `**Polynomial Features** (degree ${feDegree}) — adds interaction and higher-order terms.` :
             feMeth === 'log'        ? '**Log Transform** — applies log1p(x). Useful for skewed distributions.' :
                                       '**Square Root Transform** — applies √x. Compresses large values.')
        ));
        const feLines: string[] = [`# Step 10 — Feature Engineering (method: ${feMeth})`];
        if (feMeth === 'polynomial') {
            feLines.push(
                `poly = PolynomialFeatures(degree=${feDegree}, include_bias=False)`,
                "numeric_cols_now = X_train.select_dtypes(include=[np.number]).columns.tolist()",
                'if numeric_cols_now:',
                '    X_train_poly = poly.fit_transform(X_train[numeric_cols_now])',
                '    X_test_poly  = poly.transform(X_test[numeric_cols_now])',
                '    poly_cols    = poly.get_feature_names_out(numeric_cols_now)',
                '    X_train = pd.concat([X_train.drop(columns=numeric_cols_now).reset_index(drop=True), pd.DataFrame(X_train_poly, columns=poly_cols)], axis=1)',
                '    X_test  = pd.concat([X_test.drop(columns=numeric_cols_now).reset_index(drop=True),  pd.DataFrame(X_test_poly,  columns=poly_cols)], axis=1)',
            );
        } else if (feMeth === 'log') {
            feLines.push(
                "numeric_cols_now = X_train.select_dtypes(include=[np.number]).columns.tolist()",
                'for col in numeric_cols_now:',
                '    X_train[col] = np.log1p(X_train[col].clip(lower=0))',
                '    X_test[col]  = np.log1p(X_test[col].clip(lower=0))',
            );
        } else if (feMeth === 'sqrt') {
            feLines.push(
                "numeric_cols_now = X_train.select_dtypes(include=[np.number]).columns.tolist()",
                'for col in numeric_cols_now:',
                '    X_train[col] = np.sqrt(X_train[col].clip(lower=0))',
                '    X_test[col]  = np.sqrt(X_test[col].clip(lower=0))',
            );
        }
        feLines.push("print(f'Feature engineering done — shape: {X_train.shape}')");
        cells.push(codeCell(feLines.join('\n')));
    }

    // ── Step 11: PCA (optional) ───────────────────────────────────────────────
    if (pcaNode) {
        cells.push(markdownCell(
            `## 📉 Step 11 — Dimensionality Reduction (PCA)\n\n` +
            `Use **Principal Component Analysis** to compress features into ${pcaComponents} dimensions.  \n` +
            `PCA is **fit on training data only** and applied to both train and test sets.  \n` +
            `> ⚠️ Feature importance is skipped when PCA is used, since original feature names are lost.`
        ));
        cells.push(codeCell([
            `# Step 11 — PCA (n_components=${pcaComponents})`,
            `pca = PCA(n_components=${pcaComponents}, random_state=${randomState})`,
            'X_train_arr = X_train.to_numpy()',
            'X_test_arr  = X_test.to_numpy()',
            `X_train = pd.DataFrame(pca.fit_transform(X_train_arr), columns=[f'PC{i+1}' for i in range(${pcaComponents})])`,
            `X_test  = pd.DataFrame(pca.transform(X_test_arr),  columns=[f'PC{i+1}' for i in range(${pcaComponents})])`,
            "print(f'PCA explained variance: {pca.explained_variance_ratio_.sum():.3f}')",
        ].join('\n')));
    }

    // ── Step 12: Class Balancing (optional, classification only) ──────────────
    if (classBalNode && !isRegression && classBalMethod !== 'none' && classBalMethod !== 'class_weight') {
        cells.push(markdownCell(
            `## ⚖️ Step 12 — Class Balancing\n\n` +
            `Address class imbalance so the model does not favour the majority class.  \n` +
            `**Method:** ` +
            (classBalMethod === 'smote'       ? '**SMOTE** — synthesises new minority-class samples using k-nearest neighbours.' :
             classBalMethod === 'oversample'  ? '**Random Oversampling** — duplicates random minority-class samples.' :
                                               '**Random Undersampling** — removes random majority-class samples.') +
            `  \n> ✅ Applied to **training data only**.`
        ));
        const sampler =
            classBalMethod === 'smote'      ? `SMOTE(random_state=${randomState})` :
            classBalMethod === 'oversample' ? `RandomOverSampler(random_state=${randomState})` :
                                              `RandomUnderSampler(random_state=${randomState})`;
        cells.push(codeCell([
            `# Step 12 — Class Balancing (${classBalMethod})`,
            `sampler = ${sampler}`,
            'X_train_res, y_train_res = sampler.fit_resample(X_train.to_numpy(), y_train)',
            'X_train = pd.DataFrame(X_train_res, columns=X_train.columns)',
            'y_train = pd.Series(y_train_res)',
            'X_train = X_train.reset_index(drop=True)',
            'y_train = y_train.reset_index(drop=True)',
            "print(f'Class distribution after balancing: {pd.Series(y_train).value_counts().to_dict()}')",
        ].join('\n')));
    }

    // ── Step 13: Train Model ──────────────────────────────────────────────────
    cells.push(markdownCell(
        `## 🤖 Step 13 — Train Model\n\n` +
        `Train a **${modelType}** on the fully preprocessed training set.` +
        (classBalMethod === 'class_weight' ? `  \n> Using \`class_weight='balanced'\` to handle class imbalance internally.` : '')
    ));
    cells.push(codeCell([
        `# Step 13 — Train Model: ${modelType}`,
        `model = ${modelInfo.instantiation(cwArg)}`,
        'model.fit(X_train, y_train)',
        "print('Training complete')",
    ].join('\n')));

    // ── Step 14: Evaluate ─────────────────────────────────────────────────────
    cells.push(markdownCell(
        `## 📈 Step 14 — Evaluate Model\n\n` +
        (isRegression
            ? `Regression metrics computed on the held-out test set:\n\n` +
              `| Metric | Description |\n` +
              `|--------|-------------|\n` +
              `| **MSE** | Mean Squared Error — average squared residual |\n` +
              `| **RMSE** | Root MSE — same units as the target |\n` +
              `| **MAE** | Mean Absolute Error — average absolute residual |\n` +
              `| **R²** | Coefficient of determination (1.0 = perfect fit) |\n` +
              `| **Train R²** | Training R² — compare vs test R² to spot overfitting |\n` +
              `| **EVS** | Explained Variance Score |`
            : `Classification metrics computed on the held-out test set:\n\n` +
              `| Metric | Description |\n` +
              `|--------|-------------|\n` +
              `| **Accuracy** | % of correct predictions |\n` +
              `| **Precision** | Of all positive predictions, how many were correct |\n` +
              `| **Recall** | Of all actual positives, how many were found |\n` +
              `| **F1 Score** | Harmonic mean of precision & recall |`)
    ));
    const evalLines: string[] = ['# Step 14 — Evaluate Model'];
    if (isRegression) {
        evalLines.push(
            'y_pred       = model.predict(X_test)',
            'y_train_pred = model.predict(X_train)',
            '',
            'mse      = mean_squared_error(y_test, y_pred)',
            'rmse     = np.sqrt(mse)',
            'mae      = mean_absolute_error(y_test, y_pred)',
            'r2       = r2_score(y_test, y_pred)',
            'train_r2 = r2_score(y_train, y_train_pred)',
            'evs      = explained_variance_score(y_test, y_pred)',
            '',
            "print(f'MSE:                {mse:.4f}')",
            "print(f'RMSE:               {rmse:.4f}')",
            "print(f'MAE:                {mae:.4f}')",
            "print(f'R² (test):          {r2:.4f}')",
            "print(f'R² (train):         {train_r2:.4f}')",
            "print(f'Explained Variance: {evs:.4f}')",
        );
    } else {
        evalLines.push(
            'y_pred       = model.predict(X_test)',
            'y_train_pred = model.predict(X_train)',
            '',
            'acc       = accuracy_score(y_test, y_pred)',
            'train_acc = accuracy_score(y_train, y_train_pred)',
            "prec  = precision_score(y_test, y_pred, average='weighted', zero_division=0)",
            "rec   = recall_score(y_test, y_pred, average='weighted', zero_division=0)",
            "f1    = f1_score(y_test, y_pred, average='weighted', zero_division=0)",
            '',
            "print(f'Test  Accuracy: {acc:.4f}')",
            "print(f'Train Accuracy: {train_acc:.4f}')",
            "print(f'Precision:      {prec:.4f}')",
            "print(f'Recall:         {rec:.4f}')",
            "print(f'F1 Score:       {f1:.4f}')",
            "print(f'\\nClassification Report:\\n{classification_report(y_test, y_pred, zero_division=0)}')",
        );
    }
    cells.push(codeCell(evalLines.join('\n')));

    // ── Step 15: Cross-Validation (optional) ──────────────────────────────────
    if (cvNode) {
        const useStratifiedCV = !isRegression && cvStratified;
        cells.push(markdownCell(
            `## 🔄 Step 15 — Cross-Validation\n\n` +
            `Evaluate model stability across ${cvFolds} folds using the **entire dataset**.  \n` +
            `**Type:** ${useStratifiedCV ? 'StratifiedKFold' : 'KFold'} | ` +
            `**Scoring:** ${isRegression ? 'R²' : 'Accuracy'}  \n` +
            `> The spread (mean ± std) indicates how consistently the model generalises.`
        ));
        cells.push(codeCell([
            `# Step 15 — Cross-Validation (K=${cvFolds})`,
            useStratifiedCV
                ? `cv = StratifiedKFold(n_splits=${cvFolds}, shuffle=True, random_state=${randomState})`
                : `cv = KFold(n_splits=${cvFolds}, shuffle=True, random_state=${randomState})`,
            `scoring = '${isRegression ? 'r2' : 'accuracy'}'`,
            '',
            'X_all = pd.concat([X_train, X_test], ignore_index=True)',
            'y_all = pd.concat([pd.Series(y_train), pd.Series(y_test)], ignore_index=True)',
            '',
            'cv_scores = cross_val_score(model, X_all, y_all, cv=cv, scoring=scoring)',
            "print(f'CV Scores: {cv_scores}')",
            "print(f'Mean: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}')",
        ].join('\n')));
    }

    // ── Step 16: Feature Importance (optional) ────────────────────────────────
    if (modelInfo.hasFeatureImportance !== 'none' && !pcaNode) {
        cells.push(markdownCell(
            `## 🌟 Step 16 — Feature Importance\n\n` +
            `Visualise which features had the most influence on the model's predictions.  \n` +
            `**Method:** ` +
            (modelInfo.hasFeatureImportance === 'tree'
                ? '`feature_importances_` — impurity-based importance from the tree structure.'
                : '`|coef_|` — magnitude of linear model coefficients.')
        ));
        cells.push(codeCell([
            '# Step 16 — Feature Importance',
            'import matplotlib.pyplot as plt',
            '',
            'feature_names = X_train.columns.tolist()',
            modelInfo.hasFeatureImportance === 'tree'
                ? 'importances = model.feature_importances_'
                : 'importances = np.abs(model.coef_).flatten()[:len(feature_names)]',
            '',
            'indices = np.argsort(importances)[::-1][:20]',
            'plt.figure(figsize=(10, 6))',
            'plt.bar(range(len(indices)), importances[indices])',
            "plt.xticks(range(len(indices)), [feature_names[i] for i in indices], rotation=45, ha='right')",
            `plt.title('Feature Importance — ${modelType}')`,
            'plt.tight_layout()',
            'plt.show()',
        ].join('\n')));
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    cells.push(markdownCell(
        `---\n\n` +
        `*Generated by [FlowML](https://github.com/FlowML) — Visual ML Pipeline Builder*  \n` +
        `*Model: **${modelType}** | Task: **${isRegression ? 'Regression' : 'Classification'}** | Target: \`${targetColumn}\`*`
    ));

    return {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {
            kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
            language_info: { name: 'python', version: '3.10.0' },
        },
        cells,
    };
}


// Download the notebook as a file
export function downloadNotebook(nodes: Node[], edges: Edge[], filename: string = 'flowml_pipeline.ipynb'): void {
    const notebook = generateNotebook(nodes, edges);
    const jsonStr = JSON.stringify(notebook, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
