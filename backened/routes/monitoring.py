from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.feature_service import FeatureService
from database.telemetry_db import (
    get_recent_flows,
    insert_flow
)

from services.incident_engine import IncidentEngine


router = APIRouter(
    prefix="/monitoring",
    tags=["Monitoring"]
)


incident_engine = IncidentEngine()


# ==========================================
# Network Flow Model
# ==========================================

class NetworkFlow(BaseModel):

    source_ip: str
    destination_ip: str

    source_port: int
    destination_port: int

    protocol: str

    packets: int
    bytes: int

    duration: float
    ttl: int


# ==========================================
# GET RECENT NETWORK FLOWS
# ==========================================

@router.get("/flows")
def get_flows(limit: int = 100):

    try:

        flows = get_recent_flows(limit)

        return {
            "count": len(flows),
            "flows": flows
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# POST / PROCESS NETWORK FLOW
# ==========================================

@router.post("/flows")
def process_flow(flow: NetworkFlow):

    try:

        # ----------------------------------
        # 1. Store raw network flow
        # ----------------------------------

        flow_id = insert_flow(

            source_ip=flow.source_ip,

            destination_ip=flow.destination_ip,

            source_port=flow.source_port,

            destination_port=flow.destination_port,

            protocol=flow.protocol,

            packets=flow.packets,

            bytes=flow.bytes,

            duration=flow.duration,

            ttl=flow.ttl
        )

        # ----------------------------------
        # 2. Convert flow into ML features
        # ----------------------------------

        network_data = {

            "n_flows": 1,

            "n_packets": flow.packets,

            "n_bytes": flow.bytes,

            "n_dest_asn": 1,

            "n_dest_ports": 1,

            "n_dest_ip": 1,

            "tcp_udp_ratio_packets":
                1.0
                if flow.protocol.upper() == "TCP"
                else 0.0,

            "tcp_udp_ratio_bytes":
                1.0
                if flow.protocol.upper() == "TCP"
                else 0.0,

            "dir_ratio_packets": 1.0,

            "dir_ratio_bytes": 1.0,

            "avg_duration": flow.duration,

            "avg_ttl": flow.ttl
        }

        # ----------------------------------
        # 3. Run full AIOps engine
        # ----------------------------------

        result = incident_engine.process(
            network_data,
            source_ip=flow.source_ip,
            destination_ip=flow.destination_ip
        )

        # ----------------------------------
        # 4. Return result
        # ----------------------------------

        return {

            "flow_id": flow_id,

            "network_flow": flow,

            "aiops": result

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# BURST SIMULATOR
# Inject a synthetic traffic burst and let
# the AIOps engine evaluate the aggregate.
# ==========================================

class BurstRequest(BaseModel):

    flows: list[NetworkFlow]


@router.post("/simulate")
def simulate_burst(burst: BurstRequest):

    if not burst.flows:

        raise HTTPException(
            status_code=400,
            detail="Provide at least one flow"
        )

    try:

        # Store every flow in the burst
        for flow in burst.flows:

            insert_flow(
                source_ip=flow.source_ip,
                destination_ip=flow.destination_ip,
                source_port=flow.source_port,
                destination_port=flow.destination_port,
                protocol=flow.protocol,
                packets=flow.packets,
                bytes=flow.bytes,
                duration=flow.duration,
                ttl=flow.ttl
            )

        # Aggregate the burst into window-level features
        flow_dicts = [
            flow.model_dump()
            for flow in burst.flows
        ]

        features = FeatureService.create_features(
            flow_dicts
        )

        if not features:

            raise HTTPException(
                status_code=400,
                detail="Could not build features"
            )

        # Run the full AIOps pipeline on the window
        result = incident_engine.process(
            features,
            source_ip=burst.flows[0].source_ip,
            destination_ip=burst.flows[0].destination_ip
        )

        return {
            "flows_processed": len(burst.flows),
            "features": features,
            "aiops": result
        }

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# NETWORK SUMMARY
# ==========================================

@router.get("/summary")
def network_summary():

    try:

        flows = get_recent_flows(100)

        features = FeatureService.create_features(
            flows
        )

        return {

            "network_summary": features

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )