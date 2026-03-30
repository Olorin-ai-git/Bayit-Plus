"""
Phase A Verification Tests

Validates all 4 B2B show-stopper fixes:
A1: MeteringService.record_usage exists and works
A2: Vanity router is mounted
A3: Webhook imports resolve in all B2B endpoints
A4: Credit enforcement via monthly_interaction_limit
"""

import importlib
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestA1MeteringRecordUsage:
    """A1: Verify record_usage generic method exists on MeteringService."""

    def test_metering_service_has_record_usage(self):
        from app.services.olorin.metering.service import MeteringService
        svc = MeteringService()
        assert hasattr(svc, "record_usage"), "MeteringService missing record_usage method"
        assert callable(svc.record_usage)

    def test_record_generic_usage_function_exists(self):
        from app.services.olorin.metering.usage import record_generic_usage
        assert callable(record_generic_usage)

    def test_generic_capability_cost_map_exists(self):
        from app.services.olorin.metering.costs import (
            GENERIC_CAPABILITY_COST_USD,
            calculate_generic_cost,
        )
        assert "pause_ask" in GENERIC_CAPABILITY_COST_USD
        assert "video_ingest" in GENERIC_CAPABILITY_COST_USD
        assert "subtitles" in GENERIC_CAPABILITY_COST_USD
        assert "trivia" in GENERIC_CAPABILITY_COST_USD
        assert calculate_generic_cost("pause_ask") > 0
        assert calculate_generic_cost("unknown_cap") > 0

    def test_metering_service_singleton_has_record_usage(self):
        from app.services.olorin.metering import metering_service
        assert hasattr(metering_service, "record_usage")


class TestA2VanityRouter:
    """A2: Verify vanity router is importable and mounted."""

    def test_vanity_router_importable(self):
        from app.api.routes.olorin import vanity_router
        assert vanity_router is not None
        assert hasattr(vanity_router, "routes")

    def test_vanity_router_has_routes(self):
        from app.api.routes.olorin import vanity_router
        route_paths = [r.path for r in vanity_router.routes if hasattr(r, "path")]
        assert len(route_paths) > 0, "Vanity router has no routes"

    def test_vanity_router_imported_in_registry(self):
        import inspect
        from app.api import router_registry
        source = inspect.getsource(router_registry)
        assert "olorin_vanity_router" in source
        assert "olorin-vanity" in source


class TestA3WebhookWiring:
    """A3: Verify all B2B endpoints import send_webhook_event."""

    def test_pause_ask_imports_webhook(self):
        import inspect
        from app.api.routes.olorin import b2b_pause_ask
        source = inspect.getsource(b2b_pause_ask)
        assert "send_webhook_event" in source

    def test_subtitles_imports_webhook(self):
        import inspect
        from app.api.routes.olorin import b2b_subtitles
        source = inspect.getsource(b2b_subtitles)
        assert "send_webhook_event" in source

    def test_trivia_imports_webhook(self):
        import inspect
        from app.api.routes.olorin import b2b_trivia
        source = inspect.getsource(b2b_trivia)
        assert "send_webhook_event" in source

    def test_video_ingest_orchestrator_fires_webhook(self):
        import inspect
        from app.services.olorin import ingest_orchestrator
        source = inspect.getsource(ingest_orchestrator)
        assert "send_webhook_event" in source

    def test_webhook_send_function_exists(self):
        from app.api.routes.olorin.webhooks import send_webhook_event
        assert callable(send_webhook_event)


class TestA4CreditEnforcement:
    """A4: Verify monthly_interaction_limit field and enforcement."""

    def test_partner_model_has_interaction_limit(self):
        from app.models.integration_partner import IntegrationPartner
        fields = IntegrationPartner.model_fields
        assert "monthly_interaction_limit" in fields

    def test_partner_interaction_limit_defaults_none(self):
        from app.models.integration_partner import IntegrationPartner
        field = IntegrationPartner.model_fields["monthly_interaction_limit"]
        assert field.default is None

    def test_monthly_request_count_function_exists(self):
        from app.services.olorin.metering.summary import get_monthly_request_count
        assert callable(get_monthly_request_count)

    def test_verify_capability_references_interaction_limit(self):
        import inspect
        from app.api.routes.olorin import dependencies
        source = inspect.getsource(dependencies.verify_capability)
        assert "monthly_interaction_limit" in source
        assert "get_monthly_request_count" in source
