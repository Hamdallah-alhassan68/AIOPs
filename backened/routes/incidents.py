import json
import sqlite3
import os

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.correlation_service import CorrelationService
from services.incident_query_service import IncidentQueryService
from services.incident_service import IncidentService

query_service = IncidentQueryService()

incident_service = IncidentService()

router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"]
)


BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

DB_PATH = os.path.join(
    BASE_DIR,
    "database",
    "incidents.db"
)


# ==========================================
# LIST INCIDENTS (with filters)
# ==========================================

@router.get("/")
def get_incidents(
    limit: int = Query(100, ge=1, le=500),
    severity: str | None = None,
    status: str | None = None
):

    try:

        incidents = query_service.get_recent_incidents(
            limit=limit,
            severity=severity,
            status=status
        )

        return {
            "count": len(incidents),
            "incidents": incidents
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# SINGLE INCIDENT
# ==========================================

@router.get("/{incident_id}")
def get_incident(incident_id: int):

    incident = incident_service.get_incident(
        incident_id
    )

    if not incident:

        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    return incident


# ==========================================
# UPDATE INCIDENT STATUS (lifecycle)
# ==========================================

class IncidentUpdate(BaseModel):

    status: str


@router.patch("/{incident_id}")
def update_incident(
    incident_id: int,
    update: IncidentUpdate
):

    try:

        updated = incident_service.update_status(
            incident_id,
            update.status
        )

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    if not updated:

        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    return {
        "updated": True,
        "incident": updated
    }


# ==========================================
# SUMMARY
# ==========================================

@router.get("/summary")
def incident_summary():

    incidents = query_service.get_recent_incidents(
        limit=500
    )

    severity_counts = {}

    status_counts = {}

    for incident in incidents:

        severity_counts[incident["severity"]] = (
            severity_counts.get(
                incident["severity"], 0
            ) + 1
        )

        status_counts[incident["status"]] = (
            status_counts.get(
                incident["status"], 0
            ) + 1
        )

    latest = (
        incidents[0]
        if incidents
        else None
    )

    return {
        "total_incidents": len(incidents),
        "severity_distribution": severity_counts,
        "status_distribution": status_counts,
        "latest_incident": latest
    }


# ==========================================
# CORRELATION GROUPS
# ==========================================

@router.get("/correlations")
def get_correlations():

    incidents = (
        query_service
        .get_recent_incidents(limit=500)
    )

    events = CorrelationService.correlate(
        incidents
    )

    return {
        "events": events,
        "event_count": len(events)
    }