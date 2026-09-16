class RCAService:

    """Heuristic root cause analysis over engineered telemetry features.

    The engine evaluates traffic signatures in priority order and
    returns the most probable root cause together with a confidence
    value. In a production AIOps platform this would be replaced or
    augmented by a supervised classifier / knowledge graph over the
    network topology history.
    """

    @staticmethod
    def analyze(features):

        if not features:

            return {
                "root_cause": "Unknown",
                "confidence": 0,
                "evidence": [
                    "No telemetry features available"
                ]
            }

        # -------------------------------------------------
        # 1. Massive packet volume                    -> spike
        # -------------------------------------------------
        if features["n_packets"] > 10000:

            return {
                "root_cause": "Traffic Spike",
                "confidence": 85,
                "evidence": [
                    "Packet volume exceeded 10,000 "
                    "in the analysis window",
                    f"{features['n_bytes']:,} bytes "
                    "observed in total"
                ]
            }

        # -------------------------------------------------
        # 2. Many unique destinations                 -> scan
        # -------------------------------------------------
        if features["n_dest_ip"] > 20:

            return {
                "root_cause": "Possible Port Scan",
                "confidence": 80,
                "evidence": [
                    f"{features['n_dest_ip']} unique "
                    "destination IPs contacted",
                    f"{features['n_dest_ports']} unique "
                    "destination ports probed"
                ]
            }

        # -------------------------------------------------
        # 3. High byte volume                         -> exfil
        # -------------------------------------------------
        if features["n_bytes"] > 1000000:

            return {
                "root_cause": "Abnormal Data Transfer",
                "confidence": 75,
                "evidence": [
                    f"Byte volume {features['n_bytes']:,} "
                    "exceeded 1,000,000 threshold"
                ]
            }

        # -------------------------------------------------
        # 4. Long-lived flows + high average duration -> congestion
        # -------------------------------------------------
        avg_duration = features.get("avg_duration", 0) or 0

        if (
            avg_duration > 60
            and features["n_bytes"] > 200000
        ):

            return {
                "root_cause": "WAN Congestion",
                "confidence": 70,
                "evidence": [
                    f"Average flow duration "
                    f"{avg_duration:.1f}s exceeds 60s",
                    "Large payloads sustained over "
                    "the window"
                ]
            }

        return {
            "root_cause": "Normal Variation",
            "confidence": 50,
            "evidence": [
                "Traffic parameters remain within "
                "expected operating ranges"
            ]
        }