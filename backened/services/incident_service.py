import sqlite3
import os


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

DB_PATH = os.path.join(
    BASE_DIR,
    "database",
    "incidents.db"
)


class IncidentService:

    def create_incident(
        self,
        severity,
        risk_score,
        anomaly_score
    ):

        conn = sqlite3.connect(DB_PATH)

        cursor = conn.cursor()

        cursor.execute("""
        INSERT INTO incidents (
            severity,
            risk_score,
            anomaly_score,
            status
        )
        VALUES (?, ?, ?, ?)
        """, (
            severity,
            risk_score,
            anomaly_score,
            "Open"
        ))

        conn.commit()
        conn.close()

        return {
            "severity": severity,
            "risk_score": risk_score,
            "anomaly_score": anomaly_score,
            "status": "Open"
        }