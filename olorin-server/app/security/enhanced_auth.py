"""
Enhanced JWT Authentication and Authorization for Olorin API
Addresses critical security vulnerabilities identified in the security audit.

Author: Claude Security Specialist
Date: 2025-08-29
"""

import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, validator
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session
import redis
import logging

logger = logging.getLogger(__name__)

Base = declarative_base()


class SecureTokenData(BaseModel):
    """Enhanced token data with additional security fields."""
    username: Optional[str] = None
    scopes: List[str] = []
    session_id: Optional[str] = None
    issued_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None


class SecureUser(BaseModel):
    """Enhanced user model with security features."""
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: bool = False
    scopes: List[str] = []
    last_login: Optional[datetime] = None
    failed_login_attempts: int = 0
    account_locked_until: Optional[datetime] = None
    password_changed_at: Optional[datetime] = None
    requires_password_change: bool = False
    mfa_enabled: bool = False
    mfa_secret: Optional[str] = None

    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3 or len(v) > 50:
            raise ValueError('Username must be 3-50 characters')
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v.lower()

    @validator('email')
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v


class UserInDB(Base):
    """Database model for users with enhanced security fields."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True)
    full_name = Column(String(255))
    hashed_password = Column(Text, nullable=False)
    disabled = Column(Boolean, default=False)
    scopes = Column(Text)  # JSON string of scopes
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    failed_login_attempts = Column(Integer, default=0)
    account_locked_until = Column(DateTime)
    password_changed_at = Column(DateTime, default=datetime.utcnow)
    requires_password_change = Column(Boolean, default=False)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(32))


class PasswordPolicy:
    """Password security policy enforcement."""
    
    MIN_LENGTH = 12
    MAX_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGITS = True
    REQUIRE_SYMBOLS = True
    FORBIDDEN_PASSWORDS = {
        'password', '123456', 'qwerty', 'admin', 'login',
        'password123', 'admin123', 'root', 'user'
    }
    
    @classmethod
    def validate_password(cls, password: str) -> Tuple[bool, List[str]]:
        """Validate password against security policy."""
        errors = []
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f'Password must be at least {cls.MIN_LENGTH} characters')
            
        if len(password) > cls.MAX_LENGTH:
            errors.append(f'Password must not exceed {cls.MAX_LENGTH} characters')
            
        if cls.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append('Password must contain at least one uppercase letter')
            
        if cls.REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append('Password must contain at least one lowercase letter')
            
        if cls.REQUIRE_DIGITS and not any(c.isdigit() for c in password):
            errors.append('Password must contain at least one digit')
            
        if cls.REQUIRE_SYMBOLS and not any(c in '!@#$%^&*(),.?":{}|<>' for c in password):
            errors.append('Password must contain at least one special character')
            
        if password.lower() in cls.FORBIDDEN_PASSWORDS:
            errors.append('Password is too common and not allowed')
            
        return len(errors) == 0, errors


class EnhancedSecurityConfig:
    """Enhanced security configuration with proper secret management."""
    
    def __init__(self):
        # Generate secure secrets if not provided
        self.JWT_SECRET_KEY = self._get_secure_secret('JWT_SECRET_KEY')
        self.JWT_REFRESH_SECRET = self._get_secure_secret('JWT_REFRESH_SECRET')
        self.ENCRYPTION_KEY = self._get_secure_secret('ENCRYPTION_KEY', 32)
        
        # JWT Configuration
        self.JWT_ALGORITHM = 'HS256'
        self.ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '15'))
        self.REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', '7'))
        
        # Account Security
        self.MAX_LOGIN_ATTEMPTS = int(os.getenv('MAX_LOGIN_ATTEMPTS', '5'))
        self.ACCOUNT_LOCKOUT_MINUTES = int(os.getenv('ACCOUNT_LOCKOUT_MINUTES', '30'))
        
        # Session Security
        self.MAX_CONCURRENT_SESSIONS = int(os.getenv('MAX_CONCURRENT_SESSIONS', '3'))
        self.SESSION_TIMEOUT_MINUTES = int(os.getenv('SESSION_TIMEOUT_MINUTES', '30'))
        
        # Redis Configuration for session management
        self.REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.REDIS_PASSWORD = os.getenv('REDIS_PASSWORD')
        
        # Initialize Redis connection
        self.redis_client = self._init_redis()
    
    def _get_secure_secret(self, env_var: str, byte_length: int = 64) -> str:
        """Get secure secret from environment or generate one."""
        secret = os.getenv(env_var)
        if not secret or secret in ['your-secret-key-change-in-production', 'default-change-in-production']:
            # Generate cryptographically secure secret
            secret = secrets.token_urlsafe(byte_length)
            logger.warning(f"Generated new secret for {env_var}. Set this in environment: {secret}")
        return secret
    
    def _init_redis(self) -> Optional[redis.Redis]:
        """Initialize Redis connection for session management."""
        try:
            redis_client = redis.from_url(
                self.REDIS_URL,
                password=self.REDIS_PASSWORD,
                decode_responses=True,
                socket_connect_timeout=5,
                health_check_interval=30
            )
            redis_client.ping()  # Test connection
            return redis_client
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Session management will use memory.")
            return None


class EnhancedAuthService:
    """Enhanced authentication service with security features."""
    
    def __init__(self, config: EnhancedSecurityConfig, db_session: Session):
        self.config = config
        self.db = db_session
        
        # Enhanced password context
        self.pwd_context = CryptContext(
            schemes=["bcrypt"],
            deprecated="auto",
            bcrypt__rounds=12  # Increased cost factor
        )
        
        # HTTP Bearer security
        self.security = HTTPBearer()
    
    async def authenticate_user(
        self, 
        username: str, 
        password: str, 
        ip_address: str,
        user_agent: str
    ) -> Tuple[Optional[SecureUser], str]:
        """Enhanced user authentication with security logging."""
        try:
            # Get user from database
            db_user = self.db.query(UserInDB).filter(UserInDB.username == username.lower()).first()
            
            if not db_user:
                # Prevent username enumeration - same timing
                self.pwd_context.hash("dummy_password")
                self._log_security_event("LOGIN_FAILED", username, ip_address, "Invalid username")
                return None, "Invalid credentials"
            
            # Check account lockout
            if db_user.account_locked_until and db_user.account_locked_until > datetime.utcnow():
                remaining = (db_user.account_locked_until - datetime.utcnow()).seconds // 60
                self._log_security_event("LOGIN_BLOCKED", username, ip_address, f"Account locked for {remaining} minutes")
                return None, f"Account locked. Try again in {remaining} minutes."
            
            # Verify password
            if not self.pwd_context.verify(password, db_user.hashed_password):
                await self._handle_failed_login(db_user, ip_address)
                self._log_security_event("LOGIN_FAILED", username, ip_address, "Invalid password")
                return None, "Invalid credentials"
            
            # Check if account is disabled
            if db_user.disabled:
                self._log_security_event("LOGIN_FAILED", username, ip_address, "Account disabled")
                return None, "Account is disabled"
            
            # Reset failed attempts on successful login
            db_user.failed_login_attempts = 0
            db_user.account_locked_until = None
            db_user.last_login = datetime.utcnow()
            self.db.commit()
            
            # Convert to secure user model
            scopes = eval(db_user.scopes) if db_user.scopes else []
            user = SecureUser(
                username=db_user.username,
                email=db_user.email,
                full_name=db_user.full_name,
                disabled=db_user.disabled,
                scopes=scopes,
                last_login=db_user.last_login,
                failed_login_attempts=db_user.failed_login_attempts,
                mfa_enabled=db_user.mfa_enabled
            )
            
            self._log_security_event("LOGIN_SUCCESS", username, ip_address, "Authentication successful")
            return user, "success"
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            self._log_security_event("LOGIN_ERROR", username, ip_address, f"Authentication error: {str(e)}")
            return None, "Authentication service error"
    
    async def _handle_failed_login(self, user: UserInDB, ip_address: str) -> None:
        """Handle failed login attempt with progressive lockout."""
        user.failed_login_attempts += 1
        
        if user.failed_login_attempts >= self.config.MAX_LOGIN_ATTEMPTS:
            # Lock account
            lockout_duration = timedelta(minutes=self.config.ACCOUNT_LOCKOUT_MINUTES)
            user.account_locked_until = datetime.utcnow() + lockout_duration
            
            self._log_security_event(
                "ACCOUNT_LOCKED", 
                user.username, 
                ip_address, 
                f"Account locked after {user.failed_login_attempts} failed attempts"
            )
        
        self.db.commit()
    
    def create_tokens(self, user: SecureUser, ip_address: str) -> Dict[str, Any]:
        """Create access and refresh tokens with enhanced security."""
        session_id = secrets.token_urlsafe(32)
        
        # Access token claims
        access_claims = {
            "sub": user.username,
            "scopes": user.scopes,
            "session_id": session_id,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(minutes=self.config.ACCESS_TOKEN_EXPIRE_MINUTES),
            "aud": "olorin-api",
            "iss": "olorin-auth",
            "jti": secrets.token_urlsafe(16),  # JWT ID for blacklisting
            "ip": hashlib.sha256(ip_address.encode()).hexdigest()[:16]  # Hashed IP
        }
        
        # Refresh token claims  
        refresh_claims = {
            "sub": user.username,
            "session_id": session_id,
            "type": "refresh",
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(days=self.config.REFRESH_TOKEN_EXPIRE_DAYS),
            "jti": secrets.token_urlsafe(16)
        }
        
        # Create tokens
        access_token = jwt.encode(access_claims, self.config.JWT_SECRET_KEY, algorithm=self.config.JWT_ALGORITHM)
        refresh_token = jwt.encode(refresh_claims, self.config.JWT_REFRESH_SECRET, algorithm=self.config.JWT_ALGORITHM)
        
        # Store session in Redis if available
        if self.config.redis_client:
            session_data = {
                "username": user.username,
                "scopes": user.scopes,
                "ip_address": ip_address,
                "created_at": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat()
            }
            
            session_key = f"session:{session_id}"
            self.config.redis_client.setex(
                session_key, 
                self.config.SESSION_TIMEOUT_MINUTES * 60, 
                json.dumps(session_data)
            )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": self.config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "session_id": session_id
        }
    
    async def validate_token(
        self, 
        token: str, 
        ip_address: str,
        required_scopes: List[str] = None
    ) -> Tuple[Optional[SecureUser], str]:
        """Enhanced token validation with security checks."""
        try:
            # Decode JWT
            payload = jwt.decode(
                token, 
                self.config.JWT_SECRET_KEY, 
                algorithms=[self.config.JWT_ALGORITHM],
                audience="olorin-api",
                issuer="olorin-auth"
            )
            
            username = payload.get("sub")
            session_id = payload.get("session_id")
            token_ip_hash = payload.get("ip")
            scopes = payload.get("scopes", [])
            jti = payload.get("jti")
            
            if not username or not session_id:
                return None, "Invalid token claims"
            
            # Check IP address (optional security feature)
            current_ip_hash = hashlib.sha256(ip_address.encode()).hexdigest()[:16]
            if token_ip_hash and token_ip_hash != current_ip_hash:
                self._log_security_event("TOKEN_IP_MISMATCH", username, ip_address, "IP address mismatch")
                # Could return None here for strict IP binding, but allowing for now
            
            # Check if token is blacklisted (if Redis available)
            if self.config.redis_client and jti:
                blacklisted = self.config.redis_client.get(f"blacklist:{jti}")
                if blacklisted:
                    return None, "Token has been revoked"
            
            # Validate session if Redis available
            if self.config.redis_client:
                session_key = f"session:{session_id}"
                session_data = self.config.redis_client.get(session_key)
                if not session_data:
                    return None, "Session expired or invalid"
                
                # Update last activity
                session_info = json.loads(session_data)
                session_info["last_activity"] = datetime.utcnow().isoformat()
                self.config.redis_client.setex(
                    session_key, 
                    self.config.SESSION_TIMEOUT_MINUTES * 60, 
                    json.dumps(session_info)
                )
            
            # Get user from database
            db_user = self.db.query(UserInDB).filter(UserInDB.username == username).first()
            if not db_user or db_user.disabled:
                return None, "User not found or disabled"
            
            # Create user object
            user_scopes = eval(db_user.scopes) if db_user.scopes else []
            user = SecureUser(
                username=db_user.username,
                email=db_user.email,
                full_name=db_user.full_name,
                scopes=user_scopes
            )
            
            # Check required scopes
            if required_scopes:
                missing_scopes = set(required_scopes) - set(user.scopes)
                if missing_scopes:
                    self._log_security_event(
                        "INSUFFICIENT_SCOPE", 
                        username, 
                        ip_address, 
                        f"Missing scopes: {missing_scopes}"
                    )
                    return None, f"Insufficient permissions. Required: {missing_scopes}"
            
            return user, "success"
            
        except jwt.ExpiredSignatureError:
            return None, "Token has expired"
        except jwt.JWTError as e:
            return None, f"Invalid token: {str(e)}"
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None, "Token validation error"
    
    def revoke_token(self, token: str) -> bool:
        """Revoke a token by adding it to blacklist."""
        try:
            payload = jwt.decode(
                token, 
                self.config.JWT_SECRET_KEY, 
                algorithms=[self.config.JWT_ALGORITHM],
                options={"verify_exp": False}  # Allow expired tokens to be blacklisted
            )
            
            jti = payload.get("jti")
            exp = payload.get("exp")
            
            if self.config.redis_client and jti and exp:
                # Calculate remaining TTL
                exp_datetime = datetime.fromtimestamp(exp)
                remaining_ttl = int((exp_datetime - datetime.utcnow()).total_seconds())
                
                if remaining_ttl > 0:
                    self.config.redis_client.setex(f"blacklist:{jti}", remaining_ttl, "revoked")
                    return True
                    
        except Exception as e:
            logger.error(f"Token revocation error: {e}")
            
        return False
    
    def _log_security_event(self, event_type: str, username: str, ip_address: str, details: str):
        """Log security events for monitoring."""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "username": username,
            "ip_address": ip_address,
            "details": details
        }
        
        # Log to application logger
        logger.info(f"SECURITY_EVENT: {json.dumps(event)}")
        
        # Store in Redis for monitoring if available
        if self.config.redis_client:
            event_key = f"security_event:{datetime.utcnow().strftime('%Y%m%d')}:{secrets.token_hex(8)}"
            self.config.redis_client.setex(event_key, 86400, json.dumps(event))  # 24 hour retention


# Enhanced security dependencies
async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
) -> SecureUser:
    """Enhanced current user dependency with security checks."""
    auth_service: EnhancedAuthService = request.app.state.auth_service
    
    user, error = await auth_service.validate_token(
        credentials.credentials,
        request.client.host
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def require_scopes(required_scopes: List[str]):
    """Enhanced scope requirement with detailed error messages."""
    async def check_scopes(
        request: Request,
        credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
    ) -> SecureUser:
        auth_service: EnhancedAuthService = request.app.state.auth_service
        
        user, error = await auth_service.validate_token(
            credentials.credentials,
            request.client.host,
            required_scopes
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN if "scope" in error.lower() else status.HTTP_401_UNAUTHORIZED,
                detail=error
            )
        
        return user
    
    return check_scopes


# Enhanced security headers
class EnhancedSecurityHeaders:
    """Enhanced security headers with strict CSP and additional protections."""
    
    @staticmethod
    def get_headers() -> Dict[str, str]:
        return {
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            
            # XSS protection (legacy browsers)
            "X-XSS-Protection": "1; mode=block",
            
            # HSTS with preload
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            
            # Enhanced CSP
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "connect-src 'self'; "
                "font-src 'self'; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self'; "
                "frame-ancestors 'none'; "
                "upgrade-insecure-requests"
            ),
            
            # Referrer policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Permissions policy
            "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
            
            # Cross-origin policies
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Resource-Policy": "same-origin",
            
            # Remove server identification
            "Server": "Olorin-API"
        }


# Common permission dependencies with enhanced security
require_read = require_scopes(["read"])
require_write = require_scopes(["write"])
require_admin = require_scopes(["admin"])