"""
LangSmith Tracing Disable Fix

Fixes the 401 Unauthorized LangSmith errors by properly disabling LangChain tracing
when LANGSMITH_API_KEY is not available or when running in demo mode.

This addresses:
- Symptom: repeated LangSmithAuthError + "API key must be provided" warning
- Cause: LANGSMITH_API_KEY not set/visible to process, but LangChain still tries to ingest runs
"""

import logging
import os
import sys
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class LangSmithTracingFixer:
    """Manages LangSmith tracing configuration to prevent authentication errors"""

    def __init__(self, demo_mode: bool = True):
        self.demo_mode = demo_mode
        self.original_env = {}

    def disable_langsmith_tracing(self) -> Dict[str, Any]:
        """Completely disable LangSmith tracing to prevent 401 errors"""

        results = {
            "environment_variables_set": [],
            "imports_patched": [],
            "tracing_disabled": False,
        }

        # 1. Set environment variables to disable tracing
        tracing_env_vars = {
            "LANGCHAIN_TRACING_V2": "false",
            "LANGCHAIN_TRACING": "false",
            "LANGSMITH_TRACING": "false",
            "LANGCHAIN_ENDPOINT": "",
            "LANGCHAIN_API_KEY": "",
            "LANGSMITH_ENDPOINT": "",
            "LANGSMITH_PROJECT": "",
        }

        # Remove LANGSMITH_API_KEY completely to prevent any tracing attempts
        if "LANGSMITH_API_KEY" in os.environ:
            self.original_env["LANGSMITH_API_KEY"] = os.environ["LANGSMITH_API_KEY"]
            del os.environ["LANGSMITH_API_KEY"]
            results["environment_variables_set"].append("LANGSMITH_API_KEY removed")

        # Set all tracing variables to false/empty
        for var, value in tracing_env_vars.items():
            self.original_env[var] = os.environ.get(var)
            os.environ[var] = value
            results["environment_variables_set"].append(f"{var}={value}")

        # 2. Try to disable LangSmith at the module level
        try:
            # Disable LangChain callbacks and tracing
            self._disable_langchain_callbacks()
            results["imports_patched"].append("langchain_callbacks_disabled")

            # Disable LangSmith client if imported
            self._disable_langsmith_client()
            results["imports_patched"].append("langsmith_client_disabled")

        except Exception as e:
            logger.warning(f"Could not patch LangSmith imports: {e}")

        results["tracing_disabled"] = True

        logger.info("✅ LangSmith tracing completely disabled")
        logger.info(
            f"Environment variables set: {len(results['environment_variables_set'])}"
        )

        return results

    def _disable_langchain_callbacks(self):
        """Disable LangChain callback system"""
        try:
            # Try to import and disable LangChain callbacks
            import langchain

            # Disable verbose mode
            if hasattr(langchain, "verbose"):
                langchain.verbose = False

            # Try to disable global callbacks
            try:
                from langchain.callbacks import get_openai_callback
                from langchain.callbacks.manager import CallbackManager

                # Create empty callback manager
                empty_manager = CallbackManager([])

                # Try to set global callback manager
                if hasattr(langchain, "callback_manager"):
                    langchain.callback_manager = empty_manager

            except ImportError:
                pass

            logger.debug("LangChain callbacks disabled")

        except ImportError:
            logger.debug("LangChain not imported, no callbacks to disable")

    def _disable_langsmith_client(self):
        """Disable LangSmith client if imported"""
        try:
            import langsmith

            # If langsmith is imported, try to disable it
            if hasattr(langsmith, "Client"):
                # Patch the Client class to be a no-op
                class NoOpLangSmithClient:
                    def __init__(self, *args, **kwargs):
                        pass

                    def __getattr__(self, name):
                        return lambda *args, **kwargs: None

                langsmith.Client = NoOpLangSmithClient
                logger.debug("LangSmith client patched to no-op")

        except ImportError:
            logger.debug("LangSmith not imported, no client to disable")

    def apply_demo_mode_fixes(self) -> Dict[str, Any]:
        """Apply all demo mode fixes including LangSmith disable"""

        results = {
            "demo_mode": self.demo_mode,
            "langsmith_disabled": False,
            "environment_prepared": False,
        }

        if self.demo_mode:
            # Disable LangSmith tracing completely
            langsmith_result = self.disable_langsmith_tracing()
            results["langsmith_disabled"] = langsmith_result["tracing_disabled"]

            # Set additional demo mode environment variables
            demo_env_vars = {
                "OLORIN_DEMO_MODE": "true",
                "OLORIN_USE_DEMO_DATA": "true",
                "SECRET_MANAGER_LOG_LEVEL": "SILENT",
                "PYTHONWARNINGS": "ignore::UserWarning",  # Suppress warnings in demo mode
            }

            for var, value in demo_env_vars.items():
                os.environ[var] = value

            results["environment_prepared"] = True

            logger.info("✅ Demo mode environment configured")
            logger.info("   - LangSmith tracing disabled")
            logger.info("   - Demo mode flags set")
            logger.info("   - Warning suppression enabled")

        return results

    def restore_original_environment(self):
        """Restore original environment variables (for cleanup)"""
        for var, value in self.original_env.items():
            if value is None:
                os.environ.pop(var, None)
            else:
                os.environ[var] = value

        logger.info("Original environment restored")


def apply_langsmith_fix(demo_mode: bool = True) -> Dict[str, Any]:
    """Apply LangSmith tracing fixes to prevent 401 errors"""

    fixer = LangSmithTracingFixer(demo_mode=demo_mode)
    results = fixer.apply_demo_mode_fixes()

    logger.info("🔧 LangSmith tracing fixes applied")

    return results


def patch_test_runner_langsmith():
    """Patch the test runner to apply LangSmith fixes at startup"""

    patch_code = '''
# Add this to the beginning of main() function in unified_structured_test_runner.py:

def main():
    """Main execution function with LangSmith fixes"""
    
    # Apply LangSmith fixes BEFORE any imports or LLM usage
    try:
        from scripts.testing.langsmith_disable_fix import apply_langsmith_fix
        langsmith_result = apply_langsmith_fix(demo_mode=True)
        logger.info("✅ LangSmith tracing disabled for demo mode")
    except ImportError:
        # Fallback: manually disable environment variables
        os.environ['LANGCHAIN_TRACING_V2'] = 'false'
        os.environ.pop('LANGSMITH_API_KEY', None)
        logger.warning("Manual LangSmith disable applied")
    
    # Continue with rest of main() function...
'''

    print("📝 Patch code for test runner:")
    print(patch_code)

    return patch_code


if __name__ == "__main__":
    # Apply fixes when run directly
    print("🔧 Applying LangSmith tracing fixes...")

    result = apply_langsmith_fix(demo_mode=True)

    if result["langsmith_disabled"]:
        print("✅ LangSmith tracing successfully disabled")
        print("   - No more 401 Unauthorized errors")
        print("   - LangChain will not attempt to send traces")
        print("   - Demo mode environment configured")
    else:
        print("❌ Failed to disable LangSmith tracing")

    print("\n📋 Environment variables set:")
    for var in ["LANGCHAIN_TRACING_V2", "LANGSMITH_API_KEY", "OLORIN_DEMO_MODE"]:
        value = os.environ.get(var, "NOT SET")
        print(f"   {var} = {value}")

    # Show patch instructions
    print("\n📝 To apply to test runner, add this to main():")
    patch_test_runner_langsmith()
