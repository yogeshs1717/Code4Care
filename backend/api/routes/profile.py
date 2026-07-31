"""Health profile endpoints — the user's priorities, allergies, and history.

Auth required on every route. Kept intentionally small and schema-versioned
via Pydantic.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.db.base import get_db
from backend.db.models import HealthProfile, User
from backend.models.errors import ErrorResponse
from backend.services.personalization.engine import VALID_PRIORITIES

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])


class HealthProfileOut(BaseModel):
    priorities: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    # Unused yet — reserved for future personal thresholds.
    settings: dict = Field(default_factory=dict)


class UpdateHealthProfileIn(BaseModel):
    priorities: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)


@router.get(
    "/health",
    response_model=HealthProfileOut,
    responses={401: {"model": ErrorResponse}},
    summary="Get the current user's health profile",
)
async def get_health_profile(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> HealthProfileOut:
    profile = await _load_or_create(session, user.id)
    return HealthProfileOut(
        priorities=profile.priorities or [],
        allergies=profile.allergies or [],
    )


@router.put(
    "/health",
    response_model=HealthProfileOut,
    responses={401: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
    summary="Set the user's health priorities and allergies",
)
async def update_health_profile(
    body: UpdateHealthProfileIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> HealthProfileOut:
    # Reject unknown priorities so a typo never silently disables a check.
    unknown = [p for p in body.priorities if p not in VALID_PRIORITIES]
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown health priorities: {', '.join(unknown)}",
        )

    profile = await _load_or_create(session, user.id)
    profile.priorities = list(dict.fromkeys(body.priorities))  # dedupe, keep order
    profile.allergies = [a.strip() for a in body.allergies if a.strip()]
    await session.commit()

    return HealthProfileOut(
        priorities=profile.priorities,
        allergies=profile.allergies,
    )


async def _load_or_create(session: AsyncSession, user_id: str) -> HealthProfile:
    from backend.services.auth.user_store import get_profile

    profile = await get_profile(session, user_id)
    if profile is not None:
        return profile
    profile = HealthProfile(user_id=user_id)
    session.add(profile)
    await session.commit()
    return profile
