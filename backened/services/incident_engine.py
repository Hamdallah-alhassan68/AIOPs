from services.anomaly_service import AnomalyService
from services.risk_service import RiskService
from services.incident_service import IncidentService


class IncidentEngine:

    def __init__(self):

        self.anomaly_service = AnomalyService()
        self.incident_service = IncidentService()

    def process(self, network_data):

        # 1. Run anomaly detection
        anomaly_result = self.anomaly_service.predict(
            network_data
        )

        anomaly_score = anomaly_result["score"]
        prediction = anomaly_result["prediction"]

        # 2. Classify risk
        severity, risk_score = RiskService.classify(
            anomaly_score
        )

        # 3. Create incident if anomaly detected
        incident_id = None

        if prediction == -1:

            incident_id = self.incident_service.create_incident(
                severity,
                risk_score,
                anomaly_score
            )

        # 4. Return complete result
        return {
            "prediction": prediction,
            "anomaly_score": anomaly_score,
            "severity": severity,
            "risk_score": risk_score,
            "incident_id": incident_id
        }