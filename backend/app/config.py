from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./spss.db"
    SECRET_KEY: str = "spss-super-secret-jwt-key-change-in-production-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8-hour pharmacy shift

    model_config = {"env_file": ".env"}


settings = Settings()
