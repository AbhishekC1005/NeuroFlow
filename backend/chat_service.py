
import os
import json
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Keywords that signal the user wants to build/modify a pipeline
PIPELINE_KEYWORDS = re.compile(
    r'\b(create|build|make|generate|add|remove|delete|update|modify|change|replace|set up|setup|construct|design)\b',
    re.IGNORECASE
)

# Lean base prompt — used for ALL requests
BASE_SYSTEM_PROMPT = """You are Flow, a concise ML assistant for FlowML (a drag-and-drop ML pipeline builder).

Rules:
- Be SHORT: 2-3 sentences max for simple questions. Use bullet points.
- Only give detailed responses when explicitly asked.
- Output valid JSON: {"response": "your text", "command": null}
"""

# Extended prompt — ONLY appended when user wants to build/modify pipeline
PIPELINE_PROMPT_EXTENSION = """
PIPELINE MODE ACTIVE — the user wants to create or modify a pipeline.

Output format when building:
{"response": "text", "command": {"type": "create_pipeline", "data": {"nodes": [...], "edges": [...]}}}

When removing/modifying nodes, return the COMPLETE pipeline state.

Node Types: 'dataset', 'imputation', 'encoding', 'preprocessing', 'split', 'model', 'result', 'outlier', 'duplicate', 'featureSelection', 'featureEngineering', 'pca', 'classBalancing', 'crossValidation'.

CRITICAL RULE: For model nodes, the "label" and "modelType" MUST EXACTLY match what the user asked for. Never default to a different model.
- modelType options: 'Logistic Regression', 'Decision Tree', 'Random Forest', 'Linear Regression', 'Random Forest Regressor', 'Ridge Regression', 'ElasticNet', 'SVM', 'KNN', 'Gradient Boosting', 'XGBoost'
- Pattern: {"type": "model", "data": {"label": "<REQUESTED_MODEL>", "modelType": "<REQUESTED_MODEL>"}}
- Preprocessing pattern: {"type": "preprocessing", "data": {"label": "Preprocessing", "scaler": "StandardScaler"}}
- Imputation pattern: {"type": "imputation", "data": {"label": "Imputation", "strategy": "mean"}}

Positioning: Space nodes 300px apart horizontally. Use simple IDs (n1, n2, n3). Example layout:
Dataset {x:0,y:0} → Imputation {x:300,y:0} → Split {x:600,y:0} → Model {x:900,y:0} → Result {x:1200,y:0}
"""


class ChatService:
    def __init__(self):
        api_key = os.getenv("NVIDIA_API_KEY")
        if not api_key:
            print("WARNING: NVIDIA_API_KEY not found in environment variables.")
            self.client = None
        else:
            self.client = OpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=api_key
            )

    def _get_system_prompt(self, question: str) -> str:
        """Returns a lean prompt for chat, or extended prompt for pipeline building."""
        prompt = BASE_SYSTEM_PROMPT
        if PIPELINE_KEYWORDS.search(question):
            prompt += PIPELINE_PROMPT_EXTENSION
        return prompt

    def get_response(self, workflow: dict, question: str, sample_data: list = None) -> dict:
        """Non-streaming response."""
        try:
            if not self.client:
                return {
                    "response": "NVIDIA API key is not configured. Please set NVIDIA_API_KEY in your environment.",
                    "command": None
                }

            workflow_str = json.dumps(workflow, indent=2)
            sample_data_str = json.dumps(sample_data, indent=2) if sample_data else "No sample data."

            user_message = f"""Pipeline: {workflow_str}
Data: {sample_data_str}
Question: {question}"""

            response = self.client.chat.completions.create(
                model="moonshotai/kimi-k2-instruct",
                messages=[
                    {"role": "system", "content": self._get_system_prompt(question)},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=1024,
                temperature=0.6
            )

            response_content = response.choices[0].message.content
            try:
                return json.loads(response_content)
            except json.JSONDecodeError:
                return {
                    "response": response_content,
                    "command": None
                }
        except Exception as e:
            print(f"Error in ChatService: {e}")
            return {
                "response": f"Error: {str(e)}",
                "command": None
            }

    def get_response_stream(self, workflow: dict, question: str, sample_data: list = None):
        """Streaming response — yields chunks of text, then a final JSON with command data."""
        if not self.client:
            yield json.dumps({"type": "error", "content": "NVIDIA API key is not configured."}) + "\n"
            return

        workflow_str = json.dumps(workflow, indent=2)
        sample_data_str = json.dumps(sample_data, indent=2) if sample_data else "No sample data."

        user_message = f"""Pipeline: {workflow_str}
Data: {sample_data_str}
Question: {question}"""

        try:
            stream = self.client.chat.completions.create(
                model="moonshotai/kimi-k2-instruct",
                messages=[
                    {"role": "system", "content": self._get_system_prompt(question)},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=1024,
                temperature=0.6,
                stream=True
            )

            full_content = ""
            for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta and delta.content:
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
