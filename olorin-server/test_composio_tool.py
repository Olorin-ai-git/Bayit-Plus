#!/usr/bin/env python3
"""
Test script specifically for ComposioTool to fix failures until it succeeds.
"""

import os
import sys
import asyncio
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load .env
from dotenv import load_dotenv
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path, override=True)
    print(f"✅ Loaded .env file: {env_path}")

# Set DEFAULT_TENANT_ID for testing
os.environ['DEFAULT_TENANT_ID'] = 'test_tenant_123'

from app.service.agent.tools.tool_registry import initialize_tools, get_tools_for_agent
from app.service.logging import get_bridge_logger
from app.service.logging.investigation_log_context import set_investigation_context
from app.persistence.database import get_db_session
from app.models.composio_connection import ComposioConnection
from datetime import datetime, timedelta

logger = get_bridge_logger(__name__)

async def test_composio_tool():
    """Test ComposioTool and fix failures until it succeeds."""
    print("\n" + "="*80)
    print("COMPOSIO TOOL TESTING AND FIXING")
    print("="*80 + "\n")
    
    # Initialize tools
    print("🔧 Initializing tool registry...")
    try:
        initialize_tools()
        print("✅ Tool registry initialized\n")
    except Exception as e:
        print(f"❌ Failed to initialize tools: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Get ComposioTool
    tools = get_tools_for_agent(categories=["olorin"])
    composio_tool = next((t for t in tools if t.name == "composio_action"), None)
    
    if not composio_tool:
        print("❌ ComposioTool not found!")
        return
    
    print(f"✅ Found ComposioTool: {composio_tool.name}\n")
    
    # Test 1: Without tenant_id (should fail gracefully)
    print("="*80)
    print("TEST 1: Without tenant_id")
    print("="*80)
    try:
        result = composio_tool.invoke({
            "toolkit": "stripe",
            "action": "void_payment",
            "connection_id": "test_connection",
            "parameters": {},
            "execution_id": "test_exec_123"
        })
        print(f"Result: {result[:300]}...")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 2: With tenant_id in input
    print("\n" + "="*80)
    print("TEST 2: With tenant_id in input")
    print("="*80)
    try:
        result = composio_tool.invoke({
            "toolkit": "stripe",
            "action": "void_payment",
            "connection_id": "test_connection_123",
            "parameters": {"payment_id": "pay_123"},
            "execution_id": "test_exec_456",
            "tenant_id": "test_tenant_123"
        })
        print(f"Result: {result[:500]}...")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 3: Create a test connection in database and try to use it
    print("\n" + "="*80)
    print("TEST 3: Create test connection and execute action")
    print("="*80)
    
    test_tenant_id = "test_tenant_123"
    test_connection_id = "test_composio_connection_123"
    
    try:
        # Create a test connection
        with get_db_session() as db:
            # Check if connection already exists
            existing = db.query(ComposioConnection).filter(
                ComposioConnection.connection_id == test_connection_id,
                ComposioConnection.tenant_id == test_tenant_id
            ).first()
            
            if not existing:
                print(f"🔧 Creating test ComposioConnection: tenant_id={test_tenant_id}, connection_id={test_connection_id}")
                
                # Encrypt the test token
                from app.service.composio.encryption import ComposioEncryption
                encryption = ComposioEncryption()
                encrypted_token = encryption.encrypt("test_access_token_123")
                encrypted_refresh = encryption.encrypt("test_refresh_token_123")
                
                test_connection = ComposioConnection(
                    tenant_id=test_tenant_id,
                    toolkit_name="stripe",
                    connection_id=test_connection_id,
                    encrypted_access_token=encrypted_token,
                    refresh_token=encrypted_refresh,
                    expires_at=datetime.utcnow() + timedelta(days=30),
                    status="active"
                )
                db.add(test_connection)
                db.commit()
                print(f"✅ Created test connection: {test_connection_id}")
            else:
                print(f"✅ Test connection already exists: {test_connection_id}")
    except Exception as e:
        print(f"⚠️ Could not create test connection: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 4: Try to execute action with the test connection
    print("\n" + "="*80)
    print("TEST 4: Execute action with test connection")
    print("="*80)
    try:
        result = composio_tool.invoke({
            "toolkit": "stripe",
            "action": "void_payment",
            "connection_id": test_connection_id,
            "parameters": {"payment_id": "pay_test_123"},
            "execution_id": "test_exec_789",
            "tenant_id": test_tenant_id
        })
        print(f"Result: {result[:500]}...")
        
        # Check if it's a success or expected error
        import json
        result_dict = json.loads(result)
        if result_dict.get("status") == "success":
            print("✅ ComposioTool executed successfully!")
        elif "connection" in result_dict.get("error", "").lower():
            print(f"⚠️ Expected connection error (Composio SDK not configured): {result_dict.get('error')}")
        elif "authentication" in result_dict.get("error", "").lower():
            print(f"⚠️ Expected authentication error (Composio credentials not configured): {result_dict.get('error')}")
        else:
            print(f"⚠️ Other error: {result_dict.get('error')}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 5: With investigation context metadata
    print("\n" + "="*80)
    print("TEST 5: With investigation context metadata")
    print("="*80)
    try:
        # Set investigation context with tenant_id
        set_investigation_context(
            investigation_id="test_investigation_123",
            metadata={"tenant_id": test_tenant_id, "entity_id": "test_entity"}
        )
        
        result = composio_tool.invoke({
            "toolkit": "stripe",
            "action": "void_payment",
            "connection_id": test_connection_id,
            "parameters": {"payment_id": "pay_test_456"},
            "execution_id": "test_exec_context"
            # tenant_id not provided - should come from context
        })
        print(f"Result: {result[:500]}...")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "="*80)
    print("TESTING COMPLETE")
    print("="*80 + "\n")

if __name__ == "__main__":
    asyncio.run(test_composio_tool())

