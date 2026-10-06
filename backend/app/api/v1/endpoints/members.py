import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.v1.deps import client_ip
from app.core.database import get_db
from app.core.rate_limit import REGISTER_LIMIT, limiter
from app.core.security import Principal, require_admin, require_member
from app.models.enums import ActorType
from app.schemas.member import (
    BankOut,
    BankRevealOut,
    KycOut,
    KycRevealOut,
    MemberIdentity,
    NomineeOut,
    ProfileOut,
    RegisterMemberRequest,
    RegisterMemberResponse,
    UpdateBankRequest,
    UpdateKycRequest,
    UpdateNomineeRequest,
    UpdateProfileRequest,
)
from app.services import audit_service, member_service, profile_service

router = APIRouter(prefix="/members")


@router.post("/register", response_model=RegisterMemberResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(REGISTER_LIMIT)
def register(request: Request, dto: RegisterMemberRequest, db: Session = Depends(get_db)):
    """Register under a sponsor (referral link). Returns the one-time initial password."""
    return member_service.register(db, dto)


@router.get("/me", response_model=MemberIdentity)
def get_me(p: Principal = Depends(require_member), db: Session = Depends(get_db)):
    return member_service.get_identity(db, uuid.UUID(p.id))


# ---- own profile / KYC / bank / nominee (members only) ------------------------------


@router.get("/me/profile", response_model=ProfileOut)
def get_profile(p: Principal = Depends(require_member), db: Session = Depends(get_db)):
    return profile_service.get_profile(db, uuid.UUID(p.id))


@router.patch("/me/profile", response_model=ProfileOut)
def update_profile(
    request: Request, dto: UpdateProfileRequest,
    p: Principal = Depends(require_member), db: Session = Depends(get_db),
):
    return profile_service.update_profile(db, uuid.UUID(p.id), dto, client_ip(request))


@router.get("/me/kyc", response_model=KycOut)
def get_kyc(p: Principal = Depends(require_member), db: Session = Depends(get_db)):
    return profile_service.get_kyc(db, uuid.UUID(p.id))


@router.patch("/me/kyc", response_model=KycOut)
def update_kyc(
    request: Request, dto: UpdateKycRequest,
    p: Principal = Depends(require_member), db: Session = Depends(get_db),
):
    return profile_service.update_kyc(db, uuid.UUID(p.id), dto, client_ip(request))


@router.post("/me/kyc/reveal", response_model=KycRevealOut)
@limiter.limit("10/minute")
def reveal_kyc(request: Request, p: Principal = Depends(require_member), db: Session = Depends(get_db)):
    """Decrypted Aadhaar/PAN, to the member themselves only. Audit-logged."""
    return profile_service.reveal_kyc(db, uuid.UUID(p.id), client_ip(request))


@router.get("/me/bank", response_model=BankOut)
def get_bank(p: Principal = Depends(require_member), db: Session = Depends(get_db)):
    return profile_service.get_bank(db, uuid.UUID(p.id))


@router.patch("/me/bank", response_model=BankOut)
def update_bank(
    request: Request, dto: UpdateBankRequest,
    p: Principal = Depends(require_member), db: Session = Depends(get_db),
):
    return profile_service.update_bank(db, uuid.UUID(p.id), dto, client_ip(request))


@router.post("/me/bank/reveal", response_model=BankRevealOut)
@limiter.limit("10/minute")
def reveal_bank(request: Request, p: Principal = Depends(require_member), db: Session = Depends(get_db)):
    """Decrypted bank account number, to the member themselves only. Audit-logged."""
    return profile_service.reveal_bank(db, uuid.UUID(p.id), client_ip(request))


@router.get("/me/nominee", response_model=NomineeOut)
def get_nominee(p: Principal = Depends(require_member), db: Session = Depends(get_db)):
    return profile_service.get_nominee(db, uuid.UUID(p.id))


@router.patch("/me/nominee", response_model=NomineeOut)
def update_nominee(
    request: Request, dto: UpdateNomineeRequest,
    p: Principal = Depends(require_member), db: Session = Depends(get_db),
):
    return profile_service.update_nominee(db, uuid.UUID(p.id), dto, client_ip(request))


# ---- admin lookup (declared last so "/me/..." routes win) ---------------------------


@router.get("/{member_id}", response_model=MemberIdentity)
def get_member(
    request: Request, member_id: uuid.UUID,
    p: Principal = Depends(require_admin()), db: Session = Depends(get_db),
):
    result = member_service.get_identity(db, member_id)
    audit_service.record(
        db, actor_type=ActorType.ADMIN, actor_id=p.id, action="ADMIN_VIEWED_MEMBER_DETAIL",
        entity_name="Member", entity_id=str(member_id), ip=client_ip(request),
    )
    db.commit()
    return result
