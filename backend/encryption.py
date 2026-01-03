from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("ENCRYPTION_KEY")
if not key:
    # Fallback to a hardcoded key for dev if missing (NOT SAFER but keeps app running)
    # Ideally raise error
    print("WARNING: ENCRYPTION_KEY not found in .env, using temporary key")
    key = Fernet.generate_key().decode()

cipher_suite = Fernet(key.encode() if isinstance(key, str) else key)

def encrypt_message(message: str) -> str:
    if not message: return ""
    return cipher_suite.encrypt(message.encode()).decode()

def decrypt_message(token: str) -> str:
    if not token: return ""
    try:
        return cipher_suite.decrypt(token.encode()).decode()
    except Exception:
        # Fallback for unencrypted legacy messages
        return token
