import re

from passlib.context import CryptContext

USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{3,30}$")

password_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def validate_username(username: str) -> bool:
    return bool(USERNAME_PATTERN.fullmatch(username))
