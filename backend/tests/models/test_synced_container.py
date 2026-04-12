import pytest
from app.models.synced_container import SyncedContainer


def test_synced_container_defaults():
    sc = SyncedContainer.model_construct(
        connection_id="conn-abc",
        partner_id="partner-1",
        provider_folder_ref="folder-id-123",
        folder_path="Training / Onboarding",
        created_by="admin-user",
    )
    assert sc.status == "active"
    assert sc.auto_import_new is True
    assert sc.poll_interval_hours == 24
    assert sc.last_webhook_event_at is None


def test_poll_interval_bounds():
    with pytest.raises(ValueError):
        SyncedContainer.model_validate({
            "connection_id": "c",
            "partner_id": "p",
            "provider_folder_ref": "f",
            "folder_path": "x",
            "created_by": "u",
            "poll_interval_hours": 1,  # below minimum 6
        })
