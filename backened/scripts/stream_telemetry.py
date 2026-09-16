"""Live telemetry streamer for the AIOps NOC console.

Periodically POSTs realistic network flows to the running API so the
dashboards animate in real time. Mixes normal traffic with occasional
bursts that trigger the Isolation Forest anomaly detector.

Usage (with the API already running on :8000):
    cd backened
    python scripts/stream_telemetry.py          # stream every 3s
    python scripts/stream_telemetry.py --port 8100 --interval 1
"""

import argparse
import json
import random
import sys
import time
import urllib.request

random.seed()

SOURCES = [
    "10.0.1.5", "10.0.1.18", "10.0.2.7", "10.0.2.31",
    "10.0.3.12", "10.0.3.44", "172.16.5.20", "172.16.5.66",
]

DESTINATIONS = [
    "10.0.0.1", "10.0.0.2", "10.0.0.10", "8.8.8.8",
    "1.1.1.1", "10.0.0.20", "10.0.0.30", "192.168.10.5",
    "10.0.0.100", "172.16.0.1", "10.0.0.55", "8.8.4.4",
]

PORTS = [80, 443, 53, 22, 25, 3389, 8080, 8443, 443, 443, 443, 53]


def normal_flow():
    return {
        "source_ip": random.choice(SOURCES),
        "destination_ip": random.choice(DESTINATIONS[:10]),
        "source_port": random.randint(1024, 65535),
        "destination_port": random.choice(PORTS),
        "protocol": random.choice(["TCP", "TCP", "TCP", "UDP"]),
        "packets": random.randint(2, 70),
        "bytes": random.randint(300, 9000),
        "duration": round(random.uniform(0.2, 8.0), 2),
        "ttl": random.randint(50, 128),
    }


def burst_flow():
    return {
        "source_ip": random.choice(SOURCES),
        "destination_ip": random.choice(
            ["10.0.0.20", "10.0.0.30", "8.8.8.8"]
        ),
        "source_port": random.randint(1024, 65535),
        "destination_port": random.choice([443, 8080, 8443, 22, 3389]),
        "protocol": "TCP",
        "packets": random.randint(400, 900),
        "bytes": random.randint(45000, 95000),
        "duration": round(random.uniform(25, 95), 2),
        "ttl": random.randint(45, 58),
    }


def post(port, flow):
    payload = json.dumps(flow).encode("utf-8")
    request = urllib.request.Request(
        f"http://127.0.0.1:{port}/monitoring/flows",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.loads(response.read())


def main():
    parser = argparse.ArgumentParser(description="AIOps telemetry streamer")
    parser.add_argument("--port", type=int, default=8000, help="API port")
    parser.add_argument("--interval", type=float, default=3.0, help="seconds")
    parser.add_argument("--burst-every", type=int, default=15, help="flows per burst cycle")
    args = parser.parse_args()

    print(f"Streaming telemetry to http://127.0.0.1:{args.port} ...")
    print("Press Ctrl+C to stop.\n")

    throughput = 0
    since_burst = 0

    try:
        while True:
            burst_now = since_burst >= args.burst_every and random.random() < 0.4
            flow = burst_flow() if burst_now else normal_flow()

            try:
                result = post(args.port, flow)
                aiops = result["aiops"]
                label = (
                    f"BURST  [{aiops['severity']}]"
                    if burst_now
                    else f"flow   [{aiops['severity']}]"
                )
                print(
                    f"{time.strftime('%H:%M:%S')}  {label}  "
                    f"{flow['source_ip']} -> {flow['destination_ip']}:"
                    f"{flow['destination_port']}  {flow['protocol']} "
                    f"{flow['packets']}p/{flow['bytes']}B  "
                    f"anomaly={aiops['anomaly_score']:.3f}"
                )
                throughput += 1
                since_burst = 0 if burst_now else since_burst + 1
            except Exception as exc:
                print(f"{time.strftime('%H:%M:%S')}  ERROR {exc}  "
                      f"(is the API running on :{args.port}?)", file=sys.stderr)

            time.sleep(args.interval)
    except KeyboardInterrupt:
        print(f"\nStopped. {throughput} flows streamed.")


if __name__ == "__main__":
    main()