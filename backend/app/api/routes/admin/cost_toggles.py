"""Cost provider toggle endpoints for iOS dashboard."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.models.cost_provider_settings import (
    VALID_PROVIDER_KEYS,
    CostProviderSettings,
)
from app.models.user import User

from .cost_admin_lock import require_costs_admin_uid
from .cost_service_schemas import (
    CostCategoryEnum,
    ProviderToggleListResponse,
    ProviderToggleRequest,
    ProviderToggleResponse,
    ToggleSourceEnum,
)

router = APIRouter(prefix="/costs", tags=["admin-costs-ios"])
logger = get_logger(__name__)

_PROVIDER_META: dict[str, tuple[str, CostCategoryEnum]] = {
    "gcp": ("Google Cloud Platform", CostCategoryEnum.INFRASTRUCTURE),
    "mongodb_atlas": ("MongoDB Atlas", CostCategoryEnum.INFRASTRUCTURE),
    "openai": ("OpenAI", CostCategoryEnum.AI),
    "elevenlabs": ("ElevenLabs", CostCategoryEnum.AI),
    "stripe": ("Stripe Fees", CostCategoryEnum.THIRD_PARTY),
    "pinecone": ("Pinecone", CostCategoryEnum.THIRD_PARTY),
    "twilio": ("Twilio", CostCategoryEnum.THIRD_PARTY),
    "redis_cloud": ("Redis Cloud", CostCategoryEnum.THIRD_PARTY),
    "fixed_costs": ("Fixed Costs", CostCategoryEnum.FIXED),
    "config_fallback": (
        "Config Fallback",
        CostCategoryEnum.INFRASTRUCTURE,
    ),
}

_CONFIG_KEY_MAP: dict[str, str] = {
    "gcp": "gcp_billing",
    "mongodb_atlas": "mongodb_billing",
    "openai": "openai_billing",
    "pinecone": "pinecone_billing",
    "twilio": "twilio_billing",
    "redis_cloud": "redis_cloud_billing",
}


def _get_config_enabled(provider_key: str) -> bool:
    """Read the static config enabled flag for a provider."""
    config_attr = _CONFIG_KEY_MAP.get(provider_key)
    if config_attr is None:
        return True
    billing_cfg = getattr(settings.olorin, config_attr, None)
    if billing_cfg is None:
        return True
    return getattr(billing_cfg, "enabled", True)


@router.get("/toggles")
@limiter.limit("60/hour")
async def list_toggles(
    request: Request,
    current_user: User = Depends(require_costs_admin_uid),
) -> ProviderToggleListResponse:
    """List all providers with merged config + override state."""
    overrides = await CostProviderSettings.find_all().to_list()
    override_map = {o.provider_key: o for o in overrides}

    results: list[ProviderToggleResponse] = []
    for key in VALID_PROVIDER_KEYS:
        display_name, category = _PROVIDER_META.get(key, (key, CostCategoryEnum.FIXED))
        override = override_map.get(key)

        if override is not None:
            enabled = override.enabled
            source = ToggleSourceEnum.OVERRIDE
            updated_at = override.updated_at
        else:
            enabled = _get_config_enabled(key)
            source = ToggleSourceEnum.CONFIG
            updated_at = None

        results.append(
            ProviderToggleResponse(
                provider_key=key,
                display_name=display_name,
                enabled=enabled,
                source=source,
                category=category,
                updated_at=updated_at,
            )
        )

    results.sort(key=lambda r: (r.category.value, r.display_name))
    return ProviderToggleListResponse(providers=results)


@router.put("/toggles/{provider_key}")
@limiter.limit("30/hour")
async def update_toggle(
    provider_key: str,
    body: ProviderToggleRequest,
    request: Request,
    current_user: User = Depends(require_costs_admin_uid),
) -> ProviderToggleResponse:
    """Create or update a provider toggle override."""
    if provider_key not in VALID_PROVIDER_KEYS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid provider_key: {provider_key}",
        )

    firebase_uid = getattr(request.state, "firebase_uid", None) or getattr(
        current_user, "firebase_uid", ""
    )

    existing = await CostProviderSettings.find_one(
        CostProviderSettings.provider_key == provider_key
    )

    if existing is not None:
        existing.enabled = body.enabled
        existing.updated_at = datetime.utcnow()
        existing.updated_by = firebase_uid
        await existing.save()
        doc = existing
    else:
        doc = CostProviderSettings(
            provider_key=provider_key,
            enabled=body.enabled,
            updated_by=firebase_uid,
        )
        await doc.insert()

    display_name, category = _PROVIDER_META.get(
        provider_key, (provider_key, CostCategoryEnum.FIXED)
    )

    logger.info(
        "COST_PROVIDER_TOGGLED",
        extra={
            "provider_key": provider_key,
            "enabled": body.enabled,
            "admin_uid": firebase_uid,
        },
    )

    return ProviderToggleResponse(
        provider_key=provider_key,
        display_name=display_name,
        enabled=doc.enabled,
        source=ToggleSourceEnum.OVERRIDE,
        category=category,
        updated_at=doc.updated_at,
    )
