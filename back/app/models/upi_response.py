from typing import List, Optional

from pydantic import BaseModel, Field


class Content(BaseModel):
    text: str
    type: str


class AgentInput(BaseModel):
    content: List[Content]


class OutputFormat(BaseModel):
    format: str
    formatter_version: str = Field(..., alias="formatterVersion")
    formatter_name: str = Field(..., alias="formatterName")


class Output(BaseModel):
    content: str
    output_format: OutputFormat = Field(..., alias="outputFormat")


class AgentOutput(BaseModel):
    plain_text: str = Field(..., alias="plainText")
    outputs: List[Output]


class Agent(BaseModel):
    name: str


class Metadata(BaseModel):
    interaction_id: Optional[str] = Field(None, alias="interactionId")
    experience_id: Optional[str] = Field(None, alias="experienceId")
    originating_asset_alias: Optional[str] = Field(None, alias="originatingAssetAlias")
    intuit_tid: Optional[str] = Field(None)
    agent: Optional[Agent] = Field(None)
    additional_metadata: Optional[dict] = Field(None, alias="additionalMetadata")
    supported_output_formats: Optional[str] = Field(
        None, alias="supportedOutputFormats"
    )
    interaction_group_id: Optional[str] = Field(None, alias="interactionGroupId")


class ClientContext(BaseModel):
    client_key: str = Field(..., alias="clientKey")


class ServerContext(BaseModel):
    server_key: str = Field(..., alias="serverKey")


class Context(BaseModel):
    client_context: Optional[ClientContext] = Field(None, alias="clientContext")
    server_context: Optional[ServerContext] = Field(None, alias="serverContext")


class Interaction(BaseModel):
    role: str
    created_date_time: str = Field(..., alias="createdDateTime")
    agent_input: Optional[AgentInput] = Field(None, alias="agentInput")
    agent_output: Optional[AgentOutput] = Field(None, alias="agentOutput")
    metadata: Metadata
    context: Context


class Links(BaseModel):
    next: Optional[str] = Field(None)
    previous: Optional[str] = Field(None)


class InteractionsResponse(BaseModel):
    interactions: List[Optional[Interaction]] = Field(default_factory=list)
    count: Optional[int] = Field(0, alias="_count")
    links: Optional[Links] = Field(None, alias="links")

    model_config = {"validate_by_name": True}
