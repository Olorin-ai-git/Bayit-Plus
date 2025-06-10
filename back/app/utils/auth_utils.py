"""Utility functions for authentication used in tests."""
from __future__ import annotations

import http.client
import json
import re
import uuid
from dataclasses import dataclass
from typing import Tuple

import requests


class AuthError(Exception):
    """Custom authentication error."""


@dataclass
class _Settings:
    app_id: str = ""
    app_secret: str = ""
    default_profile_id: str = "9341454513864369"


settings_for_env = _Settings()


def get_app_secret(path: str) -> str:
    """Return a dummy secret value for tests."""
    return ""


BASE_URL_PER_ENV = {
    "QAL": "https://llmexecution-qal.api.intuit.com/{intuit_genos_model_id}",
    "E2E": "https://llmexecution-e2e.api.intuit.com/{intuit_genos_model_id}",
    "PRF": "https://llmexecution-prf.api.intuit.com/{intuit_genos_model_id}",
    "PRD": "https://llmexecution.api.intuit.com/{intuit_genos_model_id}",
}
BASE_URL = BASE_URL_PER_ENV["E2E"]
BASE_URL_WITH_INTUIT_GENOS_MODEL_ID = BASE_URL.format(intuit_genos_model_id="gpt-4o-2024-08-06")


def get_userid_and_token_from_authn_header(header: str) -> Tuple[str, str, str]:
    pattern = r"\s*(\w+)\s*=\s*\"?([^\",]+)\"?"
    parts = dict(re.findall(pattern, header))
    return (
        parts.get("intuit_userid", ""),
        parts.get("intuit_token", ""),
        parts.get("intuit_realmid", ""),
    )


def get_auth_token() -> Tuple[str, str, str]:
    url = "https://identityinternal-e2e.api.intuit.com/signin/graphql"
    payload = settings_for_env.identity_payload if hasattr(settings_for_env, "identity_payload") else ""
    try:
        password = get_app_secret(settings_for_env.app_secret)
        response = requests.request("POST", url, data=payload, timeout=5)
        if response.status_code == 200:
            try:
                data = response.json().get("data", {}).get("identityTestSignInWithPassword", {})
                userid = data.get("legacyAuthId")
                token = data.get("accessToken")
                if userid and token:
                    return userid, token, "50000003"
            except Exception:
                pass
    except Exception:
        pass
    return "fallback_user_id", "fallback_token", "50000003"


def get_offline_auth_token() -> Tuple[str, str, str]:
    host = "identityinternal-e2e.api.intuit.com"
    path = "/signin/graphql"
    try:
        conn = http.client.HTTPSConnection(host)
        payload = json.dumps({"query": ""})
        headers = {"Content-Type": "application/json"}
        conn.request("POST", path, payload, headers)
        resp = conn.getresponse()
        body = resp.read()
        data = json.loads(body)
        header = data.get("data", {}).get("identitySignInInternalApplicationWithPrivateAuth", {}).get("authorizationHeader", "")
        return get_userid_and_token_from_authn_header(header)
    except Exception:
        return "", "", ""


def validate_auth_token(token: str) -> bool:
    return bool(token)
