"""Tests for branding updates via partner API."""
import pytest
from app.api.routes.olorin.partner import PartnerUpdateRequest
from app.models.integration_partner import BrandingConfig


class TestPartnerUpdateRequestBranding:
    def test_accepts_branding_field(self):
        req = PartnerUpdateRequest(
            branding={"primary_color": "#FF5733", "show_powered_by": False}
        )
        assert req.branding is not None
        assert req.branding.primary_color == "#FF5733"

    def test_branding_is_optional(self):
        req = PartnerUpdateRequest(name="Updated Name")
        assert req.branding is None

    def test_branding_validates_hex(self):
        with pytest.raises(ValueError):
            PartnerUpdateRequest(
                branding={"primary_color": "red"}
            )

    def test_partial_branding_update(self):
        req = PartnerUpdateRequest(
            branding={"primary_color": "#123ABC"}
        )
        assert req.branding.primary_color == "#123ABC"
        assert req.branding.secondary_color is None

    def test_no_old_logo_url_field(self):
        """The old top-level logo_url field should be gone."""
        assert "logo_url" not in PartnerUpdateRequest.model_fields

    def test_no_old_website_url_field(self):
        """The old top-level website_url field should be gone."""
        assert "website_url" not in PartnerUpdateRequest.model_fields
