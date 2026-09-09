from database.telemetry_db import (
    initialize_database,
    insert_flow,
    get_recent_flows
)


# Create database and table
initialize_database()


# Insert sample network flow
flow_id = insert_flow(
    source_ip="10.0.1.5",
    destination_ip="10.0.2.8",
    source_port=54321,
    destination_port=443,
    protocol="TCP",
    packets=500,
    bytes=25000,
    duration=20,
    ttl=120
)


print("Flow inserted:", flow_id)


# Retrieve recent flows
flows = get_recent_flows()


print("\nRecent Network Flows")
print("--------------------")

for flow in flows:
    print(flow)