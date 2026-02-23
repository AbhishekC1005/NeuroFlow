
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

    def _get_system_prompt(self):
        return """You are Flow, a concise and expert ML assistant for FlowML, a drag-and-drop ML pipeline builder.

RESPONSE LENGTH RULES (CRITICAL):
- Keep answers SHORT by default — 2-3 sentences max for simple questions.
- Use bullet points instead of long paragraphs.
- Only give detailed/long responses when the user explicitly asks for explanation, detail, or elaboration.
- Never repeat what the user already knows. Be direct and to-the-point.

PIPELINE COMMAND RULES (CRITICAL):
- Generate a pipeline command when the user asks to "create", "build", "make", "generate", "add", "remove", "delete", "update", or "modify" the pipeline.
- For general questions like "what model should I use?", "explain my pipeline", "suggest improvements" — just answer with text. Do NOT generate a command unless the user explicitly asks to apply changes.
- If unsure whether the user wants a pipeline, just answer the question.
- When removing or modifying nodes, YOU MUST RETURN THE COMPLETE PIPELINE STATE (all nodes and edges) as you want it to appear.

Your Capabilities:
1. Explain Concepts: Answer questions about ML, nodes, and errors.
2. Build/Modify Pipelines: ONLY when explicitly asked with action words.

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
OR if no command is needed (just chatting/explaining):
{
    "response": "Your answer here.",
    "command": null
}

Node Types Available: 'dataset', 'imputation', 'encoding', 'preprocessing', 'split', 'model', 'result', 'outlier', 'duplicate', 'featureSelection', 'featureEngineering', 'pca', 'classBalancing', 'crossValidation'.

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
- **Positioning RULES**:
  - You MUST generate explicit `x` and `y` coordinates for every node.
  - **Do NOT** output nodes with the same (x, y) coordinates.
  - **Horizontal Layout**: Space nodes out by at least **300 pixels** horizontally (x: 0, x: 300, x: 600, etc.).
  - **Vertical Layout**: If branching, space out vertically by at least **150 pixels**.
  - **Example**:
    - Dataset: { x: 0, y: 0 }
    - Imputation: { x: 300, y: 0 }
    - Split: { x: 600, y: 0 }
    - Model: { x: 900, y: 0 }
    - Result: { x: 1200, y: 0 }
  - **Modifications**: When modifying, keep the existing layout if possible, but ensure any NEW nodes do not overlap with existing ones.
"""

    def get_response(self, workflow: dict, question: str, sample_data: list = None) -> dict:
        """Non-streaming response (kept for backward compatibility)."""
        try:
            if not self.client:
                return {
                    "response": "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment.",
                    "command": None
                }
            
            workflow_str = json.dumps(workflow, indent=2)
            sample_data_str = json.dumps(sample_data, indent=2) if sample_data else "No sample data available."
            
            user_message = f"""Current Pipeline Context:
Workflow: {workflow_str}
Sample Data: {sample_data_str}

User Input:
{question}"""

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": self._get_system_prompt()},
                    {"role": "user", "content": user_message}
                ],
                response_format={ "type": "json_object" },
                max_tokens=2000,
                temperature=0.7
            )
            
            response_content = response.choices[0].message.content
            return json.loads(response_content)
        except Exception as e:
            print(f"Error in ChatService: {e}")
            return {
                "response": f"I encountered an error processing your request: {str(e)}. Please check if your API key is valid.",
                "command": None
            }

    def get_response_stream(self, workflow: dict, question: str, sample_data: list = None):
        """Streaming response — yields chunks of text, then a final JSON with command data."""
        if not self.client:
            yield json.dumps({"type": "error", "content": "OpenAI API key is not configured."}) + "\n"
            return

        workflow_str = json.dumps(workflow, indent=2)
        sample_data_str = json.dumps(sample_data, indent=2) if sample_data else "No sample data available."

        user_message = f"""Current Pipeline Context:
Workflow: {workflow_str}
Sample Data: {sample_data_str}

User Input:
{question}"""

        try:
            stream = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": self._get_system_prompt()},
                    {"role": "user", "content": user_message}
                ],
                response_format={"type": "json_object"},
                max_tokens=2000,
                temperature=0.7,
                stream=True
            )

            full_content = ""
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    full_content += delta.content
                    yield json.dumps({"type": "chunk", "content": delta.content}) + "\n"

            # Parse the full JSON response to extract command
            try:
                parsed = json.loads(full_content)
                yield json.dumps({
                    "type": "done",
                    "response": parsed.get("response", ""),
                    "command": parsed.get("command", None)
                }) + "\n"
            except json.JSONDecodeError:
                yield json.dumps({
                    "type": "done",
                    "response": full_content,
                    "command": None
                }) + "\n"

        except Exception as e:
            print(f"Error in ChatService stream: {e}")
            yield json.dumps({"type": "error", "content": str(e)}) + "\n"
