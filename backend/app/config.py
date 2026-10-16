import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev_secret_key_12345")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt_dev_secret_key_12345")
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/finwise_db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT expiration times
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # AI configuration
    AI_PROVIDER = os.environ.get("AI_PROVIDER", "ollama")
    OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
