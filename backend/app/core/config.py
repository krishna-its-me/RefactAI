import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STATIC_DIR = BASE_DIR.parent / "frontend"
DATA_DIR = BASE_DIR / "data"

class Settings:
    PROJECT_NAME: str = "RefactAI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DESCRIPTION: str = "Technical Debt Analysis & Code Health System with Explainable AI"
    ALLOW_ORIGINS: list = ["*"]
    
    # Analysis limits
    MAX_REPO_DEPTH: int = 50
    DEFAULT_CLONE_TIMEOUT_SEC: int = 45
    DATA_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
