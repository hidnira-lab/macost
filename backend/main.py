from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import (
    ai_insight,
    allocations,
    auth,
    categories,
    dashboard,
    goal_settings,
    goals,
    transactions,
    wallets,
)

app = FastAPI(title="Macost API")

# CORS must be registered before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "tauri://localhost",
        "https://tauri.localhost",
        "http://tauri.localhost",
        "http://localhost",
        "http://localhost:3000",
        "https://macost.vercel.app",
    ],
    allow_origin_regex=r"https://macost.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(wallets.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(goal_settings.router, prefix="/api")
app.include_router(allocations.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(ai_insight.router, prefix="/api")


@app.get("/")
def read_root():
    return {"status": "Macost backend running"}


@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "ok"}
