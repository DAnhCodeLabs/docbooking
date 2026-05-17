import asyncio
import random  # Thêm thư viện random để xử lý Jitter
from src.interfaces.schemas import UniversalRequest, UniversalResponse
from src.plugins.providers import ProviderFactory
from src.common.config import settings
from src.common.logger import get_logger

logger = get_logger(__name__)

class AIEngine:
    @staticmethod
    async def execute(request: UniversalRequest) -> UniversalResponse:
        priority_list = []
        if request.model: priority_list.append(request.model)
        if settings.PRIMARY_MODEL not in priority_list: priority_list.append(settings.PRIMARY_MODEL)
        if settings.FALLBACK_MODEL not in priority_list: priority_list.append(settings.FALLBACK_MODEL)

        attempt = 1
        consecutive_rate_limits = 0 # Bộ đếm riêng biệt cho việc tính toán thời gian chờ

        while True:
            model_index = (attempt - 1) % len(priority_list)
            model_name = priority_list[model_index]
            provider = ProviderFactory.get_provider(model_name)

            try:
                logger.info(f"🚀 [Attempt {attempt}] Đang gọi model: {model_name} ...")

                # Gọi API Google
                response = await provider.generate(request, model_name)

                logger.info(f"✅ THÀNH CÔNG với model: {model_name} ở lần thử thứ {attempt}!")
                return response # Thoát vòng lặp thành công

            except Exception as e:
                error_msg = str(e).upper()

                # --- FIX 1: LỌC "LỖI TỬ HUYỆT" KHÔNG THỂ CỨU VÃN ---
                # 400: Lỗi cú pháp/Vi phạm an toàn, 403: Lỗi API Key bị vô hiệu hóa
                if any(code in error_msg for code in ["400", "INVALID_ARGUMENT", "403", "PERMISSION_DENIED"]):
                    logger.error(f"❌ LỖI FATAL (Dừng lặp): {error_msg}")
                    # Văng lỗi lập tức để Node.js bắt được và báo cho Bệnh nhân
                    raise ValueError("Nội dung không hợp lệ hoặc hệ thống AI tạm ngưng. Vui lòng thử lại bằng câu hỏi khác.")

                # --- FIX 2: TỐI ƯU CHỜ QUÁ TẢI (INFINITE LOOP VỚI JITTER) ---
                if any(code in error_msg for code in ["503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED"]):
                    consecutive_rate_limits += 1

                    # Chặn số mũ lớn nhất là 3 (2^3 = 8 giây) để CHỐNG TRÀN SỐ
                    exp = min(consecutive_rate_limits, 3)
                    base_wait = 2 ** exp

                    # Thêm "Jitter" (Cộng ngẫu nhiên từ 0.1 đến 2.5 giây)
                    # Chống hiện tượng "Đàn cừu sấm sét" - các request không đánh API cùng 1 lúc
                    wait_time = base_wait + random.uniform(0.1, 2.5)
                    wait_time = min(wait_time, 10.0) # Khóa trần chờ tối đa 10s

                    logger.warning(f"⏳ Cụm Google kẹt (Lỗi Rate Limit). Chờ {wait_time:.2f}s rồi luân phiên model đánh tiếp...")
                    await asyncio.sleep(wait_time)
                else:
                    # Các lỗi mạng ngẫu nhiên khác (như timeout kết nối tới Google)
                    logger.warning(f"⚠️ Lỗi mạng lạ: {str(e)}. Đổi model thử lại sau 2s...")
                    consecutive_rate_limits = 0 # Reset đếm để tính toán lại hàm mũ
                    await asyncio.sleep(2)

                attempt += 1