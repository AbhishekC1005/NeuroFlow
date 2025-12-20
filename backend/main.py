from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
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

from chat_service import ChatService

# Global service instances
ml_service = MLService()
chat_service = ChatService()

class PipelineRequest(BaseModel):
    file_id: str
    target_column: str
    scaler_type: str
    imputer_strategy: Optional[str] = 'mean'
    encoder_strategy: Optional[str] = 'onehot'
    test_size: float
    model_type: str

class ChatRequest(BaseModel):
    workflow: Dict[str, Any]
    question: str
    sample_data: Optional[List[Dict[str, Any]]] = None

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        # Returns { "id": "...", "preview": [...], "columns": [...], "shape": ... }
        data = ml_service.load_data(content, file.filename)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        response = chat_service.get_response(request.workflow, request.question, request.sample_data)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/run_pipeline")
async def run_pipeline(request: PipelineRequest):
    try:
        # 1. Preprocess (Pass file_id to find the correct temp dataframe)
        # 1. Load & Split (Prevents Leakage)
        ml_service.load_and_split(
            filename=request.file_id,
            target_column=request.target_column,
            test_size=request.test_size
        )
        
        # 2. Preprocess (Fit on Train, Transform Both)
        ml_service.apply_preprocessing(
            imputer_strategy=request.imputer_strategy,
            encoder_strategy=request.encoder_strategy,
            scaler_type=request.scaler_type
        )
        
        # (Old 2. Split removed as it's now step 1)
        
        # 3. Train
        ml_service.train_model(request.model_type)
        
        # 4. Evaluate
        results = ml_service.evaluate()
        
        return results
    except Exception as e:
        import traceback
        traceback.print_exc() # Print error to server logs for debugging
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/run_pipeline_batch")
async def run_pipeline_batch(requests: Dict[str, PipelineRequest]):
    batch_results = {}
    
    for result_node_id, request in requests.items():
        try:
            # Create isolated service instance for this run to avoid state collision
            service = MLService()
            
            # 1. Preprocess
            # 1. Load & Split
            service.load_and_split(
                filename=request.file_id,
                target_column=request.target_column,
                test_size=request.test_size
            )
            
            # 2. Preprocess
            service.apply_preprocessing(
                imputer_strategy=request.imputer_strategy,
                encoder_strategy=request.encoder_strategy,
                scaler_type=request.scaler_type
            )
            
            # (Old 2. Split removed)
            
            # 3. Train
            service.train_model(request.model_type)
            
            # 4. Evaluate
            batch_results[result_node_id] = service.evaluate()
            
        except Exception as e:
            print(f"Error processing node {result_node_id}: {e}")
            # Return error for this specific node
            batch_results[result_node_id] = {"error": str(e)}
            
    return batch_results

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
