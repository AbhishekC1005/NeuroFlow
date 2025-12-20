
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class ChatService:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print("WARNING: GOOGLE_API_KEY not found in environment variables.")
        else:
            genai.configure(api_key=api_key)
        
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def get_response(self, workflow: dict, question: str, sample_data: list = None) -> str:
        try:
            workflow_str = json.dumps(workflow, indent=2)
            sample_data_str = json.dumps(sample_data, indent=2) if sample_data else "No sample data available."
            
            prompt = f"""
You are an expert Data Science and Machine Learning assistant.
You are helping a user who is building a machine learning pipeline using a drag-and-drop interface.

Current Status:
Workflow: {workflow_str}
Sample Data: {sample_data_str}

User Question:
{question}

Instructions:
1. be DIRECT and STRAIGHTFORWARD. Start directly with the answer.
2. CASE: NO WORKFLOW & NO DATA.
   - Do NOT answer general questions (unless about the UI).
   -tell to add data set
   - INSTEAD, provide this exact guide:
     "To get started:
      1. Drag a **Dataset Node** to the canvas and upload your CSV.
      2. Connect it to a **Preprocessing Node** to clean your data.
      3. Connect that to a **Model Node** (like Random Forest) to train."
3. CASE: DATA UPLOADED BUT NO WORKFLOW.
   - Suggest the best model for the uploaded data.
   - Tell them to connect the Dataset Node to that model.
4. CASE: EXISTING WORKFLOW.
   - Answer the specific question in context of the pipeline.
   - Fix errors if seen.
"""
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error in ChatService: {e}")
            return f"I encountered an error processing your request: {str(e)}. Please check if your API key is valid."
