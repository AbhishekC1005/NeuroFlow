
import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class ChatService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("WARNING: OPENAI_API_KEY not found in environment variables.")
            self.client = None
        else:
            self.client = OpenAI(api_key=api_key)

    def get_response(self, workflow: dict, question: str, sample_data: list = None) -> str:
        try:
            if not self.client:
                return "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment."
            
            workflow_str = json.dumps(workflow, indent=2)
            sample_data_str = json.dumps(sample_data, indent=2) if sample_data else "No sample data available."
            
            system_prompt = """You are an expert Data Science and Machine Learning assistant for FlowML.
You are helping a user who is building a machine learning pipeline using a drag-and-drop interface.

Instructions:
1. Be DIRECT and STRAIGHTFORWARD. Start directly with the answer.
2. CASE: GREETINGS (Hi, Hello, Hey, Good morning, etc.)
   - Respond warmly and introduce yourself briefly.
   - Example: "Hi! 👋 I'm your FlowML assistant. I can help you build ML pipelines, explain concepts, and troubleshoot issues. How can I help you today?"
3. CASE: NO WORKFLOW & NO DATA.
   - Do NOT answer general questions (unless about the UI).
   - Tell user to add dataset first.
   - INSTEAD, provide this exact guide:
     "To get started:
      1. Drag a **Dataset Node** to the canvas and upload your CSV.
      2. Connect it to a **Preprocessing Node** to clean your data.
      3. Connect that to a **Model Node** (like Random Forest) to train."
4. CASE: DATA UPLOADED BUT NO WORKFLOW.
   - Suggest the best model for the uploaded data.
   - Tell them to connect the Dataset Node to that model.
5. CASE: EXISTING WORKFLOW.
   - Answer the specific question in context of the pipeline.
   - Fix errors if seen."""

            user_message = f"""Current Status:
Workflow: {workflow_str}
Sample Data: {sample_data_str}

User Question:
{question}"""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=1024,
                temperature=0.7
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error in ChatService: {e}")
            return f"I encountered an error processing your request: {str(e)}. Please check if your API key is valid."
