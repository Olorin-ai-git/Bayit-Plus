import logging

from fastapi import FastAPI

from app.router import agent_router
from app.service.agent.agent import create_and_get_agent_graph

logger = logging.getLogger(__name__)

# TODO add standard authz checks for AAL level and fradulent users


async def initialize_agent(app: FastAPI):
    # Initialize the graph.
    app.state.graph = create_and_get_agent_graph()
    logger.info("Graph initialized")
    app.include_router(agent_router.router)
