"""
Profile Document Models
MongoDB models for public CV profiles
"""

from datetime import datetime
from typing import Optional, List
from beanie import Document, Indexed
from pydantic import Field, EmailStr


class ContactRequest(Document):
    """Contact form submission for a profile"""

    profile_id: Indexed(str)
    profile_owner_id: Indexed(str)

    # Sender information
    sender_name: str
    sender_email: EmailStr
    sender_phone: Optional[str] = None
    company: Optional[str] = None
    message: str

    # Status
    status: str = "new"  # new, read, responded, archived
    response: Optional[str] = None

    # Metadata
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    referrer: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None

    class Settings:
        name = "contact_requests"
        indexes = [
            "profile_id",
            "profile_owner_id",
            "status",
            [("profile_owner_id", 1), ("created_at", -1)],
        ]


class Profile(Document):
    """Public CV profile for sharing"""

    user_id: Indexed(str)
    cv_id: Indexed(str)

    # Profile identifiers
    slug: Indexed(str, unique=True)
    custom_domain: Optional[str] = None

    # Visibility settings
    visibility: str = "public"  # public, private, unlisted
    password_protected: bool = False
    password_hash: Optional[str] = None

    # Public URL and QR code
    public_url: str
    qr_code_url: Optional[str] = None

    # Display settings
    theme: str = "professional"
    show_contact_form: bool = True
    show_download_button: bool = True
    custom_css: Optional[str] = None

    # SEO metadata
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    og_image_url: Optional[str] = None

    # Analytics
    view_count: int = 0
    unique_visitor_count: int = 0
    download_count: int = 0
    contact_request_count: int = 0

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_viewed_at: Optional[datetime] = None

    class Settings:
        name = "profiles"
        indexes = [
            "user_id",
            "cv_id",
            "slug",
            "visibility",
            [("user_id", 1), ("created_at", -1)],
        ]
