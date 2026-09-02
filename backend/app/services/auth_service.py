from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext

# Configuration (In production, these would come from environment variables)
SECRET_KEY = "super-secret-key-change-me"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    async def get_current_user_from_token(token: str) -> Dict[str, Any]:
        """
        Example of an async method that might use AsyncGenerator 
        if streaming or complex DB lookups were involved.
        """
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id is None:
                raise ValueError("Invalid token payload")
            return {"id": user_id, "email": payload.get("email")}
        except JWTError:
            raise ValueError("Could not validate credentials")

    @staticmethod
    async def stream_auth_logs(logs: list[str]) -> AsyncGenerator[str, None]:
        """Demonstrates the use of AsyncGenerator for streaming log data."""
        for log in logs:
            yield f"{log}\n"
