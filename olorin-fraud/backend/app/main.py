# Entry point for Olorin Fraud Detection System
# The FastAPI app is now created via OlorinApplication for better separation of concerns
from app.service import create_app

app = create_app()
