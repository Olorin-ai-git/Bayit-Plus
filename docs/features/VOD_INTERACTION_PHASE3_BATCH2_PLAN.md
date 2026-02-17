# VOD Interaction Phase 3 - Batch 2 (WS1+WS2) Implementation Plan

## Files to Create

1. `app/services/vod_interaction/voice_interaction_handler.py` - Voice pipeline orchestrator
2. `app/api/routes/websocket_vod_interaction.py` - WebSocket endpoint for voice interaction
3. `app/services/vod_interaction/scene_analyzer.py` - Scene analysis for avatar placement
4. `app/api/routes/vod_interaction_admin.py` - Admin endpoints for batch scene analysis

## Files to Modify

5. `app/api/router_registry.py` - Register new routers

## Key Dependencies

- enhanced_asr_service from `app.services.zeh_ani.enhanced_asr_service`
- character_ai_service from `app.services.vod_interaction.character_ai`
- character_animator_service from `app.services.vod_interaction.character_animator`
- credit_service from `app.services.beta.credit_service`
- storage_service from `app.core.storage`
- ffmpeg_service from `app.services.ffmpeg.service`
- biometric_consent_service from `app.services.zeh_ani.biometric_consent_service`
- require_admin from `app.api.routes.admin.auth`

## Status: IMPLEMENTING
