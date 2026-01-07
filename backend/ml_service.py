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
        # self.UPLOAD_DIR = "temp_uploads" # Legacy local storage
        # os.makedirs(self.UPLOAD_DIR, exist_ok=True)

        
        # State for the currently running pipeline
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.model = None
        self.feature_names = None
        self.is_regression = False

    def load_data(self, file_content: bytes, filename: str):
        # We no longer save to disk for persistence, as Supabase handles that.
        # But pandas needs a file-like object.
        file_obj = io.BytesIO(file_content)

        if filename.endswith('.csv'):
            df = pd.read_csv(file_obj)
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_obj)
        else:
            raise ValueError("Unsupported file format")
        
        # Return preview info
        return {
            "id": filename,
            "preview": df.head(10).astype(object).where(pd.notnull(df), None).to_dict(orient='records'),
            "columns": list(df.columns),
            "shape": df.shape
        }

    def load_and_split(self, file_content: bytes, filename: str, target_column: str, test_size: float = 0.2):
        # Load from memory
        file_obj = io.BytesIO(file_content)
        
        if filename.endswith('.csv'):
            df = pd.read_csv(file_obj)
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_obj)
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

    def analyze_dataset(self, file_content: bytes, filename: str):
        # Load data
        file_obj = io.BytesIO(file_content)
        if filename.endswith('.csv'):
            df = pd.read_csv(file_obj)
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_obj)
        else:
            raise ValueError("Unsupported file format")

        # 1. Identify Columns
        numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns.tolist()
        
        # 2. Histograms (for top 10 numeric cols to avoid overload)
        histograms = []
        for col in numeric_cols[:10]:
            # Simple binning
            try:
                data = df[col].dropna().tolist()
                if not data: continue
                # Calculate basic histogram using numpy
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

        # 3. Correlation Matrix (Numeric Only)
        correlation_matrix = []
        if len(numeric_cols) > 1:
            try:
                corr_df = df[numeric_cols].corr()
                # Format for Recharts heatmap (flat structure or matrix)
                # We'll return matrix structure similar to confusion matrix: just values 
                # But frontend needs x/y labels. Let's send raw matrix of values.
                # Actually, sending a list of lists is easier for the heatmap grid we built for result node.
                correlation_matrix = {
                    "columns": numeric_cols,
                    "values": corr_df.where(pd.notnull(corr_df), 0).values.tolist()
                }
            except Exception:
                pass

        return {
            "histograms": histograms,
            "correlation_matrix": correlation_matrix,
            "columns": list(df.columns),
            "rows_count": len(df)
        }

    def train_model(self, model_type: str):
        if self.X_train is None:
            raise ValueError("Data not split")
            
        self.is_regression = False
        
        if model_type == 'Logistic Regression':
            self.model = LogisticRegression(max_iter=2000)
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
        if self.model is None or self.X_test is None:
            raise ValueError("Model not trained or data not present")

        y_pred = self.model.predict(self.X_test)
        
        if self.is_regression:
            mse = mean_squared_error(self.y_test, y_pred)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(self.y_test, y_pred)
            r2 = r2_score(self.y_test, y_pred)
            
            # Feature Importance
            feature_importance = []
            if hasattr(self.model, 'feature_importances_'):
                 feature_importance = [{"name": name, "value": float(val)} for name, val in zip(self.feature_names, self.model.feature_importances_)]
            elif hasattr(self.model, 'coef_'):
                 # For linear models, coef_ might be 1D or 2D
                 coefs = self.model.coef_
                 if len(coefs.shape) > 1: coefs = coefs[0]
                 feature_importance = [{"name": name, "value": float(abs(val))} for name, val in zip(self.feature_names, coefs)]

            return {
                "mse": round(mse, 4),
                "rmse": round(rmse, 4),
                "mae": round(mae, 4),
                "r2_score": round(r2, 4),
                "feature_importance": feature_importance,
                "is_regression": True
            }
        else:
            acc = accuracy_score(self.y_test, y_pred)
            report = classification_report(self.y_test, y_pred, output_dict=True)
            try:
                 cm = confusion_matrix(self.y_test, y_pred).tolist()
            except ValueError:
                 cm = [] 
            
            # Feature Importance
            feature_importance = []
            if hasattr(self.model, 'feature_importances_'):
                 feature_importance = [{"name": name, "value": float(val)} for name, val in zip(self.feature_names, self.model.feature_importances_)]
            elif hasattr(self.model, 'coef_'):
                 # Logistic Regression coef_ is (n_classes, n_features) or (1, n_features)
                 coefs = self.model.coef_
                 # If multi-class, we could take average or max, but for binary/simple let's take mean absolute, or just the first class
                 if len(coefs.shape) > 1: 
                     # For simplicity in this overview, we take the mean absolute importance across classes
                     coefs = np.mean(np.abs(coefs), axis=0)
                 elif len(coefs.shape) == 1:
                     coefs = np.abs(coefs)
                     
                 feature_importance = [{"name": name, "value": float(val)} for name, val in zip(self.feature_names, coefs)]

            return {
                "accuracy": round(acc, 4),
                "report": report,
                "confusion_matrix": cm,
                "feature_importance": feature_importance,
                "is_regression": False
            }

    def run_pipeline(self, db, supabase, request, user_id):
        """
        Orchestrates the full ML pipeline:
        1. Fetch Dataset metadata from DB
        2. Download file from Supabase
        3. Load & Split
        4. Preprocess
        5. Train
        6. Evaluate
        7. Save Result
        """
        # Lazy import to avoid circular dependencies if any (though models should be fine)
        from models import Dataset, PipelineResult
        
        # 1. Fetch File Metadata
        dataset = None
        # Try as ID first
        try:
            dataset_id = int(request.file_id.strip())
            dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        except ValueError:
            pass
        
        # Fallback: Try as filename
        if not dataset:
             dataset = db.query(Dataset).filter(Dataset.filename == request.file_id).first()

        if not dataset:
            raise ValueError(f"Dataset not found: {request.file_id}")
        
        # Download file content
        try:
            res = supabase.storage.from_("datasets").download(dataset.storage_path)
            file_content = res
        except Exception as e:
             raise ValueError(f"File not found in storage: {dataset.storage_path}")

        # 2. Load & Split
        try:
            self.load_and_split(
                file_content=file_content,
                filename=dataset.filename,
                target_column=request.target_column,
                test_size=request.test_size
            )
        except Exception as e:
            if "not found" in str(e):
                raise ValueError(f"Target Column Error: {str(e)}\nHINT: Check if '{request.target_column}' is spelled correctly.")
            raise ValueError(f"Data Loading Error: {str(e)}")
        
        # 3. Preprocess
        try:
            self.apply_preprocessing(
                imputer_strategy=request.imputer_strategy,
                encoder_strategy=request.encoder_strategy,
                scaler_type=request.scaler_type
            )
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
        
        # 4. Train
        try:
            self.train_model(request.model_type)
        except Exception as e:
            msg = str(e)
            hint = ""
            if "Unknown label type" in msg:
                hint = "\nHINT: Your target variable might need encoding if it's categorical."
            raise ValueError(f"Training Error: {msg}{hint}")
        
        # 5. Evaluate
        try:
            results = self.evaluate()
        except Exception as e:
             raise ValueError(f"Evaluation Failed: {str(e)}")
        
        # 6. Save results
        pipeline_result = PipelineResult(
            user_id=user_id,
            workflow_id=request.workflow_id,
            results_json=results,
            workflow_snapshot=request.workflow_snapshot
        )
        db.add(pipeline_result)
        db.commit()
        
        return results
