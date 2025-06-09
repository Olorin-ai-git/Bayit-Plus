import logging
from abc import ABC

from cdcdatalib.cdc_svc import CDCService
from cdcdatalib.cdc_svc_async import CDCServiceAsync
from langchain_core.runnables.config import RunnableConfig
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from app.service.agent.tools.cdc_tool.cdc_trusted_attributes import (
    CDC_TRUSTED_COMPANY_ATTRIBUTE_LIST,
    CDC_TRUSTED_USER_ATTRIBUTE_LIST,
)
from app.service.config import get_settings_for_env

logger = logging.getLogger(__name__)

settings_for_env = get_settings_for_env()


# Define an empty Pydantic model for tools that take no arguments
class _NoArgsModel(BaseModel):
    pass


class CDCApi(ABC):
    """
    This Class is to interact with the CDC API.

    This class provides methods to fetch customer attribute data from the CDC API, both synchronously and asynchronously.
    It uses the `CDCService` and `CDCServiceAsync` classes to perform the actual data retrieval.

    Methods:
    --------
    fetch_attribute_data(cls, headers, account_type, only_trusted_attrs, userid, realmid, attributes):
        Fetches attribute data synchronously from the CDC API.

    afetch_attribute_data(cls, headers, account_type, only_trusted_attrs, userid, realmid, attributes):
        Fetches attribute data asynchronously from the CDC API.

    """

    @classmethod
    def fetch_attribute_data(
        cls, headers, account_type, only_trusted_attrs, userid, realmid, attributes
    ) -> str:
        """
        Fetches attribute data synchronously from the CDC API.

        Parameters:
        -----------
        headers : dict
            Authentication headers required for the API call.
        account_type : str
            The type of account (e.g., "PersonAccount", "OrganizationAccount").
        only_trusted_attrs : bool
            If True, only trusted attributes will be fetched.
        userid : str
            The user ID for which attributes are being fetched.
        realmid : str
            The realm ID associated with the user.
        attributes : list[str]
            List of attributes to be retrieved.

        Returns:
        --------
        dict or None
            The attribute data retrieved from the CDC API, or None if not found.

        Raises:
        -------
        Exception
            If the API call fails.
        """

        logger.debug(
            f"Calling CDC lib, env={settings_for_env.cdc_env}, account_type={account_type}, realmid={realmid}, userid={userid}, only_trusted_attrs={only_trusted_attrs}, attributes={attributes}"
        )
        svc = CDCService(settings_for_env.cdc_env)
        try:
            data = svc.get_attributes_values(
                cdc_views_type=account_type,
                account_id=userid if account_type == "PersonAccount" else realmid,
                attributes=attributes,
                with_metadata=only_trusted_attrs,
                with_trusted_only=only_trusted_attrs,
                auth_headers=headers,
            )
        except Exception as e:
            logger.error("Failed to fetch CDC attributes")
            raise e
        attribute_data = data["data"].get(account_type, None)
        return attribute_data

    @classmethod
    async def afetch_attribute_data(
        cls, headers, account_type, only_trusted_attrs, userid, realmid, attributes
    ) -> str:
        """
        Fetches attribute data asynchronously from the CDC API.

        Parameters:
        -----------
        headers : dict
           Authentication headers required for the API call.
        account_type : str
           The type of account (e.g., "PersonAccount", "OrganizationAccount").
        only_trusted_attrs : bool
           If True, only trusted attributes will be fetched.
        userid : str
           The user ID for which attributes are being fetched.
        realmid : str
           The realm ID associated with the user.
        attributes : list[str]
           List of attributes to be retrieved.

        Returns:
        --------
        dict or None
           The attribute data retrieved from the CDC API, or None if not found.

        Raises:
        -------
        Exception
           If the API call fails.
        """

        logger.debug(
            f"Async Calling CDC lib, env={settings_for_env.cdc_env}, account_type={account_type}, realmid={realmid}, userid={userid}, only_trusted_attrs={only_trusted_attrs}, attributes={attributes}"
        )
        svc = CDCServiceAsync(settings_for_env.cdc_env)

        try:
            data = await svc.get_attributes_values_async(
                cdc_views_type=account_type,
                account_id=userid if account_type == "PersonAccount" else realmid,
                attributes=attributes,
                with_metadata=only_trusted_attrs,
                with_trusted_only=only_trusted_attrs,
                auth_headers=headers,
            )
        except Exception as e:
            logger.error("Failed to fetch CDC attributes")
            raise e
        attribute_data = data["data"].get(account_type, None)
        return attribute_data


