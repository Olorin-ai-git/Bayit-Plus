"""Tools for doing actions in financial domain using Financial Service APIs."""

import asyncio
import copy
import json
import logging
from logging import getLogger
from typing import Any, Dict

import httpx

from app.service.config import get_settings_for_env
from app.service.error_handling import FinancialApiError

from .payload_get_customer import payload_get_customer
from .payload_get_customers import payload_get_customers

logger = logging.getLogger(__name__)


def get_ceres_url():
    return "{}/graphql".format(get_settings_for_env().ceres_endpoint)


async def _execute_post_request(url: str, headers: dict, body: dict):
    try:
        async with httpx.AsyncClient() as client:
            logger.debug(f"Financial tool: headers: {headers}")
            logger.debug(f"_execute_post_request: URL and body : {url} + {body}")
            response = await client.post(url, json=body, headers=headers)
            logger.debug(f"_execute_post_request: response : {response}")
            response.raise_for_status()
        return json.loads(response.content)
    except Exception as e:
        raise e


def _execute_post_request_sync(url: str, headers: dict, body: dict):
    try:
        with httpx.Client() as client:
            logger.debug(f"Financial tool: headers: {headers}")
            logger.debug(f"Financial tool: URL and body : {url} + {body}")
            response = client.post(url, json=body, headers=headers)
            response.raise_for_status()
        return json.loads(response.content)
    except Exception as e:
        raise e


class FinancialService:
    def __init__(self):
        pass

    def get_customers_sync(self, headers) -> Any | None:
        """Synchronous version of get_customers"""
        logger.info("Financial tool: calling sync get_customers API (sync)")
        try:
            payload = copy.deepcopy(payload_get_customers)
            response = _execute_post_request_sync(
                get_ceres_url(), headers=headers, body=payload
            )
            logger.debug(f"Financial tool: get_customers API response: {response}")
            return response
        except Exception as e:
            logger.error(f"Financial tool: get_customers API failed: {e}")
            return None

    async def get_customers(self, headers) -> Any | None:
        logger.info("Financial tool: calling get_customers API")
        try:
            payload = copy.deepcopy(payload_get_customers)
            logger.debug(
                f"get_customers : url {get_ceres_url()} + headers {headers} + body {payload}"
            )

            response = await _execute_post_request(
                get_ceres_url(), headers=headers, body=payload
            )
            logger.debug(f"Financial tool: get_customers API response: {response}")
            return response
        except Exception as e:
            logger.error(f"Financial tool: get_customers API failed: {e}")
            return None

    @staticmethod
    def raise_exception_on_error(message, response):
        if "errors" in response:
            raise FinancialApiError(
                {
                    "message": f"Financial API error {message}",
                    "financial_error": response["errors"][0],
                }
            )
