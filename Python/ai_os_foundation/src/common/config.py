from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    
    # Cấu hình 2 model CHẠY THẬT cho Failover
    PRIMARY_MODEL: str = "gemini-2.5-flash"
    FALLBACK_MODEL: str = "gemini-flash-latest"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()