import json
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, HttpUrl
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ImageContent(BaseModel):
    image_url: HttpUrl = Field(
        alias="imageUrl", description="url of image when type is image"
    )


class ContentItem(BaseModel):
    """
    Supports multi-modal inputs. Currently, accepts text or image
    """

    text: Optional[str] = None
    image: Optional[ImageContent] = None
    type: str


class Agent(BaseModel):
    name: str  # Name of the agent that was passed to UPI. This is just a reference and can be ignored.


class AgentInput(BaseModel):
    content: List[ContentItem]


class SupportedOutputFormat(BaseModel):
    format: str
    formatter_version: Optional[str] = Field(alias="formatterVersion")
    formatter_name: Optional[str] = Field(alias="formatterName")


class Metadata(BaseModel):
    interaction_group_id: str = Field(alias="interactionGroupId")
    supported_output_formats: Optional[List[SupportedOutputFormat]] = Field(
        alias="supportedOutputFormats", default_factory=list
    )
    additional_metadata: Optional[Dict[str, str]] = Field(
        alias="additionalMetadata", default=None
    )


class Context(BaseModel):
    interaction_type: str = Field(alias="interactionType")
    platform: str
    tax_year: Optional[str] = Field(alias="taxYear", default=None)
    additional_context: Optional[Dict[str, Any]] = Field(alias="additionalContext")


class AgentRequest(BaseModel):
    agent: Agent
    agent_input: AgentInput = Field(alias="agentInput")
    metadata: Metadata
    context: Context

    def __str__(self):
        return self.model_dump_json(indent=4)
