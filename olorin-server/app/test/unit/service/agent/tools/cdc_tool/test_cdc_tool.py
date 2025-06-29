from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.service.agent.tools.cdc_tool.cdc_tool import (
    CDCApi,
    CdcCompanyTool,
    CdcTool,
    CdcUserTool,
)


@pytest.fixture
def mock_headers():
    return {"Authorization": "Bearer test_token", "intuit-tid": "test-tid"}


@pytest.fixture
def mock_agent_context():
    mock_context = MagicMock()
    mock_context.get_header.return_value = {
        "Authorization": "Bearer test_token",
        "intuit-tid": "test-tid",
    }

    # Setup auth context
    mock_auth_context = MagicMock()
    mock_auth_context.intuit_user_id = "test-user-id"
    mock_auth_context.intuit_realmid = "test-realm-id"
    mock_context.intuit_header.auth_context = mock_auth_context

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
def mock_cdc_response():
    return {
        "data": {
            "PersonAccount": {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john.doe@example.com",
            }
        }
    }


@pytest.fixture
def mock_cdc_company_response():
    return {
        "data": {
            "OrganizationAccount": {
                "name": "ACME Inc.",
                "industry": "Technology",
                "employeeCount": "100-500",
            }
        }
    }


class TestCDCApi:
    @patch("app.service.agent.tools.cdc_tool.cdc_tool.CDCService")
    def test_fetch_attribute_data_success(
        self, mock_cdc_service_class, mock_headers, mock_cdc_response
    ):
        # Arrange
        mock_service_instance = MagicMock()
        mock_service_instance.get_attributes_values.return_value = mock_cdc_response
        mock_cdc_service_class.return_value = mock_service_instance

        account_type = "PersonAccount"
        only_trusted_attrs = True
        userid = "test-user-id"
        realmid = "test-realm-id"
        attributes = ["firstName", "lastName", "email"]

        # Act
        result = CDCApi.fetch_attribute_data(
            headers=mock_headers,
            account_type=account_type,
            only_trusted_attrs=only_trusted_attrs,
            userid=userid,
            realmid=realmid,
            attributes=attributes,
        )

        # Assert
        mock_service_instance.get_attributes_values.assert_called_once_with(
            cdc_views_type=account_type,
            account_id=userid,
            attributes=attributes,
            with_metadata=only_trusted_attrs,
            with_trusted_only=only_trusted_attrs,
            auth_headers=mock_headers,
        )
        assert result == mock_cdc_response["data"][account_type]

    @patch("app.service.agent.tools.cdc_tool.cdc_tool.CDCService")
    def test_fetch_attribute_data_organization_account(
        self, mock_cdc_service_class, mock_headers, mock_cdc_company_response
    ):
        # Arrange
        mock_service_instance = MagicMock()
        mock_service_instance.get_attributes_values.return_value = (
            mock_cdc_company_response
        )
        mock_cdc_service_class.return_value = mock_service_instance

        account_type = "OrganizationAccount"
        only_trusted_attrs = True
        userid = "test-user-id"
        realmid = "test-realm-id"
        attributes = ["name", "industry", "employeeCount"]

        # Act
        result = CDCApi.fetch_attribute_data(
            headers=mock_headers,
            account_type=account_type,
            only_trusted_attrs=only_trusted_attrs,
            userid=userid,
            realmid=realmid,
            attributes=attributes,
        )

        # Assert
        mock_service_instance.get_attributes_values.assert_called_once_with(
            cdc_views_type=account_type,
            account_id=realmid,  # Should use realmid for OrganizationAccount
            attributes=attributes,
            with_metadata=only_trusted_attrs,
            with_trusted_only=only_trusted_attrs,
            auth_headers=mock_headers,
        )
        assert result == mock_cdc_company_response["data"][account_type]

    @patch("app.service.agent.tools.cdc_tool.cdc_tool.CDCService")
    def test_fetch_attribute_data_exception(self, mock_cdc_service_class, mock_headers):
        # Arrange
        mock_service_instance = MagicMock()
        mock_service_instance.get_attributes_values.side_effect = Exception(
            "CDC API error"
        )
        mock_cdc_service_class.return_value = mock_service_instance

        account_type = "PersonAccount"
        only_trusted_attrs = True
        userid = "test-user-id"
        realmid = "test-realm-id"
        attributes = ["firstName", "lastName", "email"]

        # Act & Assert
        with pytest.raises(Exception, match="CDC API error"):
            CDCApi.fetch_attribute_data(
                headers=mock_headers,
                account_type=account_type,
                only_trusted_attrs=only_trusted_attrs,
                userid=userid,
                realmid=realmid,
                attributes=attributes,
            )

    @pytest.mark.asyncio
    @patch("app.service.agent.tools.cdc_tool.cdc_tool.CDCServiceAsync")
    async def test_afetch_attribute_data_success(
        self, mock_cdc_service_class, mock_headers, mock_cdc_response
    ):
        # Arrange
        mock_service_instance = MagicMock()
        mock_service_instance.get_attributes_values_async = AsyncMock(
            return_value=mock_cdc_response
        )
        mock_cdc_service_class.return_value = mock_service_instance

        account_type = "PersonAccount"
        only_trusted_attrs = True
        userid = "test-user-id"
        realmid = "test-realm-id"
        attributes = ["firstName", "lastName", "email"]

        # Act
        result = await CDCApi.afetch_attribute_data(
            headers=mock_headers,
            account_type=account_type,
            only_trusted_attrs=only_trusted_attrs,
            userid=userid,
            realmid=realmid,
            attributes=attributes,
        )

        # Assert
        mock_service_instance.get_attributes_values_async.assert_called_once_with(
            cdc_views_type=account_type,
            account_id=userid,
            attributes=attributes,
            with_metadata=only_trusted_attrs,
            with_trusted_only=only_trusted_attrs,
            auth_headers=mock_headers,
        )
        assert result == mock_cdc_response["data"][account_type]

    @pytest.mark.asyncio
    @patch("app.service.agent.tools.cdc_tool.cdc_tool.CDCServiceAsync")
    async def test_afetch_attribute_data_exception(
        self, mock_cdc_service_class, mock_headers
    ):
        # Arrange
        mock_service_instance = MagicMock()
        mock_service_instance.get_attributes_values_async = AsyncMock(
            side_effect=Exception("CDC API error")
        )
        mock_cdc_service_class.return_value = mock_service_instance

        account_type = "PersonAccount"
        only_trusted_attrs = True
        userid = "test-user-id"
        realmid = "test-realm-id"
        attributes = ["firstName", "lastName", "email"]

        # Act & Assert
        with pytest.raises(Exception, match="CDC API error"):
            await CDCApi.afetch_attribute_data(
                headers=mock_headers,
                account_type=account_type,
                only_trusted_attrs=only_trusted_attrs,
                userid=userid,
                realmid=realmid,
                attributes=attributes,
            )


