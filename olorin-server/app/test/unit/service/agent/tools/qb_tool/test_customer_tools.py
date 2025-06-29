from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.runnables.config import RunnableConfig

from app.service.agent.tools.qb_tool.customer_tools import ListCustomersTool


@pytest.fixture
def mock_agent_context():
    mock_context = MagicMock()
    mock_context.get_header.return_value = {
        "Authorization": "Bearer test_token",
        "olorin-tid": "test-tid",
    }
    return mock_context


@pytest.fixture
def mock_config(mock_agent_context):
    return {
        "configurable": {
            "agent_context": mock_agent_context,
            "thread_id": "test-thread-id",
        }
    }


@pytest.fixture
def mock_customers_data():
    return {
        "data": {
            "contacts": {
                "data": [
                    {
                        "id": "1",
                        "firstName": "John",
                        "lastName": "Doe",
                        "displayName": "John Doe",
                        "companyName": "ACME Inc.",
                        "extraField": "should_be_filtered",
                    },
                    {
                        "id": "2",
                        "firstName": "Jane",
                        "lastName": "Smith",
                        "displayName": "Jane Smith",
                        "companyName": "XYZ Corp",
                        "extraField": "should_be_filtered",
                    },
                ]
            }
        }
    }


@pytest.fixture
def expected_filtered_customers():
    return [
        {
            "id": "1",
            "firstName": "John",
            "lastName": "Doe",
            "displayName": "John Doe",
            "companyName": "ACME Inc.",
        },
        {
            "id": "2",
            "firstName": "Jane",
            "lastName": "Smith",
            "displayName": "Jane Smith",
            "companyName": "XYZ Corp",
        },
    ]


class TestListCustomersTool:
    @patch("app.service.agent.tools.qb_tool.customer_tools.FinancialService")
    def test_run(
        self,
        mock_financial_service_class,
        mock_config,
        mock_customers_data,
        expected_filtered_customers,
    ):
        # Arrange
        mock_financial_service_instance = MagicMock()
        mock_financial_service_instance.get_customers_sync.return_value = mock_customers_data
        mock_financial_service_class.return_value = mock_financial_service_instance

        tool = ListCustomersTool()

        # Act
        result = tool._run(tool_input="", config=mock_config)

        # Assert
        mock_financial_service_instance.get_customers_sync.assert_called_once_with(
            mock_config["configurable"]["agent_context"].get_header()
        )
        assert result == expected_filtered_customers
        assert len(result) == 2
        assert "extraField" not in result[0]
        assert "extraField" not in result[1]

    @pytest.mark.asyncio
    @patch("app.service.agent.tools.qb_tool.customer_tools.FinancialService")
    async def test_arun_success(
        self,
        mock_financial_service_class,
        mock_config,
        mock_customers_data,
        expected_filtered_customers,
    ):
        # Arrange
        mock_financial_service_instance = MagicMock()
        mock_financial_service_instance.get_customers = AsyncMock(
            return_value=mock_customers_data
        )
        mock_financial_service_class.return_value = mock_financial_service_instance

        tool = ListCustomersTool()

        # Act
        result = await tool._arun(config=mock_config)

        # Assert
        mock_financial_service_instance.get_customers.assert_called_once_with(
            mock_config["configurable"]["agent_context"].get_header()
        )
        assert result == expected_filtered_customers
        assert len(result) == 2
        assert "extraField" not in result[0]
        assert "extraField" not in result[1]

    @pytest.mark.asyncio
    @patch("app.service.agent.tools.qb_tool.customer_tools.FinancialService")
    async def test_arun_without_config(self, mock_financial_service_class):
        # Arrange
        tool = ListCustomersTool()

        # Act & Assert
        with pytest.raises(ValueError, match="Config is required but was not provided"):
            await tool._arun(config=None)

    @pytest.mark.asyncio
    @patch("app.service.agent.tools.qb_tool.customer_tools.FinancialService")
    async def test_arun_invalid_response(self, mock_financial_service_class, mock_config):
        # Arrange
        mock_financial_service_instance = MagicMock()
        mock_financial_service_instance.get_customers = AsyncMock(return_value=None)
        mock_financial_service_class.return_value = mock_financial_service_instance

        tool = ListCustomersTool()

        # Act & Assert
        with pytest.raises(ValueError, match="Invalid response from financial service"):
            await tool._arun(config=mock_config)

    @pytest.mark.asyncio
    @patch("app.service.agent.tools.qb_tool.customer_tools.FinancialService")
    async def test_arun_empty_customers(self, mock_financial_service_class, mock_config):
        # Arrange
        mock_financial_service_instance = MagicMock()
        mock_financial_service_instance.get_customers = AsyncMock(
            return_value={"data": {"contacts": {"data": []}}}
        )
        mock_financial_service_class.return_value = mock_financial_service_instance

        tool = ListCustomersTool()

        # Act
        result = await tool._arun(config=mock_config)

        # Assert
        assert result == []

    @pytest.mark.asyncio
    @patch("app.service.agent.tools.qb_tool.customer_tools.FinancialService")
    async def test_arun_exception(self, mock_financial_service_class, mock_config):
        # Arrange
        mock_financial_service_instance = MagicMock()
        mock_financial_service_instance.get_customers = AsyncMock(
            side_effect=Exception("Test error")
        )
        mock_financial_service_class.return_value = mock_financial_service_instance

        tool = ListCustomersTool()

        # Act & Assert
        with pytest.raises(ValueError, match="Failed to list customers: Test error"):
            await tool._arun(config=mock_config)
