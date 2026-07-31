"""User persistence helpers. Thin, read-mostly wrappers over the ORM."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import HealthProfile, User


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_or_create_user(
    session: AsyncSession, email: str, *, display_name: str | None = None
) -> tuple[User, bool]:
    """Return (user, created). Persists via the caller's commit."""
    email = email.lower()
    user = await get_user_by_email(session, email)
    if user is not None:
        return user, False

    user = User(email=email, display_name=display_name)
    session.add(user)
    # Flush so user.id is assigned before the FK references it.
    await session.flush()
    # Every user gets a health profile row up-front (all priorities off).
    session.add(HealthProfile(user_id=user.id))
    return user, True


async def get_profile(session: AsyncSession, user_id: str) -> HealthProfile | None:
    result = await session.execute(
        select(HealthProfile).where(HealthProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()
