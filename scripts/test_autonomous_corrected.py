#!/usr/bin/env python3
"""
WebSocket Monitor for Autonomous Investigation - Corrected Version
Uses proper entity types and formats
"""
import asyncio
import json
import websockets
import aiohttp
from datetime import datetime

async def run_autonomous_investigation_test():
    """Run complete autonomous investigation with WebSocket monitoring"""
    
    print("🚀 Autonomous Investigation WebSocket Test (Corrected)")
    print("=" * 65)
    
    # Step 1: Start the autonomous investigation with correct entity type
    investigation_id = await start_autonomous_investigation()
    if not investigation_id:
        print("❌ Failed to start investigation")
        return
    
    print(f"✅ Investigation started: {investigation_id}")
    
    # Step 2: Monitor WebSocket for updates
    await monitor_autonomous_websocket(investigation_id)
    
    # Step 3: Check final status
    await check_investigation_status(investigation_id)

async def start_autonomous_investigation():
    """Start autonomous investigation with correct entity type"""
    
    url = "http://localhost:8090/v1/autonomous/start_investigation"
    
    # Use 'user' instead of 'user_id' as entity type based on the error message
    investigation_data = {
        "entity_id": "user-websocket-test-001",
        "entity_type": "user",  # Changed from 'user_id' to 'user'
        "investigation_request": {
            "user_id": "user-websocket-test-001",
            "transaction_id": "txn-autonomous-ws-001",
            "device_info": {
                "device_id": "device-autonomous-001",
                "user_agent": "Mozilla/5.0 (WebSocket Test Browser) AppleWebKit/537.36",
                "ip_address": "192.168.1.100",
                "screen_resolution": "1920x1080",
                "timezone": "America/New_York",
                "language": "en-US"
            },
            "transaction_details": {
                "amount": 2500.00,
                "currency": "USD",
                "merchant": "Test Electronics Store",
                "category": "electronics",
                "timestamp": "2024-09-06T15:30:00Z"
            },
            "location_info": {
                "latitude": 40.7128,
                "longitude": -74.0060,
                "city": "New York",
                "state": "NY",
                "country": "US",
                "postal_code": "10001"
            }
        }
    }
    
    print("🔄 Starting autonomous investigation...")
    print(f"📋 Entity Type: {investigation_data['entity_type']}")
    print(f"📋 Entity ID: {investigation_data['entity_id']}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=investigation_data) as response:
                print(f"📡 Response Status: {response.status}")
                
                if response.status == 200:
                    result = await response.json()
                    investigation_id = result.get('investigation_id')
                    print(f"✅ Investigation created successfully!")
                    print(f"🆔 Investigation ID: {investigation_id}")
                    print(f"📋 Full Response:")
                    print(json.dumps(result, indent=2))
                    return investigation_id
                    
                elif response.status == 422:
                    error_data = await response.json()
                    print(f"❌ Validation Error (422):")
                    print(json.dumps(error_data, indent=2))
                    
                    # Try alternative entity type
                    print("\n🔄 Trying alternative entity type 'unique_user_id'...")
                    investigation_data["entity_type"] = "unique_user_id"
                    
                    async with session.post(url, json=investigation_data) as retry_response:
                        if retry_response.status == 200:
                            result = await retry_response.json()
                            investigation_id = result.get('investigation_id')
                            print(f"✅ Investigation created with unique_user_id!")
                            print(f"🆔 Investigation ID: {investigation_id}")
                            return investigation_id
                        else:
                            retry_error = await retry_response.text()
                            print(f"❌ Retry also failed: {retry_response.status} - {retry_error}")
                    
                else:
                    error_text = await response.text()
                    print(f"❌ Failed to start investigation: {response.status}")
                    print(f"📋 Error Details: {error_text}")
                
                return None
                    
    except Exception as e:
        print(f"❌ Request exception: {e}")
        return None

async def monitor_autonomous_websocket(investigation_id):
    """Monitor WebSocket for autonomous investigation updates"""
    
    print(f"\n🔗 Starting WebSocket monitoring for: {investigation_id}")
    print("─" * 65)
    
    # Comprehensive list of WebSocket URL patterns to try
    ws_urls = [
        f"ws://localhost:8090/ws/autonomous/{investigation_id}",
        f"ws://localhost:8090/ws/investigations/{investigation_id}",
        f"ws://localhost:8090/ws/investigation/{investigation_id}",
        f"ws://localhost:8090/ws/{investigation_id}",
        f"ws://localhost:8090/websocket/autonomous/{investigation_id}",
        f"ws://localhost:8090/ws/v1/autonomous/{investigation_id}",
        f"ws://localhost:8090/v1/autonomous/ws/{investigation_id}"
    ]
    
    for i, ws_url in enumerate(ws_urls, 1):
        print(f"\n🔍 [{i}/{len(ws_urls)}] Trying: {ws_url}")
        
        try:
            # Use connection timeout to fail fast if URL is wrong
            async with websockets.connect(ws_url, ping_timeout=10, 
                                        close_timeout=10) as websocket:
                print(f"✅ WebSocket Connected Successfully!")
                print(f"🎯 Listening for autonomous investigation messages...")
                print("═" * 60)
                
                message_count = 0
                start_time = asyncio.get_event_loop().time()
                max_duration = 90  # 90 seconds to allow for processing
                last_activity_time = start_time
                
                while (asyncio.get_event_loop().time() - start_time) < max_duration:
                    try:
                        # Use shorter timeout for responsiveness
                        message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                        message_count += 1
                        last_activity_time = asyncio.get_event_loop().time()
                        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
                        
                        print(f"\n🎊 [{timestamp}] MESSAGE #{message_count} RECEIVED!")
                        print("┌" + "─" * 58 + "┐")
                        
                        try:
                            data = json.loads(message)
                            msg_type = data.get('type', 'unknown')
                            
                            print(f"│ 📋 Type: {msg_type:<45} │")
                            
                            # Handle different message types
                            if msg_type == 'investigation_started':
                                print(f"│ 🚀 Investigation Started!{' ' * 27} │")
                                
                            elif msg_type == 'agent_started':
                                agent_name = data.get('data', {}).get('agent_name', 'Unknown')
                                print(f"│ 🤖 Agent Started: {agent_name:<31} │")
                                
                            elif msg_type == 'agent_progress':
                                agent_name = data.get('data', {}).get('agent_name', 'Unknown')
                                progress = data.get('data', {}).get('progress', 0)
                                print(f"│ 📊 {agent_name} Progress: {progress}%{' ' * (25-len(str(progress)))} │")
                                
                            elif msg_type == 'agent_completed':
                                agent_name = data.get('data', {}).get('agent_name', 'Unknown')
                                print(f"│ ✅ Agent Completed: {agent_name:<29} │")
                                
                            elif msg_type == 'investigation_update':
                                status = data.get('data', {}).get('status', 'unknown')
                                print(f"│ 🔄 Status Update: {status:<33} │")
                                
                            elif msg_type == 'investigation_completed':
                                risk_score = data.get('data', {}).get('risk_score', 'N/A')
                                print(f"│ 🏁 Investigation Complete! Risk: {str(risk_score):<18} │")
                                
                            elif msg_type == 'error':
                                error_msg = data.get('data', {}).get('message', 'Unknown error')
                                print(f"│ ❌ Error: {error_msg[:40]:<40} │")
                            
                            print("├" + "─" * 58 + "┤")
                            print("│ 📄 Full Message Content:" + " " * 31 + "│")
                            
                            # Pretty print the full message with proper formatting
                            formatted_json = json.dumps(data, indent=2)
                            for line in formatted_json.split('\n'):
                                truncated_line = line[:54] if len(line) > 54 else line
                                print(f"│ {truncated_line:<56} │")
                            
                            print("└" + "─" * 58 + "┘")
                            
                        except json.JSONDecodeError:
                            print(f"│ 📄 Raw Message: {message[:45]:<45} │")
                            print("└" + "─" * 58 + "┘")
                            
                    except asyncio.TimeoutError:
                        elapsed = asyncio.get_event_loop().time() - start_time
                        if int(elapsed) % 15 == 0 and int(elapsed) > 0:  # Every 15 seconds
                            print(f"⏳ Waiting for messages... ({int(elapsed)}s elapsed)")
                        
                        # Check if we've been inactive for too long
                        if (asyncio.get_event_loop().time() - last_activity_time) > 45:
                            print("⏰ No activity for 45 seconds, investigation may be complete")
                            break
                        continue
                        
                    except websockets.exceptions.ConnectionClosed:
                        print("🔌 WebSocket connection closed by server")
                        break
                
                elapsed_time = int(asyncio.get_event_loop().time() - start_time)
                
                print("\n" + "═" * 60)
                print(f"📊 WebSocket Session Summary:")
                print(f"   🔗 URL: {ws_url}")
                print(f"   📨 Messages Received: {message_count}")
                print(f"   ⏱️  Duration: {elapsed_time} seconds")
                print("═" * 60)
                
                if message_count > 0:
                    print("🎉 SUCCESS: WebSocket messages captured!")
                    return True
                else:
                    print("ℹ️  No messages received on this WebSocket")
                    
        except websockets.exceptions.InvalidHandshake:
            print(f"❌ Invalid handshake - WebSocket URL not supported")
        except websockets.exceptions.ConnectionClosed:
            print(f"❌ Connection closed immediately - URL may not exist")
        except OSError as e:
            print(f"❌ Connection failed: {e}")
        except Exception as e:
            print(f"❌ WebSocket error: {e}")
            continue
    
    print("\n❌ None of the WebSocket URLs were successful")
    print("   This might mean:")
    print("   1. WebSocket endpoints use different URL patterns")
    print("   2. WebSocket support is not enabled") 
    print("   3. Investigation completed before WebSocket connection")
    return False

async def check_investigation_status(investigation_id):
    """Check the final status of the investigation"""
    
    print(f"\n🔍 Checking final investigation status...")
    
    status_endpoints = [
        f"/v1/autonomous/investigation/{investigation_id}/status",
        f"/v1/autonomous/investigation/{investigation_id}/logs",
        f"/v1/autonomous/investigation/{investigation_id}/journey"
    ]
    
    async with aiohttp.ClientSession() as session:
        for endpoint in status_endpoints:
            url = f"http://localhost:8090{endpoint}"
            print(f"\n📡 Checking: {endpoint}")
            
            try:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ {endpoint}:")
                        print(json.dumps(data, indent=2))
                    else:
                        error_text = await response.text()
                        print(f"❌ {response.status}: {error_text}")
                        
            except Exception as e:
                print(f"❌ Request error: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(run_autonomous_investigation_test())
        print("\n" + "🎯" + "=" * 63 + "🎯")
        print("   Autonomous Investigation WebSocket Test Complete!")
        print("🎯" + "=" * 63 + "🎯")
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
    except Exception as e:
        print(f"\n🚨 Fatal error: {e}")
        import traceback
        traceback.print_exc()