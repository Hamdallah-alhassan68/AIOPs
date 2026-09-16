from collections import defaultdict
from datetime import datetime, timedelta


class CorrelationService:

    @staticmethod
    def correlate(incidents, window_minutes=5):

        """Group related incidents into meaningful events.

        Incidents are correlated when they share the same severity,
        same destination IP (if known) and fall inside the same
        sliding time window. Repeated alerts are coalesced into a
        single event, which reduces alert fatigue and duplicate
        tickets for operators.
        """

        groups = defaultdict(list)

        for incident in incidents:

            severity = incident.get(
                "severity", "Healthy"
            )

            destination = incident.get(
                "destination_ip", "unknown"
            ) or "unknown"

            created_at = incident.get("created_at")

            bucket = "unknown"

            try:

                timestamp = datetime.fromisoformat(
                    str(created_at).replace(" ", "T")
                )

                bucket = int(
                    timestamp.timestamp()
                    // (window_minutes * 60)
                )

            except (ValueError, TypeError):

                bucket = "unknown"

            key = (severity, destination, bucket)

            groups[key].append(incident)

        correlated_events = []

        for (severity, destination, bucket), items in groups.items():

            correlated_events.append({
                "event_type": severity,
                "destination_ip": destination,
                "incident_count": len(items),
                "incidents": items,
                "window_minutes": window_minutes
            })

        # Most severe first, then most recent window first
        severity_rank = {
            "Critical": 0,
            "High Risk": 1,
            "Medium Risk": 2,
            "Low Risk": 3,
            "Healthy": 4
        }

        def _recency(event):

            incidents = event["incidents"]

            if not incidents:
                return 0

            try:

                timestamp = datetime.fromisoformat(
                    str(incidents[0]["created_at"])
                    .replace(" ", "T")
                )

                return timestamp.timestamp()

            except (ValueError, TypeError):

                return 0

        correlated_events.sort(
            key=lambda event: (
                severity_rank.get(
                    event["event_type"], 5
                ),
                -_recency(event)
            )
        )

        return correlated_events