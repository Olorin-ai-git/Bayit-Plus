"""Startup module for Station-AI backend initialization."""

from app.startup.lifespan import lifespan
from app.startup.database import init_database
from app.startup.routers import register_routers

__all__ = ["lifespan", "init_database", "register_routers"]
