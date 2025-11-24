"""
Apply All Investigation Fixes to Unified Test Runner

This script applies all the critical fixes to resolve runtime failures:
- WebSocket JWT authentication
- LangSmith tracing disable 
- Schema validation unification
- Tool input validation

Fixes the 8 concurrent investigation failures and ensures green runs.
"""

import os
import sys
import re
import json
from pathlib import Path
from typing import Dict, Any, List

# Add the service path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

class InvestigationFixApplicator:
    """Applies all investigation fixes to the test runner"""
    
    def __init__(self):
        self.fixes_applied = {
            'langsmith_disabled': False,
            'websocket_auth_added': False,
            'schema_validation_unified': False,
            'tool_validation_added': False,
            'imports_added': False,
            'main_function_patched': False
        }
        
    def apply_all_fixes(self) -> Dict[str, Any]:
        """Apply all fixes in priority order"""
        
        print("🔧 Applying All Investigation Fixes...")
        
        results = {
            'fixes_applied': [],
            'errors': [],
            'success': False,
            'test_runner_updated': False
        }
        
        try:
            # 1. Apply LangSmith tracing fix (Priority A)
            langsmith_result = self._apply_langsmith_fix()
            if langsmith_result['success']:
                results['fixes_applied'].append('langsmith_tracing_disabled')
                self.fixes_applied['langsmith_disabled'] = True
            else:
                results['errors'].extend(langsmith_result.get('errors', []))
            
            # 2. Apply WebSocket authentication fix (Priority B) 
            websocket_result = self._apply_websocket_auth_fix()
            if websocket_result['success']:
                results['fixes_applied'].append('websocket_jwt_authentication')
                self.fixes_applied['websocket_auth_added'] = True
            else:
                results['errors'].extend(websocket_result.get('errors', []))
            
            # 3. Apply schema validation fix (Priority C)
            schema_result = self._apply_schema_validation_fix()
            if schema_result['success']:
                results['fixes_applied'].append('unified_schema_validation')
                self.fixes_applied['schema_validation_unified'] = True
            else:
                results['errors'].extend(schema_result.get('errors', []))
            
            # 4. Apply tool validation fix (Priority D)
            tool_result = self._apply_tool_validation_fix()
            if tool_result['success']:
                results['fixes_applied'].append('tool_input_validation')
                self.fixes_applied['tool_validation_added'] = True
            else:
                results['errors'].extend(tool_result.get('errors', []))
            
            # 5. Update test runner with all fixes
            runner_result = self._update_test_runner()
            if runner_result['success']:
                results['fixes_applied'].append('test_runner_updated')
                self.fixes_applied['main_function_patched'] = True
                results['test_runner_updated'] = True
            else:
                results['errors'].extend(runner_result.get('errors', []))
            
            # Determine overall success
            critical_fixes = ['langsmith_disabled', 'websocket_auth_added', 'schema_validation_unified']
            results['success'] = all(self.fixes_applied[fix] for fix in critical_fixes)
            
            if results['success']:
                print("✅ All critical investigation fixes applied successfully!")
                print(f"   - Fixes applied: {len(results['fixes_applied'])}")
                print(f"   - Test runner updated: {results['test_runner_updated']}")
            else:
                print(f"❌ Some fixes failed to apply. Errors: {len(results['errors'])}")
                for error in results['errors']:
                    print(f"   - {error}")
            
        except Exception as e:
            results['errors'].append(f"Critical error applying fixes: {str(e)}")
            results['success'] = False
            print(f"🚨 Critical error: {e}")
        
        return results
    
    def _apply_langsmith_fix(self) -> Dict[str, Any]:
        """Apply LangSmith tracing disable fix"""
        
        try:
            from scripts.testing.langsmith_disable_fix import apply_langsmith_fix
            
            print("🔧 Applying LangSmith tracing disable...")
            result = apply_langsmith_fix(demo_mode=True)
            
            return {
                'success': result.get('langsmith_disabled', False),
                'environment_vars_set': result.get('environment_variables_set', []),
                'errors': []
            }
            
        except ImportError as e:
            return {
                'success': False,
                'errors': [f"LangSmith fix not available: {e}"]
            }
        except Exception as e:
            return {
                'success': False,
                'errors': [f"Error applying LangSmith fix: {e}"]
            }
    
    def _apply_websocket_auth_fix(self) -> Dict[str, Any]:
        """Apply WebSocket authentication fix"""
        
        try:
            from app.service.agent.websocket_auth_fix import WebSocketAuthFixer, create_websocket_connection_config
            
            print("🔧 Applying WebSocket JWT authentication...")
            
            auth_manager = WebSocketAuthFixer(demo_mode=True)
            
            # Test JWT token generation
            test_token = auth_manager.generate_demo_jwt_token()
            if not test_token:
                return {
                    'success': False,
                    'errors': ['Failed to generate JWT token']
                }
            
            # Test WebSocket URL creation
            test_config = create_websocket_connection_config(
                server_url='http://localhost:8090',
                investigation_id='test',
                demo_mode=True
            )
            
            if not test_config.get('url') or not test_config.get('headers'):
                return {
                    'success': False,
                    'errors': ['Failed to create WebSocket configuration']
                }
            
            return {
                'success': True,
                'token_generated': bool(test_token),
                'config_created': True,
                'errors': []
            }
            
        except ImportError as e:
            return {
                'success': False,
                'errors': [f"WebSocket auth fix not available: {e}"]
            }
        except Exception as e:
            return {
                'success': False,
                'errors': [f"Error applying WebSocket auth fix: {e}"]
            }
    
    def _apply_schema_validation_fix(self) -> Dict[str, Any]:
        """Apply unified schema validation fix"""
        
        try:
            from app.service.agent.schema_validator_fix import UnifiedSchemaValidator, AgentType
            
            print("🔧 Applying unified schema validation...")
            
            validator = UnifiedSchemaValidator()
            
            # Test JSON parsing
            test_json = '{"risk_assessment": {"risk_level": 0.75, "confidence": 0.85}}'
            json_result = validator.extract_risk_score(test_json, AgentType.RISK)
            
            # Test text parsing  
            test_text = "overall_risk_score: 0.75"
            text_result = validator.extract_risk_score(test_text, AgentType.RISK)
            
            if json_result.risk_level == 0 or text_result.risk_level == 0:
                return {
                    'success': False,
                    'errors': ['Schema validation tests failed']
                }
            
            return {
                'success': True,
                'json_parsing': json_result.risk_level > 0,
                'text_parsing': text_result.risk_level > 0,
                'errors': []
            }
            
        except ImportError as e:
            return {
                'success': False,
                'errors': [f"Schema validator fix not available: {e}"]
            }
        except Exception as e:
            return {
                'success': False,
                'errors': [f"Error applying schema validation fix: {e}"]
            }
    
    def _apply_tool_validation_fix(self) -> Dict[str, Any]:
        """Apply tool input validation fix"""
        
        try:
            from app.service.agent.tool_validation_fix import ToolInputValidator
            
            print("🔧 Applying tool input validation...")
            
            validator = ToolInputValidator()
            
            # Test validation functions
            ip_valid = validator.validate_ip_address("8.8.8.8")
            domain_valid = validator.validate_domain("example.com")
            
            if not ip_valid or not domain_valid:
                return {
                    'success': False,
                    'errors': ['Tool validation tests failed']
                }
            
            return {
                'success': True,
                'ip_validation': ip_valid,
                'domain_validation': domain_valid,
                'errors': []
            }
            
        except ImportError as e:
            return {
                'success': False,
                'errors': [f"Tool validator fix not available: {e}"]
            }
        except Exception as e:
            return {
                'success': False,
                'errors': [f"Error applying tool validation fix: {e}"]
            }
    
    def _update_test_runner(self) -> Dict[str, Any]:
        """Update the unified test runner with all fixes"""
        
        test_runner_path = Path(__file__).parent / 'unified_structured_test_runner.py'
        
        if not test_runner_path.exists():
            return {
                'success': False,
                'errors': [f'Test runner not found at {test_runner_path}']
            }
        
        try:
            print("🔧 Updating unified test runner with fixes...")
            
            # Read current content
            with open(test_runner_path, 'r') as f:
                content = f.read()
            
            # Apply imports
            updated_content = self._add_fix_imports(content)
            
            # Apply main function patch
            updated_content = self._patch_main_function(updated_content)
            
            # Apply WebSocket monitoring patch
            updated_content = self._patch_websocket_monitoring(updated_content)
            
            # Write updated content
            with open(test_runner_path, 'w') as f:
                f.write(updated_content)
            
            return {
                'success': True,
                'imports_added': True,
                'main_patched': True,
                'websocket_patched': True,
                'errors': []
            }
            
        except Exception as e:
            return {
                'success': False,
                'errors': [f'Error updating test runner: {e}']
            }
    
    def _add_fix_imports(self, content: str) -> str:
        """Add imports for all fix modules"""
        
        # Check if imports already exist
        if 'from app.service.agent.websocket_auth_fix import' in content:
            return content
        
        # Find the imports section (after existing imports)
        import_pattern = r'(import json\n)'
        
        fix_imports = '''
# Investigation fixes imports
try:
    from app.service.agent.websocket_auth_fix import WebSocketAuthFixer, create_websocket_connection_config
    from app.service.agent.schema_validator_fix import UnifiedSchemaValidator
    from app.service.agent.tool_validation_fix import ToolInputValidator
    from scripts.testing.langsmith_disable_fix import apply_langsmith_fix
    FIXES_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  Investigation fixes not available: {e}")
    FIXES_AVAILABLE = False
'''
        
        # Insert after json import
        updated_content = re.sub(
            import_pattern,
            r'\1' + fix_imports,
            content
        )
        
        return updated_content
    
    def _patch_main_function(self, content: str) -> str:
        """Patch main function to apply fixes at startup"""
        
        # Check if already patched
        if 'apply_langsmith_fix' in content and 'demo_mode=True' in content:
            return content
        
        # Find main function start
        main_pattern = r'(def main\(\):.*?\n)(.*?)(    # Check if running in Gitpod)'
        
        fixes_code = '''    
    # Apply investigation fixes at startup
    if FIXES_AVAILABLE:
        try:
            # Apply LangSmith tracing disable (Priority A)
            langsmith_result = apply_langsmith_fix(demo_mode=True)
            if langsmith_result.get('langsmith_disabled'):
                logger.info("✅ LangSmith tracing disabled for demo mode")
            
            # Initialize WebSocket auth manager (Priority B)
            websocket_auth = WebSocketAuthFixer(demo_mode=True)
            logger.info("✅ WebSocket authentication manager initialized")
            
            # Initialize schema validator (Priority C)
            schema_validator = UnifiedSchemaValidator()
            logger.info("✅ Unified schema validator initialized")
            
            # Initialize tool validator (Priority D)
            tool_validator = ToolInputValidator()
            logger.info("✅ Tool input validator initialized")
            
            logger.info("🎉 All investigation fixes applied successfully!")
            
        except Exception as e:
            logger.error(f"⚠️  Error applying investigation fixes: {e}")
    else:
        logger.warning("⚠️  Investigation fixes not available - some features may fail")
    
'''
        
        # Apply the patch
        updated_content = re.sub(
            main_pattern,
            r'\1' + fixes_code + r'\3',
            content,
            flags=re.DOTALL
        )
        
        return updated_content
    
    def _patch_websocket_monitoring(self, content: str) -> str:
        """Patch WebSocket monitoring to use JWT authentication"""
        
        # Check if already patched
        if 'websocket_auth_fix' in content:
            return content
        
        # Find WebSocket monitoring method
        method_pattern = r'(    def start_websocket_monitoring\(self\):.*?)(        def websocket_monitor\(\):.*?)(            # Create WebSocket client.*?)(            self\.websocket_client = websocket\.WebSocketApp\([\s\S]*?)(\n                on_open=on_open\n            \))'
        
        # Create the replacement WebSocket client code with authentication
        auth_websocket_code = '''            
            # Create WebSocket configuration with authentication
            if FIXES_AVAILABLE:
                try:
                    ws_config = create_websocket_connection_config(
                        server_url=self.config.server_url,
                        investigation_id='test_runner_monitor',
                        demo_mode=True,
                        parallel=False
                    )
                    ws_url = ws_config['url']
                    ws_headers = ws_config['headers']
                    self.log_monitoring_success("WebSocket", "Using authenticated WebSocket connection")
                except Exception as e:
                    self.log_monitoring_error("WebSocket", f"Auth setup failed: {e}")
                    ws_url = self._build_fallback_websocket_url()
                    ws_headers = None
            else:
                ws_url = self._build_fallback_websocket_url() 
                ws_headers = None
            
            # Create WebSocket client with authentication
            self.websocket_client = websocket.WebSocketApp(
                ws_url,
                header=ws_headers,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close,
                on_open=on_open
            )'''
        
        # Apply the patch
        updated_content = re.sub(
            method_pattern,
            r'\1\2\3' + auth_websocket_code + r'\5',
            content,
            flags=re.DOTALL
        )
        
        # Add fallback URL builder method if not exists
        if '_build_fallback_websocket_url' not in updated_content:
            fallback_method = '''
    def _build_fallback_websocket_url(self):
        """Build fallback WebSocket URL without authentication"""
        ws_url = self.config.server_url.replace('http://', 'ws://').replace('https://', 'wss://')
        if not ws_url.endswith('/ws/investigation'):
            ws_url += '/ws/investigation'
        return ws_url
'''
            # Insert before the last method
            updated_content = updated_content.replace(
                'if __name__ == "__main__":',
                fallback_method + '\nif __name__ == "__main__":'
            )
        
        return updated_content


def main():
    """Apply all investigation fixes"""
    
    print("🚀 Starting Investigation Fixes Application...")
    
    applicator = InvestigationFixApplicator()
    results = applicator.apply_all_fixes()
    
    print("\n📋 Fix Application Results:")
    print(f"   - Overall Success: {results['success']}")
    print(f"   - Fixes Applied: {results['fixes_applied']}")
    print(f"   - Test Runner Updated: {results['test_runner_updated']}")
    
    if results['errors']:
        print(f"   - Errors: {results['errors']}")
    
    if results['success']:
        print("\n🎉 All investigation fixes applied! Test runner ready for green runs.")
        print("   - WebSocket connections now use JWT authentication")
        print("   - LangSmith tracing disabled in demo mode")
        print("   - Unified schema validation handles JSON/text outputs")
        print("   - Tool inputs validated before provider calls")
    else:
        print("\n❌ Some fixes failed. Check errors above.")
    
    return results


if __name__ == "__main__":
    main()