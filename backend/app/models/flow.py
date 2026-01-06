from datetime import datetime
from typing import Optional, List
from beanie import Document
from pydantic import BaseModel, Field


class FlowItem(BaseModel):
    """Single item in a flow playlist."""
    content_id: str
    content_type: str  # live, radio, vod, podcast
    title: str
    thumbnail: Optional[str] = None
    duration_hint: Optional[int] = None  # Suggested duration in seconds
    order: int = 0


class FlowTrigger(BaseModel):
    """Trigger conditions for auto-starting a flow."""
    type: str  # "time", "day", "shabbat", "holiday"
    start_time: Optional[str] = None  # "HH:MM" format
    end_time: Optional[str] = None
    days: Optional[List[int]] = None  # 0=Sunday, 6=Saturday
    skip_shabbat: bool = False


class FlowCreate(BaseModel):
    name: str
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    icon: str = ""
    items: List[FlowItem] = []
    triggers: List[FlowTrigger] = []
    auto_play: bool = True
    ai_enabled: bool = False
    ai_brief_enabled: bool = False


class FlowUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    items: Optional[List[FlowItem]] = None
    triggers: Optional[List[FlowTrigger]] = None
    auto_play: Optional[bool] = None
    ai_enabled: Optional[bool] = None
    ai_brief_enabled: Optional[bool] = None


class FlowResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    profile_id: Optional[str] = None
    name: str
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    icon: str
    flow_type: str
    is_active: bool
    items: List[FlowItem]
    triggers: List[FlowTrigger]
    auto_play: bool
    ai_enabled: bool
    ai_brief_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Flow(Document):
    user_id: Optional[str] = None  # None = system-defined flow
    profile_id: Optional[str] = None

    name: str
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    icon: str = ""

    flow_type: str = "custom"  # system, custom
    is_active: bool = True

    # Content playlist
    items: List[FlowItem] = Field(default_factory=list)

    # Trigger conditions
    triggers: List[FlowTrigger] = Field(default_factory=list)
    auto_play: bool = True

    # AI personalization
    ai_enabled: bool = False  # Allow AI to customize content
    ai_brief_enabled: bool = False  # Show AI greeting

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "flows"
        indexes = [
            "user_id",
            "profile_id",
            "flow_type",
        ]

    def to_response(self) -> FlowResponse:
        return FlowResponse(
            id=str(self.id),
            user_id=self.user_id,
            profile_id=self.profile_id,
            name=self.name,
            name_en=self.name_en,
            name_es=self.name_es,
            description=self.description,
            icon=self.icon,
            flow_type=self.flow_type,
            is_active=self.is_active,
            items=self.items,
            triggers=self.triggers,
            auto_play=self.auto_play,
            ai_enabled=self.ai_enabled,
            ai_brief_enabled=self.ai_brief_enabled,
            created_at=self.created_at,
        )


# Predefined system flows
SYSTEM_FLOWS = [
    {
        "name": "טקס בוקר",
        "name_en": "Morning Flow",
        "name_es": "Flujo Matutino",
        "description": "התחל את היום עם חדשות ותוכן מישראל",
        "icon": "",
        "flow_type": "system",
        "triggers": [
            {"type": "time", "start_time": "07:00", "end_time": "09:00", "skip_shabbat": False}
        ],
        "ai_enabled": True,
        "ai_brief_enabled": True,
    },
    {
        "name": "ליל שבת",
        "name_en": "Shabbat Dinner Flow",
        "name_es": "Cena de Shabat",
        "description": "מוזיקה ותוכן לסעודת שבת",
        "icon": "",
        "flow_type": "system",
        "triggers": [
            {"type": "shabbat", "start_time": "candle_lighting", "end_time": "21:00"}
        ],
        "ai_enabled": False,
    },
    {
        "name": "שעת שינה",
        "name_en": "Bedtime Flow",
        "name_es": "Flujo Nocturno",
        "description": "תוכן מרגיע לפני השינה",
        "icon": "",
        "flow_type": "system",
        "triggers": [
            {"type": "time", "start_time": "20:00", "end_time": "22:00"}
        ],
        "ai_enabled": False,
    },
    {
        "name": "זמן ילדים",
        "name_en": "Kids Time Flow",
        "name_es": "Tiempo de Ninos",
        "description": "תוכן לילדים אחרי הצהריים",
        "icon": "",
        "flow_type": "system",
        "triggers": [
            {"type": "time", "start_time": "16:00", "end_time": "18:00", "days": [0, 1, 2, 3, 4]}
        ],
        "ai_enabled": False,
    },
]
