from abc import ABC, abstractmethod
from google import genai
from google.genai import types
from src.interfaces.schemas import (
    UniversalRequest, UniversalResponse, UniversalMessage, Role, ContentPart, UsageMetrics
)
from src.common.config import settings
from src.common.logger import get_logger

logger = get_logger(__name__)

class BaseProvider(ABC):
    @abstractmethod
    async def generate(self, request: UniversalRequest, model_override: str) -> UniversalResponse:
        pass

class GeminiAdapter(BaseProvider):
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    async def generate(self, request: UniversalRequest, model_override: str) -> UniversalResponse:
        # Làm sạch tên model (bỏ prefix gemini/ nếu có)
        clean_model_name = model_override.split("/")[-1]
        
        # Chuyển đổi tin nhắn sang định dạng Google
        contents = [
            types.Content(
                role="model" if m.role == Role.ASSISTANT else "user",
                parts=[types.Part.from_text(text=p.text) for p in m.content]
            ) for m in request.messages
        ]

        # Gọi API bất đồng bộ
        response = await self.client.aio.models.generate_content(
            model=clean_model_name,
            contents=contents,
            config=types.GenerateContentConfig(temperature=request.temperature)
        )

        # Trích xuất dữ liệu trả về
        usage = UsageMetrics(
            prompt_tokens=response.usage_metadata.prompt_token_count or 0,
            completion_tokens=response.usage_metadata.candidates_token_count or 0,
            total_tokens=response.usage_metadata.total_token_count or 0
        )

        return UniversalResponse(
            model_used=model_override,
            choices=[UniversalMessage(
                role=Role.ASSISTANT,
                content=[ContentPart(text=response.text)]
            )],
            usage=usage
        )

class ProviderFactory:
    @staticmethod
    def get_provider(model_name: str) -> BaseProvider:
        if "gemini" in model_name.lower():
            return GeminiAdapter()
        raise ValueError(f"Provider không hỗ trợ: {model_name}")