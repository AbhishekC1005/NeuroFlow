
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

    def get_response(self, workflow: dict, question: str, sample_data: list = None) -> dict:
        try:
            if not self.client:
                return "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment."
            
            workflow_str = json.dumps(workflow, indent=2)
            sample_data_str = json.dumps(sample_data, indent=2) if sample_data else "No sample data available."
            
            system_prompt = """You are an expert Data Science and Machine Learning assistant for FlowML, a drag-and-drop ML pipeline builder.

Your Capabilities:
1. Explain Concepts: Answer questions about ML, nodes, and errors.
2. Build Pipelines: If the user asks to "create", "build", "make", or "generate" a pipeline (e.g., "build a random forest pipeline"), you MUST generate a valid JSON command.

Output Format:
You must output a JSON object with this structure:
{
    "response": "Your text response to the user here.",
    "command": {
        "type": "create_pipeline",
        "data": {
            "nodes": [ ... list of reactflow nodes ... ],
            "edges": [ ... list of reactflow edges ... ]
        }
    } 
}
OR if no command is needed (just chatting):
{
    "response": "Your answer here.",
    "command": null
}

Node Types Available: 'dataset', 'imputation', 'encoding', 'preprocessing', 'split', 'model', 'result'.

CRITICAL: Node Configuration (`data` field)
You MUST pre-configure the nodes based on the user's request.
- **Model Node**: Set `data.modelType`.
  - Options: 'Logistic Regression', 'Decision Tree', 'Random Forest', 'Linear Regression', 'Random Forest Regressor'.
  - Example: `{ "id": "model1", "type": "model", "data": { "label": "Random Forest", "modelType": "Random Forest" } }`
- **Preprocessing Node**: Set robust defaults.
  - Example: `{ "type": "preprocessing", "data": { "label": "Preprocessing", "scaler": "StandardScaler" } }`
- **Imputation Node**: Set default strategy.
  - Example: `{ "type": "imputation", "data": { "label": "Imputation", "strategy": "mean" } }`

Instructions:
- **Append Logic**: The frontend will handle unique IDs. You can use simple IDs like "n1", "n2", "n3".
- **Positioning**: Place nodes in a straight line from left to right.
  - Dataset: x:0, y:0
  - Imputation: x:300, y:0
  - Encoding: x:600, y:0 (if needed)
  - Preprocessing: x:900, y:0
  - Split: x:1200, y:0
  - Model: x:1500, y:0
  - Result: x:1800, y:0
- **Best Practices**:
  - Always include **Imputation** and **Preprocessing** unless told otherwise.
  - If the user asks for "Random Forest", ensure the model node has "Random Forest" selected.

Example Response (for "Create Random Forest"):
{
  "response": "I've added a robust Random Forest pipeline to your canvas. It includes imputation, standard scaling, and a Random Forest Classifier.",
  "command": {
    "type": "create_pipeline",
    "data": {
      "nodes": [
        { "id": "n1", "type": "dataset", "position": { "x": 0, "y": 0 }, "data": { "label": "Dataset" } },
        { "id": "n2", "type": "imputation", "position": { "x": 300, "y": 0 }, "data": { "label": "Imputation", "strategy": "mean" } },
        { "id": "n3", "type": "preprocessing", "position": { "x": 600, "y": 0 }, "data": { "label": "Scaling", "scaler": "StandardScaler" } },
        { "id": "n4", "type": "split", "position": { "x": 900, "y": 0 }, "data": { "label": "Train/Test Split", "testSize": 0.2 } },
        { "id": "n5", "type": "model", "position": { "x": 1200, "y": 0 }, "data": { "label": "Random Forest", "modelType": "Random Forest" } },
        { "id": "n6", "type": "result", "position": { "x": 1500, "y": 0 }, "data": { "label": "Result" } }
      ],
      "edges": [
        { "id": "e1", "source": "n1", "target": "n2" },
        { "id": "e2", "source": "n2", "target": "n3" },
        { "id": "e3", "source": "n3", "target": "n4" },
        { "id": "e4", "source": "n4", "target": "n5" },
        { "id": "e5", "source": "n5", "target": "n6" }
      ]
    }
  }
}
"""

            user_message = f"""Current Pipeline Context:
Workflow: {workflow_str}
Sample Data: {sample_data_str}

User Input:
{question}"""

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                response_format={ "type": "json_object" }, # Force JSON
                max_tokens=2000,
                temperature=0.7
            )
            
            # Parse the JSON response from OpenAI
            response_content = response.choices[0].message.content
            return json.loads(response_content)
        except Exception as e:
            print(f"Error in ChatService: {e}")
            return f"I encountered an error processing your request: {str(e)}. Please check if your API key is valid."
