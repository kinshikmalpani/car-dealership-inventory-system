from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.models import User

password_hasher = PasswordHash.recommended()
dummy_hash = password_hasher.hash("constant-work-for-unknown-account")
bearer = HTTPBearer(auto_error=False)


def get_session(request: Request):
    with request.app.state.session_factory() as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


def current_user(request: Request, session: SessionDep, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    unauthorized = HTTPException(401, "Please sign in again.", headers={"WWW-Authenticate": "Bearer"})
    if credentials is None:
        raise unauthorized
    try:
        claims = jwt.decode(credentials.credentials, request.app.state.jwt_secret, algorithms=["HS256"], options={"require": ["exp", "sub", "iat"]})
        user_id = int(claims["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise unauthorized
    user = session.get(User, user_id)
    if user is None:
        raise unauthorized
    return user


UserDep = Annotated[User, Depends(current_user)]


def admin_user(user: UserDep):
    if user.role != "admin":
        raise HTTPException(403, "Administrator access required.")
    return user


AdminDep = Annotated[User, Depends(admin_user)]


def issue_token(request: Request, user: User):
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(user.id), "iat": now, "exp": now + timedelta(minutes=request.app.state.token_minutes)}, request.app.state.jwt_secret, algorithm="HS256")
