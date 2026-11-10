import sys
import os
from pathlib import Path

# Setup paths so backend modules can be imported in Vercel serverless environment
current_dir = Path(__file__).resolve().parent
root_dir = current_dir.parent
backend_dir = root_dir / "backend"

for p in [str(root_dir), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Import the FastAPI ASGI app from backend.app.main
try:
    from backend.app.main import app
except ImportError:
    from app.main import app

# Vercel looks for 'app' ASGI/WSGI instance
