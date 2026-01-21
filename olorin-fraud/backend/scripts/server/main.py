"""
Simple FastAPI application for Firebase App Hosting deployment
with CORS support for fraud.olorin.ai frontend
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="Olorin Fraud Detection Backend", version="1.0.0")

# Configure CORS middleware
environment = os.getenv("APP_ENV", "local")
is_production = environment in ["prd", "production", "prod"]

if is_production:
    allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
    allowed_origins = [
        origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()
    ]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False if is_production else True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    max_age=600,
)


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "olorin-backend",
        "environment": os.getenv("APP_ENV", "development"),
    }


@app.get("/")
def root():
    """Root endpoint"""
    return {"message": "Olorin Fraud Detection Backend", "status": "running"}


@app.get("/info")
def info():
    """Service information endpoint"""
    return {
        "service": "olorin-backend",
        "version": "1.0.0",
        "environment": os.getenv("APP_ENV", "development"),
        "port": os.getenv("PORT", "8090"),
        "project_id": os.getenv("FIREBASE_PROJECT_ID", "olorin-ai"),
        "cors_origins": os.getenv("ALLOWED_ORIGINS", "not configured"),
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8090))
    uvicorn.run(app, host="0.0.0.0", port=port)
