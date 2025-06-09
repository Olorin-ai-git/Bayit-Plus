import time

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.comment_message import CommentMessageCreate
from app.router.comment_router import IN_MEMORY_COMMENTS, comment_router

app = FastAPI()
app.include_router(comment_router)


@pytest.fixture(autouse=True)
def clear_comments():
    IN_MEMORY_COMMENTS.clear()
    yield
    IN_MEMORY_COMMENTS.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_get_comment_messages_empty(client):
    response = client.get("/investigation/test-inv/comment")
    assert response.status_code == 200
    assert response.json() == []


def test_post_comment_message(client):
    payload = {
        "entity_id": "user1",
        "entity_type": "user_id",
        "sender": "user1",
        "text": "Hello!",
        "timestamp": int(time.time()),
    }
    response = client.post("/investigation/test-inv/comment", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["entity_id"] == "user1"
    assert data["entity_type"] == "user_id"
    assert data["text"] == "Hello!"
    assert data["investigation_id"] == "test-inv"
    assert "id" in data


def test_get_comment_messages_after_post(client):
    payload = {
        "entity_id": "user2",
        "entity_type": "user_id",
        "sender": "user2",
        "text": "Test comment",
        "timestamp": int(time.time()),
    }
    client.post("/investigation/test-inv/comment", json=payload)
    response = client.get("/investigation/test-inv/comment")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["text"] == "Test comment"
    assert data[0]["entity_id"] == "user2"
    assert data[0]["entity_type"] == "user_id"


def test_get_comment_messages_filter_by_sender(client):
    payload1 = {
        "entity_id": "user1",
        "entity_type": "user_id",
        "sender": "user1",
        "text": "Comment 1",
        "timestamp": int(time.time()),
    }
    payload2 = {
        "entity_id": "user2",
        "entity_type": "user_id",
        "sender": "user2",
        "text": "Comment 2",
        "timestamp": int(time.time()),
    }
    client.post("/investigation/test-inv/comment", json=payload1)
    client.post("/investigation/test-inv/comment", json=payload2)
    response = client.get("/investigation/test-inv/comment?sender=user1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["sender"] == "user1"
    assert data[0]["entity_id"] == "user1"
    assert data[0]["entity_type"] == "user_id"
