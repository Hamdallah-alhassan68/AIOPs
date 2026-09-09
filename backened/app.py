from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.monitoring import router as monitoring_router
from routes.incidents import router as incidents_router
from routes.dashboard import (
    router as dashboard_router
)

app = FastAPI(
    title="AIOps Network Monitoring Platform",
    description="AI-powered network monitoring and risk management platform",
    version="1.0.0"
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
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)