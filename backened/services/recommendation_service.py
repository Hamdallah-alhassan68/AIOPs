class RecommendationService:

    @staticmethod
    def recommend(root_cause):

        recommendations = {

            "Traffic Spike": [
                "Monitor bandwidth utilization",
                "Investigate source hosts",
                "Consider load balancing"
            ],

            "Possible Port Scan": [
                "Inspect source IP",
                "Enable firewall rules",
                "Review IDS alerts"
            ],

            "Abnormal Data Transfer": [
                "Check for data exfiltration",
                "Inspect affected hosts",
                "Review access logs"
            ],

            "Normal Variation": [
                "Continue monitoring"
            ]
        }

        return recommendations.get(
            root_cause,
            ["Investigate manually"]
        )