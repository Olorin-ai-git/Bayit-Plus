"""
Router registry for Bayit+ Backend.

This module organizes and registers all API routers with the FastAPI application.
Routers are grouped by category for better organization and maintainability.
"""

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse

from app.core.config import settings

logger = logging.getLogger(__name__)


def register_all_routers(app: FastAPI) -> None:
    """
    Register all API routers with the FastAPI application.

    Routers are organized by category:
    - Health: Health check endpoints
    - Auth: Authentication and authorization
    - Content: Content management and playback
    - Admin: Administration endpoints
    - WebSocket: Real-time communication
    - Features: Additional feature endpoints
    """
    prefix = settings.API_V1_PREFIX

    # Import all routers
    from app.api.endpoints import (analytics_router, tts_router, voice_router,
                                   wake_word_router)
    from app.api.endpoints.continue_watching import router as continue_watching_router
    # Import search sub-routers
    from app.api.routes import search_client, search_history
    from app.api.routes import (account_linking, admin, admin_audiobooks, admin_categories,
                                admin_content_importer, admin_content_vod_read,
                                admin_content_vod_toggles,
                                admin_content_vod_write, admin_cultures,
                                admin_documentary_import, admin_trailer_extraction,
                                admin_kids_content, admin_live_channels,
                                admin_podcast_episodes, admin_podcasts,
                                admin_radio_stations, admin_subtitle_sync, admin_taxonomy,
                                admin_uploads, admin_widgets,
                                admin_youngsters_content, audiobooks,
                                auth, auth_proxy, avatar_dialogue, avatar_studio, chapters, chat,
                                mfa, mobile_auth,
                                channel_chat, chess, chess_chat, chess_invite, children, content, content_taxonomy,
                                cultures, device_pairing, device_pairing_proxy, devices,
                                diagnostics, direct_messages, downloads, dubbing, epg,
                                extension_config,
                                extension_subscriptions,
                                family_controls, favorites, friends, health,
                                history, household, iap_verification,
                                jerusalem, judaism, librarian, live,
                                live_dubbing, live_quota, location, location_consent, media_proxy, news, nlp,
                                notifications,
                                onboarding, onboarding_tour, party, password_reset, payments,
                                playback_session, podcasts, profile_controls, profile_stats,
                                profiles, profiles_me, profiles_preferences, user_settings,
                                radio,
                                ritual, search,
                                security_settings,
                                search_analytics, search_llm, search_scenes,
                                search_suggestions, stats, subscriptions,
                                subtitle_preferences, support,
                                synced_streams,
                                tel_aviv, trending, trivia,
                                user_account, user_system_widgets, users, verification,
                                playlist, voice, watchlist, webauthn,
                                widget_toggle, widgets, youngsters, zman,
                                vod_interactions, vod_interaction_reels,
                                vod_interaction_multi, vod_interaction_shared,
                                admin_interactive_moments,
                                admin_voice_clone_preview,
                                admin_voice_cloning,
                                vod_interaction_admin,
                                vod_interaction_pause_ask)
    from app.api.routes.admin.recordings import \
        router as admin_recordings_router
    # Quiz and rewards routes
    from app.api.routes import quiz, rewards
    # Cultural context user routes (Hebrew engagement)
    from app.api.routes import cultural_context_user
    # Comprehension quiz routes
    from app.api.routes import comprehension
    from app.api.routes.olorin import legacy_router as olorin_legacy_router
    from app.api.routes.olorin import router as olorin_router
    # Subtitle routes (split into 3 files per 200-line limit)
    from app.api.routes import subtitles_cues, subtitles_tracks, subtitles_translation
    # BYOC Enrichment routes (Bring Your Own Content)
    from app.api.routes import byoc_enrichment
    # BYOC Normalization routes (AI-powered channel matching & dedup)
    from app.api.routes import byoc_normalization
    # VTT streaming endpoint for native tracks (AirPlay/Chromecast)
    from app.api.v1.endpoints import subtitles as subtitles_vtt
    # VOD Audio Tracks routes (AI-generated audio dubbing)
    from app.api.routes import vod_audio_tracks
    # Beta 500 routes
    from app.api.routes.beta import signup, credits, sessions, status
    # Feature validation routes
    from app.api.routes.features import validation as features_validation
    # Mission and gamification routes (Hebrew engagement)
    from app.api.routes.missions import missions_core, shekels, leaderboard, zine, coupons
    # Talk Back routes (Hebrew voice interactivity)
    from app.api.routes.talk_back import talk_back_core, talk_back_admin, talk_back_dashboard
    # Bilingual dubbing routes (progressive Hebrew/English)
    from app.api.routes import bilingual_dubbing
    # Star in Story routes (generative personalized episodes)
    from app.api.routes.star_story import star_story_core, star_story_admin, star_story_episodes
    # Interactive Mission routes (Atzmi Ba'Sipur)
    from app.api.routes.interactive_mission import mission_core as im_core
    from app.api.routes.interactive_mission import mission_play as im_play
    from app.api.routes import avatar_outfits, family_snaps
    # Phonetic Mirror routes (Perfected Voice)
    from app.api.routes.phonetic_mirror import mirror_core as pm_core
    # Gamification routes (Level Progression)
    from app.api.routes.gamification import level_routes as gamification_routes
    # Grandparent Bridge routes (news clips, sharing, voice notes)
    from app.api.routes.grandparent_bridge import bridge_core as gp_bridge
    # Chameleon Engine routes (visual style transfer)
    from app.api.routes.chameleon import style_routes as chameleon_routes
    # Zeh Ani routes (Creatify avatar, biometric consent, V2V, identity engine)
    from app.api.routes.zeh_ani import avatar_routes as za_avatar
    from app.api.routes.zeh_ani import avatar_management_routes as za_avatar_mgmt
    from app.api.routes.zeh_ani import consent_routes as za_consent
    from app.api.routes.zeh_ani import v2v_routes as za_v2v
    # Zeh Ani Phase 3+4 routes (triggers, mirror, highlights, WhatsApp)
    from app.api.routes.zeh_ani import trigger_routes as za_triggers
    from app.api.routes.zeh_ani import mirror_routes as za_mirror
    from app.api.routes.zeh_ani import highlight_routes as za_highlights
    from app.api.routes.zeh_ani import whatsapp_routes as za_whatsapp
    # Movie Interactions Hub (Zeh Ani Phase 4)
    from app.api.routes import movie_interactions
    # Device code authentication routes (TV login - RFC 8628)
    from app.api.routes import device_code
    # Internal cron endpoints (Cloud Scheduler)
    # Discover tab config (AI features hub)
    from app.api.routes import discover
    from app.api.routes import discover_characters

    # ============================================
    # Health Check Routes (no prefix)
    # ============================================
    app.include_router(health.router)
    logger.debug("Registered health routes")

    # ============================================
    # Proxy Service Endpoints (Backend-only credentials)
    # ============================================
    app.include_router(tts_router, tags=["tts-proxy"])
    app.include_router(wake_word_router, tags=["wake-word-proxy"])
    app.include_router(analytics_router, tags=["analytics-proxy"])
    app.include_router(voice_router, tags=["voice-proxy"])
    logger.debug("Registered proxy service endpoints")

    # ============================================
    # Authentication Routes
    # ============================================
    app.include_router(auth.router, prefix=f"{prefix}/auth", tags=["auth"])
    app.include_router(auth_proxy.router, prefix=f"{prefix}/auth", tags=["auth-proxy"])
    app.include_router(
        mobile_auth.router,
        prefix=f"{prefix}/auth",
        tags=["auth-mobile"],
    )
    app.include_router(
        password_reset.router,
        prefix=f"{prefix}/auth/password-reset",
        tags=["password-reset"],
    )
    app.include_router(verification.router, prefix=prefix, tags=["verification"])
    app.include_router(
        device_pairing.router,
        prefix=f"{prefix}/auth/device-pairing",
        tags=["device-pairing"],
    )
    app.include_router(
        device_pairing_proxy.router,
        prefix=f"{prefix}/auth/device-pairing",
        tags=["device-pairing-v2"],
    )
    app.include_router(webauthn.router, prefix=f"{prefix}/webauthn", tags=["webauthn"])
    app.include_router(
        security_settings.router,
        prefix=f"{prefix}/auth",
        tags=["security-settings"],
    )
    app.include_router(
        mfa.router,
        prefix=f"{prefix}/auth",
        tags=["mfa"],
    )
    app.include_router(
        account_linking.router,
        prefix=f"{prefix}/auth",
        tags=["account-linking"],
    )
    app.include_router(
        device_code.router,
        prefix=f"{prefix}/auth/device-code",
        tags=["device-code"],
    )
    logger.debug("Registered auth routes")

    # ============================================
    # Payment Routes
    # ============================================
    app.include_router(
        payments.router,
        prefix=f"{prefix}/payments",
        tags=["payments"],
    )
    logger.debug("Registered payment routes")

    # ============================================
    # Content Routes
    # ============================================
    app.include_router(search.router, prefix=prefix, tags=["search"])
    app.include_router(search_client.router, prefix=prefix, tags=["search"])
    app.include_router(search_history.router, prefix=prefix, tags=["search", "history"])
    app.include_router(
        search_analytics.router, prefix=prefix, tags=["search", "analytics"]
    )
    app.include_router(
        search_suggestions.router, prefix=prefix, tags=["search", "suggestions"]
    )
    app.include_router(search_scenes.router, prefix=prefix, tags=["search", "scenes"])
    app.include_router(search_llm.router, prefix=prefix, tags=["search", "llm"])
    app.include_router(content.router, prefix=f"{prefix}/content", tags=["content"])
    app.include_router(
        content_taxonomy.router, prefix=prefix, tags=["content-taxonomy"]
    )
    app.include_router(live.router, prefix=f"{prefix}/live", tags=["live"])
    app.include_router(live_quota.router, prefix=prefix, tags=["live-quota"])
    app.include_router(radio.router, prefix=f"{prefix}/radio", tags=["radio"])
    app.include_router(podcasts.router, prefix=f"{prefix}/podcasts", tags=["podcasts"])
    app.include_router(audiobooks.router, prefix=f"{prefix}/audiobooks", tags=["audiobooks"])
    app.include_router(epg.router, prefix=f"{prefix}/epg", tags=["epg"])
    app.include_router(chapters.router, prefix=f"{prefix}/chapters", tags=["chapters"])
    app.include_router(subtitles_tracks.router, prefix=prefix, tags=["subtitles"])
    app.include_router(subtitles_cues.router, prefix=prefix, tags=["subtitles"])
    app.include_router(subtitles_translation.router, prefix=prefix, tags=["subtitles"])
    app.include_router(subtitles_vtt.router, prefix=f"{prefix}/subtitles", tags=["subtitles"])
    app.include_router(
        subtitle_preferences.router,
        prefix=f"{prefix}/subtitles",
        tags=["subtitle-preferences"],
    )
    app.include_router(
        vod_audio_tracks.router,
        prefix=prefix,
        tags=["vod-audio-tracks"],
    )
    app.include_router(
        byoc_enrichment.router, prefix=prefix, tags=["byoc-enrichment"]
    )
    app.include_router(
        byoc_normalization.router, prefix=prefix, tags=["byoc-normalization"]
    )
    app.include_router(trending.router, prefix=f"{prefix}/trending", tags=["trending"])
    app.include_router(
        media_proxy.router, prefix="/api", tags=["media-proxy", "transcode"]
    )
    logger.debug("Registered content routes")

    # ============================================
    # User Routes
    # ============================================
    app.include_router(
        subscriptions.router, prefix=f"{prefix}/subscriptions", tags=["subscriptions"]
    )
    app.include_router(
        iap_verification.router, prefix=f"{prefix}/subscriptions", tags=["subscriptions"]
    )
    app.include_router(
        extension_config.router, prefix=prefix, tags=["extension-config"]
    )
    app.include_router(
        extension_subscriptions.router, prefix=prefix, tags=["extension-subscriptions"]
    )
    app.include_router(
        watchlist.router, prefix=f"{prefix}/watchlist", tags=["watchlist", "deprecated"]
    )
    app.include_router(
        playlist.router, prefix=f"{prefix}/playlist", tags=["playlist"]
    )
    app.include_router(
        favorites.router, prefix=f"{prefix}/favorites", tags=["favorites"]
    )
    app.include_router(
        downloads.router, prefix=f"{prefix}/downloads", tags=["downloads"]
    )
    app.include_router(history.router, prefix=f"{prefix}/history", tags=["history"])
    app.include_router(
        continue_watching_router, prefix=f"{prefix}/user", tags=["user", "continue-watching"]
    )
    # IMPORTANT: Register /me routes BEFORE /{profile_id} to avoid path variable capture
    app.include_router(profiles_me.router, prefix=f"{prefix}/profiles", tags=["profiles"])
    app.include_router(profiles.router, prefix=f"{prefix}/profiles", tags=["profiles"])
    app.include_router(profiles_preferences.router, prefix=f"{prefix}/profiles", tags=["profiles"])
    app.include_router(user_settings.router, prefix=f"{prefix}/profiles", tags=["user-settings"])
    app.include_router(user_account.router, prefix=f"{prefix}/user", tags=["user-account"])
    app.include_router(children.router, prefix=f"{prefix}/children", tags=["children"])
    app.include_router(
        youngsters.router, prefix=f"{prefix}/youngsters", tags=["youngsters"]
    )
    app.include_router(
        family_controls.router, prefix=f"{prefix}/family", tags=["family-controls"]
    )
    app.include_router(
        profile_controls.router, prefix=prefix, tags=["profile-controls"]
    )
    app.include_router(
        household.router, prefix=f"{prefix}/household", tags=["household"]
    )
    app.include_router(users.router, prefix=f"{prefix}/users", tags=["users"])
    app.include_router(profile_stats.router, prefix=prefix, tags=["profile"])
    app.include_router(devices.router, prefix=f"{prefix}/devices", tags=["devices"])
    app.include_router(
        playback_session.router,
        prefix=f"{prefix}/playback/session",
        tags=["playback", "session"],
    )
    logger.debug("Registered user routes")

    # ============================================
    # Location Routes
    # ============================================
    app.include_router(location.router, prefix=prefix, tags=["location"])
    logger.debug("Registered location routes")
    app.include_router(location_consent.router, prefix=prefix, tags=["location-consent"])
    logger.debug("Registered location consent routes")

    # ============================================
    # Social Routes
    # ============================================
    app.include_router(chat.router, prefix=f"{prefix}/chat", tags=["chat"])
    app.include_router(voice.router, prefix=f"{prefix}/voice", tags=["voice"])
    app.include_router(friends.router, prefix=prefix, tags=["friends"])
    app.include_router(direct_messages.router, prefix=prefix, tags=["direct-messages"])
    app.include_router(stats.router, prefix=prefix, tags=["stats"])
    app.include_router(party.router, prefix=f"{prefix}/party", tags=["party"])
    app.include_router(chess.router, prefix=prefix, tags=["chess"])
    app.include_router(chess_invite.router, prefix=prefix, tags=["chess"])
    app.include_router(chess_chat.router, prefix=prefix, tags=["chess"])
    logger.debug("Registered social routes")

    # ============================================
    # Feature Routes
    # ============================================
    # Feature validation for iOS/tvOS (server-side security)
    app.include_router(
        features_validation.router,
        prefix=prefix,
        tags=["feature-validation"]
    )
    # IMPORTANT: Register widget_toggle BEFORE widgets to avoid routing conflicts
    # widget_toggle has specific routes at /widgets/toggle and /widgets/check-batch
    app.include_router(
        widget_toggle.router,
        prefix=prefix,
        tags=["widget-toggle"],
    )
    app.include_router(widgets.router, prefix=f"{prefix}/widgets", tags=["widgets"])
    app.include_router(
        user_system_widgets.router,
        prefix=f"{prefix}/widgets/system",
        tags=["user-system-widgets"],
    )
    app.include_router(zman.router, prefix=f"{prefix}/zman", tags=["zman"])
    app.include_router(ritual.router, prefix=prefix, tags=["ritual"])
    app.include_router(
        onboarding.router, prefix=f"{prefix}/onboarding/ai", tags=["ai-onboarding"]
    )
    app.include_router(
        onboarding_tour.router,
        prefix=f"{prefix}/onboarding",
        tags=["onboarding-tour"],
    )
    app.include_router(
        avatar_dialogue.router, prefix=prefix, tags=["avatar-dialogue"]
    )
    app.include_router(news.router, prefix=f"{prefix}/news", tags=["news"])
    app.include_router(support.router, prefix=f"{prefix}/support", tags=["support"])
    app.include_router(trivia.router, prefix=f"{prefix}/trivia", tags=["trivia"])
    app.include_router(
        notifications.router, prefix=f"{prefix}/notifications", tags=["notifications"]
    )
    app.include_router(quiz.router, prefix=f"{prefix}/quiz", tags=["quiz"])
    app.include_router(rewards.router, prefix=f"{prefix}/rewards", tags=["rewards"])
    app.include_router(comprehension.router, prefix=f"{prefix}/comprehension", tags=["comprehension"])
    app.include_router(
        cultural_context_user.router,
        prefix=prefix,
        tags=["cultural-context"],
    )
    app.include_router(
        discover.router, prefix=f"{prefix}/discover", tags=["discover"]
    )
    app.include_router(
        discover_characters.router,
        prefix=f"{prefix}/discover",
        tags=["discover-characters"],
    )
    logger.debug("Registered feature routes")

    # ============================================
    # Judaism Routes
    # ============================================
    app.include_router(judaism.router, prefix=f"{prefix}/judaism", tags=["judaism"])
    logger.debug("Registered judaism routes")

    # ============================================
    # Location Content Routes
    # ============================================
    app.include_router(
        jerusalem.router, prefix=f"{prefix}/jerusalem", tags=["jerusalem"]
    )
    app.include_router(tel_aviv.router, prefix=f"{prefix}/tel-aviv", tags=["tel-aviv"])
    app.include_router(cultures.router, prefix=f"{prefix}/cultures", tags=["cultures"])
    logger.debug("Registered location content routes")

    # ============================================
    # Admin Routes
    # ============================================
    app.include_router(admin.router, prefix=f"{prefix}/admin", tags=["admin"])
    app.include_router(diagnostics.router, prefix=prefix, tags=["diagnostics"])
    app.include_router(librarian.router, prefix=prefix, tags=["librarian"])
    app.include_router(
        admin_content_vod_read.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_content_vod_write.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_content_vod_toggles.router,
        prefix=f"{prefix}/admin",
        tags=["admin-content"],
    )
    app.include_router(
        admin_categories.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_live_channels.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_radio_stations.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_podcasts.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_podcast_episodes.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_audiobooks.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_content_importer.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_widgets.router, prefix=f"{prefix}/admin", tags=["admin-widgets"]
    )
    app.include_router(
        admin_uploads.router, prefix=f"{prefix}/admin", tags=["admin-uploads"]
    )
    app.include_router(
        admin_recordings_router, prefix=f"{prefix}/admin", tags=["admin-recordings"]
    )
    app.include_router(
        admin_kids_content.router, prefix=f"{prefix}/admin", tags=["admin-kids-content"]
    )
    app.include_router(
        admin_youngsters_content.router,
        prefix=f"{prefix}/admin",
        tags=["admin-youngsters-content"],
    )
    app.include_router(
        admin_cultures.router,
        prefix=f"{prefix}/admin/cultures",
        tags=["admin-cultures"],
    )
    app.include_router(
        admin_taxonomy.router, prefix=f"{prefix}/admin", tags=["admin-taxonomy"]
    )
    app.include_router(
        admin_documentary_import.router,
        prefix=f"{prefix}/admin",
        tags=["admin-documentary-import"],
    )
    app.include_router(
        admin_subtitle_sync.router, prefix=prefix, tags=["admin-subtitles"]
    )
    app.include_router(
        admin_trailer_extraction.router,
        prefix=f"{prefix}/admin",
        tags=["admin-trailer-extraction"],
    )
    app.include_router(
        avatar_studio.router, prefix=f"{prefix}/admin", tags=["admin-avatar-studio"]
    )
    logger.debug("Registered admin routes")

    # ============================================
    # VOD Avatar Interaction Routes
    # ============================================
    app.include_router(
        vod_interactions.router, prefix=prefix, tags=["vod-interactions"]
    )
    app.include_router(
        vod_interaction_reels.router, prefix=prefix, tags=["vod-interaction-reels"]
    )
    app.include_router(
        admin_interactive_moments.router, prefix=prefix, tags=["admin-interactive-moments"]
    )
    app.include_router(
        admin_voice_cloning.router, prefix=prefix, tags=["admin-voice-cloning"]
    )
    app.include_router(
        admin_voice_clone_preview.router,
        prefix=prefix,
        tags=["admin-voice-clone-preview"],
    )
    app.include_router(
        vod_interaction_admin.router, prefix=prefix, tags=["vod-interaction-admin"]
    )
    app.include_router(
        vod_interaction_multi.router, prefix=prefix, tags=["vod-interaction-multi"]
    )
    app.include_router(
        vod_interaction_shared.router, prefix=prefix, tags=["vod-interaction-shared"]
    )
    app.include_router(
        vod_interaction_pause_ask.router, prefix=prefix, tags=["vod-interaction-pause-ask"]
    )
    logger.debug("Registered VOD avatar interaction routes")

    # ============================================
    # Channel Chat REST Routes (kept in monolith; WS moved to bayit-ws-gateway)
    # ============================================
    app.include_router(
        channel_chat.router,
        prefix=prefix,
        tags=["channel-chat"],
    )

    # ============================================
    # Live Dubbing Routes (REST)
    # ============================================
    app.include_router(live_dubbing.router, prefix=prefix, tags=["live-dubbing"])
    logger.debug("Registered live dubbing routes")

    # ============================================
    # Synced Streams Routes (Perfect Video-Audio Sync)
    # ============================================
    app.include_router(synced_streams.router, prefix=prefix, tags=["synced-streams"])
    logger.debug("Registered synced streams routes")

    # ============================================
    # User Dubbing Routes (Chrome Extension B2C)
    # ============================================
    app.include_router(dubbing.router, prefix=f"{prefix}/dubbing", tags=["dubbing"])
    logger.debug("Registered user dubbing routes (Chrome extension B2C)")

    # ============================================
    # Olorin.ai Platform Routes
    # ============================================
    # Versioned routes: /api/v1/olorin/v1/* (main router already has /olorin/v1 prefix)
    app.include_router(olorin_router, prefix=prefix, tags=["olorin"])
    # Legacy redirect routes: /api/v1/olorin/* -> /api/v1/olorin/v1/*
    app.include_router(olorin_legacy_router, prefix=prefix, tags=["olorin-legacy"])
    logger.debug("Registered Olorin.ai platform routes (versioned + legacy redirects)")

    # ============================================
    # NLP Routes (Natural Language Processing for CLI)
    # ============================================
    app.include_router(nlp.router, prefix=prefix, tags=["nlp"])
    logger.debug("Registered NLP routes (intent parsing, agent execution, semantic search, voice commands)")

    # ============================================
    # Beta 500 Program Routes
    # ============================================
    app.include_router(signup.router, prefix=prefix, tags=["beta"])
    app.include_router(credits.router, prefix=prefix, tags=["beta-credits"])
    app.include_router(sessions.router, prefix=prefix, tags=["beta-sessions"])
    app.include_router(status.router, prefix=prefix, tags=["beta-status"])
    logger.debug("Registered Beta 500 closed beta program routes (signup, credits, sessions, status)")

    # ============================================
    # Hebrew Engagement / Gamification Routes
    # ============================================
    app.include_router(missions_core.router, prefix=prefix, tags=["missions"])
    app.include_router(shekels.router, prefix=prefix, tags=["shekels"])
    app.include_router(leaderboard.router, prefix=prefix, tags=["leaderboard"])
    app.include_router(zine.router, prefix=prefix, tags=["zine"])
    app.include_router(coupons.router, prefix=prefix, tags=["coupons"])
    logger.debug("Registered Hebrew engagement routes (missions, shekels, leaderboard, zine, coupons)")

    # ============================================
    # Talk Back Routes (Hebrew Voice Interactivity)
    # ============================================
    app.include_router(talk_back_core.router, prefix=prefix, tags=["talk-back"])
    app.include_router(talk_back_admin.router, prefix=prefix, tags=["talk-back-admin"])
    app.include_router(talk_back_dashboard.router, prefix=prefix, tags=["talk-back-dashboard"])
    logger.debug("Registered Talk Back routes (core, admin, dashboard)")

    # ============================================
    # Bilingual Dubbing Routes (Progressive Hebrew/English)
    # ============================================
    app.include_router(bilingual_dubbing.router, prefix=prefix, tags=["bilingual-dubbing"])
    logger.debug("Registered bilingual dubbing routes (proficiency, sessions, translation)")

    # ============================================
    # Star in Story Routes (Generative Personalized Episodes)
    # ============================================
    app.include_router(star_story_core.router, prefix=prefix, tags=["star-story"])
    app.include_router(star_story_episodes.router, prefix=prefix, tags=["star-story"])
    app.include_router(star_story_admin.router, prefix=prefix, tags=["star-story-admin"])
    logger.debug("Registered Star in Story routes (consent, avatars, episodes, admin)")

    # ============================================
    # Interactive Mission Routes (Atzmi Ba'Sipur)
    # ============================================
    app.include_router(im_core.router, prefix=prefix, tags=["interactive-missions"])
    app.include_router(im_play.router, prefix=prefix, tags=["interactive-missions"])
    app.include_router(avatar_outfits.router, prefix=prefix, tags=["avatar-outfits"])
    app.include_router(family_snaps.router, prefix=prefix, tags=["family-snaps"])
    logger.debug("Registered Interactive Mission routes (core, play, outfits, snaps)")

    # ============================================
    # Phonetic Mirror Routes (Perfected Voice)
    # ============================================
    app.include_router(pm_core.router, prefix=prefix, tags=["phonetic-mirror"])
    logger.debug("Registered Phonetic Mirror routes (REST; WS moved to bayit-ws-gateway)")

    # ============================================
    # Gamification Routes (Level Progression)
    # ============================================
    app.include_router(gamification_routes.router, prefix=prefix, tags=["gamification"])
    logger.debug("Registered Gamification routes (profile, levels, perks, leaderboard)")

    # ============================================
    # Grandparent Bridge Routes (News Clips + Sharing)
    # ============================================
    app.include_router(gp_bridge.router, prefix=prefix, tags=["grandparent-bridge"])
    logger.debug("Registered Grandparent Bridge routes (clips, sharing, voice notes)")

    # ============================================
    # Chameleon Engine Routes (Visual Style Transfer)
    # ============================================
    app.include_router(chameleon_routes.router, prefix=prefix, tags=["chameleon"])
    logger.debug("Registered Chameleon Engine routes (prepare, status, cached)")

    # ============================================
    # Zeh Ani Routes (Creatify Avatar + Biometric Consent + V2V)
    # ============================================
    app.include_router(za_avatar.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_avatar_mgmt.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_consent.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_v2v.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_triggers.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_mirror.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_highlights.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_whatsapp.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(
        movie_interactions.router, prefix=prefix, tags=["movie-interactions"]
    )
    logger.debug("Registered Zeh Ani routes (mesh, consent, v2v, triggers, mirror, highlights, whatsapp, movie-interactions)")

    logger.debug("Registered all feature routes")

    # ============================================
    # WebSocket routes (also served by ws-gateway in production)
    # ============================================
    try:
        from app.api.routes import (
            websocket_live_dubbing,
            websocket_live_subtitles,
            websocket_live_trivia,
        )
        app.include_router(
            websocket_live_dubbing.router, prefix=prefix, tags=["websocket", "live-dubbing"]
        )
        app.include_router(
            websocket_live_subtitles.router, prefix=prefix, tags=["websocket", "live-subtitles"]
        )
        app.include_router(
            websocket_live_trivia.router, prefix=prefix, tags=["websocket", "live-trivia"]
        )
        logger.debug("Registered WebSocket live routes (dubbing, subtitles, trivia)")
    except ImportError as e:
        logger.warning("WebSocket live routes not available: %s", e)

    logger.info(f"All API routers registered with prefix {prefix}")


def register_upload_serving(app: FastAPI) -> None:
    """
    Register the upload file serving endpoint.

    Serves uploaded files from local storage or redirects to GCS.
    """

    @app.api_route("/uploads/{path:path}", methods=["GET", "HEAD"])
    async def serve_uploads(path: str):
        """Serve uploaded files - local storage or GCS proxy."""
        from fastapi import HTTPException

        if settings.STORAGE_TYPE == "local":
            # Serve from local uploads directory
            file_path = Path(settings.UPLOAD_DIR) / path
            if file_path.exists() and file_path.is_file():
                # Determine content type
                content_type = "application/octet-stream"
                suffix = file_path.suffix.lower()
                content_types = {
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".png": "image/png",
                    ".gif": "image/gif",
                    ".webp": "image/webp",
                    ".mp4": "video/mp4",
                    ".webm": "video/webm",
                    ".m3u8": "application/vnd.apple.mpegurl",
                    ".ts": "video/mp2t",
                    ".vtt": "text/vtt",
                    ".srt": "application/x-subrip",
                }
                content_type = content_types.get(suffix, content_type)

                return FileResponse(
                    path=str(file_path),
                    media_type=content_type,
                    headers={"Cache-Control": "public, max-age=31536000"},
                )
            raise HTTPException(status_code=404, detail="File not found")

        # Proxy to GCS for cloud storage
        gcs_url = (
            f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/uploads/{path}"
        )
        return RedirectResponse(url=gcs_url, status_code=307)

    logger.debug("Registered upload serving endpoint")
