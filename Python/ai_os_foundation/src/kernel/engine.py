import asyncio
from src.interfaces.schemas import UniversalRequest, UniversalResponse
from src.plugins.providers import ProviderFactory
from src.common.config import settings
from src.common.logger import get_logger

logger = get_logger(__name__)

class AIEngine:
    @staticmethod
    async def execute(request: UniversalRequest) -> UniversalResponse:
        # Xác định danh sách các model
        priority_list = []
        if request.model:
            priority_list.append(request.model)

        if settings.PRIMARY_MODEL not in priority_list:
            priority_list.append(settings.PRIMARY_MODEL)
        if settings.FALLBACK_MODEL not in priority_list:
            priority_list.append(settings.FALLBACK_MODEL)

        attempt = 1
        base_delay = 2
        max_delay = 10 # TRẦN CHỜ ĐỢI: Tối đa chỉ đợi 10 giây mỗi lần để liên tục đập cửa Google

        # [SỬA LỖI]: VÒNG LẶP VÔ CỰC (GỌI ĐẾN KHI NÀO ĐƯỢC THÌ THÔI)
        while True:
            # Dùng phép chia lấy dư để luân phiên Model (0 -> 1 -> 0 -> 1...)
            model_index = (attempt - 1) % len(priority_list)
            model_name = priority_list[model_index]

            provider = ProviderFactory.get_provider(model_name)

            try:
                logger.info(f"🚀 [Attempt {attempt}] Đang gọi model: {model_name} ...")

                # Gọi API Google
                response = await provider.generate(request, model_name)

                logger.info(f"✅ THÀNH CÔNG với model: {model_name} ở lần thử thứ {attempt}!")
                return response # Có kết quả là thoát vòng lặp ngay lập tức

            except Exception as e:
                error_msg = str(e).upper()

                # Nếu là lỗi do Google đang nghẽn mạng (503/429/UNAVAILABLE)
                if "503" in error_msg or "UNAVAILABLE" in error_msg or "429" in error_msg:
                    # Tính toán thời gian chờ nhưng KHÔNG vượt quá max_delay (10s)
                    wait_time = min(base_delay ** attempt, max_delay)
                    logger.warning(f"⏳ Cụm Google bận (Lỗi 503). Chờ {wait_time}s rồi đổi model đánh tiếp...")
                    await asyncio.sleep(wait_time)
                else:
                    # Các lỗi logic khác (không phải do nghẽn), chờ 2s rồi đổi model
                    logger.warning(f"⚠️ Model {model_name} báo lỗi lạ: {str(e)}. Thử model khác...")
                    await asyncio.sleep(2)

                # Tăng số lần thử lên và quay lại đầu vòng lặp while
                attempt += 1