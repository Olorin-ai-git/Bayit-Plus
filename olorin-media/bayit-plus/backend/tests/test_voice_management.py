"""
Test suite for voice management functionality
Tests configuration, library, analytics, quotas, and settings endpoints
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta

from app.models.voice_config import VoiceConfiguration, VoiceProviderHealth
from app.models.live_feature_quota import LiveFeatureUsageSession, FeatureType
from app.services.voice_management_service import VoiceManagementService


@pytest.mark.asyncio
async def test_get_merged_configuration():
    """Test getting merged voice configuration"""
    with patch('app.models.voice_config.VoiceConfiguration.find') as mock_find:
        mock_find.return_value.to_list = AsyncMock(return_value=[])

        config = await VoiceManagementService.get_merged_configuration()

        assert 'default_voice_id' in config
        assert 'assistant_voice_id' in config
        assert 'stt_provider' in config


@pytest.mark.asyncio
async def test_update_configuration():
    """Test updating voice configuration"""
    with patch('app.models.voice_config.VoiceConfiguration.find_one') as mock_find:
        mock_find.return_value = None

        with patch('app.models.voice_config.VoiceConfiguration.insert') as mock_insert:
            config = await VoiceManagementService.update_configuration(
                config_key='test_key',
                config_value='test_value',
                admin_id='admin123',
                config_type='voice_id'
            )

            assert config.config_key == 'test_key'
            assert config.config_value == 'test_value'


@pytest.mark.asyncio
async def test_fetch_elevenlabs_voices():
    """Test fetching voices from ElevenLabs API"""
    mock_response = {
        'voices': [
            {'voice_id': 'voice1', 'name': 'Test Voice'},
            {'voice_id': 'voice2', 'name': 'Another Voice'},
        ]
    }

    with patch('httpx.AsyncClient') as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(
            return_value=Mock(
                status_code=200,
                json=lambda: mock_response
            )
        )

        voices = await VoiceManagementService.fetch_elevenlabs_voices()
        assert len(voices) == 2
        assert voices[0]['name'] == 'Test Voice'


@pytest.mark.asyncio
async def test_get_realtime_sessions():
    """Test getting active voice sessions"""
    mock_sessions = [
        Mock(
            session_id='sess1',
            user_id='user1',
            feature_type=FeatureType.DUBBING,
            status='active',
            duration_seconds=120,
            started_at=datetime.utcnow(),
            ended_at=None,
            platform='web',
            estimated_total_cost=0.05,
            stt_latency_ms=150,
            tts_first_audio_ms=300,
            end_to_end_latency_ms=500
        )
    ]

    with patch('app.models.live_feature_quota.LiveFeatureUsageSession.find') as mock_find:
        mock_find.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(
            return_value=mock_sessions
        )

        sessions = await VoiceManagementService.get_realtime_sessions(limit=10)

        assert len(sessions) == 1
        assert sessions[0]['session_id'] == 'sess1'
        assert sessions[0]['stt_latency_ms'] == 150


@pytest.mark.asyncio
async def test_get_usage_chart_data():
    """Test getting usage chart data"""
    with patch('app.models.live_feature_quota.LiveFeatureUsageSession.find') as mock_find:
        mock_find.return_value.to_list = AsyncMock(return_value=[])

        data = await VoiceManagementService.get_usage_chart_data('day')

        assert data['period'] == 'day'
        assert 'data' in data


@pytest.mark.asyncio
async def test_check_provider_health():
    """Test provider health check"""
    with patch('httpx.AsyncClient') as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(
            return_value=Mock(status_code=200, raise_for_status=Mock())
        )

        with patch('app.models.voice_config.VoiceProviderHealth.find_one') as mock_find:
            mock_find.return_value = None

            with patch('app.models.voice_config.VoiceProviderHealth.insert') as mock_insert:
                result = await VoiceManagementService.check_provider_health('elevenlabs')

                assert result['provider'] == 'elevenlabs'
                assert result['is_healthy'] is True


def test_voice_configuration_model():
    """Test VoiceConfiguration model structure"""
    config = VoiceConfiguration(
        config_key='test_key',
        config_value='test_value',
        config_type='voice_id',
        created_by='admin1',
        updated_by='admin1'
    )

    assert config.config_key == 'test_key'
    assert config.is_active is True


def test_voice_provider_health_model():
    """Test VoiceProviderHealth model structure"""
    health = VoiceProviderHealth(
        provider='elevenlabs',
        is_healthy=True
    )

    assert health.provider == 'elevenlabs'
    assert health.consecutive_failures == 0
    assert health.success_rate_24h == 100.0


@pytest.mark.asyncio
async def test_get_cost_breakdown():
    """Test cost breakdown calculation"""
    start_date = datetime.utcnow() - timedelta(days=7)
    end_date = datetime.utcnow()

    mock_sessions = [
        Mock(
            feature_type='subtitle',
            estimated_total_cost=0.10,
            estimated_stt_cost=0.04,
            estimated_translation_cost=0.02,
            estimated_tts_cost=0.04,
            duration_seconds=300
        )
    ]

    with patch('app.models.live_feature_quota.LiveFeatureUsageSession.find') as mock_find:
        mock_find.return_value.to_list = AsyncMock(return_value=mock_sessions)

        breakdown = await VoiceManagementService.get_cost_breakdown(start_date, end_date)

        assert breakdown['total_cost'] == 0.10
        assert breakdown['by_feature']['subtitle'] == 0.10
        assert breakdown['by_component']['stt'] == 0.04
