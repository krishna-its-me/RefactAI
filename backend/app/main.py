import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .core.config import settings, STATIC_DIR
from .api.routes import router as api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION
)

# Enable CORS for local and decoupled frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API endpoints (both with and without /api prefix for Vercel/serverless compatibility)
app.include_router(api_router, prefix=settings.API_PREFIX)
app.include_router(api_router)

# Mount frontend static directory if exists
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {
        "project": settings.PROJECT_NAME,
        "tagline": "Automated Code Health & Technical Debt Intelligence",
        "status": "API Server Active. Frontend static files loading...",
        "docs_url": "/docs"
    }
