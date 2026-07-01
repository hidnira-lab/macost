from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import auth, wallets

app = FastAPI(title="Macost API")

# CORS must be registered before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "tauri://localhost",
        "https://tauri.localhost",
        "http://localhost",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(wallets.router, prefix="/api")


@app.get("/")
def read_root():
    return {"status": "Macost backend running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
