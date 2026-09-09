from pathlib import Path
import joblib
import pandas as pd


class AnomalyService:

    def __init__(self):

        base_dir = Path(__file__).resolve().parent.parent

        model_path = (
            base_dir /
            "models" /
            "isolation_forest_pipeline.pkl"
        )

        self.pipeline = joblib.load(model_path)

    def predict(self, network_data):

        network_data["bytes_per_packet"] = (
            network_data["n_bytes"] /
            max(network_data["n_packets"], 1)
        )

        network_data["packets_per_flow"] = (
            network_data["n_packets"] /
            max(network_data["n_flows"], 1)
        )

        network_data["bytes_per_flow"] = (
            network_data["n_bytes"] /
            max(network_data["n_flows"], 1)
        )

        df = pd.DataFrame([network_data])

        prediction = self.pipeline.predict(df)[0]

        score = float(
            self.pipeline.decision_function(df)[0]
        )

        return {
            "prediction": int(prediction),
            "score": score
        }