class CdcTool(BaseTool):
    """
    A tool for interacting with the CDC APIs to search for customer attributes.

    Attributes:
    -----------
    name : str
        The name of the tool
    description : str
        A brief description of the tool's functionality
    account_type : str
        The type of account for the current user
    only_trusted_attrs : bool
        Flag indicating whether to fetch only trusted attributes
    attributes : list[str]
        A list of attributes to be retrieved from the CDC
    """

    def fetch_attributes(self, config: RunnableConfig, **kwargs) -> str:
        """
        Executes a synchronous search for customer attributes using the CDC API.

        Parameters:
        -----------
        config : RunnableConfig
            Configuration object containing user-specific settings.
        **kwargs : dict
            Additional keyword arguments.

        Returns:
        --------
        str
            The response data from the CDC API.
        """
        from app.models.agent_context import AgentContext

        agent_context: AgentContext = config["configurable"]["agent_context"]
        intuit_header = agent_context.get_header()

        resp_data: str = CDCApi.fetch_attribute_data(
            headers=intuit_header,
            account_type=self.account_type,
            only_trusted_attrs=self.only_trusted_attrs,
            userid=agent_context.intuit_header.auth_context.intuit_user_id,
            realmid=agent_context.intuit_header.auth_context.intuit_realmid,
            attributes=self.attributes,
        )
        logger.debug(f"response from CDC search resp_data={resp_data}")
        return resp_data

    async def afetch_attributes(self, config: RunnableConfig, **kwargs) -> str:
        """
        Executes an asynchronous search for customer attributes using the CDC API.

        Parameters:
        -----------
        config : RunnableConfig
            Configuration object containing user-specific settings.
        **kwargs : dict
            Additional keyword arguments.

        Returns:
        --------
        str
            The response data from the CDC API.
        """
        from app.models.agent_context import AgentContext

        agent_context: AgentContext = config["configurable"]["agent_context"]
        intuit_header = agent_context.get_header()

        resp_data: str = await CDCApi.afetch_attribute_data(
            headers=intuit_header,
            account_type=self.account_type,
            only_trusted_attrs=self.only_trusted_attrs,
            userid=agent_context.intuit_header.auth_context.intuit_user_id,
            realmid=agent_context.intuit_header.auth_context.intuit_realmid,
            attributes=self.attributes,
        )
        logger.debug(f"async response from CDC search resp_data={resp_data}")
        return resp_data


class CdcUserTool(CdcTool):
    name: str = Field(
        "cdc_user_attribute_retriever",
        description="CDC tool can be used to search customer attributes from CDC APIs",
    )
    description: str = Field(
        "This tool helps find relevant information about a customer. If the question is related to customer tax data use this tool.",
    )
    account_type: str = Field(
        "PersonAccount",
        description="The account type of the current user. It can be one of the following:  PersonAccount, OrganizationAccount and Visitor",
    )
    only_trusted_attrs: bool = Field(
        True,
        description="If true, only trusted attributes will be fetched. Otherwise, all attributes will be included.",
    )
    attributes: list[str] = Field(
        CDC_TRUSTED_USER_ATTRIBUTE_LIST,
        description="List of attributes to be retrieved from CDC",
    )
    args_schema: type[BaseModel] = _NoArgsModel

    def _run(self, config: RunnableConfig, **kwargs) -> str:
        return self.fetch_attributes(config, **kwargs)

    def _arun(self, config: RunnableConfig, **kwargs) -> str:
        return self.afetch_attributes(config, **kwargs)


class CdcCompanyTool(CdcTool):
    name: str = Field(
        "cdc_company_attribute_retriever",
        description="CDC tool can be used to search customer attributes from CDC APIs",
    )
    description: str = Field(
        "This tool helps find relevant profile information a the customer. If the question is related to customer business aggregate data or profiles use this tool.",
    )
    account_type: str = Field(
        "OrganizationAccount",
        description="The account type of the current user. It can be one of the following:  PersonAccount, OrganizationAccount and Visitor",
    )
    only_trusted_attrs: bool = Field(
        True,
        description="If true, only trusted attributes will be fetched. Otherwise, all attributes will be included.",
    )
    attributes: list[str] = Field(
        CDC_TRUSTED_COMPANY_ATTRIBUTE_LIST,
        description="List of attributes to be retrieved from CDC",
    )
    args_schema: type[BaseModel] = _NoArgsModel

    def _run(self, config: RunnableConfig, **kwargs) -> str:
        return self.fetch_attributes(config, **kwargs)

    def _arun(self, config: RunnableConfig, **kwargs) -> str:
        return self.afetch_attributes(config, **kwargs)
