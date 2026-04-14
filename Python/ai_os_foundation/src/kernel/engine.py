from src.interfaces.schemas import UniversalRequest, UniversalResponse
from src.plugins.providers import ProviderFactory
from src.common.config import settings
from src.common.logger import get_logger

logger = get_logger(__name__)

class AIEngine:
    @staticmethod
    async def execute(request: UniversalRequest) -> UniversalResponse:
        # Xác định danh sách các model sẽ thử theo thứ tự ưu tiên
        # 1. Model khách gửi lên -> 2. Model chính hệ thống -> 3. Model dự phòng
        priority_list = []
        if request.model:
            priority_list.append(request.model)
        
        if settings.PRIMARY_MODEL not in priority_list:
            priority_list.append(settings.PRIMARY_MODEL)
        if settings.FALLBACK_MODEL not in priority_list:
            priority_list.append(settings.FALLBACK_MODEL)

        last_error = None

        # Vòng lặp Failover: Thử từng model trong danh sách
        for model_name in priority_list:
            try:
                logger.info(f"🚀 Đang thử thực thi với model: {model_name}")
                provider = ProviderFactory.get_provider(model_name)
                
                response = await provider.generate(request, model_name)
                
                logger.info(f"✅ Thành công với model: {model_name}")
                return response

            except Exception as e:
                last_error = e
                logger.warning(f"⚠️ Model {model_name} thất bại. Lỗi: {str(e)}")
                logger.info("🔄 Đang chuyển sang model dự phòng tiếp theo...")
                continue

        # Nếu chạy hết danh sách mà vẫn lỗi
        logger.error("❌ Tất cả các model trong danh sách Failover đều thất bại.")
        raise last_error