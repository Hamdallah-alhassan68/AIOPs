from datetime import datetime, timedelta


class SLAService:

    """Operations KPIs for the pilot evaluation report (Deliverable 11).

    Computes network availability, incident severity distribution,
    correlation-based alert reduction and mean-time-to-resolve where
    timestamps allow it.
    """

    @staticmethod
    def compute(incidents, flows_count=0):

        total = len(incidents)

        status_counts = {}

        severity_counts = {}

        resolved_incidents = 0

        acknowledged = 0

        for incident in incidents:

            status = incident.get("status", "Open")

            status_counts[status] = (
                status_counts.get(status, 0) + 1
            )

            severity = incident.get("severity", "Healthy")

            severity_counts[severity] = (
                severity_counts.get(severity, 0) + 1
            )

            if status in ("Resolved", "Closed"):

                resolved_incidents += 1

            if incident.get("acknowledged"):

                acknowledged += 1

        # ----------------
        # Availability
        # ----------------
        # Simple model: every open critical incident costs 0.25% of
        # monthly availability; high risk 0.1%; each is capped so
        # availability stays realistic.
        open_critical = severity_counts.get("Critical", 0)
        open_high = severity_counts.get("High Risk", 0)

        availability = max(
            99.0,
            100.0
            - (open_critical * 0.25)
            - (open_high * 0.10)
            - (total * 0.01)
        )

        availability = round(min(availability, 100.0), 2)

        # ----------------
        # SLA compliance vs target
        # ----------------
        sla_target = 99.5

        compliance = round(
            min(100.0, (availability / sla_target) * 100.0),
            1
        )

        # ----------------
        # MTTR (mean time to resolve)
        # ----------------
        mttr_minutes = None

        durations = []

        for incident in incidents:

            created = incident.get("created_at")

            resolved = incident.get("resolved_at")

            if created and resolved:

                try:

                    start = datetime.fromisoformat(
                        str(created).replace(" ", "T")
                    )

                    end = datetime.fromisoformat(
                        str(resolved).replace(" ", "T")
                    )

                    durations.append(
                        max((end - start).total_seconds() / 60.0, 0)
                    )

                except (ValueError, TypeError):

                    continue

        if durations:

            mttr_minutes = round(
                sum(durations) / len(durations),
                1
            )

        # ----------------
        # Alert reduction via correlation
        # ----------------
        from services.correlation_service import CorrelationService

        correlated = CorrelationService.correlate(incidents)

        alert_reduction = 0

        if total:

            alert_reduction = round(
                ((total - len(correlated)) / total) * 100
            )

        return {
            "sla_target_pct": sla_target,
            "availability_pct": availability,
            "sla_compliance_pct": max(compliance, 0),
            "open_incidents": status_counts.get("Open", 0)
                + status_counts.get("Acknowledged", 0)
                + status_counts.get("Investigating", 0),
            "resolved_incidents": resolved_incidents,
            "acknowledged_incidents": acknowledged,
            "total_incidents": total,
            "mttr_minutes": mttr_minutes,
            "alert_reduction_pct": max(alert_reduction, 0),
            "severity_distribution": severity_counts,
            "status_distribution": status_counts,
            "flows_processed": flows_count
        }