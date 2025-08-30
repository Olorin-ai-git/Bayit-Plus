#!/usr/bin/env python
"""Debug API call format."""

import requests
import json
import os

def debug_api_call():
    """Debug the API call format."""
    # SECURITY: Get API key from environment variable or Firebase secrets
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ ERROR: ANTHROPIC_API_KEY environment variable not set")
        print("For production: Use Firebase secret 'olorin/anthropic_api_key'")
        print("For testing: Set environment variable: export ANTHROPIC_API_KEY='your-key'")
        return False
    api_url = "https://api.anthropic.com/v1/messages"
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key,
        "anthropic-version": "2023-06-01"
    }
    
    # Simple test message
    data = {
        "model": "claude-3-opus-20240229",
        "max_tokens": 100,
        "messages": [
            {
                "role": "user",
                "content": "Test message for API debug"
            }
        ]
    }
    
    print("Sending request...")
    print(f"Headers: {headers}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    response = requests.post(api_url, headers=headers, json=data)
    
    print(f"\nResponse Status: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    
    if response.status_code != 200:
        print(f"Response Text: {response.text}")
    else:
        result = response.json()
        print(f"Success: {result}")

if __name__ == "__main__":
    debug_api_call()