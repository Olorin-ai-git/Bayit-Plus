"""
WebSocket Authentication Patch for Unified Test Runner

This patch fixes the 403 Forbidden WebSocket error by adding proper JWT authentication
to WebSocket connections in the autonomous investigation test runner.

Apply this patch to unified_autonomous_test_runner.py
"""

import sys
import os
from pathlib import Path

# Add the service path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# The patched WebSocket monitoring function
def patched_start_websocket_monitoring(self):
    """Start WebSocket message monitoring with proper authentication"""
    if not self.config.show_websocket:
        return
        
    def websocket_monitor():
        try:
            # Import websocket-client
            try:
                import websocket
            except ImportError:
                self.log_monitoring_warning("WebSocket", "websocket-client library not installed - install with 'poetry add websocket-client'")
                return
            
            # Import authentication fix
            try:
                from app.service.agent.websocket_auth_fix import create_websocket_connection_config
                auth_available = True
            except ImportError:
                self.log_monitoring_warning("WebSocket", "WebSocket auth fix not available, using basic connection")
                auth_available = False
            
            # Create WebSocket configuration with authentication
            if auth_available:
                ws_config = create_websocket_connection_config(
                    server_url=self.config.server_url,
                    investigation_id='test_runner_monitor',
                    demo_mode=True,
                    parallel=False
                )
                ws_url = ws_config['url']
                ws_headers = ws_config['headers']
                self.log_monitoring_success("WebSocket", "Using authenticated WebSocket connection")
            else:
                # Fallback to basic connection (will likely get 403)
                ws_url = self.config.server_url.replace('http://', 'ws://').replace('https://', 'wss://')
                if not ws_url.endswith('/ws/investigation'):
                    ws_url += '/ws/investigation'
                ws_headers = {
                    'Origin': 'http://localhost:8090',
                    'X-Olorin-Mode': 'demo'
                }
                self.log_monitoring_warning("WebSocket", "Using basic WebSocket connection (may fail with 403)")
            
            def on_message(ws, message):
                try:
                    # Try to parse as JSON
                    if message.strip().startswith('{'):
                        data = json.loads(message)
                        self.log_websocket_message(
                            data.get('type', 'json'),
                            data,
                            data.get('investigation_id', 'unknown')
                        )
                    else:
                        self.log_websocket_message('text', message, 'unknown')
                except json.JSONDecodeError:
                    # Log raw message if not JSON
                    self.log_websocket_message('raw', message, 'unknown')
                except Exception as e:
                    self.log_monitoring_warning("WebSocket", f"Error processing message: {e}")
            
            def on_error(ws, error):
                self.log_monitoring_error("WebSocket", f"Connection error: {error}")
            
            def on_close(ws, close_status_code, close_msg):
                if close_status_code:
                    if close_status_code == 1008:  # Policy violation (auth failure)
                        self.log_monitoring_error("WebSocket", f"Authentication failed (403 Forbidden) - check JWT token")
                    else:
                        self.log_monitoring_warning("WebSocket", f"Connection closed (code: {close_status_code}, msg: {close_msg})")
                else:
                    self.log_monitoring_warning("WebSocket", "Connection closed")
            
            def on_open(ws):
                self.log_monitoring_success("WebSocket", f"Connected to investigation stream at {ws_url}")
            
            # Create WebSocket client with authentication
            self.websocket_client = websocket.WebSocketApp(
                ws_url,
                header=ws_headers if auth_available else None,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close,
                on_open=on_open
            )
            
            # Run forever with automatic reconnection
            self.websocket_client.run_forever(
                ping_interval=30,
                ping_timeout=10,
                reconnect=3
            )
            
        except Exception as e:
            self.log_monitoring_error("WebSocket", f"Failed to start monitoring: {e}")
    
    if self.config.show_websocket:
        import threading
        thread = threading.Thread(target=websocket_monitor, daemon=True)
        thread.start()
        self.monitoring_threads.append(thread)


