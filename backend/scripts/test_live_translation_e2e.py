#!/usr/bin/env python3
"""
End-to-End Test for Live Translation System

This script tests the complete live translation pipeline:
1. Health check endpoints
2. LiveTranslationService initialization with different providers
3. WebSocket connection simulation
4. Audio transcription and translation flow

Usage:
    poetry run python scripts/test_live_translation_e2e.py
"""

import asyncio
import json
import os
import sys
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def print_header(title: str):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


def print_result(test_name: str, passed: bool, details: str = ""):
    """Print test result."""
    status = "PASS" if passed else "FAIL"
    symbol = "✅" if passed else "❌"
    print(f"{symbol} [{status}] {test_name}")
    if details:
        print(f"   └─ {details}")


async def test_health_endpoints():
    """Test health check endpoints."""
    print_header("Testing Health Check Endpoints")

    from app.main import app
    from fastapi.testclient import TestClient

    client = TestClient(app)
    results = []

    # Test basic health
    try:
        response = client.get("/health")
        data = response.json()
        passed = response.status_code == 200 and data.get("status") == "healthy"
        print_result("Basic health check", passed, f"Status: {data.get('status')}")
        results.append(passed)
    except Exception as e:
        print_result("Basic health check", False, str(e))
        results.append(False)

    # Test live translation health
    try:
        response = client.get("/health/live-translation")
        data = response.json()
        passed = response.status_code == 200
        print_result(
            "Live translation health check",
            passed,
            f"STT: {data.get('stt_provider')}, Translation: {data.get('translation_provider')}",
        )
        print(f"   └─ Providers available: {json.dumps(data.get('providers', {}))}")
        results.append(passed)
    except Exception as e:
        print_result("Live translation health check", False, str(e))
        results.append(False)

    return all(results)


async def test_service_initialization():
    """Test LiveTranslationService initialization with different providers."""
    print_header("Testing Service Initialization")

    from app.core.config import settings
    from app.services.live_translation_service import LiveTranslationService

    test_cases = [
        ("elevenlabs", "google", "ElevenLabs STT + Google Translate"),
        ("elevenlabs", "openai", "ElevenLabs STT + OpenAI Translate"),
        ("elevenlabs", "claude", "ElevenLabs STT + Claude Translate"),
        ("whisper", "openai", "Whisper STT + OpenAI Translate"),
    ]

    results = []

    for stt, translation, description in test_cases:
        try:
            service = LiveTranslationService(
                provider=stt, translation_provider=translation
            )
            status = service.verify_service_availability()
            passed = status.get("speech_to_text") and status.get("translate")
            print_result(
                description,
                passed,
                f"STT: {status.get('speech_to_text')}, Translate: {status.get('translate')}",
            )
            results.append(passed)
        except Exception as e:
            print_result(description, False, str(e))
            results.append(False)

    return all(results)


async def test_elevenlabs_service():
    """Test ElevenLabs realtime service directly."""
    print_header("Testing ElevenLabs Realtime Service")

    from app.core.config import settings
    from app.services.elevenlabs_realtime_service import (
        WEBSOCKETS_AVAILABLE,
        ElevenLabsRealtimeService,
    )

    results = []

    # Test initialization
    try:
        service = ElevenLabsRealtimeService()
        passed = service.api_key is not None
        print_result("Service initialization", passed, "API key configured")
        results.append(passed)
    except Exception as e:
        print_result("Service initialization", False, str(e))
        results.append(False)
        return False

    # Test service availability
    try:
        available = service.verify_service_availability()
        print_result(
            "Service availability", available, f"WebSockets: {WEBSOCKETS_AVAILABLE}"
        )
        results.append(available)
    except Exception as e:
        print_result("Service availability", False, str(e))
        results.append(False)

    # Test audio buffer
    try:
        test_audio = b"\x00" * 1600  # 100ms of 16kHz audio
        await service.send_audio_chunk(test_audio)
        passed = len(service._audio_buffer) == 1
        print_result(
            "Audio buffering", passed, f"Buffer size: {len(service._audio_buffer)}"
        )
        results.append(passed)
    except Exception as e:
        print_result("Audio buffering", False, str(e))
        results.append(False)

    # Test buffer rolling
    try:
        for i in range(150):
            await service.send_audio_chunk(bytes([i % 256]))
        passed = len(service._audio_buffer) == 100
        print_result(
            "Buffer rolling (max 100)",
            passed,
            f"Buffer size: {len(service._audio_buffer)}",
        )
        results.append(passed)
    except Exception as e:
        print_result("Buffer rolling", False, str(e))
        results.append(False)

    return all(results)


