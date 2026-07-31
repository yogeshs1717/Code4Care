"""Authentication endpoints — email OTP sign-in.

Flow: request OTP → server stores hash + sends code → verify → JWT.
"""
from __future__ import annotations

import logging
from datetime import timedelta

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import get_settings
from backend.db.base import as_utc, get_db, utcnow
from backend.db.models import Otp, User
from backend.models.errors import ErrorResponse
from backend.services.auth import jwt as jwt_service
from backend.services.auth import otp as otp_service
from backend.services.auth.errors import (
    InvalidOtpError,
    OtpRateLimitError,
    UnauthorizedError,
)
from backend.services.auth.user_store import get_or_create_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_MAX_RECENT_OTPS = 5


class RequestOtpRequest(BaseModel):
    email: str


class RequestOtpResponse(BaseModel):
    sent: bool
    message: str


class VerifyOtpRequest(BaseModel):
    email: str
    code: str


class VerifyOtpResponse(BaseModel):
    access_token: str
    user: dict


def _normalize_email(raw: str) -> str:
    try:
        # check_deliverability=False → pure syntax validation. Skipping the DNS
        # lookup keeps this instant and works for any domain (test/dev inboxes).
        result = validate_email(raw.strip(), check_deliverability=False)
    except EmailNotValidError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please enter a valid email address.",
        ) from exc
    return result.normalized


def _user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
    }


@router.post(
    "/otp/request",
    response_model=RequestOtpResponse,
    responses={422: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
    summary="Request a one-time code for email sign-in",
)
async def request_otp(body: RequestOtpRequest, session: AsyncSession = Depends(get_db)) -> RequestOtpResponse:
    settings = get_settings()
    email = _normalize_email(body.email)

    now = utcnow()
    recent = await session.execute(
        select(Otp).where(Otp.email == email).order_by(Otp.created_at.desc()).limit(_MAX_RECENT_OTPS)
    )
    existing = list(recent.scalars())

    # Guard against flooding: at most N live codes per email.
    if len(existing) >= _MAX_RECENT_OTPS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification codes requested. Try again in a few minutes.",
        )
    # Rate-limit within a short window: one code per 30 seconds.
    if existing and (now - as_utc(existing[0].created_at)).total_seconds() < 30:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="A verification code was sent recently. Please check your email.",
        )

    code = otp_service.generate_code()
    await otp_service.send_code(email, code)

    session.add(
        Otp(
            email=email,
            otp_id=otp_service.hash_code(code),
            code_hash=otp_service.hash_code(code),
            expires_at=now + timedelta(seconds=settings.otp_ttl_seconds),
        )
    )
    await session.commit()

    if not settings.resend_api_key:
        return RequestOtpResponse(
            sent=True,
            message=f"Development mode: verification code is {code} (printed to server console).",
        )
    return RequestOtpResponse(sent=True, message="Verification code sent to your email.")


@router.post(
    "/otp/verify",
    response_model=VerifyOtpResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="Verify the code and receive an access token",
)
async def verify_otp(body: VerifyOtpRequest, session: AsyncSession = Depends(get_db)) -> VerifyOtpResponse:
    email = _normalize_email(body.email)
    code = body.code.strip()

    now = utcnow()
    result = await session.execute(
        select(Otp).where(Otp.email == email).order_by(Otp.created_at.desc()).limit(10)
    )
    candidates = list(result.scalars())

    current = None
    for o in candidates:
        if o.verified:
            continue
        if as_utc(o.expires_at) > now and otp_service.verify_code(code, o.code_hash):
            current = o
            break

    if current is None:
        # Burn an attempt on the newest unverified code so brute force is slow.
        newest = next((o for o in candidates if not o.verified), None)
        if newest is not None:
            newest.attempts += 1
            if newest.attempts >= get_settings().otp_max_attempts:
                newest.verified = True  # lock it out
            await session.commit()
        raise InvalidOtpError()

    current.verified = True
    await session.commit()

    user, _ = await get_or_create_user(session, email)
    await session.commit()

    token = jwt_service.create_access_token(user.id)
    return VerifyOtpResponse(access_token=token, user=_user_payload(user))


@router.post(
    "/logout",
    responses={204: {"model": None}},
    summary="No-op server-side logout (JWT is stateless; client discards token)",
)
async def logout() -> None:
    return None


@router.get(
    "/me",
    response_model=dict,
    responses={401: {"model": ErrorResponse}},
    summary="Return the current user (or 401)",
)
async def me(
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise UnauthorizedError()
    token = auth.removeprefix("Bearer ").strip()
    user_id = jwt_service.verify_access_token(token)
    from backend.services.auth.user_store import get_user_by_email
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise UnauthorizedError()
    return _user_payload(user)
