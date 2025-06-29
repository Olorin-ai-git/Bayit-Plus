from typing import Optional

from pydantic import BaseModel, Field


class AuthContext(BaseModel):
    olorin_user_id: str
    olorin_user_token: str
    olorin_realmid: Optional[str] = None


class OlorinHeader(BaseModel):
<<<<<<< HEAD:back/app/models/agent_headers.py
    olorin_tid: Optional[str] = None
    olorin_experience_id: Optional[str] = None
    olorin_originating_assetalias: Optional[str] = None
    auth_context: Optional[AuthContext] = Field(exclude=True)

    def __str__(self) -> str:
        return f"OlorinHeader: {self.olorin_tid} {self.olorin_experience_id} {self.olorin_originating_assetalias})"
=======
    olorin_tid: Optional[str] = None
    olorin_experience_id: Optional[str] = None
    olorin_originating_assetalias: Optional[str] = None
    auth_context: Optional[AuthContext] = Field(exclude=True)

    def __str__(self) -> str:
        return f"OlorinHeader: {self.olorin_tid} {self.olorin_experience_id} {self.olorin_originating_assetalias})"
>>>>>>> restructure-projects:olorin-server/app/models/agent_headers.py
