#!/usr/bin/env python3
"""
Test script to verify CORS/OPTIONS fix for settings router.
Tests both OPTIONS preflight and actual GET requests.
"""

import requests
import sys
import time
from typing import Dict, Any


def test_cors_preflight(base_url: str = "http://localhost:8090") -> bool:
    """Test CORS preflight OPTIONS request."""
    url = f"{base_url}/api/settings/"
    
    # CORS preflight request headers
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "X-User-ID,Content-Type"
    }
    
    try:
        print("Testing CORS preflight OPTIONS request...")
        response = requests.options(url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        # Check if CORS headers are present
        cors_headers = {
            "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
            "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
        }
        print(f"CORS Headers: {cors_headers}")
        
        # Success if status is 200 and proper CORS headers are present
        success = (
            response.status_code == 200 and
            cors_headers["Access-Control-Allow-Origin"] is not None
        )
        
        if success:
            print("✅ CORS preflight test PASSED")
        else:
            print("❌ CORS preflight test FAILED")
            
        return success
        
    except requests.exceptions.RequestException as e:
        print(f"❌ CORS preflight test FAILED with exception: {e}")
        return False


def test_get_settings(base_url: str = "http://localhost:8090") -> bool:
    """Test actual GET request to settings endpoint."""
    url = f"{base_url}/api/settings/"
    
    headers = {
        "X-User-ID": "test_user_123",
        "Content-Type": "application/json"
    }
    
    try:
        print("\nTesting GET settings request...")
        response = requests.get(url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data}")
            
            # Check if response has expected structure
            success = (
                "success" in data and
                data["success"] is True and
                "settings" in data
            )
            
            if success:
                print("✅ GET settings test PASSED")
            else:
                print("❌ GET settings test FAILED - Invalid response structure")
        else:
            print(f"❌ GET settings test FAILED - Status code: {response.status_code}")
            print(f"Response: {response.text}")
            success = False
            
        return success
        
    except requests.exceptions.RequestException as e:
        print(f"❌ GET settings test FAILED with exception: {e}")
        return False


def check_server_health(base_url: str = "http://localhost:8090") -> bool:
    """Check if the server is running."""
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        return response.status_code == 200
    except:
        return False


def main():
    """Main test function."""
    print("🔧 Testing CORS/OPTIONS fix for settings router")
    print("=" * 60)
    
    base_url = "http://localhost:8001"
    
    # Check if server is running
    print("Checking server health...")
    if not check_server_health(base_url):
        print("❌ Server is not running or not accessible")
        print("Please start the server with: poetry run python -m app.local_server")
        sys.exit(1)
    
    print("✅ Server is running")
    
    # Run tests
    cors_success = test_cors_preflight(base_url)
    get_success = test_get_settings(base_url)
    
    print("\n" + "=" * 60)
    print("Test Results:")
    print(f"CORS Preflight: {'✅ PASSED' if cors_success else '❌ FAILED'}")
    print(f"GET Settings:   {'✅ PASSED' if get_success else '❌ FAILED'}")
    
    if cors_success and get_success:
        print("\n🎉 All tests PASSED! CORS fix is working correctly.")
        sys.exit(0)
    else:
        print("\n💥 Some tests FAILED. Please check the implementation.")
        sys.exit(1)


if __name__ == "__main__":
    main()