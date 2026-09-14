from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import get_settings
from app.db.session import get_db
from app.models.user import User

_bearer = HTTPBearer(auto_error=False)
DEFAULT_USER_ID = "default_local_author"


def hash_password(plain: str) -> str:
    pwd_bytes = plain.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials and credentials.credentials:
        try:
            settings = get_settings()
            payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
            user_id: str | None = payload.get("sub")
            if user_id:
                result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))  # noqa: E712
                user = result.scalar_one_or_none()
                if user:
                    return user
        except Exception:
            pass

    # No login required! Default to local user automatically
    result = await db.execute(select(User).where(User.id == DEFAULT_USER_ID))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            id=DEFAULT_USER_ID,
            email="author@taleforge.local",
            hashed_password=hash_password("localpass"),
            display_name="Tale Author",
            is_active=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
    return user
