from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk
from app.config.settings import get_settings

# Get settings
settings = get_settings()

# Initialize Sentry
sentry_sdk.init(
    dsn=settings.sentry_dsn,
    environment=settings.app_env,
)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Financial intelligence for African businesses",
    version="0.1.0"
)

# Enable CORS (allow frontend to call backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # React dev fallback
        "https://akowe.vercel.app",  # Your Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Akowe backend is running",
        "version": "0.1.0",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "app": "akowe"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)