class RiskService:

    @staticmethod
    def classify(score):

        if score >= 0:
            return "Healthy", 10

        elif score >= -0.05:
            return "Low Risk", 40

        elif score >= -0.15:
            return "Medium Risk", 65

        elif score >= -0.25:
            return "High Risk", 85

        return "Critical", 95