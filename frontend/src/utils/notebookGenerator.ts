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
        kernelspec: {
            display_name: string;
            language: string;
            name: string;
        };
        language_info: {
            name: string;
            version: string;
        };
    };
    cells: NotebookCell[];
}

// Helper to create a code cell
const codeCell = (source: string): NotebookCell => ({
    cell_type: 'code',
    source: source.split('\n').map((line, i, arr) => (i < arr.length - 1 ? line + '\n' : line)),
    metadata: {},
    execution_count: null,
    outputs: [],
});

// Helper to create a markdown cell
const markdownCell = (source: string): NotebookCell => ({
    cell_type: 'markdown',
    source: source.split('\n').map((line, i, arr) => (i < arr.length - 1 ? line + '\n' : line)),
    metadata: {},
});

// Get node data from pipeline by type
const getNodeByType = (nodes: Node[], type: string): Node | undefined => {
    return nodes.find((n) => n.type === type);
};

// Generate Python code for each pipeline step
export function generateNotebook(nodes: Node[], _edges: Edge[]): JupyterNotebook {
    const cells: NotebookCell[] = [];

    // Title
    cells.push(markdownCell(`# FlowML Pipeline Export\n\nThis notebook was automatically generated from FlowML. Run all cells to reproduce the ML pipeline.`));

    // Imports
    cells.push(markdownCell(`## 1. Install & Import Dependencies`));
    cells.push(codeCell(`# Install required packages
!pip install pandas scikit-learn numpy matplotlib seaborn xgboost`));

    cells.push(codeCell(`import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, LabelEncoder, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')`));

    // Dataset Loading
    const datasetNode = getNodeByType(nodes, 'dataset');
    cells.push(markdownCell(`## 2. Load Dataset`));

    const datasetName = datasetNode?.data?.fileName || 'your_dataset.csv';
    cells.push(codeCell(`# Upload your dataset or provide the path
# For Google Colab, you can use:
# from google.colab import files
# uploaded = files.upload()

# Load the dataset
df = pd.read_csv('${datasetName}')
print(f"Dataset Shape: {df.shape}")
print(f"\\nColumn Types:\\n{df.dtypes}")
print(f"\\nFirst 5 Rows:")
df.head()`));

    // Imputation
    const imputationNode = getNodeByType(nodes, 'imputation');
    if (imputationNode) {
        cells.push(markdownCell(`## 3. Handle Missing Values (Imputation)`));
        const strategy = imputationNode.data?.strategy || 'mean';
        cells.push(codeCell(`# Check for missing values
print("Missing Values:")
print(df.isnull().sum())

# Apply imputation
numeric_cols = df.select_dtypes(include=[np.number]).columns
categorical_cols = df.select_dtypes(include=['object']).columns

# Impute numeric columns with ${strategy}
if len(numeric_cols) > 0:
    num_imputer = SimpleImputer(strategy='${strategy}')
    df[numeric_cols] = num_imputer.fit_transform(df[numeric_cols])

# Impute categorical columns with most frequent
if len(categorical_cols) > 0:
    cat_imputer = SimpleImputer(strategy='most_frequent')
    df[categorical_cols] = cat_imputer.fit_transform(df[categorical_cols])

print("\\nMissing values after imputation:")
print(df.isnull().sum().sum())`));
    }

    // Encoding
    const encodingNode = getNodeByType(nodes, 'encoding');
    if (encodingNode) {
        cells.push(markdownCell(`## 4. Encode Categorical Variables`));
        const encodingStrategy = encodingNode.data?.strategy || 'label';

        if (encodingStrategy === 'onehot' || encodingStrategy === 'One-Hot Encoding') {
            cells.push(codeCell(`# One-Hot Encoding for categorical variables
categorical_cols = df.select_dtypes(include=['object']).columns.tolist()

# Exclude target column if it's categorical (we'll encode it separately)
# Modify 'target_column' to your actual target column name
target_column = df.columns[-1]  # Assuming last column is target

if target_column in categorical_cols:
    categorical_cols.remove(target_column)

# Apply One-Hot Encoding
if len(categorical_cols) > 0:
    df = pd.get_dummies(df, columns=categorical_cols, drop_first=True)

print(f"Shape after encoding: {df.shape}")`));
        } else {
            cells.push(codeCell(`# Label Encoding for categorical variables
from sklearn.preprocessing import LabelEncoder

categorical_cols = df.select_dtypes(include=['object']).columns

label_encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    label_encoders[col] = le

print(f"Encoded {len(categorical_cols)} categorical columns")`));
        }
    }

    // Preprocessing (Scaling)
    const preprocessingNode = getNodeByType(nodes, 'preprocessing');
    const splitNode = getNodeByType(nodes, 'split');
    const modelNode = getNodeByType(nodes, 'model');

    if (preprocessingNode) {
        cells.push(markdownCell(`## 5. Feature Scaling`));
        const scalerType = preprocessingNode.data?.scaler || 'standard';

        let scalerCode = 'StandardScaler()';
        if (scalerType === 'minmax') scalerCode = 'MinMaxScaler()';
        else if (scalerType === 'robust') scalerCode = 'RobustScaler()';

        cells.push(codeCell(`# Prepare features and target
# Modify these according to your dataset
target_column = df.columns[-1]  # Assuming last column is target
X = df.drop(columns=[target_column])
y = df[target_column]

# Apply ${scalerType} scaling
scaler = ${scalerCode}
X_scaled = pd.DataFrame(scaler.fit_transform(X), columns=X.columns)

print(f"Features shape: {X_scaled.shape}")
print(f"Target shape: {y.shape}")`));
    } else if (splitNode || modelNode) {
        // If no preprocessing node but we have split/model, we need to define X and y
        cells.push(markdownCell(`## 5. Prepare Features and Target`));
        cells.push(codeCell(`# Prepare features and target
# Modify these according to your dataset
target_column = df.columns[-1]  # Assuming last column is target
X = df.drop(columns=[target_column])
y = df[target_column]
X_scaled = X  # No scaling applied

print(f"Features shape: {X.shape}")
print(f"Target shape: {y.shape}")`));
    } else {
        // Just show the final dataframe if no further steps
        cells.push(markdownCell(`## 5. Final Dataset`));
        cells.push(codeCell(`print("Final processed dataset shape:", df.shape)
df.head()`));
    }

    // Train-Test Split
    if (splitNode) {
        const testSize = splitNode.data?.testSize || 0.2;
        const randomState = splitNode.data?.randomState || 42;

        cells.push(markdownCell(`## 6. Train-Test Split`));
        cells.push(codeCell(`# Split the data
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, 
    test_size=${testSize}, 
    random_state=${randomState}
)

print(f"Training set: {X_train.shape[0]} samples")
print(f"Test set: {X_test.shape[0]} samples")`));
    }

    // Model Training
    if (modelNode) {
        cells.push(markdownCell(`## 7. Model Training`));

        const modelType = modelNode.data?.modelType || 'logistic_regression';

        let modelImport = '';
        let modelInit = '';

        switch (modelType) {
            case 'logistic_regression':
                modelImport = 'from sklearn.linear_model import LogisticRegression';
                modelInit = 'LogisticRegression(max_iter=1000, random_state=42)';
                break;
            case 'random_forest':
                modelImport = 'from sklearn.ensemble import RandomForestClassifier';
                modelInit = 'RandomForestClassifier(n_estimators=100, random_state=42)';
                break;
            case 'svm':
                modelImport = 'from sklearn.svm import SVC';
                modelInit = 'SVC(kernel="rbf", random_state=42)';
                break;
            case 'decision_tree':
                modelImport = 'from sklearn.tree import DecisionTreeClassifier';
                modelInit = 'DecisionTreeClassifier(random_state=42)';
                break;
            case 'knn':
                modelImport = 'from sklearn.neighbors import KNeighborsClassifier';
                modelInit = 'KNeighborsClassifier(n_neighbors=5)';
                break;
            case 'gradient_boosting':
                modelImport = 'from sklearn.ensemble import GradientBoostingClassifier';
                modelInit = 'GradientBoostingClassifier(random_state=42)';
                break;
            case 'xgboost':
                modelImport = 'from xgboost import XGBClassifier';
                modelInit = 'XGBClassifier(random_state=42, use_label_encoder=False, eval_metric="logloss")';
                break;
            default:
                modelImport = 'from sklearn.linear_model import LogisticRegression';
                modelInit = 'LogisticRegression(max_iter=1000, random_state=42)';
        }

        const trainData = splitNode ? 'X_train' : 'X_scaled';
        const trainTarget = splitNode ? 'y_train' : 'y';

        cells.push(codeCell(`${modelImport}

# Initialize and train the model
model = ${modelInit}
model.fit(${trainData}, ${trainTarget})

print("Model trained successfully!")
print(f"Model: {model.__class__.__name__}")`));

        // Evaluation
        cells.push(markdownCell(`## 8. Model Evaluation`));

        const testData = splitNode ? 'X_test' : 'X_scaled';
        const testTarget = splitNode ? 'y_test' : 'y';

        cells.push(codeCell(`# Make predictions
y_pred = model.predict(${testData})

# Calculate metrics
accuracy = accuracy_score(${testTarget}, y_pred)
precision = precision_score(${testTarget}, y_pred, average='weighted', zero_division=0)
recall = recall_score(${testTarget}, y_pred, average='weighted', zero_division=0)
f1 = f1_score(${testTarget}, y_pred, average='weighted', zero_division=0)

print("=" * 50)
print("MODEL EVALUATION RESULTS")
print("=" * 50)
print(f"Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
print(f"Precision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1 Score:  {f1:.4f}")
print("=" * 50)`));

        // Confusion Matrix Visualization
        cells.push(markdownCell(`## 9. Confusion Matrix`));
        cells.push(codeCell(`# Plot confusion matrix
plt.figure(figsize=(8, 6))
cm = confusion_matrix(${testTarget}, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.title('Confusion Matrix')
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.tight_layout()
plt.show()

# Classification Report
print("\\nClassification Report:")
print(classification_report(${testTarget}, y_pred))`));
    }

    // Footer
    cells.push(markdownCell(`---\n\n*Generated by FlowML - Visual ML Pipeline Builder*`));

    // Construct the notebook
    const notebook: JupyterNotebook = {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {
            kernelspec: {
                display_name: 'Python 3',
                language: 'python',
                name: 'python3',
            },
            language_info: {
                name: 'python',
                version: '3.9.0',
            },
        },
        cells,
    };

    return notebook;
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
