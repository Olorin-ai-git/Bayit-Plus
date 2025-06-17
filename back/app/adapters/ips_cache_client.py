"""Implementation of IPSCacheClient to interact with IPS Cache (Redis-based)."""

import logging
from typing import Any, Dict, List

import aiohttp

from app.service.config import get_settings, get_settings_for_env

logger = logging.getLogger(__name__)
settings_for_env = get_settings_for_env()


def get_ips_cache_base_url() -> str:
    return "{}/v1/cache".format(get_settings_for_env().ips_base_url)


class IPSCacheClient:
    """Client for interacting with the IPS Cache (Redis-based)."""

    def __init__(self):
        self.base_url = get_ips_cache_base_url()

    async def _send_request(
        self,
        method: str,
        endpoint: str,
        data=None,
        olorin_header: dict[str, Any] = None,
    ):
        # TODO: Refactor to pass headers as parameter instead of building them inside the client

        url = f"{self.base_url}/{endpoint}"
        try:
            async with aiohttp.ClientSession() as session:
                if method == "GET":
                    async with session.get(url, headers=olorin_header) as response:
                        response.raise_for_status()
                        result = await response.json()
                        logger.debug(
                            f"GET request to IPS Cache successful url={url};result={result}"
                        )
                elif method == "POST":
                    async with session.post(
                        url, headers=olorin_header, json=data
                    ) as response:
                        response.raise_for_status()
                        result = await response.json()
                        logger.debug(
                            f"Post request to IPS Cache successful url={url};data={data};result={result}"
                        )
                else:
                    raise ValueError("Unsupported HTTP method")

                if isinstance(result, list):
                    return [item.get("result", item.get("error")) for item in result]
                else:
                    if "error" in result:
                        raise Exception(result["error"])
                    return result["result"]
        except Exception as e:
            logger.error(f"Error in IPS Cache request url={url};data={data};error={e}")
            raise e

    async def hset(
        self, key: str, data: List[Any], olorin_header: dict[str, Any] = None
    ):
        data_as_list = ["HSET", key] + data
        await self._send_request(
            method="POST", endpoint="", data=data_as_list, olorin_header=olorin_header
        )

    async def expire(
        self, key: str, seconds: int, olorin_header: dict[str, Any] = None
    ):
        await self._send_request(
            method="POST",
            endpoint="",
            data=["EXPIRE", key, seconds],
            olorin_header=olorin_header,
        )

    async def zadd(
        self,
        zset_name: str,
        score: float,
        key: str,
        olorin_header: dict[str, Any] = None,
    ):
        await self._send_request(
            method="POST",
            endpoint="",
            data=["ZADD", zset_name, score, key],
            olorin_header=olorin_header,
        )

    async def hgetall(
        self, key: str, olorin_header: dict[str, Any] = None
    ) -> Dict[str, Any]:
        endpoint = f"hgetall/{key}"
        return await self._send_request(
            method="GET", endpoint=endpoint, data=None, olorin_header=olorin_header
        )

    async def zscan(
        self,
        zset_name: str,
        cursor: int = 0,
        count: int = 2000,
        olorin_header: dict[str, Any] = None,
    ) -> List[str]:
        matching_keys = []
        while True:
            endpoint = f"zscan/{zset_name}/{cursor}/COUNT/{count}"
            result = await self._send_request(
                method="GET", endpoint=endpoint, data=None, olorin_header=olorin_header
            )
            cursor, keys = result
            matching_keys.extend(keys)
            if cursor is None:
                break
        return [
            matching_keys[i] for i in range(0, len(matching_keys), 2)
        ]  # Remove scores from the keys

    async def pipeline(
        self, commands: List[List[Any]], olorin_header: dict[str, Any] = None
    ):
        try:
            if commands is None or not commands:
                return []
            pipeline_output = await self._send_request(
                "POST", "pipeline", commands, olorin_header
            )
            logger.debug(f"pipeline_output={pipeline_output}")
            return pipeline_output
        except Exception as e:
            raise e
