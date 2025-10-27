from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY is not set")

cipher = Fernet(ENCRYPTION_KEY.encode())

def encrypt_data(plaintext: str) -> str:
    """Encrypt message content using AES-256 (Fernet).
    
    Args:
        plaintext: Unencrypted message string
        
    Returns:
        Base64-encoded encrypted ciphertext
    """
    return cipher.encrypt(plaintext.encode()).decode()

def decrypt_data(encrypted_text: str) -> str:
    """Decrypt message content using AES-256 (Fernet).
    
    Args:
        ciphertext: Base64-encoded encrypted message
        
    Returns:
        Decrypted plaintext string
    """
    return cipher.decrypt(encrypted_text.encode()).decode()