# Entry point for Gaia Fraud Detection System
# The FastAPI app is now created via GaiaApplication for better separation of concerns
from app.service import create_app

app = create_app()
