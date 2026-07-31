"""Scan history — the app's memory of what the user has scanned.

Every authenticated scan is stored (ingredient text + report JSON). Recent
scans can be surfaced in the UI as "recently scanned" chips and, later, used
for analytics (e.g. "3 of your last 10 scans were blocked").
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.db.base import get_db
from backend.db.models import ScanHistory, User
from backend.models.errors import ErrorResponse

router = APIRouter(prefix="/api/v1/history", tags=["history"])


class ScanSummary(BaseModel):
    id: int
    product_name: str | None = None
    score: int | None = None
    label: str | None = None
    scanned_at: str


class ScanHistoryOut(BaseModel):
    scans: list[ScanSummary] = Field(default_factory=list)
    total: int = 0


@router.get(
    "/scans",
    response_model=ScanHistoryOut,
    responses={401: {"model": ErrorResponse}},
    summary="List recent scans (most recent first)",
)
async def list_scans(
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> ScanHistoryOut:
    result = await session.execute(
        select(ScanHistory)
        .where(ScanHistory.user_id == user.id)
        .order_by(ScanHistory.scanned_at.desc())
        .limit(limit)
    )
    rows = list(result.scalars())

    items: list[ScanSummary] = []
    for row in rows:
        score = label = None
        try:
            import json

            report = json.loads(row.report_json)
            hs = report.get("health_score") or {}
            score = hs.get("score")
            label = hs.get("label")
        except Exception:
            pass
        items.append(
            ScanSummary(
                id=row.id,
                product_name=row.product_name,
                score=score,
                label=label,
                scanned_at=row.scanned_at.isoformat(),
            )
        )

    return ScanHistoryOut(scans=items, total=len(items))
