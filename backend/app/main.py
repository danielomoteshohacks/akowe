# ============================================
# main.py — FastAPI application entry point
#
# This is the first file that runs when you
# start the backend with: uvicorn app.main:app
#
# It does 3 things:
# 1. Creates the FastAPI app
# 2. Adds middleware (CORS, Sentry)
# 3. Registers all routers (auth, transactions, analytics)
# ============================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk
from app.config.settings import get_settings

# Import all routers
# Each router handles a group of related endpoints
from app.routers import auth, transactions, analytics

settings = get_settings()

# Initialize Sentry error monitoring
# Any unhandled error will be sent to your Sentry dashboard
sentry_sdk.init(
    dsn=settings.sentry_dsn,
    environment=settings.app_env,
)

# Create the FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Financial intelligence for African businesses",
    version="1.0.0"
)

# ============================================
# CORS MIDDLEWARE
#
# CORS = Cross-Origin Resource Sharing
# Browsers block requests from one domain
# to another by default for security.
# This middleware tells FastAPI which frontend
# URLs are allowed to call our backend.
# ============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",       # Vite dev server on your laptop
        "http://localhost:3000",       # Alternative React dev port
        "https://akowe.vercel.app",   # Your Vercel frontend (update this later)
    ],
    allow_credentials=True,  # Allow cookies and auth headers
    allow_methods=["*"],     # Allow GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],     # Allow Authorization header etc.
)

# ============================================
# REGISTER ROUTERS
#
# This connects each router to the main app.
# The prefix is added to every route in that router.
# auth router:         /auth/signup, /auth/login, /auth/me
# transactions router: /transactions, /transactions/{id}
# analytics router:    /analytics/pnl, /analytics/summary
# ============================================
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(analytics.router)


# ============================================
# ROOT ENDPOINTS
# ============================================

@app.get("/")
async def root():
    """Health check — confirms the API is running"""
    return {
        "message": "Akowe backend is running",
        "version": "1.0.0",
        "status": "healthy",
        "endpoints": {
            "auth": "/auth",
            "transactions": "/transactions",
            "analytics": "/analytics",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """Simple health check for deployment monitoring"""
    return {"status": "ok", "app": "akowe"}