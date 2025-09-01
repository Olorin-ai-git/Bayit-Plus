"""
Simple FastAPI application for testing Firebase App Hosting deployment
"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import os

app = FastAPI(title="Olorin Fraud Detection Backend", version="1.0.0")

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "olorin-backend", "environment": os.getenv("APP_ENV", "development")}

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
        "port": os.getenv("PORT", "8000"),
        "project_id": os.getenv("FIREBASE_PROJECT_ID", "olorin-ai")
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)