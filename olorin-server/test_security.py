#!/usr/bin/env python3
"""
Security validation script for Olorin application
"""

import sys
import os
import asyncio
import httpx
from typing import List, Dict, Any

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.security.config import get_security_config
from app.security.auth import verify_password, get_password_hash, create_access_token
from app.security.encryption import DataEncryption, FieldEncryption
from app.models.validation import ValidatedUserID, ValidatedInvestigationRequest


class SecurityTester:
    """Security testing and validation."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.config = get_security_config()
        self.test_results = []
    
    def log_test(self, test_name: str, passed: bool, message: str = ""):
        """Log test result."""
        status = "✅ PASS" if passed else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "message": message
        })
        print(f"{status} {test_name}: {message}")
    
    def test_configuration_security(self):
        """Test security configuration."""
        print("\n🔧 Testing Security Configuration...")
        
        # Test production validation
        issues = self.config.validate_production_settings()
        if self.config.is_production and issues:
            self.log_test("Production Config", False, f"Issues: {', '.join(issues)}")
        else:
            self.log_test("Production Config", True, "Configuration validated")
        
        # Test JWT secret strength
        if len(self.config.jwt_secret_key) < 32:
            self.log_test("JWT Secret Length", False, "JWT secret should be at least 32 characters")
        else:
            self.log_test("JWT Secret Length", True, "JWT secret length adequate")
    
    def test_password_security(self):
        """Test password hashing and verification."""
        print("\n🔐 Testing Password Security...")
        
        # Test password hashing
        password = "test_password_123"
        hashed = get_password_hash(password)
        
        # Verify password
        if verify_password(password, hashed):
            self.log_test("Password Hashing", True, "Password hashing works correctly")
        else:
            self.log_test("Password Hashing", False, "Password verification failed")
        
        # Test wrong password
        if not verify_password("wrong_password", hashed):
            self.log_test("Password Rejection", True, "Wrong passwords correctly rejected")
        else:
            self.log_test("Password Rejection", False, "Wrong password accepted")
    
    def test_jwt_tokens(self):
        """Test JWT token creation and validation."""
        print("\n🎫 Testing JWT Tokens...")
        
        try:
            # Create token
            token = create_access_token(
                data={"sub": "testuser", "scopes": ["read"]}
            )
            
            if token and len(token) > 0:
                self.log_test("JWT Creation", True, "JWT token created successfully")
            else:
                self.log_test("JWT Creation", False, "JWT token creation failed")
        
        except Exception as e:
            self.log_test("JWT Creation", False, f"Error: {e}")
    
    def test_encryption(self):
        """Test data encryption functionality."""
        print("\n🔒 Testing Data Encryption...")
        
        try:
            encryption = DataEncryption()
            
            # Test string encryption
            test_data = "sensitive_user_data_123"
            encrypted = encryption.encrypt(test_data)
            decrypted = encryption.decrypt(encrypted)
            
            if decrypted == test_data:
                self.log_test("String Encryption", True, "String encryption/decryption works")
            else:
                self.log_test("String Encryption", False, "String decryption mismatch")
            
            # Test dict encryption
            test_dict = {"user_id": "user123", "email": "test@example.com"}
            encrypted_dict = encryption.encrypt(test_dict)
            decrypted_dict = encryption.decrypt(encrypted_dict)
            
            if decrypted_dict == test_dict:
                self.log_test("Dict Encryption", True, "Dictionary encryption/decryption works")
            else:
                self.log_test("Dict Encryption", False, "Dictionary decryption mismatch")
        
        except Exception as e:
            self.log_test("Encryption", False, f"Error: {e}")
    
    def test_field_encryption(self):
        """Test field-level encryption."""
        print("\n🏷️ Testing Field Encryption...")
        
        try:
            field_enc = FieldEncryption()
            
            # Test sensitive field detection
            sensitive_data = {
                "user_id": "user123",
                "name": "John Doe",
                "email": "john@example.com",
                "api_key": "secret_key_123"
            }
            
            encrypted_data = field_enc.encrypt_dict(sensitive_data)
            decrypted_data = field_enc.decrypt_dict(encrypted_data)
            
            # Check that sensitive fields were encrypted
            has_encrypted_fields = any(key.startswith("enc_") for key in encrypted_data.keys())
            
            if has_encrypted_fields:
                self.log_test("Field Encryption", True, "Sensitive fields encrypted")
            else:
                self.log_test("Field Encryption", False, "No fields were encrypted")
            
            # Check decryption accuracy
            if decrypted_data == sensitive_data:
                self.log_test("Field Decryption", True, "Field decryption accurate")
            else:
                self.log_test("Field Decryption", False, "Field decryption mismatch")
        
        except Exception as e:
            self.log_test("Field Encryption", False, f"Error: {e}")
    
    def test_input_validation(self):
        """Test input validation models."""
        print("\n✅ Testing Input Validation...")
        
        # Test valid user ID
        try:
            valid_user = ValidatedUserID(user_id="user123")
            self.log_test("Valid User ID", True, "Valid user ID accepted")
        except Exception as e:
            self.log_test("Valid User ID", False, f"Error: {e}")
        
        # Test invalid user ID with script injection
        try:
            invalid_user = ValidatedUserID(user_id="<script>alert('xss')</script>")
            self.log_test("XSS User ID", False, "XSS in user ID was accepted")
        except Exception:
            self.log_test("XSS User ID", True, "XSS in user ID was rejected")
        
        # Test SQL injection in investigation request
        try:
            malicious_request = ValidatedInvestigationRequest(
                entity_id="'; DROP TABLE users; --",
                entity_type="user_id",
                investigation_id="test123",
                time_range="30d"
            )
            self.log_test("SQL Injection", False, "SQL injection was accepted")
        except Exception:
            self.log_test("SQL Injection", True, "SQL injection was rejected")
    
    async def test_api_security(self):
        """Test API endpoint security."""
        print("\n🌐 Testing API Security...")
        
        async with httpx.AsyncClient() as client:
            # Test unauthorized access
            try:
                response = await client.get(f"{self.base_url}/api/investigations")
                if response.status_code == 401:
                    self.log_test("API Authentication", True, "Unauthorized access blocked")
                else:
                    self.log_test("API Authentication", False, f"Got status {response.status_code} instead of 401")
            except Exception as e:
                self.log_test("API Authentication", False, f"Error testing API: {e}")
            
            # Test rate limiting (if enabled)
            try:
                # Make multiple rapid requests
                responses = []
                for i in range(10):
                    resp = await client.get(f"{self.base_url}/health")
                    responses.append(resp.status_code)
                
                # Check if any were rate limited
                if 429 in responses:
                    self.log_test("Rate Limiting", True, "Rate limiting active")
                else:
                    self.log_test("Rate Limiting", False, "No rate limiting detected")
            except Exception as e:
                self.log_test("Rate Limiting", False, f"Error: {e}")
    
    def test_security_headers(self):
        """Test security headers."""
        print("\n📋 Testing Security Headers...")
        
        try:
            from app.security.auth import SecurityHeaders
            headers = SecurityHeaders.get_headers()
            
            required_headers = [
                "X-Content-Type-Options",
                "X-Frame-Options",
                "X-XSS-Protection",
                "Content-Security-Policy"
            ]
            
            missing_headers = [h for h in required_headers if h not in headers]
            
            if not missing_headers:
                self.log_test("Security Headers", True, "All required headers present")
            else:
                self.log_test("Security Headers", False, f"Missing headers: {missing_headers}")
        
        except Exception as e:
            self.log_test("Security Headers", False, f"Error: {e}")
    
    async def run_all_tests(self):
        """Run all security tests."""
        print("🔐 Starting Olorin Security Test Suite\n")
        
        self.test_configuration_security()
        self.test_password_security()
        self.test_jwt_tokens()
        self.test_encryption()
        self.test_field_encryption()
        self.test_input_validation()
        self.test_security_headers()
        await self.test_api_security()
        
        # Summary
        print("\n📊 Test Summary:")
        passed = sum(1 for result in self.test_results if result["passed"])
        total = len(self.test_results)
        
        print(f"Passed: {passed}/{total}")
        print(f"Failed: {total - passed}/{total}")
        
        if passed == total:
            print("🎉 All security tests passed!")
            return True
        else:
            print("⚠️ Some security tests failed. Please review the issues above.")
            return False


async def main():
    """Main test runner."""
    tester = SecurityTester()
    success = await tester.run_all_tests()
    
    # Exit with error code if tests failed
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())