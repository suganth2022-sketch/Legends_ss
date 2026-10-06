import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import LOOKUP_LIMIT, limiter
from app.core.security import Principal, get_principal
from app.schemas.finance import GenealogyRow
from app.schemas.member import SponsorValidation
from app.services import referral_service

router = APIRouter(prefix="/referral")


@router.get("/validate/{sponsor_code}", response_model=SponsorValidation)
@limiter.limit(LOOKUP_LIMIT)
def validate_sponsor(request: Request, sponsor_code: str, db: Session = Depends(get_db)):
    """Public: validate a sponsor code before showing the registration form."""
    sponsor = referral_service.validate_sponsor(db, sponsor_code)
    return SponsorValidation(valid=True, member_code=sponsor.member_code, full_name=sponsor.full_name)


@router.get("/genealogy/{member_id}", response_model=list[GenealogyRow])
def get_genealogy(member_id: uuid.UUID, p: Principal = Depends(get_principal), db: Session = Depends(get_db)):
    """Downline up to 10 levels. Members may only view their own network; admins any."""
    if p.user_type == "MEMBER" and p.id != str(member_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You may only view your own network")
    return referral_service.get_genealogy(db, member_id)
