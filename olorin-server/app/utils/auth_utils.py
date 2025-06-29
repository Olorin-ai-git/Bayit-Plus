# Olorin PrivateAuth+ headers
import http.client
import json
import logging
import re
import uuid
from typing import Tuple

import requests

from app.service.config import get_settings_for_env
from app.utils.idps_utils import get_app_secret

logger = logging.getLogger(__name__)
settings_for_env = get_settings_for_env()

# Base URLs that will be used in SDKs
BASE_URL_PER_ENV = {
    "QAL": "https://llmexecution-qal.api.olorin.com/v3/{olorin_genos_model_id}",
    "E2E": "https://llmexecution-e2e.api.olorin.com/v3/{olorin_genos_model_id}",
    "PRF": "https://llmexecution-prf.api.olorin.com/v3/{olorin_genos_model_id}",
    "PRD": "https://llmexecution.api.olorin.com/v3/{olorin_genos_model_id}",
}

BASE_URL = BASE_URL_PER_ENV["E2E"]
BASE_URL_WITH_OLORIN_GENOS_MODEL_ID = BASE_URL.format(
    olorin_genos_model_id="gpt-4o-2024-08-06"
)


def get_userid_and_token_from_authn_header(header):
    if header is None:
        return None, None, None
    pattern = r'([a-zA-Z_]+)=("?[^",\s]+"?|[^,\s]+)'
    matches = re.findall(pattern, header)
    values = dict(matches)
    olorin_userid = values.get("olorin_userid")
    olorin_token = values.get("olorin_token")
    olorin_realmid = values.get("olorin_realmid", None)
    if olorin_userid and olorin_userid.startswith('"') and olorin_userid.endswith('"'):
        olorin_userid = olorin_userid[1:-1]
    if olorin_token and olorin_token.startswith('"') and olorin_token.endswith('"'):
        olorin_token = olorin_token[1:-1]
    if (
        olorin_realmid
        and olorin_realmid.startswith('"')
        and olorin_realmid.endswith('"')
    ):
        olorin_realmid = olorin_realmid[1:-1]
    return olorin_userid, olorin_token, olorin_realmid


def get_auth_token():
    """Using test client and user specifically created for GED."""
    try:
        appId = settings_for_env.app_id
        password = get_app_secret("olorin/test_user_pwd")
        url = "https://identityinternal-e2e.api.olorin.com/signin/graphql"
        payload = json.dumps(
            {
                "query": "mutation identityTestSignInWithPassword($input: Identity_TestSignInWithPasswordInput!) {\n    identityTestSignInWithPassword(input: $input) {\n        accessToken\n        legacyAuthId\n    }\n}",
                "operationName": "identityTestSignInWithPassword",
                "variables": {
                    "input": {
                        "username": "iamtestpass_47427305155952_testGEDFY2510",
                        "password": password,
                        "tenantId": "50000003",
                        "intent": {
                            "appGroup": "FINANCIAL",
                            "assetAlias": "Olorin.fraudprevention.accountrequests",
                        },
                    }
                },
            }
        )
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": "Olorin_IAM_Authentication olorin_appid="
            + settings_for_env.app_id
            + ",olorin_app_secret="
            + get_app_secret(settings_for_env.app_secret),
        }

        response = requests.request("POST", url, headers=headers, data=payload)

        # Check if the response is successful
        if response.status_code != 200:
            logger.error(
                f"Identity service returned status {response.status_code}: {response.text}"
            )
            raise Exception(
                f"Identity service authentication failed with status {response.status_code}"
            )

        # Try to parse JSON response
        try:
            response_json = response.json()
        except json.JSONDecodeError as json_err:
            logger.error(
                f"Identity service returned non-JSON response: {response.text[:500]}"
            )
            raise Exception(
                f"Identity service returned invalid JSON response: {str(json_err)}"
            )

        # Check if the response has the expected structure
        if "data" not in response_json:
            logger.error(
                f"Identity service response missing 'data' field: {response_json}"
            )
            raise Exception("Identity service response missing 'data' field")

        if "identityTestSignInWithPassword" not in response_json["data"]:
            logger.error(
                f"Identity service response missing authentication data: {response_json}"
            )
            raise Exception("Identity service response missing authentication data")

        # Get the token and user ID
        auth_data = response_json["data"]["identityTestSignInWithPassword"]
        olorin_token = auth_data.get("accessToken")
        olorin_userid = auth_data.get("legacyAuthId")
        olorin_realmid = "50000003"

        if not olorin_token or not olorin_userid:
            logger.error(
                f"Identity service response missing token or userid: {auth_data}"
            )
            raise Exception(
                "Identity service response missing required authentication fields"
            )

        return olorin_userid, olorin_token, olorin_realmid

    except Exception as e:
        logger.error(f"Failed to get authentication token: {str(e)}")
        # Return placeholder values to prevent complete failure
        # This allows the application to continue running in a degraded state
        return "fallback_user_id", "fallback_token", "50000003"


def get_offline_auth_token() -> Tuple[str, str, str]:
    """
    Get a fresh offline authentication token by calling the Olorin Identity API.
    Returns a tuple of (olorin_userid, olorin_token, olorin_realmid).
    """
    try:
        conn = http.client.HTTPSConnection("identityinternal-e2e.api.olorin.com")

        profile_id = getattr(settings_for_env, "default_profile_id", "9341454513864369")

        payload = f'{{"query":"mutation identitySignInInternalApplicationWithPrivateAuth($input:Identity_SignInApplicationWithPrivateAuthInput!) {{                                                \\n        identitySignInInternalApplicationWithPrivateAuth(input: $input) {{\\n            authorizationHeader\\n    }}\\n}}","variables":{{"input":{{"profileId":"{profile_id}"}}}}}}'

        transaction_id = f"tid_{str(uuid.uuid4())}"

        headers = {
            "olorin_tid": transaction_id,
            "Authorization": f"Olorin_IAM_Authentication olorin_appid={settings_for_env.app_id}, olorin_app_secret={get_app_secret(settings_for_env.app_secret)}",
            "Content-Type": "application/json",
        }
        conn.request("POST", "/v1/graphql", payload, headers)
        res = conn.getresponse()
        data = res.read()

        response_data = json.loads(data.decode("utf-8"))

        auth_header = (
            response_data.get("data", {})
            .get("identitySignInInternalApplicationWithPrivateAuth", {})
            .get("authorizationHeader")
        )

        if not auth_header:
            raise ValueError(
                "Failed to retrieve authorization header from identity API"
            )

        olorin_userid, olorin_token, olorin_realmid = (
            get_userid_and_token_from_authn_header(auth_header)
        )

        return olorin_userid, olorin_token, olorin_realmid
    except Exception as e:
        print(f"Error getting offline auth token: {str(e)}")
        # Return placeholder values in case of failure
        return "", "", ""
