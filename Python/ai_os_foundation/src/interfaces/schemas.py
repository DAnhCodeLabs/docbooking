from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import uuid

# [BẢN VÁ P0]: Khai báo Enum SYSTEM để đón dữ liệu từ Node.js
class Role(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"

class ContentPart(BaseModel):
    text: str

class UniversalMessage(BaseModel):
    role: Role
    content: List[ContentPart]

class UniversalRequest(BaseModel):
    # Model có thể để trống, nếu trống Engine sẽ dùng mặc định trong config
    model: Optional[str] = None
    messages: List[UniversalMessage]
    temperature: float = 0.7
    provider_overrides: Dict[str, Any] = Field(default_factory=dict)

class UsageMetrics(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

class UniversalResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model_used: str  # Thông báo cho người dùng biết cuối cùng model nào đã chạy thành công
    choices: List[UniversalMessage]
    usage: UsageMetrics = Field(default_factory=UsageMetrics)