"""
Example API endpoint
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing_extensions import Annotated

from .config import SvcSettings, get_settings

router = APIRouter(prefix="/v1/example", tags=["example"])


class LogLevelResponse(BaseModel):
    # see https://github.olorin.com/pages/olorin-one-api/one-api-standards-governance/#/REST/guidelines?id=_711-string
    log_level: str = Field(
        description="The configured log level",
        min_length=1,
        max_length=20,
        pattern=r"^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$",
        examples=[
            "INFO",
            "WARNING",
        ],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "log_level": "INFO",
                }
            ]
        }
    }


@router.get("/log_level", operation_id="getLogLevel")
def get_log_level(
    settings: Annotated[SvcSettings, Depends(get_settings)],
) -> LogLevelResponse:
    """
    An example endpoint that uses the settings.
    """
    response = LogLevelResponse(log_level=settings.log_level)
    return response
