import { useEffect, useState } from "react";
import api, { BASE_URL } from "../services/api";

const severityClass = (severity) =>
  String(severity || "").toLowerCase().replace(/\s+/g, "-");

const statusClass = (status) => String(status || "").toLowerCase();

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function SlaPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = () => {
      api
        .get("/dashboard/sla")
        .then((response) => {
          setData(response.data);
          setError(null);
        })
        .catch((err) => {
          console.error(err);
          setError("Unable to load SLA report from the AIOps backend");
        });
    };

    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const exportCsv = () => {
    if (!data) return;
    const sla = data.sla;

    const rows = [
      ["Section", "Metric", "Value"],
      ["Pilot KPIs", "Availability (%)", sla.availability_pct],
      ["Pilot KPIs", "SLA Target (%)", sla.sla_target_pct],
      ["Pilot KPIs", "SLA Compliance (%)", sla.sla_compliance_pct],
      ["Pilot KPIs", "Mean Time To Resolve (minutes)", sla.mttr_minutes ?? "N/A"],
      ["Pilot KPIs", "Alert Reduction (%)", sla.alert_reduction_pct],
      ["Pilot KPIs", "Total Incidents", sla.total_incidents],
      ["Pilot KPIs", "Open Incidents", sla.open_incidents],
      ["Pilot KPIs", "Resolved Incidents", sla.resolved_incidents],
      ["Pilot KPIs", "Acknowledged Incidents", sla.acknowledged_incidents],
      ["Pilot KPIs", "Flows Processed", sla.flows_processed],
    ];

    Object.entries(sla.severity_distribution || {}).forEach(([k, v]) => {
      rows.push(["Severity Distribution", k, v]);
    });
    Object.entries(sla.status_distribution || {}).forEach(([k, v]) => {
      rows.push(["Status Distribution", k, v]);
    });
    (data.open_incidents || []).forEach((item) => {
      rows.push(["Open Incidents", `#${item.incident_id} ${item.severity} ${item.destination_ip || ""}`.trim(), ""]);
    });

    const escaped = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    downloadFile("aiops-sla-report.csv", escaped, "text/csv;charset=utf-8;");
  };

  const exportJson = () => {
    if (!data) return;
    downloadFile(
      "aiops-sla-report.json",
      JSON.stringify(data, null, 2),
      "application/json;charset=utf-8;"
    );
  };

  const printReport = () => {
    window.print();
  };

  const downloadHtmlReport = () => {
    window.open(`${BASE_URL}/report/pilot?download=1`, "_blank");
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!data) {
    return <div className="loading">Loading SLA report…</div>;
  }

  const sla = data.sla;
  const severityEntries = Object.entries(sla.severity_distribution || {});
  const statusEntries = Object.entries(sla.status_distribution || {});
  const mttr = sla.mttr_minutes != null ? `${sla.mttr_minutes} min` : "—";

  return (
    <div className="dashboard sla-report">
      <div className="report-actions no-print">
        <span className="muted">Report generated {new Date().toLocaleString()}</span>
        <div className="report-buttons">
          <button className="secondary-btn" onClick={exportCsv}>
            ⬇ Export CSV
          </button>
          <button className="secondary-btn" onClick={exportJson}>
            ⬇ Export JSON
          </button>
          <button className="secondary-btn" onClick={downloadHtmlReport}>
            ⬇ Download Report
          </button>
          <button className="primary-btn" onClick={printReport}>
            🖨 Print Report
          </button>
        </div>
      </div>

      <div className="report-head">
        <h1>AIOps Pilot Evaluation Report</h1>
        <p>Nairobi Digital Bank · Network Operations Center</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Availability</div>
          <div className="stat-value">{sla.availability_pct}%</div>
          <div className="stat-subtitle">Target {sla.sla_target_pct}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">SLA Compliance</div>
          <div className="stat-value">{sla.sla_compliance_pct}%</div>
          <div className="stat-subtitle">vs. target</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Mean Time to Resolve</div>
          <div className="stat-value">{mttr}</div>
          <div className="stat-subtitle">Resolved incidents</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Alert Reduction</div>
          <div className="stat-value">{sla.alert_reduction_pct}%</div>
          <div className="stat-subtitle">Fewer tickets via correlation</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Operations Report</h2>
              <p>Pilot evaluation KPIs over the captured telemetry</p>
            </div>
          </div>

          <div className="sla-rows">
            <div className="sla-row">
              <span>Total incidents</span>
              <strong>{sla.total_incidents}</strong>
            </div>
            <div className="sla-row">
              <span>Open / in-progress</span>
              <strong>{sla.open_incidents}</strong>
            </div>
            <div className="sla-row">
              <span>Resolved</span>
              <strong>{sla.resolved_incidents}</strong>
            </div>
            <div className="sla-row">
              <span>Acknowledged</span>
              <strong>{sla.acknowledged_incidents}</strong>
            </div>
            <div className="sla-row">
              <span>Flows processed</span>
              <strong>{sla.flows_processed}</strong>
            </div>
          </div>

          <div className="sla-big-track">
            <div className="sla-big-label">
              <span>Availability vs SLA target</span>
              <strong>
                {sla.availability_pct}% / {sla.sla_target_pct}%
              </strong>
            </div>
            <div className="util-bar">
              <div
                className="util-fill good"
                style={{ width: `${Math.min(sla.availability_pct, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>Severity Mix</h2>
          <p className="panel-description">Share of each risk class</p>
          <div className="distribution-bars">
            {severityEntries.length === 0 && <p className="muted">No data yet.</p>}
            {severityEntries.map(([severity, count]) => (
              <div key={severity} className="dist-row">
                <span className={`severity-badge ${severityClass(severity)}`}>
                  {severity}
                </span>
                <div className="dist-track">
                  <div
                    className={`dist-fill ${severityClass(severity)}`}
                    style={{ width: `${(count / Math.max(sla.total_incidents, 1)) * 100}%` }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h2>Lifecycle Status</h2>
          <p className="panel-description">Incidents by workflow state</p>
          <div className="distribution-bars">
            {statusEntries.length === 0 && <p className="muted">No data yet.</p>}
            {statusEntries.map(([status, count]) => (
              <div key={status} className="dist-row">
                <span className={`status-badge ${statusClass(status)}`}>
                  {status}
                </span>
                <div className="dist-track">
                  <div
                    className={`dist-fill status-${statusClass(status)}`}
                    style={{ width: `${(count / Math.max(sla.total_incidents, 1)) * 100}%` }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Open Incidents</h2>
          <p className="panel-description">Still requiring operator attention</p>
          {data.open_incidents.length === 0 && (
            <p className="muted">No open incidents — network is healthy.</p>
          )}
          <div className="open-list">
            {data.open_incidents.map((incident) => (
              <div key={incident.incident_id} className="open-item">
                <span className={`severity-badge ${severityClass(incident.severity)}`}>
                  {incident.severity}
                </span>
                <span className="mono">#{incident.incident_id}</span>
                <span>{incident.destination_ip || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlaPage;