import sqlite3
import os


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

DATABASE_PATH = os.path.join(
    BASE_DIR,
    "database",
    "incidents.db"
)


# Columns introduced after the initial schema. They are added
# lazily by `migrate_database` so existing databases keep working.
_ADDITIONAL_COLUMNS = {
    "source_ip": "TEXT",
    "destination_ip": "TEXT",
    "root_cause": "TEXT",
    "recommendations": "TEXT",
    "reroute_plan": "TEXT",
    "acknowledged": "INTEGER DEFAULT 0",
    "resolved_at": "TIMESTAMP",
}


def _get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def migrate_database():

    conn = _get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents(
        incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
        severity TEXT,
        risk_score INTEGER,
        anomaly_score REAL,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    existing = {
        row["name"]
        for row in cursor.execute(
            "PRAGMA table_info(incidents)"
        )
    }

    for column, definition in _ADDITIONAL_COLUMNS.items():

        if column not in existing:

            cursor.execute(
                f"ALTER TABLE incidents "
                f"ADD COLUMN {column} {definition}"
            )

    conn.commit()
    conn.close()

    print(
        "Incident database initialized successfully"
    )