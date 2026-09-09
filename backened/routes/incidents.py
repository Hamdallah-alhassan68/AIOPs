from fastapi import APIRouter, HTTPException
import sqlite3
import os

from services.correlation_service import CorrelationService
from services.incident_query_service import IncidentQueryService

query_service = IncidentQueryService()
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


@router.get("/")
def get_incidents(limit: int = 100):

    try:

        conn = sqlite3.connect(DB_PATH)

        conn.row_factory = sqlite3.Row

        cursor = conn.cursor()

        cursor.execute("""
        SELECT *
        FROM incidents
        ORDER BY created_at DESC
        LIMIT ?
        """, (limit,))

        incidents = [
            dict(row)
            for row in cursor.fetchall()
        ]

        conn.close()

        return {
            "count": len(incidents),
            "incidents": incidents
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
@router.get("/summary")
def incident_summary():

    conn = sqlite3.connect(DB_PATH)

    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) as total
        FROM incidents
    """)

    total = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT *
        FROM incidents
        ORDER BY created_at DESC
        LIMIT 1
    """)

    latest = cursor.fetchone()

    conn.close()

    return {
        "total_incidents": total,
        "latest_incident":
            dict(latest) if latest else None
    }
@router.get("/correlations")
def get_correlations():

    incidents = query_service.get_recent_incidents()

    events = CorrelationService.correlate(
        incidents
    )

    return {
        "events": events
    }