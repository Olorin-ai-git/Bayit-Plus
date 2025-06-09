import json
import logging
from typing import Any, Dict, Optional

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# Pydantic model for DI Tool response
class DIResponse(BaseModel):
    session_id: str = Field(..., description="Session ID from Splunk")
    user_id: str = Field(..., description="User ID")
    data: Any = Field(
        ..., description="Parsed 'data' field from DI API response (dict or str)"
    )
    errorMessage: Optional[str] = Field(None, description="Error message from DI API")
    elapsedTime: Optional[float] = Field(None, description="Elapsed time from DI API")
    status: Optional[str] = Field(None, description="Status from DI API")


# Mock external API call
async def mock_external_api(session_id: str, user_id: str) -> Dict[str, Any]:
    logger.info(
        f"Calling external DI API with session_id={session_id}, user_id={user_id}"
    )
    # Simulate network delay and response
    return {
        "data": {"device_type": "mobile", "os": "Android", "risk_score": "0.2"},
        "errorMessage": None,
        "elapsedTime": 0.1,
        "status": "SUCCESS",
    }


class DITool:
    async def run(
        self,
        session_id: str,
        user_id: str,
        use_mock: bool = False,
    ) -> DIResponse:
        if use_mock:
            mock_resp = await mock_external_api(session_id, user_id)
            return DIResponse(
                session_id=session_id,
                user_id=user_id,
                data=mock_resp["data"],
                errorMessage=mock_resp.get("errorMessage"),
                elapsedTime=mock_resp.get("elapsedTime"),
                status=mock_resp.get("status"),
            )

        url = "https://deviceintelbb-e2e.api.intuit.com/v1/session/bbscore"
        headers = {
            "Authorization": "Intuit_IAM_Authentication intuit_appid=Intuit.fraudprevention.ditestclient,intuit_app_secret=preprd6JxXTUUeMF57WYrZx0wvW8zdyWzITgNPlC",
            "intuit_tid": "tid70324582-f038-426e-9165-f3990846543",
            "intuit_offeringid": "Intuit.fraudprevention.deviceintelligencedf",
            "Content-Type": "application/json",
        }
        payload = {
            "sessionId": session_id,
            "businessTransaction": "genOSEligibilityPolicy",
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                resp_json = response.json()
                # Parse the 'data' field if it's a JSON string
                data_field = resp_json.get("data", "{}")
                try:
                    data_parsed = (
                        json.loads(data_field)
                        if isinstance(data_field, str)
                        else data_field
                    )
                except Exception:
                    data_parsed = data_field
                errorMessage = resp_json.get("errorMessage")
                elapsedTime = resp_json.get("elapsedTime")
                status = resp_json.get("status")
        except Exception as e:
            logger.error(f"DI Tool API call failed: {e}")
            data_parsed = {}
            errorMessage = str(e)
            elapsedTime = None
            status = "ERROR"
        return DIResponse(
            session_id=session_id,
            user_id=user_id,
            data=data_parsed,
            errorMessage=errorMessage,
            elapsedTime=elapsedTime,
            status=status,
        )
