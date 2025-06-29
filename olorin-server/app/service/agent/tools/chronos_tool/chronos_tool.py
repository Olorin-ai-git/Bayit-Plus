import http.client
import json
import logging
from datetime import datetime, timedelta
from typing import Any, ClassVar, Dict, Optional, Type

from dateutil.tz import tzutc
from langchain_core.callbacks import Callbacks
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from app.models.agent_headers import IntuitHeader
from app.service.config import get_settings_for_env
from app.utils.auth_utils import get_offline_auth_token

settings_for_env = get_settings_for_env()

logger = logging.getLogger(__name__)


class ChronosToolArgs(BaseModel):
    user_id: str = Field(..., description="The user ID to search for Chronos data")
    select: list[str] = Field(..., description="Fields to select from Chronos")


class ChronosTool(BaseTool):
    name: str = "chronos_tool"
    description: str = (
        "Use this tool to retrieve Chronos data for a user. You must provide a user_id and a list of fields to select."
    )
    args_schema: type = ChronosToolArgs

    formatter: ClassVar[str] = "%Y-%m-%dT%H:%M:%S+00:00"

    def _run(
        self,
        user_id: str,
        select: list[str],
        run_manager: Optional[Callbacks] = None,
        **kwargs: Any,
    ) -> str:
        """Execute the Chronos query to fetch RSS information."""
        if "sessionId" not in select:
            select = select + ["sessionId"]
        headers = kwargs.get("extra_headers")
        identity_data = self._query_chronos_api(user_id, select, headers)
        return json.dumps(identity_data, indent=2)

    async def _arun(
        self,
        user_id: str,
        select: list[str],
        run_manager: Optional[Callbacks] = None,
        range: Optional[dict] = None,
        extra_headers: Optional[dict] = None,
        **kwargs: Any,
    ) -> str:
        """
        Async execution of the Chronos query.
        Accepts optional 'range' (dict with 'from' and 'to') and 'extra_headers' to override/add request headers.
        """
        if "sessionId" not in select:
            select = select + ["sessionId"]
        try:
            identity_data = self._query_chronos_api(
                user_id, select, extra_headers=extra_headers, range_override=range
            )
        except Exception as e:
            logger.error(f"ChronosTool._arun error: {e}")
            identity_data = {}
        return json.dumps(identity_data, indent=2)

    def _query_chronos_api(
        self,
        user_id: str,
        select: list[str],
        headers: Optional[IntuitHeader] = None,
        extra_headers: Optional[dict] = None,
        range_override: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """
        Query Chronos API for information about the user.
        Accepts optional extra_headers to override/add request headers, and range_override to override the default time range.
        """
        try:
            # Use the same authentication approach as the working curl
            # First get a fresh token using the correct app credentials
            intuit_userid, intuit_token, intuit_realmid = self._get_fresh_auth_token()

            # Check if we got valid auth tokens
            if not intuit_userid or not intuit_token:
                logger.error("Failed to get valid auth tokens")
                return {"error": "Authentication failed", "entities": []}

            logger.info(
                f"Got auth tokens - userid: {intuit_userid[:10]}..., realmid: {intuit_realmid}"
            )

            conn = http.client.HTTPSConnection("elcdsl-e2e.api.intuit.com")

            if range_override:
                range_dict = range_override
            else:
                now = datetime.now(tzutc())
                seven_days_ago = now - timedelta(days=7)
                range_dict = {
                    "from": seven_days_ago.strftime(self.formatter),
                    "to": now.strftime(self.formatter),
                }

            payload = {
                "metadata": {"limit": 300},
                "range": range_dict,
                "filter": {
                    "auth_id": [user_id]
                },  # Use array format like the working curl
                "select": select,
                "queryId": "OLORIN",
                "routingLabel": "elc",
            }

            payload_json = json.dumps(payload)

            request_headers = {
                "intuit_originatingip": "127.0.0.1",
                "intuit_country": "US",
                "intuit_locale": "en-US",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "intuit_assetalias": "Intuit.cas.hri.olorin",
                "intuit_offeringid": "Intuit.cto.iam.ius",  # Add missing header from working curl
                "intuit_tid": "480e8643-d4fb-4546-bda8-555c67c14432",  # Use working intuit_tid
                "Authorization": f"Intuit_IAM_Authentication intuit_realmid={intuit_realmid},intuit_token={intuit_token},intuit_token_type=IAM-Ticket,intuit_userid={intuit_userid},intuit_appid=Intuit.secfraud.shared.ghost,intuit_app_secret=preprdbVmhuQWzwYkuILZ1PJAnSPYrOhUMPJiSru",
            }
            # Merge/override with extra_headers if provided
            if extra_headers:
                for k, v in extra_headers.items():
                    # FastAPI headers are lower-case; Chronos expects canonical case
                    canon_k = k if k in request_headers else k.title().replace("-", "_")
                    request_headers[canon_k] = v

            logger.debug(
                f"Making Chronos API request for user {user_id} with payload: {payload_json}"
            )
            logger.debug(
                f"Request headers: {dict((k, v[:50] + '...' if len(str(v)) > 50 else v) for k, v in request_headers.items())}"
            )

            conn.request("POST", "/v1/event", payload_json, request_headers)
            response = conn.getresponse()
            data = response.read()

            logger.info(f"Chronos API response status: {response.status}")
            logger.debug(f"Chronos API response data: {data.decode('utf-8')[:500]}")

            if response.status != 200:
                logger.error(
                    f"Chronos API returned status {response.status}: {data.decode('utf-8')}"
                )
                return {
                    "error": f"Chronos API error: {response.status}",
                    "entities": [],
                }

            api_response = json.loads(data.decode("utf-8"))

            if "errorMessage" in api_response:
                logger.error(f"Chronos API errors: {api_response['errorMessage']}")
                return {"error": api_response["errorMessage"], "entities": []}

            return api_response

        except json.JSONDecodeError as json_err:
            logger.error(f"Chronos API returned invalid JSON: {json_err}")
            return {"error": "Invalid JSON response from Chronos API", "entities": []}
        except Exception as e:
            logger.error(f"Chronos API call failed: {e}", exc_info=True)
            return {"error": f"Chronos API call failed: {str(e)}", "entities": []}

    def _get_fresh_auth_token(self):
        """Get a fresh authentication token using the correct app credentials for Chronos."""
        try:
            conn = http.client.HTTPSConnection("identityinternal-e2e.api.intuit.com")

            # Use the profile ID from the working example
            profile_id = "9341450868951246"

            payload = f'{{"query":"mutation identitySignInInternalApplicationWithPrivateAuth($input:Identity_SignInApplicationWithPrivateAuthInput!) {{                                                \\n        identitySignInInternalApplicationWithPrivateAuth(input: $input) {{\\n            authorizationHeader\\n    }}\\n}}","variables":{{"input":{{"profileId":"{profile_id}"}}}}}}'

            headers = {
                "intuit_tid": "480e8643-d4fb-4546-bda8-555c67c14432",
                "intuit_assetalias": "Intuit.shared.fraudlistclient",
                "Authorization": "Intuit_IAM_Authentication intuit_appid=Intuit.shared.fraudlistclient, intuit_app_secret=preprdf5KZ20app3oib0XW4TugiHhk6id1mCKmUp",
                "Content-Type": "application/json",
            }

            conn.request("POST", "/v1/graphql", payload, headers)
            res = conn.getresponse()
            data = res.read()

            if res.status != 200:
                logger.error(
                    f"Identity service returned status {res.status}: {data.decode('utf-8')}"
                )
                return "", "", ""

            response_data = json.loads(data.decode("utf-8"))

            auth_header = (
                response_data.get("data", {})
                .get("identitySignInInternalApplicationWithPrivateAuth", {})
                .get("authorizationHeader")
            )

            if not auth_header:
                logger.error(
                    f"Failed to retrieve authorization header from identity API: {response_data}"
                )
                return "", "", ""

            # Parse the auth header to extract components
            from app.utils.auth_utils import get_userid_and_token_from_authn_header

            intuit_userid, intuit_token, intuit_realmid = (
                get_userid_and_token_from_authn_header(auth_header)
            )

            return intuit_userid, intuit_token, intuit_realmid

        except Exception as e:
            logger.error(f"Error getting fresh auth token: {str(e)}")
            return "", "", ""
