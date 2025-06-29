from pydantic import BaseModel, ConfigDict


class CommentMessageCreate(BaseModel):
    entity_id: str
    entity_type: str
    sender: str
    text: str
    timestamp: int


class CommentMessageRead(CommentMessageCreate):
    id: int
    investigation_id: str
    model_config = ConfigDict(from_attributes=True)
