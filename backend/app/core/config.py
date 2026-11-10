import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STATIC_DIR = BASE_DIR.parent / "frontend"
if not STATIC_DIR.exists():
    STATIC_DIR = BASE_DIR / "frontend"

DATA_DIR = BASE_DIR / "data"
try:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    test_file = DATA_DIR / ".write_test"
    test_file.touch()
    test_file.unlink(missing_ok=True)
except Exception:
    import tempfile
    DATA_DIR = Path(tempfile.gettempdir()) / "refactai_data"
    DATA_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "RefactAI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DESCRIPTION: str = "Technical Debt Analysis & Code Health System with Explainable AI"
    ALLOW_ORIGINS: list = ["*"]
    
    # Analysis limits
    MAX_REPO_DEPTH: int = 50
    DEFAULT_CLONE_TIMEOUT_SEC: int = 45

settings = Settings()
