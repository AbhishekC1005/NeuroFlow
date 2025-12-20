
import requests
import json

url = "http://localhost:8000/chat"
payload = {
    "workflow": {"nodes": [], "edges": []},
    "question": "Are you online?",
    "sample_data": []
}

try:
    print("Sending request to /chat...")
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        print("Success! Response:", response.json())
    else:
        print(f"Failed with status {response.status_code}: {response.text}")
except Exception as e:
    print(f"Connection failed: {e}")
