import json
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

VALID_STATUSES = {
    "Open",
    "Acknowledged",
    "Investigating",
    "Resolved",
    "Closed",
}


class IncidentService:

    def create_incident(
        self,
        severity,
        risk_score,
        anomaly_score,
        source_ip=None,
        destination_ip=None,
        root_cause=None,
        recommendations=None,
        reroute_plan=None
    ):

        conn = sqlite3.connect(DB_PATH)

        cursor = conn.cursor()

        cursor.execute("""
        INSERT INTO incidents (
            severity,
            risk_score,
            anomaly_score,
            status,
            source_ip,
            destination_ip,
            root_cause,
            recommendations,
            reroute_plan
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            severity,
            risk_score,
            anomaly_score,
            "Open",
            source_ip,
            destination_ip,
            (
                json.dumps(root_cause)
                if isinstance(root_cause, dict)
                else root_cause
            ),
            json.dumps(recommendations or []),
            json.dumps(reroute_plan or {})
        ))

        incident_id = cursor.lastrowid

        conn.commit()
        conn.close()

        return {
            "incident_id": incident_id,
            "severity": severity,
            "risk_score": risk_score,
            "anomaly_score": anomaly_score,
            "status": "Open",
            "root_cause": root_cause,
            "recommendations": recommendations or [],
            "reroute_plan": reroute_plan
        }

    def update_status(self, incident_id, new_status):

        if new_status not in VALID_STATUSES:

            raise ValueError(
                f"Invalid status '{new_status}'. "
                f"Expected one of {sorted(VALID_STATUSES)}"
            )

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row

        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM incidents "
            "WHERE incident_id = ?",
            (incident_id,)
        )

        incident = cursor.fetchone()

        if not incident:

            conn.close()

            return None

        acknowledge = (
            1 if new_status in (
                "Acknowledged",
                "Investigating",
                "Resolved",
                "Closed"
            ) else incident["acknowledged"]
        )

        resolved_at = None

        if new_status in ("Resolved", "Closed"):

            resolved_at = (
                "CURRENT_TIMESTAMP"
                if not incident["resolved_at"]
                else incident["resolved_at"]
            )

            cursor.execute("""
            UPDATE incidents
            SET status = ?,
                acknowledged = ?,
                resolved_at = CURRENT_TIMESTAMP
            WHERE incident_id = ?
            """, (
                new_status,
                acknowledge,
                incident_id
            ))

        else:

            cursor.execute("""
            UPDATE incidents
            SET status = ?,
                acknowledged = ?
            WHERE incident_id = ?
            """, (
                new_status,
                acknowledge,
                incident_id
            ))

        conn.commit()

        cursor.execute(
            "SELECT * FROM incidents "
            "WHERE incident_id = ?",
            (incident_id,)
        )

        updated = dict(cursor.fetchone())

        conn.close()

        return updated

    def get_incident(self, incident_id):

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row

        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM incidents "
            "WHERE incident_id = ?",
            (incident_id,)
        )

        row = cursor.fetchone()

        conn.close()

        if not row:

            return None

        return self._serialize(dict(row))

    @staticmethod
    def _serialize(incident):

        for field in ("recommendations", "reroute_plan"):

            value = incident.get(field)

            if isinstance(value, str):

                try:

                    incident[field] = json.loads(value)

                except json.JSONDecodeError:

                    incident[field] = {}

        return incident