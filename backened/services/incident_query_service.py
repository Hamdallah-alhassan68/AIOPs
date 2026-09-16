import json
import sqlite3
import os

from services.incident_service import IncidentService
from services.correlation_service import CorrelationService
from services.rca_service import RCAService
from services.recommendation_service import RecommendationService
from services.reroute_service import RerouteService


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

_JSON_FIELDS = ("recommendations", "reroute_plan", "root_cause")


class IncidentQueryService:

    def __init__(self):

        base_dir = os.path.dirname(
            os.path.dirname(
                os.path.abspath(__file__)
            )
        )

        self.db_path = os.path.join(
            base_dir,
            "database",
            "incidents.db"
        )

    def get_recent_incidents(
        self,
        limit=100,
        severity=None,
        status=None
    ):

        conn = sqlite3.connect(
            self.db_path
        )

        conn.row_factory = sqlite3.Row

        cursor = conn.cursor()

        clause = "1=1"

        params = []

        if severity:

            clause += " AND severity = ?"

            params.append(severity)

        if status:

            clause += " AND status = ?"

            params.append(status)

        params.append(limit)

        cursor.execute(
            f"""
            SELECT *
            FROM incidents
            WHERE {clause}
            ORDER BY created_at DESC
            LIMIT ?
            """,
            params
        )

        data = [
            self._serialize(dict(row))
            for row in cursor.fetchall()
        ]

        conn.close()

        return data

    @staticmethod
    def _serialize(incident):

        for field in _JSON_FIELDS:

            value = incident.get(field)

            if isinstance(value, str):

                try:

                    incident[field] = json.loads(value)

                except json.JSONDecodeError:

                    incident[field] = {}

        return incident

    def run_full_analysis(self, network_data, source_ip=None, destination_ip=None):

        """End-to-end AIOps analysis for a telemetry window:
        anomaly -> risk -> root cause -> recommendations -> reroute.
        Used by both the live engine and the burst simulator.
        """

        from services.anomaly_service import AnomalyService
        from services.risk_service import RiskService

        anomaly_result = (
            AnomalyService().predict(network_data)
        )

        anomaly_score = anomaly_result["score"]

        prediction = anomaly_result["prediction"]

        severity, risk_score = (
            RiskService.classify(anomaly_score)
        )

        rca = RCAService.analyze(
            network_data
        )

        root_cause_name = rca["root_cause"]

        recommendations = RecommendationService.recommend(
            root_cause_name,
            severity
        )

        reroute_plan = None

        if severity in ("High Risk", "Critical"):

            reroute_plan = RerouteService.simulate(
                destination_ip
            )

        incident = None

        if prediction == -1:

            incident = IncidentService().create_incident(
                severity=severity,
                risk_score=risk_score,
                anomaly_score=anomaly_score,
                source_ip=source_ip,
                destination_ip=destination_ip,
                root_cause=rca,
                recommendations=recommendations,
                reroute_plan=reroute_plan
            )

        return {
            "prediction": prediction,
            "anomaly_score": anomaly_score,
            "severity": severity,
            "risk_score": risk_score,
            "root_cause": rca,
            "recommendations": recommendations,
            "reroute_plan": reroute_plan,
            "incident": incident
        }

    def lifecycle_summary(self):

        incidents = self.get_recent_incidents(500)

        status_counts = {}

        severity_counts = {}

        for incident in incidents:

            status = incident.get("status", "Open")

            status_counts[status] = (
                status_counts.get(status, 0) + 1
            )

            severity = incident.get("severity", "Healthy")

            severity_counts[severity] = (
                severity_counts.get(severity, 0) + 1
            )

        acknowledged = sum(
            1
            for incident in incidents
            if incident.get("acknowledged")
        )

        events = CorrelationService.correlate(
            incidents
        )

        original_alerts = len(incidents)

        correlated_count = len(events)

        alert_reduction = 0

        if original_alerts:

            alert_reduction = round(
                (
                    (original_alerts - correlated_count)
                    / original_alerts
                ) * 100
            )

        return {
            "total_incidents": original_alerts,
            "status_distribution": status_counts,
            "severity_distribution": severity_counts,
            "acknowledged": acknowledged,
            "correlated_events": correlated_count,
            "alert_reduction_pct": max(
                alert_reduction, 0
            )
        }