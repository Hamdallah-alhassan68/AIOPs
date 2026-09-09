from services.incident_engine import IncidentEngine


engine = IncidentEngine()


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


result = engine.process(sample)


print("\nAIOps Incident Engine Result")
print("--------------------------------")

print("Prediction:", result["prediction"])
print("Anomaly Score:", result["anomaly_score"])
print("Severity:", result["severity"])
print("Risk Score:", result["risk_score"])
print("Incident ID:", result["incident_id"])