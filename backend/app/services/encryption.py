from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY is not set")

cipher = Fernet(ENCRYPTION_KEY.encode())

def encrypt_data(plaintext: str) -> str:
    return cipher.encrypt(plaintext.encode()).decode()

def decrypt_data(encrypted_text: str) -> str:
    return cipher.decrypt(encrypted_text.encode()).decode()