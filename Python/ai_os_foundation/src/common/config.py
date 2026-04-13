from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Các API Key bắt buộc phải có trong môi trường hoặc file .env
    GEMINI_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""

    # Cấu hình đọc từ file .env ở thư mục gốc
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()