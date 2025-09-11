#!/usr/bin/env python3
"""
Test HTTP Session Cleanup

Validates that HTTP sessions are properly managed and cleaned up,
preventing unclosed session warnings in production.
"""

import asyncio
import sys
import os
import pytest
from unittest.mock import Mock, patch

# Add the project root to Python path
sys.path.insert(0, os.path.abspath('../..'))


async def test_virustotal_client_session_management():
    """Test that VirusTotal client uses managed sessions."""
    print("🧪 Testing VirusTotal Client Session Management")
    print("=" * 45)
    
    os.environ['TEST_MODE'] = 'true'
    
    try:
        from app.service.agent.tools.threat_intelligence_tool.virustotal.virustotal_client import VirusTotalClient
        from app.service.agent.tools.threat_intelligence_tool.virustotal.models import VirusTotalConfig
        from app.service.agent.tools.async_client_manager import get_client_manager
        
        config = VirusTotalConfig()
        client = VirusTotalClient(config)
        
        # Check that client no longer has _session attribute (using managed sessions)
        print(f"   Client has _session attribute: {hasattr(client, '_session')}")
        assert not hasattr(client, '_session'), "Client should not manage its own session"
        
        # Get session manager stats before operation
        manager = get_client_manager()
        initial_stats = manager.get_session_stats()
        print(f"   Initial sessions: {initial_stats['active_sessions']}")
        
        # Mock the Firebase secret to avoid real API key lookup
        with patch('app.service.agent.tools.threat_intelligence_tool.virustotal.virustotal_client.get_firebase_secret', return_value='test_key'):
            # Perform an IP analysis (this will create and destroy a managed session)
            response = await client.analyze_ip("8.8.8.8")
            print(f"   Analysis completed: {response.success}")
            assert response.success
        
        # Check session stats after operation
        final_stats = manager.get_session_stats()
        print(f"   Final sessions: {final_stats['active_sessions']}")
        
        # Sessions should be cleaned up automatically
        print("   ✅ VirusTotal client using managed sessions")
        return True
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_async_client_manager_cleanup():
    """Test async client manager proper cleanup."""
    print("\n🧪 Testing Async Client Manager Cleanup")
    print("=" * 37)
    
    try:
        from app.service.agent.tools.async_client_manager import get_client_manager, http_session
        
        manager = get_client_manager()
        initial_stats = manager.get_session_stats()
        print(f"   Initial active sessions: {initial_stats['active_sessions']}")
        
        # Create multiple sessions in sequence
        for i in range(3):
            async with http_session() as session:
                print(f"   Created session {i+1}")
                # Session should be automatically cleaned up when exiting context
        
        final_stats = manager.get_session_stats()
        print(f"   Final active sessions: {final_stats['active_sessions']}")
        
        # All sessions should be cleaned up
        assert final_stats['active_sessions'] == 0, "All sessions should be cleaned up"
        
        print("   ✅ Async client manager cleanup working")
        return True
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_concurrent_session_usage():
    """Test concurrent session usage and cleanup."""
    print("\n🧪 Testing Concurrent Session Usage")
    print("=" * 32)
    
    try:
        from app.service.agent.tools.async_client_manager import get_client_manager, http_session
        
        manager = get_client_manager()
        
        async def create_session(session_id: int):
            async with http_session() as session:
                # Simulate some work
                await asyncio.sleep(0.1)
                return f"session_{session_id}"
        
        # Create multiple concurrent sessions
        print("   Creating 5 concurrent sessions...")
        tasks = [create_session(i) for i in range(5)]
        results = await asyncio.gather(*tasks)
        
        print(f"   Completed sessions: {len(results)}")
        assert len(results) == 5
        
        # Check that all sessions were cleaned up
        final_stats = manager.get_session_stats()
        print(f"   Active sessions after concurrent usage: {final_stats['active_sessions']}")
        
        assert final_stats['active_sessions'] == 0, "All concurrent sessions should be cleaned up"
        
        print("   ✅ Concurrent session usage working")
        return True
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_session_error_handling():
    """Test session cleanup during errors."""
    print("\n🧪 Testing Session Error Handling")
    print("=" * 30)
    
    try:
        from app.service.agent.tools.async_client_manager import get_client_manager, http_session
        
        manager = get_client_manager()
        
        try:
            async with http_session() as session:
                # Simulate an error
                raise RuntimeError("Simulated error")
        except RuntimeError:
            pass  # Expected error
        
        # Check that session was cleaned up despite the error
        final_stats = manager.get_session_stats()
        print(f"   Active sessions after error: {final_stats['active_sessions']}")
        
        assert final_stats['active_sessions'] == 0, "Session should be cleaned up even after error"
        
        print("   ✅ Session error handling working")
        return True
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def run_all_tests():
    """Run all HTTP session cleanup tests."""
    print("🎯 Running HTTP Session Cleanup Tests\n")
    
    tests = [
        ("VirusTotal Client Session Management", test_virustotal_client_session_management),
        ("Async Client Manager Cleanup", test_async_client_manager_cleanup),
        ("Concurrent Session Usage", test_concurrent_session_usage),
        ("Session Error Handling", test_session_error_handling)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"Running: {test_name}")
        print('='*60)
        
        try:
            result = await test_func()
            results.append((test_name, result))
            
            if result:
                print(f"\n✅ {test_name}: PASSED")
            else:
                print(f"\n❌ {test_name}: FAILED")
                
        except Exception as e:
            print(f"\n💥 {test_name}: ERROR - {str(e)}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print('='*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status}: {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL HTTP SESSION CLEANUP TESTS PASSED!")
        print("   ✅ VirusTotal client uses managed sessions")
        print("   ✅ Sessions are automatically cleaned up")
        print("   ✅ Concurrent sessions work properly")
        print("   ✅ Error handling maintains cleanup")
        return True
    else:
        print("⚠️ Some tests failed - session cleanup needs more work")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)