from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import LOGIN_LIMIT, limiter
from app.core.security import Principal, get_principal
from app.schemas.auth import (
    AdminLoginRequest,
    ChangePasswordRequest,
    LoginResponse,
    MemberLoginRequest,
    RefreshRequest,
    TokenResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=LoginResponse)
@limiter.limit(LOGIN_LIMIT)
def member_login(request: Request, dto: MemberLoginRequest, db: Session = Depends(get_db)):
    """Member Code / e-mail / phone + password."""
    return auth_service.login_member(db, dto)


@router.post("/admin/login", response_model=LoginResponse)
@limiter.limit(LOGIN_LIMIT)
def admin_login(request: Request, dto: AdminLoginRequest, db: Session = Depends(get_db)):
    return auth_service.login_admin(db, dto)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
def refresh(request: Request, dto: RefreshRequest, db: Session = Depends(get_db)):
    return auth_service.refresh(db, dto.refresh_token)


@router.get("/me")
def me(principal: Principal = Depends(get_principal)) -> dict[str, Any]:
    return principal.profile


@router.post("/change-password")
def change_password(
    dto: ChangePasswordRequest,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    return auth_service.change_password(db, principal.id, principal.user_type, dto)
