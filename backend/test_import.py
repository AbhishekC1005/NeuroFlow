
print("Importing langchain_google_genai...")
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    print("Success importing ChatGoogleGenerativeAI")
except Exception as e:
    print(f"Error: {e}")
