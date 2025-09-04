import uuid
from abc import ABC
from typing import Annotated, Any, Dict, List, Optional

import httpx
from fastapi import HTTPException
from langchain_core.runnables.config import RunnableConfig
from langchain_core.tools import BaseTool
from langgraph.graph.message import add_messages
from pydantic import BaseModel, ConfigDict, Field
from typing_extensions import TypedDict

from app.service.config import get_settings_for_env
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)
settings_for_env = get_settings_for_env()


class RAGApi(ABC):
    def search(headers, payload):
        logger.debug(
            f"calling api {settings_for_env.rag_search_url}, payload: {payload}"
        )
        try:
            response = httpx.post(
                url=settings_for_env.rag_search_url,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code, detail=e.response.text
            )

    async def asearch(headers, payload):
        logger.debug(
            f"calling api {settings_for_env.rag_search_url}, payload: {payload}"
        )
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url=settings_for_env.rag_search_url,
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code, detail=e.response.text
            )


class RAGInputState(TypedDict):
    messages: Annotated[list, add_messages]
    conversation_id: str


# Define a Pydantic model for items in the messages list
class MessageItem(BaseModel):
    # This model can be expanded if the structure of message items is known.
    # For now, this makes it an object that forbids additional properties.
    model_config = ConfigDict(extra="forbid")

    # You might need to add specific fields like 'role': str, 'content': str if they are expected.
    # For maximum flexibility initially, we can allow any fields known to Pydantic, but no extras.
    # However, to truly match a generic object for JSON schema, one might need to use `model_extra` for Pydantic v2
    # or other tricks. For now, `extra = 'forbid'` is the most direct way to address `additionalProperties: false`.
    # If this still fails, it means the items MUST NOT be empty objects, or need specific properties.

    # Let's assume messages are dicts and try to capture them as such, but still forbid extra top-level keys in the item itself.
    # This is a common pattern for LangChain messages (role: str, content: str)
    role: str  # Made required
    content: str  # Made required and specified as string type


# Define Pydantic models for the arguments
class _RetrieverToolStateSchema(BaseModel):
    messages: List[MessageItem] = Field(
        ...,
        description="The conversation messages, each being an object that forbids additional properties.",
    )
    conversation_id: Optional[str] = Field(
        description="The unique identifier for the conversation. If not provided, a new UUID will be generated.",
    )


class RetrieverToolArgs(BaseModel):
    state: _RetrieverToolStateSchema = Field(
        ..., description="The RAG input state, including messages and conversation ID."
    )


class RetrieverTool(BaseTool):
    max_results: int = Field(
        10, description="The maximum number of search results to return."
    )

    query_configs: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional query configurations to be merged with the default configs",
    )

    index_name: str | list[str] = Field(
        "aimqa_qbo_payrollqa",
        description="The name of the index to search.",
    )

    args_schema: type[BaseModel] = RetrieverToolArgs

    def _build_message_metadata(self) -> Dict[str, Any]:
        # Start with basic query configs
        base_configs = {"size": self.max_results}

        # If additional query_configs are provided, merge them
        if self.query_configs:
            # Deep merge if needed
            if "query_configs" in self.query_configs:
                base_configs.update(self.query_configs["query_configs"])
            else:
                base_configs.update(self.query_configs)

        return {"query_configs": base_configs}

    def retrieve_run(
        self, state: RAGInputState, config: RunnableConfig, **kwargs
    ) -> str:
        messages = state["messages"]
        # Ensure metadata key exists if messages[-1] is a dict, common in LangChain message formats
        if isinstance(messages[-1], dict) and "metadata" not in messages[-1]:
            messages[-1]["metadata"] = {}
        elif not isinstance(messages[-1], dict):
            # Handle cases where message format might not be a direct dict (e.g. AIMessage object)
            # This part might need adjustment based on actual message types used with these tools
            logger.warning(
                f"Last message is not a dict, metadata injection might not work as expected: {type(messages[-1])}"  # pragma: no cover
            )

        # Safely set metadata
        if isinstance(messages[-1], dict):
            messages[-1]["metadata"] = self._build_message_metadata()

        payload = {
            "conversationId": (
                state["conversation_id"]
                if "conversation_id" in state and state["conversation_id"]
                else str(uuid.uuid4())
            ),
            "experience": self.index_name,
            "messages": messages,
        }
        from app.models.agent_context import AgentContext

        agent_context: AgentContext = config["configurable"]["agent_context"]
        olorin_header = agent_context.get_header()

        resp_data = RAGApi.search(
            headers=olorin_header,
            payload=payload,
        )
        logger.debug(f"response from RAG search {resp_data}")
        output = [choice["content"] for choice in resp_data["choices"]]
        return ", ".join(output)

    async def aretrieve_arun(
        self, state: RAGInputState, config: RunnableConfig, **kwargs
    ) -> str:
        messages = state["messages"]
        # Ensure metadata key exists
        if isinstance(messages[-1], dict) and "metadata" not in messages[-1]:
            messages[-1]["metadata"] = {}
        elif not isinstance(messages[-1], dict):
            logger.warning(
                f"Last message is not a dict, metadata injection might not work as expected: {type(messages[-1])}"  # pragma: no cover
            )

        if isinstance(messages[-1], dict):
            messages[-1]["metadata"] = self._build_message_metadata()

        payload = {
            "conversationId": (
                state["conversation_id"]
                if "conversation_id" in state and state["conversation_id"]
                else str(uuid.uuid4())
            ),
            "experience": self.index_name,
            "messages": messages,
        }
        from app.models.agent_context import AgentContext

        agent_context: AgentContext = config["configurable"]["agent_context"]
        olorin_header = agent_context.get_header()

        resp_data = await RAGApi.asearch(
            headers=olorin_header,
            payload=payload,
        )
        logger.debug(f"async response from RAG search {resp_data}")  # pragma: no cover
        output = [choice["content"] for choice in resp_data["choices"]]
        return ", ".join(output)


class QBRetrieverTool(RetrieverTool):
    name: str = Field(
        "qbo_knowledgebase_retriever",
        description="Olorin RAG paved path tool which can be used to search any index",
    )
    description: str = Field(
        "This tool helps find relevant help content about Quickbooks",
    )
    index_name: str | list[str] = Field(
        "aimqa_qbo_payrollqa",
        description="The name of the index to search.",
    )
    args_schema: type[BaseModel] = RetrieverToolArgs

    def _run(self, state: RAGInputState, config: RunnableConfig, **kwargs) -> str:
        return super().retrieve_run(state, config, **kwargs)

    async def _arun(
        self, state: RAGInputState, config: RunnableConfig, **kwargs
    ) -> str:
        return await super().aretrieve_arun(state, config, **kwargs)


class TTRetrieverTool(RetrieverTool):
    name: str = Field(
        "tto_knowledgebase_retriever",
        description="Olorin RAG paved path tool which can be used to search any index",
    )
    description: str = Field(
        "This tool helps find relevant help content about Turbotax and Tax.",
    )
    index_name: str | list[str] = Field(
        "aimqa_incomet_dnaragusecasemodel",
        description="The name of the index to search.",
    )
    args_schema: type[BaseModel] = RetrieverToolArgs

    def _run(self, state: RAGInputState, config: RunnableConfig, **kwargs) -> str:
        return super().retrieve_run(state, config, **kwargs)

    async def _arun(
        self, state: RAGInputState, config: RunnableConfig, **kwargs
    ) -> str:
        return await super().aretrieve_arun(state, config, **kwargs)
