from cryptography.fernet import Fernet

from app.core.config import settings

_fallback_key = Fernet.generate_key().decode()


def _fernet() -> Fernet:
    key = settings.fernet_key or _fallback_key
    return Fernet(key.encode())


def encrypt_message(content: str) -> str:
    return _fernet().encrypt(content.encode("utf-8")).decode("utf-8")


def decrypt_message(encrypted_content: str) -> str:
    return _fernet().decrypt(encrypted_content.encode("utf-8")).decode("utf-8")
