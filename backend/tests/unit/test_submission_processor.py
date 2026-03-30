"""Unit tests for the submission queue processor endpoint."""

import pytest


class TestProcessorRequestModel:
    def test_request_requires_api_key(self):
        from app.api.routes.submission_processor import ProcessSubmissionsRequest
        req = ProcessSubmissionsRequest(api_key="test-key-123")
        assert req.api_key == "test-key-123"

    def test_batch_size_defaults_to_one(self):
        from app.api.routes.submission_processor import ProcessSubmissionsRequest
        req = ProcessSubmissionsRequest(api_key="k")
        assert req.batch_size == 1

    def test_batch_size_max_five(self):
        from app.api.routes.submission_processor import ProcessSubmissionsRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ProcessSubmissionsRequest(api_key="k", batch_size=10)


class TestProcessorResponseModel:
    def test_response_fields(self):
        from app.api.routes.submission_processor import ProcessSubmissionsResponse
        resp = ProcessSubmissionsResponse(processed=1, skipped=0, pending=3)
        assert resp.processed == 1
        assert resp.pending == 3

    def test_defaults_zero(self):
        from app.api.routes.submission_processor import ProcessSubmissionsResponse
        resp = ProcessSubmissionsResponse()
        assert resp.processed == 0
        assert resp.skipped == 0
        assert resp.pending == 0
