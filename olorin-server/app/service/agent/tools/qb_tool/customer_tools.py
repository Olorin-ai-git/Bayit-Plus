import logging
from typing import Any, Optional

from langchain_core.runnables.config import RunnableConfig
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from app.service.config import get_settings_for_env

from .qbo_service import FinancialService

logger = logging.getLogger(__name__)

settings_for_env = get_settings_for_env()


# Define an empty Pydantic model for tools that take no arguments
class _NoArgsModel(BaseModel):
    pass


class ListCustomersTool(BaseTool):
    name: str = Field(
        "list_customers", description="Get a list of all customers from financial service"
    )
    description: str = Field(
        "This tool retrieves a list of all customers with their basic information from financial service"
    )
    args_schema: type[BaseModel] = _NoArgsModel

    def _run(
        self, tool_input: str = "", config: Optional[RunnableConfig] = None
    ) -> Any:
        """Synchronous version of list_customers

        Returns:
            List of customers with their basic information
        """
        from app.models.agent_context import AgentContext

        logger.info("Customer Tool: Calling list_customers API (sync)")

        agent_context: AgentContext = config["configurable"]["agent_context"]
        olorin_header = agent_context.get_header()

        financial_service = FinancialService()
        resp = financial_service.get_customers_sync(olorin_header)
        customers = resp["data"]["contacts"]["data"]
        keys_to_select = ["id", "firstName", "lastName", "displayName", "companyName"]
        customers = [
            {key: customer[key] for key in keys_to_select} for customer in customers
        ]
        return customers

    async def _arun(self, config: RunnableConfig, **kwargs) -> Any:
        """Asynchronous version of list_customers

        Returns:
            List of customers with their basic information
        """
        from app.models.agent_context import AgentContext

        logger.info("Customer Tool: Calling list_customers API (async)")
        logger.debug(f"[LIST_CUSTOMERS] Received config: {config}")
        try:
            if not config:
                raise ValueError("Config is required but was not provided")

            agent_context: AgentContext = config["configurable"]["agent_context"]
            olorin_header = agent_context.get_header()

            financial_service_instance = FinancialService()
            resp = await financial_service_instance.get_customers(olorin_header)

            if not resp or "data" not in resp:
                raise ValueError("Invalid response from financial service")

            customers = resp.get("data", {}).get("contacts", {}).get("data", [])
            logger.debug(f"[LIST_CUSTOMERS] Received Customers: {customers}")
            if not customers:
                return []  # Return empty list if no customers found

            keys_to_select = [
                "id",
                "firstName",
                "lastName",
                "displayName",
                "companyName",
            ]
            customers = [
                {key: customer.get(key) for key in keys_to_select}
                for customer in customers
            ]

            logger.debug(f"Successfully retrieved {len(customers)} customers")
            return customers

        except Exception as e:
            logger.error(f"Error in list_customers async: {str(e)}", exc_info=True)
            raise ValueError(f"Failed to list customers: {str(e)}")
