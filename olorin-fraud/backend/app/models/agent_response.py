from typing import List, Optional

from pydantic import BaseModel, Field


class OutputFormat(BaseModel):
    format: str
    formatter_version: Optional[str] = Field(alias="formatterVersion")
    formatter_name: Optional[str] = Field(alias="formatterName")


class Output(BaseModel):
    content: str
    output_format: OutputFormat = Field(alias="outputFormat")


class AgentOutput(BaseModel):
    plain_text: str = Field(
        alias="plainText",
        json_schema_extra={
            "description": "Plain text output of the agent. This is a required field."
        },
    )
    outputs: Optional[List[Output]]


class AgentMetadata(BaseModel):
    agent_trace_id: str = Field(
        alias="agentTraceId",
        json_schema_extra={
            "description": "Trace ID for the agent invocation. This is used for debugging purposes."
        },
    )


class AgentResponse(BaseModel):
    agent_output: AgentOutput = Field(alias="agentOutput")
    agent_metadata: AgentMetadata = Field(alias="agentMetadata")

    def __str__(self):
        return self.model_dump_json(indent=4)