class TestCdcTool:
    @patch("app.service.agent.tools.cdc_tool.cdc_tool.CDCApi")
    def test_fetch_attributes(self, mock_cdc_api, mock_config, mock_cdc_response):
        # Arrange
        mock_cdc_api.fetch_attribute_data.return_value = mock_cdc_response["data"][
            "PersonAccount"
        ]

        # Create a concrete subclass instance for testing the abstract base class
        cdc_tool = MagicMock(spec=CdcTool)
        cdc_tool.account_type = "PersonAccount"
        cdc_tool.only_trusted_attrs = True
        cdc_tool.attributes = ["firstName", "lastName", "email"]
        cdc_tool.fetch_attributes = CdcTool.fetch_attributes.__get__(cdc_tool, CdcTool)

        # Act
        result = cdc_tool.fetch_attributes(mock_config)

        # Assert
        mock_cdc_api.fetch_attribute_data.assert_called_once_with(
            headers=mock_config["configurable"]["agent_context"].get_header(),
            account_type="PersonAccount",
            only_trusted_attrs=True,
            userid=mock_config["configurable"][
                "agent_context"
            ].intuit_header.auth_context.intuit_user_id,
            realmid=mock_config["configurable"][
                "agent_context"
            ].intuit_header.auth_context.intuit_realmid,
            attributes=["firstName", "lastName", "email"],
        )
        assert result == mock_cdc_response["data"]["PersonAccount"]

    @pytest.mark.asyncio
    @patch("app.service.agent.tools.cdc_tool.cdc_tool.CDCApi")
    async def test_afetch_attributes(
        self, mock_cdc_api, mock_config, mock_cdc_response
    ):
        # Arrange
        mock_cdc_api.afetch_attribute_data = AsyncMock(
            return_value=mock_cdc_response["data"]["PersonAccount"]
        )

        # Create a concrete subclass instance for testing the abstract base class
        cdc_tool = MagicMock(spec=CdcTool)
        cdc_tool.account_type = "PersonAccount"
        cdc_tool.only_trusted_attrs = True
        cdc_tool.attributes = ["firstName", "lastName", "email"]
        cdc_tool.afetch_attributes = CdcTool.afetch_attributes.__get__(
            cdc_tool, CdcTool
        )

        # Act
        result = await cdc_tool.afetch_attributes(mock_config)

        # Assert
        mock_cdc_api.afetch_attribute_data.assert_called_once_with(
            headers=mock_config["configurable"]["agent_context"].get_header(),
            account_type="PersonAccount",
            only_trusted_attrs=True,
            userid=mock_config["configurable"][
                "agent_context"
            ].intuit_header.auth_context.intuit_user_id,
            realmid=mock_config["configurable"][
                "agent_context"
            ].intuit_header.auth_context.intuit_realmid,
            attributes=["firstName", "lastName", "email"],
        )
        assert result == mock_cdc_response["data"]["PersonAccount"]


