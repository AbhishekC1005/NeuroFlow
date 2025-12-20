import pandas as pd
import os
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder, OneHotEncoder, OrdinalEncoder
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    mean_squared_error, r2_score, mean_absolute_error
)
import numpy as np
import io
import uuid

class MLService:
    def __init__(self):
        # Persistent storage configuration
        self.UPLOAD_DIR = "temp_uploads"
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)
        
        # State for the currently running pipeline
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.model = None
        self.feature_names = None
        self.is_regression = False

    def load_data(self, file_content: bytes, filename: str):
        # Save file to disk for persistence
        file_path = os.path.join(self.UPLOAD_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(file_content)

        if filename.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_path)
        else:
            raise ValueError("Unsupported file format")
        
        # Return preview info
        return {
            "id": filename,
            "preview": df.head(10).astype(object).where(pd.notnull(df), None).to_dict(orient='records'),
            "columns": list(df.columns),
            "shape": df.shape
        }

    def load_and_split(self, filename: str, target_column: str, test_size: float = 0.2):
        # Load from disk
        file_path = os.path.join(self.UPLOAD_DIR, filename)
        if not os.path.exists(file_path):
            raise ValueError(f"Dataset {filename} not found on server. Please upload it again.")
        
        if filename.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_path)
        else:
             raise ValueError("Unsupported file format")
        
        # 1. Handle Target
        if target_column not in df.columns:
             raise ValueError(f"Target column {target_column} not found")
        
        # Drop rows where target is NaN
        df = df.dropna(subset=[target_column])
        
        # Separate Features and Target
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # 2. Split Data (Before any processing to prevent leakage)
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        # Identify column types based on TRAIN set
        self.numeric_cols = self.X_train.select_dtypes(include=['float64', 'int64']).columns.tolist()
        self.cat_cols = self.X_train.select_dtypes(include=['object', 'category']).columns.tolist()

    def apply_preprocessing(self, imputer_strategy: str = 'mean', encoder_strategy: str = 'onehot', scaler_type: str = 'None'):
        # --- 1. Imputation ---
        if imputer_strategy == 'drop':
            # Drop NaN rows in Train and Test separately
            train_mask = self.X_train.notna().all(axis=1)
            self.X_train = self.X_train[train_mask]
            self.y_train = self.y_train[train_mask]
            
            test_mask = self.X_test.notna().all(axis=1)
            self.X_test = self.X_test[test_mask]
            self.y_test = self.y_test[test_mask]
        
        else:
            # Numeric Imputation (Fit on Train, Transform Both)
            if self.numeric_cols:
                imp_num = SimpleImputer(strategy=imputer_strategy if imputer_strategy != 'constant' else 'constant', fill_value=0 if imputer_strategy == 'constant' else None)
                
                self.X_train[self.numeric_cols] = imp_num.fit_transform(self.X_train[self.numeric_cols])
                self.X_test[self.numeric_cols] = imp_num.transform(self.X_test[self.numeric_cols])
            
            # Categorical Imputation (Fit on Train, Transform Both)
            if self.cat_cols:
                # Always fill categorical missing with most_frequent or explicit 'Missing'
                imp_cat = SimpleImputer(strategy='most_frequent')
                self.X_train[self.cat_cols] = imp_cat.fit_transform(self.X_train[self.cat_cols])
                self.X_test[self.cat_cols] = imp_cat.transform(self.X_test[self.cat_cols])

        # --- 2. Encoding ---
        # Re-check columns (though identifying types earlier is safer, imputation kept them same)
        # Using sklearn encoders
        if self.cat_cols:
            if encoder_strategy == 'onehot':
                ohe = OneHotEncoder(handle_unknown='ignore', sparse_output=False, drop='first')
                
                X_train_enc = ohe.fit_transform(self.X_train[self.cat_cols])
                X_test_enc = ohe.transform(self.X_test[self.cat_cols])
                
                feat_names = ohe.get_feature_names_out(self.cat_cols)
                
                X_train_cat = pd.DataFrame(X_train_enc, columns=feat_names, index=self.X_train.index)
                X_test_cat = pd.DataFrame(X_test_enc, columns=feat_names, index=self.X_test.index)
                
                # Drop original cat cols and concat encoded
                self.X_train = pd.concat([self.X_train.drop(columns=self.cat_cols), X_train_cat], axis=1)
                self.X_test = pd.concat([self.X_test.drop(columns=self.cat_cols), X_test_cat], axis=1)
                
            else: # label / ordinal
                # Use OrdinalEncoder
                oe = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
                
                self.X_train[self.cat_cols] = oe.fit_transform(self.X_train[self.cat_cols])
                self.X_test[self.cat_cols] = oe.transform(self.X_test[self.cat_cols])
                
                # Ensure float
                self.X_train[self.cat_cols] = self.X_train[self.cat_cols].astype(float)
                self.X_test[self.cat_cols] = self.X_test[self.cat_cols].astype(float)

        # Safety fill (e.g. unknown categories becoming -1 or NaNs)
        self.X_train = self.X_train.fillna(0)
        self.X_test = self.X_test.fillna(0)
        
        # Store feature names
        self.feature_names = list(self.X_train.columns)

        # --- 3. Scaling ---
        if scaler_type != 'None':
            # Scale ALL columns now (since cat are encoded)
            if scaler_type == 'StandardScaler':
                scaler = StandardScaler()
            elif scaler_type == 'MinMaxScaler':
                scaler = MinMaxScaler()
            
            # Fit on Train, Transform Both
            self.X_train = pd.DataFrame(scaler.fit_transform(self.X_train), columns=self.feature_names, index=self.X_train.index)
            self.X_test = pd.DataFrame(scaler.transform(self.X_test), columns=self.feature_names, index=self.X_test.index)

    def train_model(self, model_type: str):
        if self.X_train is None:
            raise ValueError("Data not split")
            
        self.is_regression = False
        
        if model_type == 'Logistic Regression':
            self.model = LogisticRegression(max_iter=1000)
        elif model_type == 'Decision Tree':
            self.model = DecisionTreeClassifier()
        elif model_type == 'Random Forest':
            self.model = RandomForestClassifier()
        elif model_type == 'Linear Regression':
            self.model = LinearRegression()
            self.is_regression = True
        elif model_type == 'Random Forest Regressor':
            self.model = RandomForestRegressor()
            self.is_regression = True
        else:
            raise ValueError(f"Unsupported model: {model_type}")
            
        self.model.fit(self.X_train, self.y_train)

    def evaluate(self):
        if self.model is None:
            raise ValueError("Model not trained")
            
        y_pred = self.model.predict(self.X_test)
        
        # Feature Importance
        importances = []
        if hasattr(self.model, 'feature_importances_'):
            # Tree-based
            for name, val in zip(self.feature_names, self.model.feature_importances_):
                importances.append({"name": name, "value": float(val)})
        elif hasattr(self.model, 'coef_'):
            # Linear models
            coefs = self.model.coef_
            if len(coefs.shape) > 1: # Multiclass logic or multi-output
                coefs = coefs[0]
            for name, val in zip(self.feature_names, coefs):
                importances.append({"name": name, "value": abs(float(val))})
        
        # Sort importances
        importances.sort(key=lambda x: x['value'], reverse=True)
        importances = importances[:10] # Top 10

        if self.is_regression:
            mse = mean_squared_error(self.y_test, y_pred)
            mae = mean_absolute_error(self.y_test, y_pred)
            r2 = r2_score(self.y_test, y_pred)
            return {
                "is_regression": True,
                "r2_score": r2,
                "mse": mse,
                "mae": mae,
                "feature_importance": importances
            }
        else:
            accuracy = accuracy_score(self.y_test, y_pred)
            report = classification_report(self.y_test, y_pred, output_dict=True)
            cm = confusion_matrix(self.y_test, y_pred, labels=self.model.classes_).tolist()
            
            return {
                "is_regression": False,
                "accuracy": accuracy,
                "classification_report": report,
                "confusion_matrix": cm,
                "feature_importance": importances
            }
