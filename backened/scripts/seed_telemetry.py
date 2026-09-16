"""Seed the AIOps pilot with realistic telemetry + incidents.
Usage: cd backened && python scripts/seed_telemetry.py
"""

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.telemetry_db import (  # noqa: E402
    initialize_database as init_telemetry,
    insert_flow,
)
from database.incident_db import migrate_database  # noqa: E402
from services.feature_service import FeatureService  # noqa: E402
from services.incident_query_service import IncidentQueryService  # noqa: E402


random.seed(42)

SOURCES = [
    "10.0.1.5", "10.0.1.18", "10.0.2.7", "10.0.2.31",
    "10.0.3.12", "10.0.3.44", "172.16.5.20", "172.16.5.66",
]

DESTINATIONS = [
    "10.0.0.1", "10.0.0.2", "10.0.0.10", "8.8.8.8",
    "1.1.1.1", "10.0.0.20", "10.0.0.30", "192.168.10.5",
    "10.0.0.100", "172.16.0.1",
]

PORTS = [80, 443, 53, 22, 25, 3389, 8080, 8443, 443, 443]


def normal_flow():
    return {
        "source_ip": random.choice(SOURCES),
        "destination_ip": random.choice(DESTINATIONS[:7]),
        "source_port": random.randint(1024, 65535),
        "destination_port": random.choice(PORTS),
        "protocol": random.choice(["TCP", "TCP", "UDP"]),
        "packets": random.randint(2, 60),
        "bytes": random.randint(300, 8000),
        "duration": round(random.uniform(0.2, 8.0), 2),
        "ttl": random.randint(50, 128),
    }


def burst_flow(destination):
    return {
        "source_ip": random.choice(SOURCES),
        "destination_ip": destination,
        "source_port": random.randint(1024, 65535),
        "destination_port": random.choice([443, 8080, 8443]),
        "protocol": "TCP",
        "packets": random.randint(400, 900),
        "bytes": random.randint(40000, 90000),
        "duration": round(random.uniform(20, 90), 2),
        "ttl": random.randint(45, 55),
    }


def analyze_window(flows, destination_ip):
    features = FeatureService.create_features(flows)
    result = IncidentQueryService().run_full_analysis(
        features,
        source_ip=flows[0]["source_ip"],
        destination_ip=destination_ip
    )
    return result

def main():

    init_telemetry()
    migrate_database()

    print("Seeding telemetry database...")

    created_incidents = 0

    # ---------------- Normal background traffic ----------------
    for index in range(120):
        flow = normal_flow()
        insert_flow(
            source_ip=flow["source_ip"],
            destination_ip=flow["destination_ip"],
            source_port=flow["source_port"],
            destination_port=flow["destination_port"],
            protocol=flow["protocol"],
            packets=flow["packets"],
            bytes=flow["bytes"],
            duration=flow["duration"],
            ttl=flow["ttl"],
        )

    print("Inserted 120 normal flows.")

    # ---------------- Burst window 1: traffic spike ----------------
    print("Simulating burst window 1 (traffic spike)...")

    burst_1 = [burst_flow("10.0.0.20") for _ in range(40)]

    for flow in burst_1:
        insert_flow(
            source_ip=flow["source_ip"],
            destination_ip=flow["destination_ip"],
            source_port=flow["source_port"],
            destination_port=flow["destination_port"],
            protocol=flow["protocol"],
            packets=flow["packets"],
            bytes=flow["bytes"],
            duration=flow["duration"],
            ttl=flow["ttl"],
        )

    result_1 = analyze_window(burst_1, "10.0.0.20")

    if result_1["incident"]:
        created_incidents += 1

    print(
        "  severity=", result_1["severity"],
        "root_cause=", result_1["root_cause"]["root_cause"],
        "incident=", result_1["incident"] is not None
    )

    # ---------------- Burst window 2: port scan ----------------
    print("Simulating burst window 2 (port scan)...")

    scan_targets = [f"10.0.0.{i}" for i in range(30, 56)]

    burst_2 = []

    for idx, target in enumerate(scan_targets):

        flow = burst_flow(target)
        flow["packets"] = random.randint(2, 8)
        flow["bytes"] = random.randint(100, 400)
        flow["duration"] = round(random.uniform(0.05, 0.5), 2)
        flow["source_port"] = 1024 + idx

        burst_2.append(flow)

        insert_flow(
            source_ip=flow["source_ip"],
            destination_ip=flow["destination_ip"],
            source_port=flow["source_port"],
            destination_port=flow["destination_port"],
            protocol=flow["protocol"],
            packets=flow["packets"],
            bytes=flow["bytes"],
            duration=flow["duration"],
            ttl=flow["ttl"],
        )

    result_2 = analyze_window(burst_2, scan_targets[0])

    if result_2["incident"]:
        created_incidents += 1

    print(
        "  severity=", result_2["severity"],
        "root_cause=", result_2["root_cause"]["root_cause"],
        "incident=", result_2["incident"] is not None
    )

    # ---------------- Burst window 3: abnormal transfer ----------------
    print("Simulating burst window 3 (abnormal transfer)...")

    burst_3 = [burst_flow("8.8.8.8") for _ in range(25)]

    for flow in burst_3:

        flow["duration"] = round(random.uniform(80, 200), 2)
        flow["bytes"] = random.randint(60000, 120000)

        insert_flow(
            source_ip=flow["source_ip"],
            destination_ip=flow["destination_ip"],
            source_port=flow["source_port"],
            destination_port=flow["destination_port"],
            protocol=flow["protocol"],
            packets=flow["packets"],
            bytes=flow["bytes"],
            duration=flow["duration"],
            ttl=flow["ttl"],
        )

    result_3 = analyze_window(burst_3, "8.8.8.8")

    if result_3["incident"]:
        created_incidents += 1

    print(
        "  severity=", result_3["severity"],
        "root_cause=", result_3["root_cause"]["root_cause"],
        "incident=", result_3["incident"] is not None
    )

    print()
    print(f"Seeding complete. Incidents created: {created_incidents}")
    print("Start the API with:  uvicorn app:app --reload")
    print("Start the UI with:   npm run dev (in ../frontend)")


if __name__ == "__main__":
    main()