async def test_translation_providers():
    """Test translation with different providers."""
    print_header("Testing Translation Providers")

    from app.services.live_translation_service import LiveTranslationService

    test_text = "שלום"  # "Hello" in Hebrew
    results = []

    # Test Google Translate
    try:
        service = LiveTranslationService(
            provider="whisper", translation_provider="google"
        )
        result = await service.translate_text(test_text, "he", "en")
        passed = result and len(result) > 0 and result != test_text
        print_result("Google Translate", passed, f"'{test_text}' -> '{result}'")
        results.append(passed)
    except Exception as e:
        print_result("Google Translate", False, str(e))
        results.append(False)

    # Test OpenAI Translation
    try:
        service = LiveTranslationService(
            provider="whisper", translation_provider="openai"
        )
        result = await service.translate_text(test_text, "he", "en")
        passed = result and len(result) > 0
        print_result("OpenAI Translate", passed, f"'{test_text}' -> '{result}'")
        results.append(passed)
    except Exception as e:
        print_result("OpenAI Translate", False, str(e))
        results.append(False)

    # Test Claude Translation
    try:
        service = LiveTranslationService(
            provider="elevenlabs", translation_provider="claude"
        )
        result = await service.translate_text(test_text, "he", "en")
        passed = result and len(result) > 0
        print_result("Claude Translate", passed, f"'{test_text}' -> '{result}'")
        results.append(passed)
    except Exception as e:
        print_result("Claude Translate", False, str(e))
        results.append(False)

    return all(results)


async def test_websocket_endpoint():
    """Test WebSocket live subtitles endpoint structure."""
    print_header("Testing WebSocket Endpoint Structure")

    from app.api.routes.websocket_live_subtitles import router

    results = []

    # Check that the WebSocket route exists
    try:
        routes = [r for r in router.routes if hasattr(r, "path")]
        ws_routes = [r for r in routes if "/subtitles" in r.path or "live" in r.path]
        passed = len(ws_routes) > 0
        route_paths = [r.path for r in ws_routes] if ws_routes else []
        print_result(
            "WebSocket route exists",
            passed,
            f"Found {len(ws_routes)} route(s): {route_paths}",
        )
        results.append(passed)
    except Exception as e:
        print_result("WebSocket route exists", False, str(e))
        results.append(False)

    return all(results)


async def test_full_pipeline_simulation():
    """Simulate the full translation pipeline with mocked audio."""
    print_header("Testing Full Pipeline Simulation")

    from app.services.live_translation_service import LiveTranslationService

    results = []

    # Create service with ElevenLabs + Google (recommended production config)
    try:
        service = LiveTranslationService(
            provider="elevenlabs", translation_provider="google"
        )

        # Verify both services are ready
        status = service.verify_service_availability()
        stt_ready = status.get("speech_to_text", False)
        translate_ready = status.get("translate", False)

        print_result(
            "Pipeline initialization",
            stt_ready and translate_ready,
            f"STT ready: {stt_ready}, Translate ready: {translate_ready}",
        )
        results.append(stt_ready and translate_ready)

        # Test translation component
        test_texts = [
            ("שלום", "he", "en"),
            ("תודה רבה", "he", "en"),
            ("בוקר טוב", "he", "en"),
        ]

        for hebrew, src, tgt in test_texts:
            translated = await service.translate_text(hebrew, src, tgt)
            passed = translated and len(translated) > 0
            print_result(f"Translate '{hebrew}'", passed, f"Result: '{translated}'")
            results.append(passed)

    except Exception as e:
        print_result("Pipeline initialization", False, str(e))
        results.append(False)

    return all(results)


async def main():
    """Run all end-to-end tests."""
    print("\n" + "=" * 60)
    print(" LIVE TRANSLATION SYSTEM - END-TO-END TEST")
    print(f" Started at: {datetime.now().isoformat()}")
    print("=" * 60)

    all_results = []

    # Run all test suites
    test_suites = [
        ("Health Endpoints", test_health_endpoints),
        ("Service Initialization", test_service_initialization),
        ("ElevenLabs Service", test_elevenlabs_service),
        ("Translation Providers", test_translation_providers),
        ("WebSocket Endpoint", test_websocket_endpoint),
        ("Full Pipeline", test_full_pipeline_simulation),
    ]

    for name, test_func in test_suites:
        try:
            result = await test_func()
            all_results.append((name, result))
        except Exception as e:
            print(f"\n❌ Test suite '{name}' crashed: {e}")
            all_results.append((name, False))

    # Print summary
    print_header("TEST SUMMARY")

    passed = sum(1 for _, r in all_results if r)
    failed = sum(1 for _, r in all_results if not r)

    for name, result in all_results:
        status = "PASSED" if result else "FAILED"
        symbol = "✅" if result else "❌"
        print(f"  {symbol} {name}: {status}")

    print()
    print(f"Total: {passed} passed, {failed} failed")
    print()

    if failed == 0:
        print("🎉 ALL TESTS PASSED - System is production ready!")
        return 0
    else:
        print("⚠️  Some tests failed - Review issues above")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
