from services.incident_query_service import (
    IncidentQueryService
)


class IncidentEngine:

    """Orchestrates the full AIOps pipeline for one telemetry window:

    anomaly detection -> risk classification -> root cause analysis
    -> recommended actions -> reroute simulation -> incident creation
    """

    def __init__(self):

        self.query_service = IncidentQueryService()

    def process(
        self,
        network_data,
        source_ip=None,
        destination_ip=None
    ):

        result = self.query_service.run_full_analysis(
            network_data,
            source_ip=source_ip,
            destination_ip=destination_ip
        )

        return {
            "prediction": result["prediction"],
            "anomaly_score": result["anomaly_score"],
            "severity": result["severity"],
            "risk_score": result["risk_score"],
            "root_cause": result["root_cause"],
            "recommendations": result["recommendations"],
            "reroute_plan": result["reroute_plan"],
            "incident_id": (
                result["incident"]["incident_id"]
                if result["incident"]
                else None
            )
        }