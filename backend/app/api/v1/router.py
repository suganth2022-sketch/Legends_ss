"""Combines every endpoint module's router into one `api_router`, which
app/main.py mounts under the /api/v1 prefix. Add new endpoint modules here."""

from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, finance, health, members, referral

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(members.router, tags=["members"])
api_router.include_router(referral.router, tags=["referral"])
api_router.include_router(finance.payments_router, tags=["payments"])
api_router.include_router(finance.commission_router, tags=["commission"])
api_router.include_router(finance.passbook_router, tags=["passbook"])
api_router.include_router(finance.payouts_router, tags=["payouts"])
api_router.include_router(admin.router, tags=["admin"])
