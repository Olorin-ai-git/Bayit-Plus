import asyncio
import copy
import logging
from typing import Any, Dict, Optional

import aiohttp

from app.models.upi_response import InteractionsResponse
from app.service.config import get_settings_for_env
from app.service.error_handling import UPIServiceException

logger = logging.getLogger(__name__)
settings_for_env = get_settings_for_env()


class UPIConversationHistoryClient:
    """
    UPIClient is responsible for interacting with the UPIservice.
    This class provides methods to perform operations related to UPI interactions, such as sending
    requests to the UPI service and handling responses. It abstracts the details of making HTTP
    requests and processing the results, allowing other parts of the application to use UPI services
    without dealing with the underlying network communication.
    Attributes:
        session (aiohttp.ClientSession): An asynchronous HTTP client session used for making requests.
        base_url (str): The base URL for the UPI service interactions endpoint.
    """

    DEFAULT_PAGE_LIMIT = 50
    DEFAULT_UPI_CLIENT_TIMEOUT = 60
    session: Optional[aiohttp.ClientSession] = None
    _lock = asyncio.Lock()

    @classmethod
    async def get_session(cls) -> aiohttp.ClientSession:
        """
        Get or create the aiohttp ClientSession in a thread-safe manner.
        """
        if cls.session is None:
            async with cls._lock:
                if cls.session is None:
                    cls.session = aiohttp.ClientSession(
                        timeout=aiohttp.ClientTimeout(
                            total=cls.DEFAULT_UPI_CLIENT_TIMEOUT
                        )
                    )
        return cls.session

    @classmethod
    async def send_request(
        cls,
        method: str,
        endpoint: str,
        headers: Dict[str, str],
        data: Any = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """
        Send an HTTP request to the UPI service.
        Args:
            method (str): The HTTP method to use (e.g., 'GET').
            endpoint (str): The API endpoint to call.
            headers (Dict[str, str]): The headers to include in the request.
            data (Any, optional): The data to include in the request body (for POST/PUT requests).
            params (Optional[Dict[str, Any]], optional): The query parameters to include in the request.
        Returns:
            Any: The response from the UPI service.
        Raises:
            UPIServiceException: If there is an error in the API communication.
        """
        upi_base_url = settings_for_env.upi_history_conversation_api_config.upi_base_url
        upi_path = settings_for_env.upi_history_conversation_api_config.upi_path
        url = f"{upi_base_url}/{upi_path}/{endpoint}"
        session = await cls.get_session()
        try:
            if method.upper() == "GET":
                async with session.get(url, headers=headers, params=params) as response:
                    if response.status != 200:
                        _resp = await response.text()
                        logger.warning(
                            f"Non 200 response from server calling {url}, received response_body {_resp}"
                        )
                        response.raise_for_status()
                    result: Any = await response.json()
                    logger.debug(
                        f"GET request to UPI successful url={url};result={result}"
                    )
            else:
                raise ValueError("Unsupported HTTP method")

            return result
        except Exception as e:
            logger.error(f"Error in UPI request url={url};;error={e}")
            raise UPIServiceException(f"Error in UPI request url={url};;error={e}")

    @classmethod
    async def call_upi_service(
        cls,
        experience_id: str,
        agent_name: str,
        olorin_headers: Dict[str, str],
        after: Optional[str] = None,
        limit: Optional[int] = None,
        filter: Optional[str] = None,
    ) -> InteractionsResponse:
        """
        Fetch interactions from the UPI service with pagination support.
        Args:
            experience_id (str): Unique identifier for the experience
            agent_name (str): Name of the agent
            olorin_headers (Dict[str, str]): Headers required for Olorin authentication
            after (Optional[str]): Pagination token for fetching next set of results
            limit (Optional[int]): Maximum number of interactions to fetch
            filter_param (Optional[str]): Filter criteria for the interactions
        Returns:
            InteractionsResponse: Object containing fetched interactions and metadata
        Raises:
            UPIServiceException: If there's an error in API communication
        """

        endpoint = cls._build_endpoint(experience_id, agent_name)
        params = {"filter": filter} if filter else {}

        limit = cls._get_effective_limit(limit)

        interaction_response: InteractionsResponse = (
            await cls._fetch_paginated_interactions(
                endpoint=endpoint, headers=olorin_headers, params=params, limit=limit
            )
        )

        return interaction_response

    @staticmethod
    def _build_endpoint(experience_id: str, agent_name: str) -> str:
        """
        Construct the API endpoint URL.
        Args:
            experience_id (str): Unique identifier for the experience.
            agent_name (str): Name of the agent.
        Returns:
            str: The constructed API endpoint URL.
        """
        return f"agents/{agent_name}"

    @staticmethod
    def _get_effective_limit(limit: Optional[int]) -> Optional[int]:
        """
        Determine the effective limit for pagination.
        Args:
            limit (Optional[int]): The specified limit for pagination.
        Returns:
            Optional[int]: The effective limit for pagination.
        """
        return (
            limit or UPIConversationHistoryClient.DEFAULT_PAGE_LIMIT
            if get_settings_for_env().upi_history_conversation_api_config.upi_mock_response
            else limit
        )

    @classmethod
    async def _fetch_paginated_interactions(
        cls,
        endpoint: str,
        headers: Dict[str, str],
        params: Dict[str, str],
        limit: Optional[int],
    ) -> InteractionsResponse:
        """
        Fetch interactions with pagination support.
        Continuously fetches interactions until either:
        1. The specified limit is reached
        2. No more pages are available
        """
        final_interactions = InteractionsResponse()
        count = 0

        while True:
            # Calculate remaining items to fetch
            if limit:
                params["limit"] = limit - count

            # Fetch current page
            response = await cls.send_request(
                method="GET", endpoint=endpoint, headers=headers, params=params
            )

            # Parse and process response
            try:
                page_interactions = InteractionsResponse.model_validate(response)
            except Exception as e:
                raise UPIServiceException(
                    f"Failed to parse UPI interactions response: {response}. Error: {e}"
                )

            # Update accumulated results
            final_interactions.interactions.extend(page_interactions.interactions)
            final_interactions.links = page_interactions.links
            count += page_interactions.count
            final_interactions.count = count

            if cls._should_terminate_pagination(limit, count, page_interactions):
                break

            params["after"] = page_interactions.links.next

        return final_interactions

    @staticmethod
    def _should_terminate_pagination(
        limit: Optional[int], count: int, page_interactions: InteractionsResponse
    ) -> bool:
        """
        Determine whether to terminate pagination.
        Args:
            limit (Optional[int]): The specified limit for pagination.
            count (int): The current count of fetched interactions.
            page_interactions (InteractionsResponse): The interactions fetched in the current page.
        Returns:
            bool: True if pagination should be terminated, False otherwise.
        """
        if limit and count >= limit:
            return True
        if not (page_interactions.links and page_interactions.links.next):
            return True
        return False
