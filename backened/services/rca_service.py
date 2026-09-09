class RCAService:

    @staticmethod
    def analyze(features):

        if not features:
            return {
                "root_cause": "Unknown",
                "confidence": 0
            }

        # Traffic spike
        if features["n_packets"] > 10000:
            return {
                "root_cause": "Traffic Spike",
                "confidence": 85
            }

        # Excessive destinations
        if features["n_dest_ip"] > 20:
            return {
                "root_cause": "Possible Port Scan",
                "confidence": 80
            }

        # Large volume transfer
        if features["n_bytes"] > 1000000:
            return {
                "root_cause": "Abnormal Data Transfer",
                "confidence": 75
            }

        return {
            "root_cause": "Normal Variation",
            "confidence": 50
        }