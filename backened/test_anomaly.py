from services.anomaly_service import AnomalyService

service = AnomalyService()

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

result = service.predict(sample)

print(result)




