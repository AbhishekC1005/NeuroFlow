"""
ML Service for data processing, training, and evaluation.
Updated for MongoDB + Cloudinary.
Enhanced with comprehensive pipeline capabilities.
"""
import pandas as pd
import numpy as np
import io
import os
import requests
import warnings
from bson import ObjectId
from datetime import datetime, timezone

from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold, KFold
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import (
    StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler, Normalizer,
    LabelEncoder, OneHotEncoder, OrdinalEncoder, PolynomialFeatures
)
from sklearn.feature_selection import VarianceThreshold
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import (
    RandomForestClassifier, RandomForestRegressor,
    GradientBoostingClassifier, GradientBoostingRegressor
)
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    mean_squared_error, r2_score, mean_absolute_error,
    precision_score, recall_score, f1_score, explained_variance_score
)

from database import datasets_collection, results_collection

warnings.filterwarnings('ignore')


class MLService:
    def __init__(self):
        # State for the currently running pipeline
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.model = None
        self.feature_names = None
        self.is_regression = False
        self.numeric_cols = []
        self.cat_cols = []
        self.target_encoder = None  # For categorical targets
        self.pipeline_warnings = []  # Collect warnings throughout pipeline

    def load_data(self, file_content: bytes, filename: str):
        """Load data from bytes and return preview info."""
        file_obj = io.BytesIO(file_content)

        if filename.endswith('.csv'):
            df = pd.read_csv(file_obj)
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_obj)
        else:
            raise ValueError("Unsupported file format")
        
        return {
            "id": filename,
            "preview": df.head(10).astype(object).where(pd.notnull(df), None).to_dict(orient='records'),
            "columns": list(df.columns),
            "shape": df.shape
        }

    def load_and_split(self, file_content: bytes, filename: str, target_column: str,
                       test_size: float = 0.2, stratified: bool = False,
                       random_state: int = 42, shuffle: bool = True):
        """Load data and split into train/test sets."""
        file_obj = io.BytesIO(file_content)
        
        if filename.endswith('.csv'):
            df = pd.read_csv(file_obj)
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_obj)
        else:
            raise ValueError("Unsupported file format")
        
        if target_column not in df.columns:
            raise ValueError(f"Target column {target_column} not found")
        
        df = df.dropna(subset=[target_column])
        
        X = df.drop(columns=[target_column])
        y = df[target_column]

        # Auto-encode categorical target for classification
        if y.dtype == 'object' or y.dtype.name == 'category':
            self.target_encoder = LabelEncoder()
            y = pd.Series(self.target_encoder.fit_transform(y), index=y.index, name=y.name)
            self.pipeline_warnings.append(
                f"Target column '{target_column}' is categorical — auto-encoded with LabelEncoder. "
                f"Classes: {list(self.target_encoder.classes_)}"
            )

        # Determine stratification
        stratify_param = None
        if stratified and not self.is_regression:
            # Check if stratification is possible
            min_class_count = y.value_counts().min()
            if min_class_count >= 2:
                stratify_param = y
            else:
                self.pipeline_warnings.append(
                    "Stratified split requested but some classes have fewer than 2 samples. Using regular split."
                )
        
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state,
            shuffle=shuffle, stratify=stratify_param
        )
        
        self.numeric_cols = self.X_train.select_dtypes(include=['float64', 'int64']).columns.tolist()
        self.cat_cols = self.X_train.select_dtypes(include=['object', 'category']).columns.tolist()

    # ==================== NEW: Duplicate Removal ====================
    def remove_duplicates(self, strategy: str = 'all'):
        """Remove duplicate rows from training and test data."""
        if self.X_train is None:
            return {"removed_train": 0, "removed_test": 0}

        train_before = len(self.X_train)
        test_before = len(self.X_test)

        if strategy == 'none':
            return {"removed_train": 0, "removed_test": 0}

        # Combine X and y for duplicate detection
        train_combined = self.X_train.copy()
        train_combined['__target__'] = self.y_train.values

        if strategy == 'all':
            train_combined = train_combined.drop_duplicates(keep=False)
        elif strategy == 'first':
            train_combined = train_combined.drop_duplicates(keep='first')
        elif strategy == 'last':
            train_combined = train_combined.drop_duplicates(keep='last')

        self.y_train = train_combined['__target__']
        self.X_train = train_combined.drop(columns=['__target__'])

        # Also clean test set
        test_combined = self.X_test.copy()
        test_combined['__target__'] = self.y_test.values
        if strategy == 'all':
            test_combined = test_combined.drop_duplicates(keep=False)
        else:
            test_combined = test_combined.drop_duplicates(keep='first')
        self.y_test = test_combined['__target__']
        self.X_test = test_combined.drop(columns=['__target__'])

        removed_train = train_before - len(self.X_train)
        removed_test = test_before - len(self.X_test)

        if removed_train > 0 or removed_test > 0:
            self.pipeline_warnings.append(
                f"Removed {removed_train} duplicate rows from training data and {removed_test} from test data."
            )

        return {"removed_train": removed_train, "removed_test": removed_test}

    # ==================== NEW: Outlier Handling ====================
    def handle_outliers(self, method: str = 'iqr', action: str = 'clip'):
        """Detect and handle outliers in numeric columns."""
        if self.X_train is None or not self.numeric_cols:
            return {"outliers_handled": 0}

        if method == 'none' or action == 'none':
            return {"outliers_handled": 0}

        total_outliers = 0

        for col in self.numeric_cols:
            if col not in self.X_train.columns:
                continue

            if method == 'iqr':
                Q1 = self.X_train[col].quantile(0.25)
                Q3 = self.X_train[col].quantile(0.75)
                IQR = Q3 - Q1
                lower = Q1 - 1.5 * IQR
                upper = Q3 + 1.5 * IQR
            elif method == 'zscore':
                mean = self.X_train[col].mean()
                std = self.X_train[col].std()
                lower = mean - 3 * std
                upper = mean + 3 * std
            else:
                continue

            # Count outliers
            train_outliers = ((self.X_train[col] < lower) | (self.X_train[col] > upper)).sum()
            total_outliers += train_outliers

            if action == 'clip':
                self.X_train[col] = self.X_train[col].clip(lower, upper)
                self.X_test[col] = self.X_test[col].clip(lower, upper)
            elif action == 'remove':
                mask = (self.X_train[col] >= lower) & (self.X_train[col] <= upper)
                self.X_train = self.X_train[mask]
                self.y_train = self.y_train[mask]

        if total_outliers > 0:
            self.pipeline_warnings.append(
                f"Detected {total_outliers} outlier values across {len(self.numeric_cols)} numeric columns "
                f"using {method.upper()} method. Action: {action}."
            )

        return {"outliers_handled": total_outliers, "method": method, "action": action}

    # ==================== NEW: Feature Selection ====================
    def apply_feature_selection(self, method: str = 'variance', variance_threshold: float = 0.01,
                                 correlation_threshold: float = 0.95):
        """Select features based on variance or correlation."""
        if self.X_train is None:
            return {"features_removed": []}

        if method == 'none':
            return {"features_removed": []}

        removed_features = []
        original_count = len(self.X_train.columns)

        # Variance Threshold — remove near-zero variance features
        if method in ['variance', 'both']:
            # Only apply to numeric columns
            numeric_train = self.X_train.select_dtypes(include=[np.number])
            if len(numeric_train.columns) > 0:
                selector = VarianceThreshold(threshold=variance_threshold)
                try:
                    selector.fit(numeric_train)
                    low_variance_cols = numeric_train.columns[~selector.get_support()].tolist()
                    if low_variance_cols:
                        self.X_train = self.X_train.drop(columns=low_variance_cols)
                        self.X_test = self.X_test.drop(columns=low_variance_cols)
                        removed_features.extend(low_variance_cols)
                        self.pipeline_warnings.append(
                            f"Removed {len(low_variance_cols)} low-variance features: {low_variance_cols}"
                        )
                except Exception:
                    pass

        # Correlation Filter — remove highly correlated features
        if method in ['correlation', 'both']:
            numeric_train = self.X_train.select_dtypes(include=[np.number])
            if len(numeric_train.columns) > 1:
                corr_matrix = numeric_train.corr().abs()
                upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
                high_corr_cols = [col for col in upper.columns if any(upper[col] > correlation_threshold)]
                if high_corr_cols:
                    self.X_train = self.X_train.drop(columns=high_corr_cols)
                    self.X_test = self.X_test.drop(columns=high_corr_cols)
                    removed_features.extend(high_corr_cols)
                    self.pipeline_warnings.append(
                        f"Removed {len(high_corr_cols)} highly correlated features (>{correlation_threshold}): {high_corr_cols}"
                    )

        # Update column lists
        self.numeric_cols = self.X_train.select_dtypes(include=['float64', 'int64']).columns.tolist()
        self.cat_cols = self.X_train.select_dtypes(include=['object', 'category']).columns.tolist()

        return {
            "features_removed": removed_features,
            "features_before": original_count,
            "features_after": len(self.X_train.columns)
        }

    def apply_preprocessing(self, imputer_strategy: str = 'mean', encoder_strategy: str = 'onehot', scaler_type: str = 'None'):
        """Apply imputation, encoding, and scaling."""
        # --- 1. Imputation ---
        if imputer_strategy == 'drop':
            train_mask = self.X_train.notna().all(axis=1)
            self.X_train = self.X_train[train_mask]
            self.y_train = self.y_train[train_mask]
            
            test_mask = self.X_test.notna().all(axis=1)
            self.X_test = self.X_test[test_mask]
            self.y_test = self.y_test[test_mask]
        else:
            if self.numeric_cols:
                num_cols_present = [c for c in self.numeric_cols if c in self.X_train.columns]
                if num_cols_present:
                    imp_num = SimpleImputer(
                        strategy=imputer_strategy if imputer_strategy != 'constant' else 'constant',
                        fill_value=0 if imputer_strategy == 'constant' else None
                    )
                    self.X_train[num_cols_present] = imp_num.fit_transform(self.X_train[num_cols_present])
                    self.X_test[num_cols_present] = imp_num.transform(self.X_test[num_cols_present])
            
            if self.cat_cols:
                cat_cols_present = [c for c in self.cat_cols if c in self.X_train.columns]
                if cat_cols_present:
                    imp_cat = SimpleImputer(strategy='most_frequent')
                    self.X_train[cat_cols_present] = imp_cat.fit_transform(self.X_train[cat_cols_present])
                    self.X_test[cat_cols_present] = imp_cat.transform(self.X_test[cat_cols_present])

        # --- 2. Encoding ---
        cat_cols_present = [c for c in self.cat_cols if c in self.X_train.columns]
        if cat_cols_present:
            if encoder_strategy == 'onehot':
                ohe = OneHotEncoder(handle_unknown='ignore', sparse_output=False, drop='first')
                
                X_train_enc = ohe.fit_transform(self.X_train[cat_cols_present])
                X_test_enc = ohe.transform(self.X_test[cat_cols_present])
                
                feat_names = ohe.get_feature_names_out(cat_cols_present)
                
                X_train_cat = pd.DataFrame(X_train_enc, columns=feat_names, index=self.X_train.index)
                X_test_cat = pd.DataFrame(X_test_enc, columns=feat_names, index=self.X_test.index)
                
                self.X_train = pd.concat([self.X_train.drop(columns=cat_cols_present), X_train_cat], axis=1)
                self.X_test = pd.concat([self.X_test.drop(columns=cat_cols_present), X_test_cat], axis=1)
            elif encoder_strategy == 'label':
                oe = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
                self.X_train[cat_cols_present] = oe.fit_transform(self.X_train[cat_cols_present])
                self.X_test[cat_cols_present] = oe.transform(self.X_test[cat_cols_present])
                self.X_train[cat_cols_present] = self.X_train[cat_cols_present].astype(float)
                self.X_test[cat_cols_present] = self.X_test[cat_cols_present].astype(float)
            elif encoder_strategy == 'target':
                # Target Encoding — replace category with mean of target
                for col in cat_cols_present:
                    target_means = self.X_train.copy()
                    target_means['__target__'] = self.y_train.values
                    means = target_means.groupby(col)['__target__'].mean()
                    global_mean = self.y_train.mean()
                    self.X_train[col] = self.X_train[col].map(means).fillna(global_mean).astype(float)
                    self.X_test[col] = self.X_test[col].map(means).fillna(global_mean).astype(float)
            elif encoder_strategy == 'frequency':
                # Frequency Encoding — replace category with its frequency
                for col in cat_cols_present:
                    freq_map = self.X_train[col].value_counts(normalize=True)
                    self.X_train[col] = self.X_train[col].map(freq_map).fillna(0).astype(float)
                    self.X_test[col] = self.X_test[col].map(freq_map).fillna(0).astype(float)

        self.X_train = self.X_train.fillna(0)
        self.X_test = self.X_test.fillna(0)
        self.feature_names = list(self.X_train.columns)

        # --- 3. Scaling ---
        if scaler_type != 'None':
            if scaler_type == 'StandardScaler':
                scaler = StandardScaler()
            elif scaler_type == 'MinMaxScaler':
                scaler = MinMaxScaler()
            elif scaler_type == 'RobustScaler':
                scaler = RobustScaler()
            elif scaler_type == 'Normalizer':
                scaler = Normalizer()
            else:
                scaler = None

            if scaler is not None:
                self.X_train = pd.DataFrame(
                    scaler.fit_transform(self.X_train),
                    columns=self.feature_names,
                    index=self.X_train.index
                )
                self.X_test = pd.DataFrame(
                    scaler.transform(self.X_test),
                    columns=self.feature_names,
                    index=self.X_test.index
                )

    # ==================== NEW: PCA ====================
    def apply_pca(self, n_components: int = 0):
        """Apply PCA dimensionality reduction."""
        if n_components <= 0 or self.X_train is None:
            return {"applied": False}

        max_components = min(self.X_train.shape[0], self.X_train.shape[1])
        n_components = min(n_components, max_components)

        pca = PCA(n_components=n_components)
        X_train_pca = pca.fit_transform(self.X_train)
        X_test_pca = pca.transform(self.X_test)

        pca_cols = [f"PC{i+1}" for i in range(n_components)]
        self.X_train = pd.DataFrame(X_train_pca, columns=pca_cols, index=self.X_train.index)
        self.X_test = pd.DataFrame(X_test_pca, columns=pca_cols, index=self.X_test.index)
        self.feature_names = pca_cols

        explained = sum(pca.explained_variance_ratio_) * 100
        self.pipeline_warnings.append(
            f"PCA reduced features to {n_components} components, explaining {explained:.1f}% of variance."
        )

        return {
            "applied": True,
            "n_components": n_components,
            "explained_variance_pct": round(explained, 2),
            "per_component": [round(v * 100, 2) for v in pca.explained_variance_ratio_]
        }

    # ==================== NEW: Feature Engineering ====================
    def apply_feature_engineering(self, method: str = 'none', polynomial_degree: int = 2):
        """Apply feature engineering transformations."""
        if method == 'none' or self.X_train is None:
            return {"applied": False}

        if method == 'polynomial':
            poly = PolynomialFeatures(degree=polynomial_degree, include_bias=False, interaction_only=False)
            X_train_poly = poly.fit_transform(self.X_train)
            X_test_poly = poly.transform(self.X_test)
            poly_cols = [f"poly_{i}" for i in range(X_train_poly.shape[1])]
            self.X_train = pd.DataFrame(X_train_poly, columns=poly_cols, index=self.X_train.index)
            self.X_test = pd.DataFrame(X_test_poly, columns=poly_cols, index=self.X_test.index)
            self.feature_names = poly_cols
            self.pipeline_warnings.append(
                f"Polynomial features (degree={polynomial_degree}) expanded features from {len(self.numeric_cols)} to {len(poly_cols)}."
            )
        elif method == 'log':
            for col in self.X_train.columns:
                if self.X_train[col].min() > 0:
                    self.X_train[col] = np.log1p(self.X_train[col])
                    self.X_test[col] = np.log1p(self.X_test[col])
            self.feature_names = list(self.X_train.columns)
            self.pipeline_warnings.append("Applied log(1+x) transformation to positive-valued features.")
        elif method == 'sqrt':
            for col in self.X_train.columns:
                if self.X_train[col].min() >= 0:
                    self.X_train[col] = np.sqrt(self.X_train[col])
                    self.X_test[col] = np.sqrt(self.X_test[col])
            self.feature_names = list(self.X_train.columns)
            self.pipeline_warnings.append("Applied sqrt transformation to non-negative features.")

        return {"applied": True, "method": method, "features_count": len(self.feature_names)}

    # ==================== NEW: Class Balancing ====================
    def handle_class_imbalance(self, method: str = 'none'):
        """Handle class imbalance in training data."""
        if method == 'none' or self.X_train is None or self.is_regression:
            return {"applied": False}

        class_counts = pd.Series(self.y_train).value_counts()
        majority_count = class_counts.max()
        minority_count = class_counts.min()

        if minority_count / majority_count > 0.8:
            self.pipeline_warnings.append("Classes are already balanced (minority/majority ratio > 0.8). No balancing applied.")
            return {"applied": False, "reason": "already_balanced"}

        original_size = len(self.X_train)

        if method == 'oversample':
            # Random oversampling of minority classes
            from sklearn.utils import resample
            combined = pd.DataFrame(self.X_train)
            combined['__target__'] = self.y_train.values
            
            dfs = []
            for cls in class_counts.index:
                cls_data = combined[combined['__target__'] == cls]
                if len(cls_data) < majority_count:
                    cls_upsampled = resample(cls_data, replace=True, n_samples=majority_count, random_state=42)
                    dfs.append(cls_upsampled)
                else:
                    dfs.append(cls_data)
            
            balanced = pd.concat(dfs)
            self.y_train = balanced['__target__']
            self.X_train = balanced.drop(columns=['__target__'])

        elif method == 'undersample':
            # Random undersampling of majority class
            from sklearn.utils import resample
            combined = pd.DataFrame(self.X_train)
            combined['__target__'] = self.y_train.values
            
            dfs = []
            for cls in class_counts.index:
                cls_data = combined[combined['__target__'] == cls]
                if len(cls_data) > minority_count:
                    cls_downsampled = resample(cls_data, replace=False, n_samples=minority_count, random_state=42)
                    dfs.append(cls_downsampled)
                else:
                    dfs.append(cls_data)
            
            balanced = pd.concat(dfs)
            self.y_train = balanced['__target__']
            self.X_train = balanced.drop(columns=['__target__'])

        elif method == 'smote':
            try:
                from imblearn.over_sampling import SMOTE
                smote = SMOTE(random_state=42)
                X_resampled, y_resampled = smote.fit_resample(self.X_train, self.y_train)
                self.X_train = pd.DataFrame(X_resampled, columns=self.X_train.columns)
                self.y_train = pd.Series(y_resampled)
            except ImportError:
                self.pipeline_warnings.append(
                    "SMOTE requires 'imbalanced-learn' package. Install with: pip install imbalanced-learn. "
                    "Falling back to random oversampling."
                )
                return self.handle_class_imbalance('oversample')

        # 'class_weight' is handled directly in model training, not here
        elif method == 'class_weight':
            self.pipeline_warnings.append(
                "Class weight balancing will be applied during model training."
            )
            return {"applied": True, "method": "class_weight"}

        new_size = len(self.X_train)
        self.pipeline_warnings.append(
            f"Class balancing ({method}): training set changed from {original_size} to {new_size} samples."
        )

        return {"applied": True, "method": method, "original_size": original_size, "new_size": new_size}

    def analyze_dataset(self, file_content: bytes, filename: str):
        """Analyze dataset for histograms and correlations."""
        file_obj = io.BytesIO(file_content)
        if filename.endswith('.csv'):
            df = pd.read_csv(file_obj)
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_obj)
        else:
            raise ValueError("Unsupported file format")

        numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns.tolist()
        
        histograms = []
        for col in numeric_cols[:10]:
            try:
                data = df[col].dropna().tolist()
                if not data:
                    continue
                counts, bin_edges = np.histogram(data, bins=10)
                hist_data = []
                for i in range(len(counts)):
                    hist_data.append({
                        "bin": f"{bin_edges[i]:.1f} - {bin_edges[i+1]:.1f}",
                        "count": int(counts[i])
                    })
                histograms.append({"column": col, "data": hist_data})
            except Exception:
                continue

        correlation_matrix = []
        if len(numeric_cols) > 1:
            try:
                corr_df = df[numeric_cols].corr()
                correlation_matrix = {
                    "columns": numeric_cols,
                    "values": corr_df.where(pd.notnull(corr_df), 0).values.tolist()
                }
            except Exception:
                pass

        return {
            "histograms": histograms,
            "correlation_matrix": correlation_matrix if isinstance(correlation_matrix, dict) else {"columns": [], "values": []},
            "columns": list(df.columns),
            "rows_count": len(df)
        }

    def train_model(self, model_type: str, class_balancing: str = 'none'):
        """Train the specified model."""
        if self.X_train is None:
            raise ValueError("Data not split")
            
        self.is_regression = False
        self.model_type = model_type  # Store for reporting

        # Determine if class_weight should be used
        use_balanced = class_balancing == 'class_weight'
        
        if model_type == 'Logistic Regression':
            self.model = LogisticRegression(
                max_iter=2000,
                class_weight='balanced' if use_balanced else None
            )
        elif model_type == 'Decision Tree':
            self.model = DecisionTreeClassifier(
                class_weight='balanced' if use_balanced else None
            )
        elif model_type == 'Random Forest':
            self.model = RandomForestClassifier(
                class_weight='balanced' if use_balanced else None
            )
        elif model_type == 'SVM':
            self.model = SVC(
                probability=True, max_iter=5000,
                class_weight='balanced' if use_balanced else None
            )
        elif model_type == 'KNN':
            self.model = KNeighborsClassifier()
        elif model_type == 'Gradient Boosting':
            self.model = GradientBoostingClassifier()
        elif model_type == 'XGBoost':
            try:
                from xgboost import XGBClassifier
                self.model = XGBClassifier(
                    use_label_encoder=False, eval_metric='logloss',
                    verbosity=0
                )
            except ImportError:
                raise ValueError(
                    "XGBoost is not installed. Install with: pip install xgboost"
                )
        elif model_type == 'MLP Classifier':
            self.model = MLPClassifier(max_iter=1000, early_stopping=True)
        elif model_type == 'Linear Regression':
            self.model = LinearRegression()
            self.is_regression = True
        elif model_type == 'Random Forest Regressor':
            self.model = RandomForestRegressor()
            self.is_regression = True
        elif model_type == 'Ridge Regression':
            self.model = Ridge()
            self.is_regression = True
        elif model_type == 'Lasso Regression':
            self.model = Lasso()
            self.is_regression = True
        elif model_type == 'ElasticNet':
            self.model = ElasticNet()
            self.is_regression = True
        elif model_type == 'SVR':
            self.model = SVR()
            self.is_regression = True
        elif model_type == 'KNN Regressor':
            self.model = KNeighborsRegressor()
            self.is_regression = True
        elif model_type == 'Gradient Boosting Regressor':
            self.model = GradientBoostingRegressor()
            self.is_regression = True
        elif model_type == 'XGBoost Regressor':
            try:
                from xgboost import XGBRegressor
                self.model = XGBRegressor(verbosity=0)
            except ImportError:
                raise ValueError(
                    "XGBoost is not installed. Install with: pip install xgboost"
                )
            self.is_regression = True
        elif model_type == 'MLP Regressor':
            self.model = MLPRegressor(max_iter=1000, early_stopping=True)
            self.is_regression = True
        else:
            raise ValueError(f"Unsupported model: {model_type}")
            
        self.model.fit(self.X_train, self.y_train)

    # ==================== NEW: Cross-Validation ====================
    def cross_validate(self, cv_folds: int = 5, cv_stratified: bool = True):
        """Perform cross-validation on the training data."""
        if self.model is None or self.X_train is None or cv_folds <= 1:
            return None

        try:
            scoring = 'r2' if self.is_regression else 'accuracy'

            if cv_stratified and not self.is_regression:
                cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
            else:
                cv = KFold(n_splits=cv_folds, shuffle=True, random_state=42)

            scores = cross_val_score(self.model, self.X_train, self.y_train, cv=cv, scoring=scoring)

            return {
                "folds": cv_folds,
                "scores": [round(s, 4) for s in scores.tolist()],
                "mean": round(scores.mean(), 4),
                "std": round(scores.std(), 4),
                "metric": scoring,
                "stratified": cv_stratified and not self.is_regression
            }
        except Exception as e:
            self.pipeline_warnings.append(f"Cross-validation failed: {str(e)}")
            return None

    def evaluate(self):
        """Evaluate the trained model with overfitting detection."""
        if self.model is None or self.X_test is None:
            raise ValueError("Model not trained or data not present")

        y_pred = self.model.predict(self.X_test)
        y_train_pred = self.model.predict(self.X_train)

        if self.is_regression:
            # Test metrics
            mse = mean_squared_error(self.y_test, y_pred)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(self.y_test, y_pred)
            r2 = r2_score(self.y_test, y_pred)
            explained_var = explained_variance_score(self.y_test, y_pred)

            # Training metrics for overfitting detection
            train_r2 = r2_score(self.y_train, y_train_pred)
            train_mse = mean_squared_error(self.y_train, y_train_pred)

            # Adjusted R²
            n = len(self.y_test)
            p = self.X_test.shape[1]
            adjusted_r2 = 1 - (1 - r2) * (n - 1) / (n - p - 1) if n > p + 1 else r2

            # Overfitting analysis
            overfit_gap = train_r2 - r2
            overfitting_analysis = self._analyze_overfitting(train_r2, r2, overfit_gap)

            feature_importance = self._get_feature_importance()

            return {
                "mse": round(mse, 4),
                "rmse": round(rmse, 4),
                "mae": round(mae, 4),
                "r2_score": round(r2, 4),
                "adjusted_r2": round(adjusted_r2, 4),
                "explained_variance": round(explained_var, 4),
                "train_r2": round(train_r2, 4),
                "train_mse": round(train_mse, 4),
                "feature_importance": feature_importance,
                "is_regression": True,
                "overfitting_analysis": overfitting_analysis,
                "model_type": getattr(self, 'model_type', 'Unknown Model')
            }
        else:
            # Test metrics
            acc = accuracy_score(self.y_test, y_pred)
            report = classification_report(self.y_test, y_pred, output_dict=True)
            try:
                cm = confusion_matrix(self.y_test, y_pred).tolist()
            except ValueError:
                cm = []

            # Training metrics for overfitting detection
            train_acc = accuracy_score(self.y_train, y_train_pred)

            # Weighted averages
            precision_w = precision_score(self.y_test, y_pred, average='weighted', zero_division=0)
            recall_w = recall_score(self.y_test, y_pred, average='weighted', zero_division=0)
            f1_w = f1_score(self.y_test, y_pred, average='weighted', zero_division=0)

            # Overfitting analysis
            overfit_gap = train_acc - acc
            overfitting_analysis = self._analyze_overfitting(train_acc, acc, overfit_gap)

            feature_importance = self._get_feature_importance()

            return {
                "accuracy": round(acc, 4),
                "train_accuracy": round(train_acc, 4),
                "precision": round(precision_w, 4),
                "recall": round(recall_w, 4),
                "f1_score": round(f1_w, 4),
                "report": report,
                "confusion_matrix": cm,
                "feature_importance": feature_importance,
                "is_regression": False,
                "overfitting_analysis": overfitting_analysis,
                "model_type": getattr(self, 'model_type', 'Unknown Model')
            }

    def _analyze_overfitting(self, train_score, test_score, gap):
        """Analyze overfitting based on train/test score gap."""
        status = "good"
        message = "Model generalizes well."

        if gap > 0.20:
            status = "severe_overfit"
            message = (
                f"⚠️ Severe overfitting detected! Train: {train_score:.3f}, Test: {test_score:.3f} "
                f"(gap: {gap:.3f}). Try: reduce model complexity, add regularization, get more data, "
                f"or use cross-validation."
            )
        elif gap > 0.10:
            status = "moderate_overfit"
            message = (
                f"⚡ Moderate overfitting. Train: {train_score:.3f}, Test: {test_score:.3f} "
                f"(gap: {gap:.3f}). Consider: adding more training data, feature selection, "
                f"or simpler model."
            )
        elif gap > 0.05:
            status = "mild_overfit"
            message = (
                f"ℹ️ Slight overfitting. Train: {train_score:.3f}, Test: {test_score:.3f} "
                f"(gap: {gap:.3f}). This is usually acceptable."
            )
        elif gap < -0.05:
            status = "underfit"
            message = (
                f"🔍 Possible underfitting or data leakage. Test score ({test_score:.3f}) is higher "
                f"than train score ({train_score:.3f}). Check your data split."
            )

        return {
            "status": status,
            "train_score": round(train_score, 4),
            "test_score": round(test_score, 4),
            "gap": round(gap, 4),
            "message": message
        }

    def _get_feature_importance(self):
        """Extract feature importance from the trained model."""
        feature_importance = []
        if hasattr(self.model, 'feature_importances_'):
            feature_importance = [
                {"name": name, "value": float(val)}
                for name, val in zip(self.feature_names, self.model.feature_importances_)
            ]
        elif hasattr(self.model, 'coef_'):
            coefs = self.model.coef_
            if len(coefs.shape) > 1:
                coefs = np.mean(np.abs(coefs), axis=0)
            elif len(coefs.shape) == 1:
                coefs = np.abs(coefs)
            feature_importance = [
                {"name": name, "value": float(val)}
                for name, val in zip(self.feature_names, coefs)
            ]

        # Sort by importance
        feature_importance.sort(key=lambda x: x['value'], reverse=True)
        return feature_importance

    @staticmethod
    def _convert_numpy(obj):
        """Recursively convert numpy types to native Python types."""
        if isinstance(obj, dict):
            return {k: MLService._convert_numpy(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [MLService._convert_numpy(item) for item in obj]
        elif isinstance(obj, (np.integer,)):
            return int(obj)
        elif isinstance(obj, (np.floating,)):
            return float(obj)
        elif isinstance(obj, (np.bool_,)):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return obj

    def _capture_snapshot(self, step_name: str, prev_shape=None):
        """Capture a lightweight snapshot of current data state for step previews."""
        if self.X_train is None:
            return None
        
        current_shape = (len(self.X_train), self.X_train.shape[1] if hasattr(self.X_train, 'shape') and len(self.X_train.shape) > 1 else 0)
        
        # Get column names
        columns = []
        if hasattr(self.X_train, 'columns'):
            columns = list(self.X_train.columns)[:20]  # max 20 columns
        elif hasattr(self, 'feature_names') and self.feature_names:
            columns = list(self.feature_names)[:20]
        
        # Get 3-row sample preview as list of dicts
        sample = []
        try:
            if isinstance(self.X_train, pd.DataFrame):
                sample_df = self.X_train.head(3)
            else:
                sample_df = pd.DataFrame(self.X_train[:3], columns=columns if columns else None)
            
            for _, row in sample_df.iterrows():
                row_dict = {}
                for col in sample_df.columns[:10]:  # Max 10 cols in preview
                    val = row[col]
                    if pd.isna(val):
                        row_dict[str(col)] = None
                    elif isinstance(val, (np.integer,)):
                        row_dict[str(col)] = int(val)
                    elif isinstance(val, (np.floating, float)):
                        row_dict[str(col)] = round(float(val), 4)
                    else:
                        row_dict[str(col)] = str(val)[:30]
                sample.append(row_dict)
        except:
            pass
        
        snapshot = {
            "step": step_name,
            "rows": current_shape[0],
            "cols": current_shape[1],
            "columns": columns,
            "sample": sample,
        }
        
        # Compute delta from previous shape
        if prev_shape:
            snapshot["delta"] = {
                "rows": current_shape[0] - prev_shape[0],
                "cols": current_shape[1] - prev_shape[1],
            }
        
        return snapshot, current_shape

    def run_pipeline(self, request, user_id: str):
        """
        Orchestrates the full ML pipeline:
        1. Fetch Dataset from MongoDB
        2. Download file from Cloudinary
        3. Load & Split
        4. Remove Duplicates (if node present)
        5. Handle Outliers (if node present)
        6. Preprocess (Impute, Encode, Scale)
        7. Feature Selection (if node present)
        8. Feature Engineering (if node present)
        9. PCA (if node present)
        10. Class Balancing (if node present)
        11. Train
        12. Cross-Validate (if node present)
        13. Evaluate
        14. Save Result to MongoDB
        """
        self.pipeline_warnings = []  # Reset warnings

        # 1. Fetch Dataset from MongoDB
        dataset = None
        try:
            dataset = datasets_collection.find_one({"_id": ObjectId(request.file_id)})
        except:
            pass
        
        if not dataset:
            dataset = datasets_collection.find_one({"filename": request.file_id})

        if not dataset:
            raise ValueError(f"Dataset not found: {request.file_id}")
            
        # Security: Check ownership or public/sample status
        is_public = dataset.get("is_sample", False) or dataset.get("user_id") == "system"
        
        if dataset["user_id"] != user_id and not is_public:
            if "filename" in dataset:
                 my_dataset = datasets_collection.find_one({
                     "filename": dataset["filename"],
                     "user_id": user_id
                 })
                 if my_dataset:
                     dataset = my_dataset
                 else:
                     raise ValueError("Unauthorized: You do not own this dataset")
            else:
                 raise ValueError("Unauthorized: You do not own this dataset")
        
        # 2. Download from Cloudinary
        try:
            response = requests.get(dataset["cloudinary_url"])
            file_content = response.content
        except Exception as e:
            raise ValueError(f"File not found in storage: {dataset.get('cloudinary_url')}")

        # 3. Load & Split
        try:
            self.load_and_split(
                file_content=file_content,
                filename=dataset["filename"],
                target_column=request.target_column,
                test_size=request.test_size,
                stratified=getattr(request, 'stratified', False),
                random_state=getattr(request, 'random_state', 42),
                shuffle=getattr(request, 'shuffle', True)
            )
        except Exception as e:
            if "not found" in str(e):
                raise ValueError(f"Target Column Error: {str(e)}\nHINT: Check if '{request.target_column}' is spelled correctly.")
            raise ValueError(f"Data Loading Error: {str(e)}")

        # --- Step Previews: capture snapshots after each step ---
        step_previews = {}
        prev_shape = None

        # Snapshot after load & split (dataset + split)
        snap = self._capture_snapshot("dataset")
        if snap:
            step_previews["dataset"] = snap[0]
            step_previews["split"] = snap[0]  # split happens here too
            prev_shape = snap[1]

        # 4. Remove Duplicates (if node present)
        dup_strategy = getattr(request, 'duplicate_handling', 'none')
        dup_result = {}
        if dup_strategy != 'none':
            try:
                dup_result = self.remove_duplicates(strategy=dup_strategy)
                snap = self._capture_snapshot("duplicate", prev_shape)
                if snap:
                    step_previews["duplicate"] = snap[0]
                    prev_shape = snap[1]
            except Exception as e:
                self.pipeline_warnings.append(f"Duplicate removal failed: {str(e)}")

        # 5. Handle Outliers (if node present)
        outlier_method = getattr(request, 'outlier_method', 'none')
        outlier_action = getattr(request, 'outlier_action', 'clip')
        outlier_result = {}
        if outlier_method != 'none':
            try:
                outlier_result = self.handle_outliers(method=outlier_method, action=outlier_action)
                snap = self._capture_snapshot("outlier", prev_shape)
                if snap:
                    step_previews["outlier"] = snap[0]
                    prev_shape = snap[1]
            except Exception as e:
                self.pipeline_warnings.append(f"Outlier handling failed: {str(e)}")
        
        # 6. Preprocess (Impute, Encode, Scale)
        try:
            self.apply_preprocessing(
                imputer_strategy=request.imputer_strategy,
                encoder_strategy=request.encoder_strategy,
                scaler_type=request.scaler_type
            )
            # Capture separate snapshots for imputation, encoding, preprocessing
            snap = self._capture_snapshot("imputation", prev_shape)
            if snap:
                step_previews["imputation"] = snap[0]
                step_previews["encoding"] = snap[0]  # same step handles all three
                step_previews["preprocessing"] = snap[0]
                prev_shape = snap[1]
        except ValueError as e:
            msg = str(e)
            hint = ""
            if "could not convert string to float" in msg:
                hint = "\nHINT: You have text data in a numeric column. Try adding an 'Encoding' node (OneHot or Label) before the model."
            elif "Input contains NaN" in msg:
                hint = "\nHINT: Your data has missing values. Try changing the Imputer strategy to 'Mean' or 'Constant'."
            raise ValueError(f"Preprocessing Error: {msg}{hint}")
        except Exception as e:
            raise ValueError(f"Preprocessing Failed: {str(e)}")

        # 7. Feature Selection (if node present)
        fs_method = getattr(request, 'feature_selection_method', 'none')
        fs_result = {}
        if fs_method != 'none':
            try:
                fs_result = self.apply_feature_selection(
                    method=fs_method,
                    variance_threshold=getattr(request, 'variance_threshold', 0.01),
                    correlation_threshold=getattr(request, 'correlation_threshold', 0.95)
                )
                snap = self._capture_snapshot("featureSelection", prev_shape)
                if snap:
                    step_previews["featureSelection"] = snap[0]
                    prev_shape = snap[1]
            except Exception as e:
                self.pipeline_warnings.append(f"Feature selection failed: {str(e)}")

        # 8. Feature Engineering (if node present)
        fe_method = getattr(request, 'feature_engineering_method', 'none')
        fe_result = {}
        if fe_method != 'none':
            try:
                fe_result = self.apply_feature_engineering(
                    method=fe_method,
                    polynomial_degree=getattr(request, 'polynomial_degree', 2)
                )
                snap = self._capture_snapshot("featureEngineering", prev_shape)
                if snap:
                    step_previews["featureEngineering"] = snap[0]
                    prev_shape = snap[1]
            except Exception as e:
                self.pipeline_warnings.append(f"Feature engineering failed: {str(e)}")

        # 9. PCA (if node present)
        pca_components = getattr(request, 'pca_components', 0)
        pca_result = {}
        if pca_components > 0:
            try:
                pca_result = self.apply_pca(n_components=pca_components)
                snap = self._capture_snapshot("pca", prev_shape)
                if snap:
                    step_previews["pca"] = snap[0]
                    prev_shape = snap[1]
            except Exception as e:
                self.pipeline_warnings.append(f"PCA failed: {str(e)}")

        # 10. Class Balancing (if node present)
        class_balancing = getattr(request, 'class_balancing', 'none')
        balance_result = {}
        if class_balancing != 'none' and class_balancing != 'class_weight':
            try:
                balance_result = self.handle_class_imbalance(method=class_balancing)
                snap = self._capture_snapshot("classBalancing", prev_shape)
                if snap:
                    step_previews["classBalancing"] = snap[0]
                    prev_shape = snap[1]
            except Exception as e:
                self.pipeline_warnings.append(f"Class balancing failed: {str(e)}")

        # Final snapshot before training (for model node)
        snap = self._capture_snapshot("model", prev_shape)
        if snap:
            step_previews["model"] = snap[0]

        # 11. Train
        try:
            self.train_model(request.model_type, class_balancing=class_balancing)
        except Exception as e:
            msg = str(e)
            hint = ""
            if "Unknown label type" in msg:
                hint = "\nHINT: Your target variable might need encoding if it's categorical."
            raise ValueError(f"Training Error: {msg}{hint}")

        # 12. Cross-Validate (if node present)
        cv_folds = getattr(request, 'cv_folds', 0)
        cv_result = None
        if cv_folds > 1:
            cv_result = self.cross_validate(
                cv_folds=cv_folds,
                cv_stratified=getattr(request, 'cv_stratified', True)
            )

        # 13. Evaluate
        try:
            results = self.evaluate()
        except Exception as e:
            raise ValueError(f"Evaluation Failed: {str(e)}")

        # Add pipeline metadata to results
        results["warnings"] = self.pipeline_warnings
        results["step_previews"] = step_previews
        if cv_result:
            results["cross_validation"] = cv_result
        if dup_result:
            results["duplicate_removal"] = dup_result
        if outlier_result:
            results["outlier_handling"] = outlier_result
        if fs_result:
            results["feature_selection"] = fs_result
        if fe_result:
            results["feature_engineering"] = fe_result
        if pca_result:
            results["pca"] = pca_result
        if balance_result:
            results["class_balancing"] = balance_result

        results["data_shape"] = {
            "train_samples": len(self.X_train),
            "test_samples": len(self.X_test),
            "features": len(self.feature_names)
        }

        # Convert numpy types to native Python types before serialization
        results = self._convert_numpy(results)

        # 14. Save results to MongoDB
        pipeline_result = {
            "user_id": user_id,
            "workflow_id": request.workflow_id,
            "results_json": results,
            "workflow_snapshot": request.workflow_snapshot,
            "created_at": datetime.now(timezone.utc)
        }
        results_collection.insert_one(pipeline_result)
        
        return results

