from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.incident_db import migrate_database
from routes.monitoring import router as monitoring_router
from routes.incidents import router as incidents_router
from routes.dashboard import (
    router as dashboard_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):

    # Ensure incident schema is available / migrated
    migrate_database()

    yield


app = FastAPI(
    title="AIOps Network Monitoring Platform",
    description="AI-powered network monitoring and risk management platform",
    version="1.0.0",
    lifespan=lifespan
)


app.include_router(monitoring_router)

app.include_router(incidents_router)


@app.get("/")
def root():

    return {
        "name": "AIOps Network Monitoring Platform",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy",
        "services": {
            "api": "online",
            "monitoring": "online",
            "incident_management": "online"
        }
    }
app.include_router(
    dashboard_router
)


app.add_middleware(
    CORSMiddleware,
    # Local dev console: allow any origin (Starlette echoes the
    # caller origin back when credentials are enabled, so whichever
    # port Vite happens to pick keeps working).
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)