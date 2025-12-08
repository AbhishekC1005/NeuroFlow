from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from ml_service import MLService
import uvicorn

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global service instance (for MVP simplicity - in prod use session/db)
ml_service = MLService()

class PipelineRequest(BaseModel):
    target_column: str
    scaler_type: str
    test_size: float
    model_type: str

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        preview, columns, shape = ml_service.load_data(content, file.filename)
        return {"preview": preview, "columns": columns, "shape": shape}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/run_pipeline")
async def run_pipeline(request: PipelineRequest):
    try:
        # 1. Preprocess
        X, y = ml_service.preprocess(request.target_column, request.scaler_type)
        
        # 2. Split
        ml_service.split_data(X, y, request.test_size)
        
        # 3. Train
        ml_service.train_model(request.model_type)
        
        # 4. Evaluate
        results = ml_service.evaluate()
        
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
