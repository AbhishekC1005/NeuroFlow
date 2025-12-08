import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import io

class MLService:
    def __init__(self):
        self.df = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.model = None

    def load_data(self, file_content: bytes, filename: str):
        if filename.endswith('.csv'):
            self.df = pd.read_csv(io.BytesIO(file_content))
        elif filename.endswith(('.xls', '.xlsx')):
            self.df = pd.read_excel(io.BytesIO(file_content))
        else:
            raise ValueError("Unsupported file format")
        
        # Drop rows with missing values for simplicity in this MVP
        self.df = self.df.dropna()
        return self.df.head().to_dict(orient='records'), list(self.df.columns), self.df.shape

    def preprocess(self, target_column: str, scaler_type: str = 'None'):
        if self.df is None:
            raise ValueError("No data loaded")
        
        X = self.df.drop(columns=[target_column])
        y = self.df[target_column]
        
        # Identify numeric columns
        numeric_cols = X.select_dtypes(include=['float64', 'int64']).columns
        
        if scaler_type == 'StandardScaler':
            scaler = StandardScaler()
            X[numeric_cols] = scaler.fit_transform(X[numeric_cols])
        elif scaler_type == 'MinMaxScaler':
            scaler = MinMaxScaler()
            X[numeric_cols] = scaler.fit_transform(X[numeric_cols])
            
        return X, y

    def split_data(self, X, y, test_size: float = 0.2):
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        return self.X_train.shape, self.X_test.shape

    def train_model(self, model_type: str):
        if self.X_train is None:
            raise ValueError("Data not split")
            
        if model_type == 'Logistic Regression':
            self.model = LogisticRegression()
        elif model_type == 'Decision Tree':
            self.model = DecisionTreeClassifier()
        else:
            raise ValueError(f"Unsupported model: {model_type}")
            
        self.model.fit(self.X_train, self.y_train)

    def evaluate(self):
        if self.model is None:
            raise ValueError("Model not trained")
            
        y_pred = self.model.predict(self.X_test)
        accuracy = accuracy_score(self.y_test, y_pred)
        report = classification_report(self.y_test, y_pred, output_dict=True)
        cm = confusion_matrix(self.y_test, y_pred).tolist()
        
        return {
            "accuracy": accuracy,
            "classification_report": report,
            "confusion_matrix": cm
        }
