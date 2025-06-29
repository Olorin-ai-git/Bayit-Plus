import logging

from fastapi import FastAPI

from app.router import agent_router
from app.service.agent.agent import create_and_get_agent_graph

logger = logging.getLogger(__name__)

# TODO add standard authz checks for AAL level and fradulent users


async def initialize_agent(app: FastAPI):
    # Initialize both parallel and sequential graphs
    app.state.graph_parallel = create_and_get_agent_graph(parallel=True)
    app.state.graph_sequential = create_and_get_agent_graph(parallel=False)
    logger.info("Both parallel and sequential graphs initialized")
    app.include_router(agent_router.router)
