#!/usr/bin/env python3
"""Test that environment variable validation works correctly."""

import os
import sys

# Clear the environment variable to test error handling
if "SNOWFLAKE_DATABASE" in os.environ:
    del os.environ["SNOWFLAKE_DATABASE"]

try:
    from app.service.agent.tools.snowflake_tool.schema_constants import (
        get_required_env_var,
    )

    # This should raise an error since SNOWFLAKE_DATABASE is not set
    result = get_required_env_var("SNOWFLAKE_DATABASE")
    print(f"ERROR: Should have raised an error but got: {result}")
    sys.exit(1)

except ValueError as e:
    print(f"✅ SUCCESS: Properly caught missing environment variable error: {e}")
    sys.exit(0)

except Exception as e:
    print(f"❌ UNEXPECTED ERROR: {e}")
    sys.exit(1)