def apply_websocket_auth_patch():
    """Apply the WebSocket authentication patch to the test runner"""
    
    # Get the test runner file path
    test_runner_path = Path(__file__).parent / 'unified_autonomous_test_runner.py'
    
    if not test_runner_path.exists():
        print(f"❌ Test runner not found at {test_runner_path}")
        return False
    
    print(f"🔧 Applying WebSocket authentication patch to {test_runner_path}")
    
    # Read the current content
    with open(test_runner_path, 'r') as f:
        content = f.read()
    
    # Check if already patched
    if 'websocket_auth_fix' in content:
        print("✅ WebSocket authentication patch already applied")
        return True
    
    # Apply the patch by replacing the start_websocket_monitoring method
    import re
    
    # Find the method definition
    method_pattern = r'(    def start_websocket_monitoring\(self\):.*?)(\n    def \w+|$)'
    
    match = re.search(method_pattern, content, re.DOTALL)
    if not match:
        print("❌ Could not find start_websocket_monitoring method to patch")
        return False
    
    # Create the replacement
    replacement_method = '''    def start_websocket_monitoring(self):
        """Start WebSocket message monitoring with proper authentication"""
        if not self.config.show_websocket:
            return
            
        def websocket_monitor():
            try:
                # Import websocket-client
                try:
                    import websocket
                except ImportError:
                    self.log_monitoring_warning("WebSocket", "websocket-client library not installed - install with 'poetry add websocket-client'")
                    return
                
                # Import authentication fix
                try:
                    from app.service.agent.websocket_auth_fix import create_websocket_connection_config
                    auth_available = True
                except ImportError:
                    self.log_monitoring_warning("WebSocket", "WebSocket auth fix not available, using basic connection")
                    auth_available = False
                
                # Create WebSocket configuration with authentication
                if auth_available:
                    ws_config = create_websocket_connection_config(
                        server_url=self.config.server_url,
                        investigation_id='test_runner_monitor',
                        demo_mode=True,
                        parallel=False
                    )
                    ws_url = ws_config['url']
                    ws_headers = ws_config['headers']
                    self.log_monitoring_success("WebSocket", "Using authenticated WebSocket connection")
                else:
                    # Fallback to basic connection (will likely get 403)
                    ws_url = self.config.server_url.replace('http://', 'ws://').replace('https://', 'wss://')
                    if not ws_url.endswith('/ws/investigation'):
                        ws_url += '/ws/investigation'
                    ws_headers = {
                        'Origin': 'http://localhost:8090',
                        'X-Olorin-Mode': 'demo'
                    }
                    self.log_monitoring_warning("WebSocket", "Using basic WebSocket connection (may fail with 403)")
                
                def on_message(ws, message):
                    try:
                        # Try to parse as JSON
                        if message.strip().startswith('{'):
                            data = json.loads(message)
                            self.log_websocket_message(
                                data.get('type', 'json'),
                                data,
                                data.get('investigation_id', 'unknown')
                            )
                        else:
                            self.log_websocket_message('text', message, 'unknown')
                    except json.JSONDecodeError:
                        # Log raw message if not JSON
                        self.log_websocket_message('raw', message, 'unknown')
                    except Exception as e:
                        self.log_monitoring_warning("WebSocket", f"Error processing message: {e}")
                
                def on_error(ws, error):
                    if "403 Forbidden" in str(error):
                        self.log_monitoring_error("WebSocket", f"Authentication failed (403 Forbidden) - JWT token missing or invalid")
                    else:
                        self.log_monitoring_error("WebSocket", f"Connection error: {error}")
                
                def on_close(ws, close_status_code, close_msg):
                    if close_status_code:
                        if close_status_code == 1008:  # Policy violation (auth failure)
                            self.log_monitoring_error("WebSocket", f"Authentication failed - JWT token rejected")
                        else:
                            self.log_monitoring_warning("WebSocket", f"Connection closed (code: {close_status_code}, msg: {close_msg})")
                    else:
                        self.log_monitoring_warning("WebSocket", "Connection closed")
                
                def on_open(ws):
                    self.log_monitoring_success("WebSocket", f"Connected to investigation stream")
                
                # Create WebSocket client with authentication
                self.websocket_client = websocket.WebSocketApp(
                    ws_url,
                    header=ws_headers,
                    on_message=on_message,
                    on_error=on_error,
                    on_close=on_close,
                    on_open=on_open
                )
                
                # Run forever with automatic reconnection
                self.websocket_client.run_forever(
                    ping_interval=30,
                    ping_timeout=10,
                    reconnect=3
                )
                
            except Exception as e:
                self.log_monitoring_error("WebSocket", f"Failed to start monitoring: {e}")
        
        if self.config.show_websocket:
            import threading
            thread = threading.Thread(target=websocket_monitor, daemon=True)
            thread.start()
            self.monitoring_threads.append(thread)'''
    
    # Replace the method
    new_content = re.sub(method_pattern, replacement_method + r'\\2', content, flags=re.DOTALL)
    
    # Write back the patched content
    with open(test_runner_path, 'w') as f:
        f.write(new_content)
    
    print("✅ WebSocket authentication patch applied successfully")
    print("🔧 WebSocket connections now include proper JWT authentication")
    
    return True


if __name__ == "__main__":
    # Apply the patch when run directly
    success = apply_websocket_auth_patch()
    if success:
        print("\n🎉 WebSocket authentication fix completed!")
        print("   - JWT tokens are now included in WebSocket connections")
        print("   - 403 Forbidden errors should be resolved")
        print("   - Proper error messages for authentication failures")
    else:
        print("\n❌ Failed to apply WebSocket authentication patch")
        print("   - Manual application may be required")