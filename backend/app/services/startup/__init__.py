"""
Startup module for Bayit+ Backend.

This module handles all initialization tasks that run when the server starts:
- Widget seeding (default system widgets)
- Culture seeding (default Israeli culture)
- Background task management
- Configuration validation
"""

from app.services.startup.background_tasks import (start_background_tasks,
                                                   stop_background_tasks)
from app.services.startup.culture_seeder import init_default_cultures
from app.services.startup.widget_seeder import init_default_widgets

__all__ = [
    "init_default_widgets",
    "init_default_cultures",
    "start_background_tasks",
    "stop_background_tasks",
]
