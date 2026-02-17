# Batch 3: WS3+WS4 Backend Services Implementation Plan

## Files to Create
1. `app/services/vod_interaction/multi_character_ai.py` - Multi-character AI response generation
2. `app/services/vod_interaction/multi_character_handler.py` - Orchestration for multi-character interactions
3. `app/api/routes/vod_interaction_multi.py` - REST endpoint for multi-character messages
4. `app/services/vod_interaction/shared_interaction_service.py` - Shared interactive sessions
5. `app/api/routes/vod_interaction_shared.py` - REST endpoints for shared sessions

## Files to Modify
6. `app/services/connection_manager.py` - Add broadcast_interaction_event method
7. `app/services/vod_interaction/reel_compositor.py` - Add generate_shared_reel method
8. `app/services/vod_interaction/interaction_service.py` - Add process_multi_character_message delegation
9. `app/api/router_registry.py` - Register new routers
10. `app/services/vod_interaction/__init__.py` - Export new services

## Key Patterns
- Module-level singleton instances
- get_logger(__name__) for structured logging
- settings from app.core.config for all configuration
- get_anthropic_client() for AI calls
- credit_service for credit management
- connection_manager for WebSocket broadcasts
