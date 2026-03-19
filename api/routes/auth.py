"""Auth routes — JWT token generation."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta

from jose import jwt
from config import settings

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/token")
async def login(req: LoginRequest):
    """
    Authenticate against Navidrome and return JWT.
    Uses Navidrome as the single source of truth for users.
    """
    import httpx, hashlib, secrets
    salt  = secrets.token_hex(6)
    token = hashlib.md5(f"{req.password}{salt}".encode()).hexdigest()

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{settings.NAVIDROME_URL}/rest/ping",
                params={
                    "u": req.username, "t": token, "s": salt,
                    "v": "1.16.1", "c": "Driftwave", "f": "json",
                },
                timeout=10,
            )
            resp = r.json().get("subsonic-response", {})
            if resp.get("status") != "ok":
                raise HTTPException(status_code=401, detail="Invalid credentials")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Navidrome unavailable")

    payload = {
        "sub": req.username,
        "exp": datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINS),
    }
    access_token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return {"access_token": access_token, "token_type": "bearer"}
