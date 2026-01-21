"""
IP Risk API Router
Feature: 001-composio-tools-integration

Provides REST API endpoints for MaxMind minFraud IP risk scoring.
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.models.ip_risk_score import IPRiskScoreRequest, IPRiskScoreResponse
from app.security.auth import User, require_read, require_write
from app.service.ip_risk.exceptions import (
    MaxMindConnectionError,
    MaxMindError,
    MaxMindRateLimitError,
)
from app.service.ip_risk.maxmind_client import MaxMindClient
from app.service.ip_risk.score_cache import ScoreCache

router = APIRouter(
    prefix="/api/ip-risk",
    tags=["IP Risk Scoring"],
    responses={
        400: {"description": "Bad request"},
        401: {"description": "Unauthorized"},
        429: {"description": "Rate limit exceeded"},
    },
)


def get_maxmind_client() -> MaxMindClient:
    """Dependency for MaxMindClient."""
    return MaxMindClient()


@router.post(
    "/score",
    response_model=IPRiskScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Score IP risk",
    description="Score transaction IP risk using MaxMind minFraud API",
)
async def score_ip_risk(
    request: IPRiskScoreRequest,
    current_user: User = Depends(require_write),
    maxmind_client: MaxMindClient = Depends(get_maxmind_client),
) -> IPRiskScoreResponse:
    """
    Score IP risk for a transaction using MaxMind minFraud.

    Returns risk score, proxy/VPN/TOR detection, geolocation, and velocity signals.
    Results are cached for 1 hour and persisted to Snowflake.
    """
    try:
        score_data = await maxmind_client.score_transaction_with_fallback(
            transaction_id=request.transaction_id,
            ip_address=request.ip_address,
            email=request.email,
            billing_country=request.billing_country,
            transaction_amount=request.transaction_amount,
            currency=request.currency,
        )

        return IPRiskScoreResponse(
            transaction_id=score_data["transaction_id"],
            ip_address=score_data["ip_address"],
            risk_score=score_data["risk_score"],
            is_proxy=score_data.get("is_proxy"),
            is_vpn=score_data.get("is_vpn"),
            is_tor=score_data.get("is_tor"),
            geolocation=score_data.get("geolocation"),
            velocity_signals=score_data.get("velocity_signals"),
            scored_at=score_data.get("scored_at", ""),
            cached=score_data.get("cached", False),
            cached_at=score_data.get("cached_at"),
            expires_at=score_data.get("expires_at"),
        )

    except MaxMindRateLimitError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e)
        ) from e
    except MaxMindConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"MaxMind service unavailable: {str(e)}",
        ) from e
    except MaxMindError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to score IP risk: {str(e)}",
        ) from e


@router.get(
    "/score/{ip_address}",
    response_model=IPRiskScoreResponse,
    summary="Get cached IP risk score",
    description="Get cached IP risk score if available (1 hour TTL)",
)
async def get_cached_ip_risk_score(
    ip_address: str,
    current_user: User = Depends(require_read),
    score_cache: ScoreCache = Depends(lambda: ScoreCache()),
) -> IPRiskScoreResponse:
    """
    Get cached IP risk score for an IP address.

    Returns cached score if available and not expired, otherwise 404.
    """
    try:
        import ipaddress

        ipaddress.ip_address(ip_address)  # Validate IP format
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid IP address format: {ip_address}",
        )

    cached_score = score_cache.get_cached_score(ip_address)

    if not cached_score:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cached score not found for IP {ip_address}",
        )

    return IPRiskScoreResponse(
        transaction_id=cached_score.get("transaction_id", f"cached_{ip_address}"),
        ip_address=ip_address,
        risk_score=cached_score["risk_score"],
        is_proxy=cached_score.get("is_proxy"),
        is_vpn=cached_score.get("is_vpn"),
        is_tor=cached_score.get("is_tor"),
        geolocation=cached_score.get("geolocation"),
        velocity_signals=cached_score.get("velocity_signals"),
        scored_at=cached_score.get("scored_at", ""),
        cached=True,
        cached_at=cached_score.get("cached_at"),
        expires_at=cached_score.get("expires_at"),
    )
