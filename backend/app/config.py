from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Multilingual Hotel Concierge API"
    environment: str = "development"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/conciergedb"
    redis_url: str = "redis://localhost:6379/0"
    
    nvidia_api_key: str = ""
    unsplash_access_key: str = ""
    secret_key: str = "super_secret_key_change_in_production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440 # 24 hours

    class Config:
        env_file = ".env"

settings = Settings()
