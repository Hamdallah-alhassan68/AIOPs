import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const STATUSES = ["Open", "Acknowledged", "Investigating", "Resolved", "Closed"];

function severityClass(severity) {
  return String(severity || "").toLowerCase().replace(/\s+/g, "-");
}

function statusClass(status) {
  return String(status || "").toLowerCase();
}

function rootCauseName(rootCause) {
  if (!rootCause) return "—";
  if (typeof rootCause === "string") return rootCause;
  return rootCause.root_cause || "—";
}

function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = () => {
      api
        .get("/incidents/?limit=200")
        .then((response) => {
          setIncidents(response.data.incidents || []);
          setError(null);
        })
        .catch((err) => {
          console.error(err);
          setError("Unable to load incidents from the AIOps backend");
        })
        .finally(() => setLoading(false));
    };

    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    return incidents.filter((incident) => {
      if (filterSeverity && incident.severity !== filterSeverity) return false;
      if (filterStatus && incident.status !== filterStatus) return false;
      if (search) {
        const haystack = `${incident.source_ip || ""} ${incident.destination_ip || ""} ${incident.incident_id} ${rootCauseName(incident.root_cause)}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [incidents, filterSeverity, filterStatus, search]);

  const updateStatus = (incidentId, status) => {
    api
      .patch(`/incidents/${incidentId}`, { status })
      .then((response) => {
        const updated = response.data.incident;
        setIncidents((previous) =>
          previous.map((item) =>
            item.incident_id === incidentId ? { ...item, ...updated } : item
          )
        );
      })
      .catch((err) => console.error(err));
  };

  const counts = useMemo(() => {
    const bySeverity = {};
    const byStatus = {};
    incidents.forEach((incident) => {
      bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
      byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;
    });
    return { bySeverity, byStatus };
  }, [incidents]);

  if (loading) {
    return <div className="loading">Loading incident workspace…</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Total Incidents</div>
          <div className="stat-value">{incidents.length}</div>
          <div className="stat-subtitle">
            {counts.bySeverity.Critical || 0} critical /{" "}
            {counts.bySeverity["High Risk"] || 0} high risk
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Open</div>
          <div className="stat-value">
            {(counts.byStatus.Open || 0) +
              (counts.byStatus.Acknowledged || 0) +
              (counts.byStatus.Investigating || 0)}
          </div>
          <div className="stat-subtitle">Awaiting action</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Resolved</div>
          <div className="stat-value">
            {(counts.byStatus.Resolved || 0) + (counts.byStatus.Closed || 0)}
          </div>
          <div className="stat-subtitle">Closed or resolved</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Acknowledged</div>
          <div className="stat-value">{counts.byStatus.Acknowledged || 0}</div>
          <div className="stat-subtitle">In operator queue</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Incident Queue</h2>
            <p>Filter, acknowledge, investigate, resolve or close incidents</p>
          </div>
          <span className="live-badge">● LIVE</span>
        </div>

        <div className="filter-bar">
          <input
            className="filter-input"
            placeholder="Search source / destination IP, ID or root cause…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="filter-select"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="">All severities</option>
            <option value="Critical">Critical</option>
            <option value="High Risk">High Risk</option>
            <option value="Medium Risk">Medium Risk</option>
            <option value="Low Risk">Low Risk</option>
            <option value="Healthy">Healthy</option>
          </select>
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Severity</th>
                <th>Root Cause</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Detected</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-row">
                    No incidents match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((incident) => (
                <tr key={incident.incident_id}>
                  <td className="mono">#{incident.incident_id}</td>
                  <td>
                    <span className={`severity-badge ${severityClass(incident.severity)}`}>
                      {incident.severity}
                    </span>
                  </td>
                  <td>{rootCauseName(incident.root_cause)}</td>
                  <td className="mono">{incident.source_ip || "—"}</td>
                  <td className="mono">{incident.destination_ip || "—"}</td>
                  <td>{incident.created_at}</td>
                  <td>
                    <span className={`status-badge ${statusClass(incident.status)}`}>
                      {incident.status}
                    </span>
                  </td>
                  <td>
                    <select
                      className="status-select"
                      value={incident.status}
                      onChange={(e) => updateStatus(incident.incident_id, e.target.value)}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h2>Severity Distribution</h2>
          <p className="panel-description">Incidents by risk class</p>
          <div className="distribution-bars">
            {Object.entries(counts.bySeverity).map(([severity, count]) => (
              <div key={severity} className="dist-row">
                <span className={`severity-badge ${severityClass(severity)}`}>
                  {severity}
                </span>
                <div className="dist-track">
                  <div
                    className={`dist-fill ${severityClass(severity)}`}
                    style={{ width: `${(count / Math.max(incidents.length, 1)) * 100}%` }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Lifecycle Status</h2>
          <p className="panel-description">Where incidents sit today</p>
          <div className="distribution-bars">
            {Object.entries(counts.byStatus).map(([status, count]) => (
              <div key={status} className="dist-row">
                <span className={`status-badge ${statusClass(status)}`}>
                  {status}
                </span>
                <div className="dist-track">
                  <div
                    className={`dist-fill status-${statusClass(status)}`}
                    style={{ width: `${(count / Math.max(incidents.length, 1)) * 100}%` }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncidentsPage;
