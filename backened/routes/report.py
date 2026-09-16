"""Pilot Evaluation Report (Deliverable 11).

Serves a self-contained, print-ready HTML report of the AIOps pilot
measured KPIs at GET /report/pilot  (try /report/pilot?download=1).
"""

import html
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse

from services.incident_query_service import IncidentQueryService
from services.sla_service import SLAService
from services.correlation_service import CorrelationService
from database.telemetry_db import get_recent_flows

router = APIRouter(prefix="/report", tags=["Report"])

query_service = IncidentQueryService()

TEMPLATE_PATH = (
    Path(__file__).resolve().parent.parent / "templates" / "pilot_report.html"
)


def _severity_class(severity):
    return str(severity or "").lower().replace(" ", "-")


def _root_cause(incident):
    value = incident.get("root_cause")
    if isinstance(value, dict):
        return value.get("root_cause", "Unknown")
    return str(value or "Unknown")


def _table_rows(rows, colspan, empty_text):
    body = "".join(rows)
    return body or (
        f"<tr><td colspan='{colspan}'>{html.escape(empty_text)}</td></tr>"
    )


@router.get("/pilot", response_class=HTMLResponse)
def pilot_report(download: bool = Query(False)):

    try:

        incidents = query_service.get_recent_incidents(limit=500)

        flows = get_recent_flows(1000)

        sla = SLAService.compute(incidents, flows_count=len(flows))

        events = CorrelationService.correlate(incidents)

        generated = datetime.now().strftime("%Y-%m-%d %H:%M")

        severity_rows = _table_rows(
            [
                f"""
                <tr><td>{html.escape(k)}</td><td>{v}</td>
                <td>{round(v / max(sla['total_incidents'], 1) * 100, 1)}%</td></tr>
                """
                for k, v in sorted(
                    sla["severity_distribution"].items(),
                    key=lambda item: item[1],
                    reverse=True,
                )
            ],
            3,
            "No incidents",
        )

        status_rows = _table_rows(
            [
                f"""
                <tr><td>{html.escape(k)}</td><td>{v}</td></tr>
                """
                for k, v in sorted(sla["status_distribution"].items())
            ],
            2,
            "No records",
        )

        recent_rows = _table_rows(
            [
                f"""
                <tr>
                  <td>#{incident['incident_id']}</td>
                  <td><span class="sev {_severity_class(incident['severity'])}">
                    {html.escape(incident['severity'])}</span></td>
                  <td>{html.escape(_root_cause(incident))}</td>
                  <td>{html.escape(str(incident.get('destination_ip') or '-'))}</td>
                  <td>{html.escape(incident['status'])}</td>
                </tr>
                """
                for incident in incidents[:12]
            ],
            5,
            "No incidents",
        )

        mttr = sla["mttr_minutes"]
        mttr_text = (
            f"{mttr:.1f} min"
            if mttr is not None
            else "N/A (resolve incidents to measure)"
        )

        kpi_html = "".join(
            "<div class='kpi'>"
            f"<span>{html.escape(k)}</span>"
            f"<strong>{html.escape(v)}</strong>"
            f"<small>{html.escape(s)}</small></div>"
            for k, v, s in [
                ("Availability", f"{sla['availability_pct']:.2f}%",
                 f"target {sla['sla_target_pct']}%"),
                ("SLA compliance", f"{sla['sla_compliance_pct']:.1f}%",
                 "of target achieved"),
                ("Alert reduction", f"{sla['alert_reduction_pct']}%",
                 f"{len(incidents)} alerts -> {len(events)} events"),
                ("Mean time to resolve", mttr_text, "resolved incidents"),
                ("Flows processed", str(sla["flows_processed"]),
                 "telemetry records"),
                ("Open incidents", str(sla["open_incidents"]), "require action"),
            ]
        )

        document = TEMPLATE_PATH.read_text(encoding="utf-8")

        document = (
            document.replace("{generated}", html.escape(generated))
            .replace("{kpi_html}", kpi_html)
            .replace("{severity_rows}", severity_rows)
            .replace("{status_rows}", status_rows)
            .replace("{recent_rows}", recent_rows)
        )

        if download:
            return HTMLResponse(
                content=document,
                headers={
                    "Content-Disposition":
                        'attachment; filename="AIOps_Pilot_Evaluation_Report.html"'
                },
            )

        return HTMLResponse(content=document)

    except Exception as e:

        raise HTTPException(status_code=500, detail=str(e))