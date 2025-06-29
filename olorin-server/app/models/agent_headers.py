from typing import Optional

from pydantic import BaseModel, Field


class AuthContext(BaseModel):
    intuit_user_id: str
    intuit_user_token: str
    intuit_realmid: Optional[str] = None


class OlorinHeader(BaseModel):
    intuit_tid: Optional[str] = None
    intuit_experience_id: Optional[str] = None
    intuit_originating_assetalias: Optional[str] = None
    auth_context: Optional[AuthContext] = Field(exclude=True)

    def __str__(self) -> str:
        return f"OlorinHeader: {self.intuit_tid} {self.intuit_experience_id} {self.intuit_originating_assetalias})"
