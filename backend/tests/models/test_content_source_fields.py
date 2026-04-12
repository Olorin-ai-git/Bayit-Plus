from app.models.content import Content


def test_content_source_fields_default_to_url():
    c = Content.model_construct(
        title="Test",
        stream_url="https://example.com/v.mp4",
    )
    assert c.source_type == "url"
    assert c.source_connection_id is None
    assert c.source_ref is None
    assert c.source_path is None
    assert c.source_status == "available"
    assert c.source_embed_url is None
    assert c.source_unavailable_since is None


def test_content_authenticated_source():
    c = Content.model_construct(
        title="Training Video",
        stream_url="https://drive.google.com/file/d/abc",
        source_type="google_workspace",
        source_connection_id="conn-123",
        source_ref="file-id-abc",
        source_path="Training / Onboarding",
    )
    assert c.source_type == "google_workspace"
    assert c.source_connection_id == "conn-123"
