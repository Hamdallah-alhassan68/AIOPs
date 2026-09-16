import { useEffect, useState } from "react";

import api from "../services/api";
import StatCard from "../components/StatCard";

function severityClass(severity) {
  return String(severity || "").toLowerCase().replace(/\s+/g, "-");
}

function RiskDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadRiskData = () => {
      api
        .get("/dashboard/risk")
        .then((response) => {
          setData(response.data);
          setError(null);
        })
        .catch((error) => {
          console.error(error);
          setError("Unable to connect to AIOps backend");
        });
    };

    loadRiskData();
    const interval = setInterval(loadRiskData, 6000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!data) {
    return <div className="loading">Loading risk intelligence…</div>;
  }

  // ------------------------------------------------------------------
  // Derive the latest correlated incident + AIOps context
  // ------------------------------------------------------------------
  const latestIncident =
    data.latest_incident ||
    data.latest_event?.incidents?.[0] ||
    null;

  const riskLevel = latestIncident?.severity || "Healthy";
  const riskScore = latestIncident?.risk_score ?? 10;
  const anomalyScore = latestIncident?.anomaly_score ?? null;
  const riskClass = severityClass(riskLevel);

  const rootCause = latestIncident?.root_cause || null;
  const rootCauseName =
    typeof rootCause === "string"
      ? rootCause
      : (rootCause?.root_cause ?? null);
  const rootCauseConfidence =
    rootCause && typeof rootCause === "object"
      ? rootCause.confidence
      : null;
  const evidence =
    rootCause && typeof rootCause === "object"
      ? rootCause.evidence || []
      : [];

  const recommendations = latestIncident?.recommendations || [];
  const reroute = latestIncident?.reroute_plan || null;

  const priorityClass = (priority) =>
    String(priority || "medium").toLowerCase();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>AI Operations Center</h1>
          <p>Machine learning based network risk and anomaly analysis</p>
        </div>
        <div className="system-status">
          <span className="status-dot"></span>
          AI Monitoring Active
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Incidents"
          value={data.total_incidents}
          subtitle="Detected incidents"
        />
        <StatCard
          title="Critical"
          value={data.critical_incidents}
          subtitle="Critical incidents"
        />
        <StatCard
          title="High Risk"
          value={data.high_risk_incidents}
          subtitle={"Medium " + (data.medium_risk_incidents || 0)}
        />
        <StatCard
          title="Alert Reduction"
          value={data.alert_reduction_pct + "%"}
          subtitle="Fewer tickets via correlation"
        />
      </div>

      <div className="risk-dashboard-grid">
        <div className={`panel risk-main-card ${riskClass}`}>
          <div className="panel-header">
            <div>
              <h2>Current Network Risk</h2>
              <p>AI-generated risk assessment</p>
            </div>
            <span className={`risk-badge ${riskClass}`}>{riskLevel}</span>
          </div>

          <div className="risk-score-display">
            <strong>{riskScore}</strong>
            <span>/ 100</span>
          </div>

          <div className="risk-progress">
            <div
              className={`risk-progress-bar ${riskClass}`}
              style={{ width: `${riskScore}%` }}
            />
          </div>

          <div className="risk-scale">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
            <span>Critical</span>
          </div>

          <div className="risk-explanation">
            <strong>
              {latestIncident
                ? `Latest signal: ${rootCauseName || riskLevel}`
                : "Network operating normally"}
            </strong>
            <p>
              {latestIncident
                ? `Incident #${latestIncident.incident_id} — ${riskLevel}. Anomaly score ${anomalyScore?.toFixed(4)}.`
                : "No significant abnormal behavior has been detected."}
            </p>
          </div>
        </div>

        <div className="panel anomaly-card">
          <h2>Anomaly Detection</h2>
          <p>Isolation Forest assessment</p>

          <div className="anomaly-score">
            {anomalyScore !== null ? anomalyScore.toFixed(4) : "—"}
          </div>

          <div className="anomaly-status">
            {anomalyScore !== null && anomalyScore < 0 ? (
              <>
                <span className="anomaly-dot danger"></span>
                Abnormal network behavior detected
              </>
            ) : (
              <>
                <span className="anomaly-dot healthy"></span>
                Network behavior appears normal
              </>
            )}
          </div>

          <div className="sla-mini">
            <div>
              <span>Availability</span>
              <strong>{data.availability_pct}%</strong>
            </div>
            <div>
              <span>SLA</span>
              <strong>{data.sla_compliance_pct}%</strong>
            </div>
            <div>
              <span>Open</span>
              <strong>{data.open_incidents}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Root Cause Analysis</h2>
              <p>Probable cause and supporting evidence</p>
            </div>
            <span className="live-badge">AI</span>
          </div>

          {latestIncident ? (
            <div className="rc-card">
              <div className="rc-title">
                <strong>{rootCauseName || "Unknown"}</strong>
                {rootCauseConfidence != null && (
                  <span className={`confidence ${riskClass}`}>
                    {rootCauseConfidence}% confidence
                  </span>
                )}
              </div>
              <ul className="evidence-list">
                {evidence.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

              {reroute && (
                <div className="rc-reroute">
                  <strong>
                    Suggestion: reroute {reroute.shift_pct}% via{" "}
                    {reroute.alternate_path?.join(" → ") || "—"}
                  </strong>
                  <p>
                    Congested link {reroute.congested_link} at{" "}
                    {reroute.congested_link_utilization}% → predicted{" "}
                    {reroute.predicted_congested_utilization}%.
                  </p>
                  <span className="open-link">Open Reroute Simulator</span>
                </div>
              )}
            </div>
          ) : (
            <div className="no-incidents">
              <div className="healthy-icon">✓</div>
              <h3>No Active Incident</h3>
              <p>No root cause analysis available right now.</p>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>AI Recommendations</h2>
              <p>Recommended actions for the current incident</p>
            </div>
            <span className="live-badge">AI</span>
          </div>

          {recommendations.length > 0 ? (
            <div className="rec-list">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="rec-item">
                  <span
                    className={`priority-badge ${priorityClass(
                      recommendation.priority
                    )}`}
                  >
                    {recommendation.priority}
                  </span>
                  <div>
                    <strong>{recommendation.action}</strong>
                    <span className="rec-owner">→ {recommendation.owner}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              No recommendations yet — the engine is watching for anomalies.
            </p>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h2>Latest Risk Event</h2>
          {latestIncident ? (
            <div className="incident-details">
              <div className="incident-detail">
                <span>Incident ID</span>
                <strong>#{latestIncident.incident_id}</strong>
              </div>
              <div className="incident-detail">
                <span>Severity</span>
                <strong className={`risk-text ${riskClass}`}>
                  {latestIncident.severity}
                </strong>
              </div>
              <div className="incident-detail">
                <span>Risk Score</span>
                <strong>{latestIncident.risk_score} / 100</strong>
              </div>
              <div className="incident-detail">
                <span>Destination</span>
                <strong className="mono">
                  {latestIncident.destination_ip || "—"}
                </strong>
              </div>
              <div className="incident-detail">
                <span>Status</span>
                <strong>{latestIncident.status}</strong>
              </div>
              <div className="incident-detail">
                <span>Detected At</span>
                <strong>{latestIncident.created_at}</strong>
              </div>
            </div>
          ) : (
            <div className="no-incidents">
              <div className="healthy-icon">✓</div>
              <h3>No Active Incidents</h3>
              <p>The AIOps engine has not detected any abnormal behavior.</p>
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Event Correlation</h2>
          <p className="panel-description">
            Related alerts coalesced to reduce alert fatigue
          </p>
          <div className="correlation-number">{data.correlated_events}</div>
          <span className="correlation-label">Correlated events</span>
          <p className="panel-description">
            {data.correlated_events} distinct events from{" "}
            {data.total_incidents} raw incidents — a{" "}
            {data.alert_reduction_pct}% reduction in operator alerts.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RiskDashboard;
