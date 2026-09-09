from services.anomaly_service import AnomalyService
from services.risk_service import RiskService
from services.incident_service import IncidentService

anomaly_service = AnomalyService()

incident_service = IncidentService()

sample = {
    "n_flows": 20,
    "n_packets": 500,
    "n_bytes": 25000,
    "n_dest_asn": 5,
    "n_dest_ports": 10,
    "n_dest_ip": 7,
    "tcp_udp_ratio_packets": 0.8,
    "tcp_udp_ratio_bytes": 0.7,
    "dir_ratio_packets": 0.4,
    "dir_ratio_bytes": 0.5,
    "avg_duration": 20,
    "avg_ttl": 120
}

result = anomaly_service.predict(sample)

severity, risk = RiskService.classify(
    result["score"]
)

incident_id = incident_service.create_incident(
    severity,
    risk,
    result["score"]
)

print("Incident Created:", incident_id)