import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

/* Fixed layout for the reference WAN topology map (SVG) */
const NODE_POSITIONS = {
  R1: { x: 60, y: 150 },
  R2: { x: 210, y: 55 },
  R3: { x: 210, y: 245 },
  R4: { x: 360, y: 150 },
  R5: { x: 520, y: 55 },
  R6: { x: 520, y: 245 },
  R7: { x: 670, y: 150 },
};

const LINK_STATUS_COLORS = {
  congested: "#f43f5e",
  warning: "#f59e0b",
  normal: "#10b981",
};

const FALLBACK_DESTINATIONS = ["10.0.0.55", "10.0.0.20", "8.8.8.8", ""];

function linkStatusClass(status) {
  return status || "normal";
}

function TopologyMap({ topology, alternatePath }) {
  const pathSet = useMemo(() => {
    const set = new Set();
    (alternatePath || []).forEach((node, index) => {
      if (index > 0) {
        const a = alternatePath[index - 1];
        set.add([a, node].sort().join("|"));
      }
    });
    return set;
  }, [alternatePath]);

  if (!topology || !topology.nodes) {
    return <p className="muted">Topology not available yet.</p>;
  }

  const nodes = topology.nodes || [];
  const links = topology.links || [];

  return (
    <svg className="topology-svg" viewBox="0 0 740 310" role="img" aria-label="WAN topology map">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#8aa0c0" />
        </marker>
      </defs>

      <rect x="10" y="10" width="720" height="290" rx="14" fill="rgba(127,150,190,0.05)" />

      {links.map((link, index) => {
        const from = nodes.find((n) => n.id === link.source);
        const to = nodes.find((n) => n.id === link.target);
        if (!from || !to) return null;
        const a = NODE_POSITIONS[from.id];
        const b = NODE_POSITIONS[to.id];
        const isPath = pathSet.has([link.source, link.target].sort().join("|"));
        const color = isPath ? "#38bdf8" : LINK_STATUS_COLORS[link.status] || "#10b981";
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        return (
          <g key={index}>
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={color}
              strokeWidth={isPath ? 4 : 2}
              strokeOpacity={isPath ? 0.95 : 0.6}
              strokeDasharray={isPath ? "7 4" : undefined}
              markerEnd="url(#arrow)"
            />
            <circle cx={midX} cy={midY} r="13" fill="rgba(10,16,29,0.85)" stroke={color} strokeWidth="1" />
            <text x={midX} y={midY + 4} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">
              {link.utilization}%
            </text>
          </g>
        );
      })}

      {nodes.map((node) => {
        const pos = NODE_POSITIONS[node.id];
        const isOnPath = (alternatePath || []).includes(node.id);
        return (
          <g key={node.id}>
            <circle
              cx={pos.x} cy={pos.y} r={isOnPath ? 26 : 22}
              fill={isOnPath ? "rgba(56,189,248,0.25)" : "rgba(127,150,190,0.12)"}
              stroke={isOnPath ? "#38bdf8" : "#8aa0c0"}
              strokeWidth={isOnPath ? 3 : 2}
            />
            <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">
              {node.id}
            </text>
            <text x={pos.x} y={pos.y + 20} textAnchor="middle" fontSize="7.5" fill="#93a4c0">
              {String(node.label).replace(node.id, "").trim()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ReroutePage() {
  const [topology, setTopology] = useState(null);
  const [plan, setPlan] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [destination, setDestination] = useState("");
  const [shiftPct, setShiftPct] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ranOnce, setRanOnce] = useState(false);

  const simulate = (dest, shift) => {
    return api.post("/dashboard/reroute/simulate", {
      destination_ip: dest || null,
      shift_pct: shift,
    });
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get("/dashboard/reroute/topology"),
      api.get("/incidents/?limit=50"),
    ])
      .then(([topoResponse, incidentResponse]) => {
        if (cancelled) return null;
        setTopology(topoResponse.data);
        const dests = [
          ...[new Set(
            (incidentResponse.data.incidents || [])
              .map((incident) => incident.destination_ip)
              .filter(Boolean)
          )],
        ];
        setDestinations(dests);
        const fallback =
          FALLBACK_DESTINATIONS.find((d) => !dests.includes(d)) || "";
        const target = dests[0] || fallback;
        setDestination(target || "");
        return simulate(target, 30);
      })
      .then((result) => {
        if (cancelled || !result) return;
        setPlan(result.data.plan);
        setError(null);
        setRanOnce(true);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError(err.message || "Simulation failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSimulation = () => {
    setLoading(true);
    setError(null);
    simulate(destination, shiftPct)
      .then((response) => {
        setPlan(response.data.plan);
        setRanOnce(true);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Simulation failed");
      })
      .finally(() => setLoading(false));
  };

  const formatPath = (path) => (path || []).join(" → ") || "—";

  const congestedLink = plan ? plan.congested_link : "—";
  const originalUtil = plan ? plan.congested_link_utilization : 0;
  const predictedUtil = plan ? plan.predicted_congested_utilization : 0;

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Congested Link</div>
          <div className="stat-value text-congested">{congestedLink}</div>
          <div className="stat-subtitle">Worst-utilization link now</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Current Utilization</div>
          <div className="stat-value">{plan ? `${originalUtil}%` : "—"}</div>
          <div className="stat-subtitle">Before reroute</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Predicted After Shift</div>
          <div className="stat-value text-good">{plan ? `${predictedUtil}%` : "—"}</div>
          <div className="stat-subtitle">
            {plan ? `${plan.shift_pct}% traffic shifted` : "Run a simulation"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Improvement</div>
          <div className="stat-value text-good">
            {plan ? `${plan.predicted_improvement_pct}%` : "—"}
          </div>
          <div className="stat-subtitle">Link headroom recovered</div>
        </div>
      </div>

      {error && (
        <div className="inline-error" role="alert">⚠ {error}</div>
      )}

      <div className="simulator-panel panel">
        <div className="panel-header">
          <div>
            <h2>Reroute Simulation</h2>
            <p>Choose a destination and the percentage of traffic to shift</p>
          </div>
          <span className="live-badge">⇄ SIMULATION</span>
        </div>

        <div className="filter-bar">
          <select
            className="filter-select"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="">Any destination</option>
            {destinations.map((dest) => (
              <option key={dest} value={dest}>{dest}</option>
            ))}
          </select>
          <label className="shift-control">
            <span>Shift {shiftPct}%</span>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={shiftPct}
              onChange={(e) => setShiftPct(Number(e.target.value))}
            />
          </label>
          <button className="primary-btn" onClick={runSimulation} disabled={loading}>
            {loading ? "Simulating…" : "Run Simulation"}
          </button>
        </div>

        {loading && !ranOnce && <p className="muted">Loading the WAN topology…</p>}

        {plan && (
          <>
            <div className="comparison-grid">
              <div className="comparison-card before">
                <h3>Before — Current Path</h3>
                <p className="mono-path">{originalUtil}% utilization</p>
                <div className="util-bar">
                  <div className="util-fill congested" style={{ width: `${Math.min(originalUtil, 100)}%` }} />
                </div>
                <p>
                  Traffic flows through the saturated{" "}
                  <strong>{congestedLink}</strong> link.
                </p>
              </div>

              <div className="comparison-card after">
                <h3>After — Alternate Path</h3>
                <p className="mono-path">{formatPath(plan.alternate_path)}</p>
                <div className="util-bar">
                  <div className="util-fill good" style={{ width: `${Math.min(predictedUtil, 100)}%` }} />
                </div>
                <p>Shift {plan.shift_pct}% of the load to the alternate route.</p>
              </div>
            </div>

            <div className="path-visual">
              {(plan.alternate_path || []).map((node, index) => (
                <span key={node} className="path-node-group">
                  <span className="path-node">{node}</span>
                  {index < (plan.alternate_path || []).length - 1 && (
                    <span className="path-arrow">→</span>
                  )}
                </span>
              ))}
            </div>

            <div className="recommendation-box">
              <div className="recommendation-icon">AI</div>
              <div>
                <h3>Simulation Conclusion</h3>
                <p>{plan.recommendation}</p>
                <p className="muted">
                  Average alternate-path utilization:{" "}
                  <strong>{plan.avg_alternate_path_utilization}%</strong>
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Live WAN Topology</h2>
            <p>
              Reference network with current link utilization
              {plan && (
                <span className="legend">
                  <span className="legend-dot" style={{ background: "#38bdf8" }} />
                  alternate path
                </span>
              )}
            </p>
          </div>
          <span className="live-badge">● LIVE</span>
        </div>

        <TopologyMap topology={topology} alternatePath={plan?.alternate_path} />

        <div className="link-list">
          {(topology?.links || []).map((link, index) => (
            <div key={index} className="link-item">
              <span className={`link-status ${linkStatusClass(link.status)}`} />
              <span className="mono">
                {link.source} ↔ {link.target}
              </span>
              <span className="link-capacity">{link.capacity_mbps} Mbps</span>
              <div className="util-bar small">
                <div
                  className={`util-fill ${linkStatusClass(link.status)}`}
                  style={{ width: `${Math.min(link.utilization, 100)}%` }}
                />
              </div>
              <strong>{link.utilization}%</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReroutePage;