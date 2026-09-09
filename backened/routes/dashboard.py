from fastapi import APIRouter, HTTPException

from database.telemetry_db import get_recent_flows

from services.feature_service import FeatureService

from services.incident_query_service import (
    IncidentQueryService
)

from services.correlation_service import (
    CorrelationService
)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


incident_service = IncidentQueryService()


# ==========================================
# NETWORK DASHBOARD
# ==========================================

@router.get("/network")
def network_dashboard():

    try:

        flows = get_recent_flows(100)

        features = FeatureService.create_features(
            flows
        )

        return {

            "network_health": "Healthy",

            "total_flows":
                features.get("n_flows", 0),

            "total_packets":
                features.get("n_packets", 0),

            "total_bytes":
                features.get("n_bytes", 0),

            "unique_destinations":
                features.get("n_dest_ip", 0),

            "unique_ports":
                features.get("n_dest_ports", 0),

            "avg_duration":
                features.get("avg_duration", 0),

            "avg_ttl":
                features.get("avg_ttl", 0)

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# AIOPS RISK DASHBOARD
# ==========================================

@router.get("/risk")
def risk_dashboard():

    try:

        incidents = (
            incident_service
            .get_recent_incidents()
        )

        events = (
            CorrelationService
            .correlate(incidents)
        )

        high_risk = sum(
            1
            for incident in incidents
            if incident["severity"] == "High Risk"
        )

        critical = sum(
            1
            for incident in incidents
            if incident["severity"] == "Critical"
        )

        return {

            "total_incidents":
                len(incidents),

            "high_risk_incidents":
                high_risk,

            "critical_incidents":
                critical,

            "correlated_events":
                len(events),

            "latest_event":
                events[0]
                if events
                else None

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )