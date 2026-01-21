"""
Minimal stub for the agents package to allow the server to start.
This is a temporary workaround for the missing internal agents framework.
"""

from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, Generic, List, Optional, TypeVar

T = TypeVar("T")


class Agent(ABC, Generic[T]):
    """Minimal Agent base class stub"""

    def __init__(
        self,
        name: str,
        instructions: str,
        tools: Optional[List[Any]] = None,
        model: str = "gpt-4",
        **kwargs,
    ):
        self.name = name
        self.instructions = instructions
        self.tools = tools or []
        self.model = model

    @abstractmethod
    async def connect(self) -> None:
        """Connect to the agent's backend service"""
        pass

    async def disconnect(self) -> None:
        """Disconnect from the agent's backend service"""
        pass


def function_tool(func: Callable) -> Callable:
    """Decorator to mark a function as a tool"""
    # For now, just return the function as-is
    return func
