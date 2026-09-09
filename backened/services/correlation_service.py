from collections import defaultdict


class CorrelationService:

    @staticmethod
    def correlate(incidents):

        groups = defaultdict(list)

        for incident in incidents:

            severity = incident["severity"]

            groups[severity].append(
                incident
            )

        correlated_events = []

        for severity, items in groups.items():

            correlated_events.append({
                "event_type": severity,
                "incident_count": len(items),
                "incidents": items
            })

        return correlated_events