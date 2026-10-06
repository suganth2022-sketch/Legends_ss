"""Sponsor validation and downline (genealogy) derivation.

The genealogy is derived, never stored: one recursive CTE fetches the whole
real network as (id, sponsor_id) edges; levels and team sizes are computed in
one pass in Python; display fields are then loaded for only the <=10 levels
that are returned. No per-row queries.
"""

import uuid
from collections import defaultdict

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import MemberStatus, PlanStatus
from app.models.finance import PaymentPlan
from app.models.member import Member
from app.schemas.finance import GenealogyRow

MAX_DISPLAY_LEVEL = 10


def validate_sponsor(db: Session, sponsor_code: str) -> Member:
    sponsor = db.scalar(select(Member).where(Member.member_code == sponsor_code.upper()))
    if sponsor is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Sponsor code does not exist")
    if sponsor.status != MemberStatus.ACTIVE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Sponsor account is not active")
    return sponsor


def get_genealogy(db: Session, root_id: uuid.UUID) -> list[GenealogyRow]:
    base = select(Member.id, Member.sponsor_id).where(Member.sponsor_id == root_id).cte(
        "downline", recursive=True
    )
    downline = base.union_all(
        select(Member.id, Member.sponsor_id).join(base, Member.sponsor_id == base.c.id)
    )
    edges = db.execute(select(downline.c.id, downline.c.sponsor_id)).all()

    children_of: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for node_id, sponsor_id in edges:
        children_of[sponsor_id].append(node_id)

    # Level via BFS from the root (direct children = level 1).
    level: dict[uuid.UUID, int] = {}
    frontier = list(children_of.get(root_id, []))
    depth = 1
    seen: set[uuid.UUID] = {root_id}
    while frontier:
        nxt: list[uuid.UUID] = []
        for node_id in frontier:
            if node_id in seen:  # defensive: a cycle must never hang the request
                continue
            seen.add(node_id)
            level[node_id] = depth
            nxt.extend(children_of.get(node_id, []))
        frontier, depth = nxt, depth + 1

    # True (unlimited-depth) team size per node, deepest first.
    team: dict[uuid.UUID, int] = {}
    for node_id in sorted(level, key=lambda n: level[n], reverse=True):
        team[node_id] = sum(1 + team.get(c, 0) for c in children_of.get(node_id, []))

    display_ids = [n for n, lv in level.items() if lv <= MAX_DISPLAY_LEVEL]
    if not display_ids:
        return []

    members = db.scalars(select(Member).where(Member.id.in_(display_ids))).all()
    plans = db.execute(
        select(PaymentPlan.member_id, PaymentPlan.committed_amount)
        .where(PaymentPlan.member_id.in_(display_ids), PaymentPlan.status == PlanStatus.ACTIVE)
        .order_by(PaymentPlan.effective_from.desc())
    ).all()
    plan_by_member: dict[uuid.UUID, str] = {}
    for member_id, amount in plans:
        plan_by_member.setdefault(member_id, str(amount))

    root = db.get(Member, root_id)
    code_by_id = {m.id: m.member_code for m in members}
    rows = [
        GenealogyRow(
            id=m.id,
            member_code=m.member_code,
            full_name=m.full_name,
            doj=m.doj,
            status=m.status.value,
            level=level[m.id],
            sponsor_code=(
                code_by_id.get(m.sponsor_id, root.member_code if root else None)
                if m.sponsor_id
                else None
            ),
            committed_amount=plan_by_member.get(m.id),
            direct_referrals_count=len(children_of.get(m.id, [])),
            total_team_count=team.get(m.id, 0),
        )
        for m in members
    ]
    rows.sort(key=lambda r: (r.level, r.full_name))
    return rows
