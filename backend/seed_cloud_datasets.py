import os
import requests
import pandas as pd
import io
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
from datetime import datetime, timezone
from database import datasets_collection

# Load environment variables
load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# Sample Datasets to Download
DATASETS = {
    "Titanic_Survival.csv": "https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv",
    "Iris_Flower.csv": "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv",
    "Housing_Prices.csv": "https://raw.githubusercontent.com/ageron/handson-ml/master/datasets/housing/housing.csv",
    "Wine_Quality.csv": "https://archive.ics.uci.edu/ml/machine-learning-databases/wine-quality/winequality-red.csv",
    "Diabetes_Prediction.csv": "https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.data.csv",
    "Sonar_Mines.csv": "https://raw.githubusercontent.com/jbrownlee/Datasets/master/sonar.csv"
}

# Column names for datasets that lack headers
HEADERS = {
    "Diabetes_Prediction.csv": ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI", "DiabetesPedigreeFunction", "Age", "Outcome"],
    "Sonar_Mines.csv": [f"Freq_{i}" for i in range(1, 61)] + ["Label"]
}

def seed_datasets():
    print("🚀 Starting Sample Dataset Seeding...")

    # Check for 'system' user datasets first to avoid duplicates
    existing_samples = list(datasets_collection.find({"user_id": "system"}))
    existing_filenames = {d["filename"] for d in existing_samples}

    for name, url in DATASETS.items():
        if name in existing_filenames:
            print(f"⏭️  Skipping {name} (Already exists)")
            continue

        print(f"⬇️  Downloading {name}...")
        try:
            response = requests.get(url)
            response.raise_for_status()
            
            # Process CSV
            if name == "Wine_Quality.csv":
                df = pd.read_csv(io.BytesIO(response.content), sep=";")
            elif name in HEADERS:
                df = pd.read_csv(io.BytesIO(response.content), header=None, names=HEADERS[name])
            else:
                df = pd.read_csv(io.BytesIO(response.content))
            
            # Convert back to CSV for upload
            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False)
            csv_content = csv_buffer.getvalue().encode('utf-8')

            print(f"☁️  Uploading {name} to Cloudinary...")
            upload_result = cloudinary.uploader.upload(
                csv_content,
                resource_type="raw",
                folder="neuroflow/samples",
                public_id=name.rsplit('.', 1)[0],
                overwrite=True
            )

            # Metadata
            dataset_meta = {
                "user_id": "system",
                "is_sample": True,
                "filename": name,
                "cloudinary_url": upload_result["secure_url"],
                "cloudinary_public_id": upload_result["public_id"],
                "columns": list(df.columns),
                "shape": {"rows": df.shape[0], "cols": df.shape[1]},
                "created_at": datetime.now(timezone.utc)
            }

            datasets_collection.insert_one(dataset_meta)
            print(f"✅ Registered {name} in MongoDB")

        except Exception as e:
            print(f"❌ Failed to process {name}: {e}")

    print("✨ Seeding Complete!")

if __name__ == "__main__":
    seed_datasets()
