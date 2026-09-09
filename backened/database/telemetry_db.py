import sqlite3
import os


BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

DB_PATH = os.path.join(
    BASE_DIR,
    "database",
    "telemetry.db"
)


def initialize_database():

    conn = sqlite3.connect(DB_PATH)

    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS network_flows (

        flow_id INTEGER PRIMARY KEY AUTOINCREMENT,

        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        source_ip TEXT NOT NULL,

        destination_ip TEXT NOT NULL,

        source_port INTEGER,

        destination_port INTEGER,

        protocol TEXT,

        packets INTEGER,

        bytes INTEGER,

        duration REAL,

        ttl INTEGER

    )
    """)

    conn.commit()
    conn.close()

    print("Telemetry database initialized successfully")


def insert_flow(
    source_ip,
    destination_ip,
    source_port,
    destination_port,
    protocol,
    packets,
    bytes,
    duration,
    ttl
):

    conn = sqlite3.connect(DB_PATH)

    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO network_flows (
        source_ip,
        destination_ip,
        source_port,
        destination_port,
        protocol,
        packets,
        bytes,
        duration,
        ttl
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        source_ip,
        destination_ip,
        source_port,
        destination_port,
        protocol,
        packets,
        bytes,
        duration,
        ttl
    ))

    conn.commit()

    flow_id = cursor.lastrowid

    conn.close()

    return flow_id


def get_recent_flows(limit=100):

    conn = sqlite3.connect(DB_PATH)

    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()

    cursor.execute("""
    SELECT *
    FROM network_flows
    ORDER BY timestamp DESC
    LIMIT ?
    """, (limit,))

    flows = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return flows