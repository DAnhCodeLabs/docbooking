from abc import ABC, abstractmethod
from google import genai
from google.genai import types
from src.interfaces.schemas import (
    UniversalRequest, UniversalResponse, UniversalMessage, Role, ContentPart, UsageMetrics
)
from src.common.config import settings

# =========================================================================
# LỚP TRỪU TƯỢNG (INTERFACE) - Đã được bổ sung lại để sửa lỗi NameError
# =========================================================================
class BaseProvider(ABC):
    @abstractmethod
    async def generate(self, request: UniversalRequest, model_override: str) -> UniversalResponse:
        pass

# =========================================================================
# TRIỂN KHAI GEMINI ADAPTER (KÈM BỘ NHỚ JSON TỐI ƯU)
# =========================================================================
class GeminiAdapter(BaseProvider):
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    async def generate(self, request: UniversalRequest, model_override: str) -> UniversalResponse:
        clean_model_name = model_override.split("/")[-1]

        # 1. Trích xuất System Instruction
        system_instructions = [
            "".join([p.text for p in m.content])
            for m in request.messages if m.role == Role.SYSTEM
        ]

        # 2. Ép AI trả về JSON chứa Reply và State Summary (Cốt lõi trí nhớ)
        json_schema_instruction = """
        BẮT BUỘC TRẢ VỀ ĐỊNH DẠNG JSON:
        {
          "reply": "Nội dung phản hồi đầy đủ cho người dùng (theo 4 bước tư vấn)",
          "state_summary": "Tóm tắt cực ngắn cốt lõi (Ví dụ: 'User đau đầu, tư vấn khoa Thần kinh, gợi ý BS Tuấn')"
        }
        """
        final_system_instruction = "\n\n".join(system_instructions) + "\n" + json_schema_instruction

        # 3. Chuẩn hóa hội thoại (User/Model)
        contents = []
        for m in request.messages:
            if m.role == Role.SYSTEM: continue
            google_role = "model" if m.role == Role.ASSISTANT else "user"
            contents.append(types.Content(
                role=google_role,
                parts=[types.Part.from_text(text=p.text) for p in m.content]
            ))

        # 4. Cấu hình JSON Mode Native
        response = await self.client.aio.models.generate_content(
            model=clean_model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=request.temperature,
                system_instruction=final_system_instruction,
                response_mime_type="application/json" # Kích hoạt JSON Mode
            )
        )

        # 5. Trả về kết quả chuẩn Universal
        return UniversalResponse(
            model_used=model_override,
            choices=[UniversalMessage(
                role=Role.ASSISTANT,
                content=[ContentPart(text=response.text)]
            )],
            usage=UsageMetrics(
                prompt_tokens=response.usage_metadata.prompt_token_count or 0,
                completion_tokens=response.usage_metadata.candidates_token_count or 0,
                total_tokens=response.usage_metadata.total_token_count or 0
            )
        )

# =========================================================================
# FACTORY PATTERN ĐỂ QUẢN LÝ NHIỀU MODEL
# =========================================================================
class ProviderFactory:
    @staticmethod
    def get_provider(model_name: str) -> BaseProvider:
        if "gemini" in model_name.lower():
            return GeminiAdapter()
        raise ValueError(f"Provider không hỗ trợ: {model_name}")