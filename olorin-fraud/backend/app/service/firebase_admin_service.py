"""
Firebase Admin SDK Service for authentication and RBAC
Handles token verification and custom claims management
"""

import os
from functools import lru_cache
from typing import Optional

import firebase_admin
from firebase_admin import auth, credentials
from pydantic import BaseModel

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class FirebaseUserClaims(BaseModel):
    """User claims from Firebase token"""

    uid: str
    email: str
    name: str
    role: str
    permissions: list[str]
    email_verified: bool


class FirebaseAdminServiceClass:
    """
    Singleton service for Firebase Admin SDK operations.
    Handles token verification and custom claims management.
    """

    _initialized: bool = False

    def initialize(self) -> bool:
        """
        Initialize Firebase Admin SDK with service account credentials.
        Returns True if initialization succeeds.
        """
        if self._initialized:
            return True

        try:
            # Check for existing Firebase app
            try:
                firebase_admin.get_app()
                self._initialized = True
                logger.info("Firebase Admin SDK already initialized")
                return True
            except ValueError:
                pass

            # Initialize with credentials from environment
            project_id = os.getenv("FIREBASE_PROJECT_ID")
            if not project_id:
                logger.error("FIREBASE_PROJECT_ID environment variable not set")
                return False

            # Try to use default credentials (for Cloud Run/GCP environments)
            # or service account file if GOOGLE_APPLICATION_CREDENTIALS is set
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {"projectId": project_id})

            self._initialized = True
            logger.info(f"Firebase Admin SDK initialized for project: {project_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
            return False

    def verify_id_token(self, id_token: str) -> Optional[FirebaseUserClaims]:
        """
        Verify Firebase ID token and return user claims.
        Returns None if verification fails.
        """
        if not self._initialized and not self.initialize():
            logger.error("Firebase Admin SDK not initialized")
            return None

        try:
            decoded_token = auth.verify_id_token(id_token)

            return FirebaseUserClaims(
                uid=decoded_token["uid"],
                email=decoded_token.get("email", ""),
                name=decoded_token.get("name", ""),
                role=decoded_token.get("role", "viewer"),
                permissions=decoded_token.get("permissions", []),
                email_verified=decoded_token.get("email_verified", False),
            )

        except auth.InvalidIdTokenError as e:
            logger.warning(f"Invalid Firebase ID token: {e}")
            return None
        except auth.ExpiredIdTokenError as e:
            logger.warning(f"Expired Firebase ID token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error verifying Firebase token: {e}")
            return None

    def set_custom_claims(
        self, uid: str, role: str, permissions: Optional[list[str]] = None
    ) -> bool:
        """
        Set custom claims (role, permissions) for a user.
        Only admins should call this method.
        """
        if not self._initialized and not self.initialize():
            logger.error("Firebase Admin SDK not initialized")
            return False

        try:
            claims = {"role": role}
            if permissions:
                claims["permissions"] = permissions

            auth.set_custom_user_claims(uid, claims)
            logger.info(f"Set custom claims for user {uid}: role={role}")
            return True

        except Exception as e:
            logger.error(f"Failed to set custom claims for user {uid}: {e}")
            return False

    def get_user(self, uid: str) -> Optional[auth.UserRecord]:
        """Get Firebase user record by UID."""
        if not self._initialized and not self.initialize():
            return None

        try:
            return auth.get_user(uid)
        except auth.UserNotFoundError:
            logger.warning(f"User not found: {uid}")
            return None
        except Exception as e:
            logger.error(f"Error getting user {uid}: {e}")
            return None


@lru_cache(maxsize=1)
def get_firebase_admin() -> FirebaseAdminServiceClass:
    """Get singleton instance of FirebaseAdminService."""
    service = FirebaseAdminServiceClass()
    service.initialize()
    return service