class TestCdcUserTool:
    @patch("app.service.agent.tools.cdc_tool.cdc_tool.CdcUserTool.fetch_attributes")
    def test_run(self, mock_fetch_attributes, mock_config, mock_cdc_response):
        # Arrange
        mock_fetch_attributes.return_value = mock_cdc_response["data"]["PersonAccount"]
        tool = CdcUserTool()

        # Act
        result = tool._run(config=mock_config)

        # Assert
        mock_fetch_attributes.assert_called_once_with(mock_config)
        assert result == mock_cdc_response["data"]["PersonAccount"]

        # Verify the tool's configuration
        assert tool.account_type == "PersonAccount"
        assert tool.only_trusted_attrs is True
        assert len(tool.attributes) > 0  # Should have some attributes defined

    @pytest.mark.asyncio
    @patch("app.service.agent.tools.cdc_tool.cdc_tool.CdcUserTool.afetch_attributes")
    async def test_arun(self, mock_afetch_attributes, mock_config, mock_cdc_response):
        # Arrange
        mock_afetch_attributes.return_value = mock_cdc_response["data"]["PersonAccount"]
        tool = CdcUserTool()

        # Act
        result = await tool._arun(config=mock_config)

        # Assert
        mock_afetch_attributes.assert_called_once_with(mock_config)
        assert result == mock_cdc_response["data"]["PersonAccount"]


class TestCdcCompanyTool:
    @patch("app.service.agent.tools.cdc_tool.cdc_tool.CdcCompanyTool.fetch_attributes")
    def test_run(self, mock_fetch_attributes, mock_config, mock_cdc_company_response):
        # Arrange
        mock_fetch_attributes.return_value = mock_cdc_company_response["data"][
            "OrganizationAccount"
        ]
        tool = CdcCompanyTool()

        # Act
        result = tool._run(config=mock_config)

        # Assert
        mock_fetch_attributes.assert_called_once_with(mock_config)
        assert result == mock_cdc_company_response["data"]["OrganizationAccount"]

        # Verify the tool's configuration
        assert tool.account_type == "OrganizationAccount"
        assert tool.only_trusted_attrs is True
        assert len(tool.attributes) > 0  # Should have some attributes defined

    @pytest.mark.asyncio
    @patch("app.service.agent.tools.cdc_tool.cdc_tool.CdcCompanyTool.afetch_attributes")
    async def test_arun(
        self, mock_afetch_attributes, mock_config, mock_cdc_company_response
    ):
        # Arrange
        mock_afetch_attributes.return_value = mock_cdc_company_response["data"][
            "OrganizationAccount"
        ]
        tool = CdcCompanyTool()

        # Act
        result = await tool._arun(config=mock_config)

        # Assert
        mock_afetch_attributes.assert_called_once_with(mock_config)
        assert result == mock_cdc_company_response["data"]["OrganizationAccount"]
