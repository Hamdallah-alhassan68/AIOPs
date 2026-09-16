from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from database.telemetry_db import get_recent_flows

from services.feature_service import FeatureService
from services.incident_query_service import IncidentQueryService
from services.correlation_service import CorrelationService
from services.sla_service import SLAService
from services.reroute_service import RerouteService


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

query_service = IncidentQueryService()


# ==========================================
# NETWORK DASHBOARD
# ==========================================

@router.get("/network")
def network_dashboard():

    try:

        flows = get_recent_flows(100)

        features = FeatureService.create_features(flows) or {}

        return {
            "network_health": "Healthy",
            "total_flows": features.get("n_flows", 0),
            "total_packets": features.get("n_packets", 0),
            "total_bytes": features.get("n_bytes", 0),
            "unique_destinations": features.get("n_dest_ip", 0),
            "unique_ports": features.get("n_dest_ports", 0),
            "avg_duration": features.get("avg_duration", 0),
            "avg_ttl": features.get("avg_ttl", 0),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# AIOPS RISK DASHBOARD
# ==========================================

@router.get("/risk")
def risk_dashboard():

    try:

        incidents = query_service.get_recent_incidents(limit=200)

        events = CorrelationService.correlate(incidents)

        high_risk = sum(1 for i in incidents if i["severity"] == "High Risk")
        critical = sum(1 for i in incidents if i["severity"] == "Critical")
        medium = sum(1 for i in incidents if i["severity"] == "Medium Risk")
        low = sum(1 for i in incidents if i["severity"] == "Low Risk")

        latest_event = events[0] if events else None

        latest_incident = (
            latest_event["incidents"][0]
            if latest_event and latest_event["incidents"]
            else None
        )

        sla = SLAService.compute(incidents, flows_count=0)

        return {
            "total_incidents": len(incidents),
            "high_risk_incidents": high_risk,
            "critical_incidents": critical,
            "medium_risk_incidents": medium,
            "low_risk_incidents": low,
            "correlated_events": len(events),
            "alert_reduction_pct": sla["alert_reduction_pct"],
            "sla_compliance_pct": sla["sla_compliance_pct"],
            "availability_pct": sla["availability_pct"],
            "open_incidents": sla["open_incidents"],
            "severity_distribution": sla["severity_distribution"],
            "status_distribution": sla["status_distribution"],
            "latest_event": latest_event,
            "latest_incident": latest_incident,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# SLA / OPERATIONS KPIs
# ==========================================

@router.get("/sla")
def dashboard_sla():

    try:

        incidents = query_service.get_recent_incidents(limit=500)

        flows = get_recent_flows(1000)

        sla = SLAService.compute(incidents, flows_count=len(flows))

        open_incidents = query_service.get_recent_incidents(
            limit=50, status="Open"
        )

        return {
            "sla": sla,
            "open_incidents": open_incidents,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# INCIDENT LIFECYCLE OVERVIEW
# ==========================================

@router.get("/incidents")
def dashboard_incidents(limit: int = Query(200, ge=1, le=1000)):

    try:

        incidents = query_service.get_recent_incidents(limit=limit)

        events = CorrelationService.correlate(incidents)

        return {
            "count": len(incidents),
            "incidents": incidents,
            "correlated_events": events,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# REROUTE SIMULATOR
# ==========================================

class RerouteSimulationRequest(BaseModel):

    destination_ip: str | None = None
    shift_pct: int | None = None


@router.post("/reroute/simulate")
def reroute_simulate(request: RerouteSimulationRequest):

    try:

        plan = RerouteService.simulate(
            destination_ip=request.destination_ip,
            shift_pct=request.shift_pct,
        )

        topology = RerouteService.get_topology()

        return {
            "plan": plan,
            "topology": topology,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reroute/topology")
def reroute_topology():

    try:

        return RerouteService.get_topology()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
