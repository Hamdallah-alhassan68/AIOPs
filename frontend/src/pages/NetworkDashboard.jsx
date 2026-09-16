import { useEffect, useMemo, useRef, useState } from "react";

import {
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

import api from "../services/api";
import StatCard from "../components/StatCard";

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)} KB`;
  return `${value} B`;
}

const SENSITIVE_PORTS = new Set([22, 23, 25, 1433, 3306, 3389]);

function flagFlow(flow) {
  const bytes = Number(flow.bytes) || 0;
  const packets = Number(flow.packets) || 0;
  const duration = Number(flow.duration) || 0;
  const port = Number(flow.destination_port) || 0;

  if (bytes >= 50000) {
    return {
      label: "HEAVY",
      cls: "heavy",
      title: "Large transfer (>50 KB)",
    };
  }
  if (packets <= 8 && bytes <= 500 && duration < 1) {
    return {
      label: "PROBE",
      cls: "probe",
      title: "Suspicious probe signature",
    };
  }
  if (SENSITIVE_PORTS.has(port)) {
    return {
      label: "SENSITIVE",
      cls: "sensitive",
      title: `Traffic to sensitive port ${port}`,
    };
  }
  return null;
}

function nodeHealth(node, links) {
  let level = "healthy";
  (links || []).forEach((link) => {
    if (
      (link.source === node.id || link.target === node.id) &&
      link.status === "congested"
    ) {
      level = "critical";
    } else if (
      (link.source === node.id || link.target === node.id) &&
      link.status === "warning" &&
      level !== "critical"
    ) {
      level = "warning";
    }
  });
  return level;
}

const PROTOCOL_COLORS = { TCP: "#38bdf8", UDP: "#a78bfa", OTHER: "#93a4c0" };

function linkStatusClass(status) {
  return status || "normal";
}

function NetworkDashboard() {
  const [network, setNetwork] = useState(null);
  const [risk, setRisk] = useState(null);
  const [flows, setFlows] = useState([]);
  const [topology, setTopology] = useState(null);
  const [trafficHistory, setTrafficHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const previousTotals = useRef({ bytes: null, packets: null });

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const [networkRes, riskRes, flowsRes, topoRes] = await Promise.all([
          api.get("/dashboard/network"),
          api.get("/dashboard/risk"),
          api.get("/monitoring/flows?limit=80"),
          api.get("/dashboard/reroute/topology"),
        ]);

        if (cancelled) return;

        setNetwork(networkRes.data);
        setRisk(riskRes.data);
        setTopology(topoRes.data);

        const newFlows = flowsRes.data.flows || [];
        setFlows(newFlows);

        const totalBytes = newFlows.reduce(
          (sum, f) => sum + (Number(f.bytes) || 0),
          0
        );
        const totalPackets = newFlows.reduce(
          (sum, f) => sum + (Number(f.packets) || 0),
          0
        );

        // Throughput = bytes observed since the previous poll
        const prev = previousTotals.current;
        const deltaBytes =
          prev.bytes === null ? 0 : Math.max(totalBytes - prev.bytes, 0);
        const deltaPackets =
          prev.packets === null ? 0 : Math.max(totalPackets - prev.packets, 0);
        previousTotals.current = { bytes: totalBytes, packets: totalPackets };

        setTrafficHistory((previous) => [
          ...previous,
          {
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            trafficBytes: deltaBytes,
            packetsPerSec: Math.round((deltaPackets / 5) * 10) / 10,
          },
        ].slice(-24));

        setError(null);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Unable to connect to AIOps backend");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  /* ---------------------------------------------------------------
     Derived datasets
     --------------------------------------------------------------- */

  const protocolDist = useMemo(() => {
    const buckets = {};
    (flows || []).forEach((f) => {
      const p = String(f.protocol || "unknown").toUpperCase();
      const key = p === "TCP" || p === "UDP" ? p : "OTHER";
      const entry = buckets[key] || { name: key, count: 0, bytes: 0 };
      entry.count += 1;
      entry.bytes += Number(f.bytes) || 0;
      buckets[key] = entry;
    });
    return Object.values(buckets);
  }, [flows]);

  const topDestinations = useMemo(() => {
    const buckets = {};
    (flows || []).forEach((f) => {
      const b = buckets[f.destination_ip] || {
        destination: f.destination_ip,
        bytes: 0,
        flows: 0,
      };
      b.bytes += Number(f.bytes) || 0;
      b.flows += 1;
      buckets[f.destination_ip] = b;
    });
    return Object.values(buckets)
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 6);
  }, [flows]);

  const topTalkers = useMemo(() => {
    const buckets = {};
    (flows || []).forEach((f) => {
      const b = buckets[f.source_ip] || { source: f.source_ip, bytes: 0, flows: 0 };
      b.bytes += Number(f.bytes) || 0;
      b.flows += 1;
      buckets[f.source_ip] = b;
    });
    return Object.values(buckets)
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 6);
  }, [flows]);

  const flaggedFlows = useMemo(
    () =>
      (flows || [])
        .map((f) => ({ ...f, _flag: flagFlow(f) }))
        .filter((f) => f._flag)
        .slice(0, 12),
    [flows]
  );

  const visibleFlows = useMemo(() => (flows || []).slice(0, 12), [flows]);

  const deviceStats = useMemo(() => {
    if (!topology) return null;
    const links = topology.links || [];
    const nodes = topology.nodes || [];
    return {
      nodes,
      links,
      totalLinks: links.length,
      congested: links.filter((l) => l.status === "congested").length,
      warning: links.filter((l) => l.status === "warning").length,
    };
  }, [topology]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (loading && !network) {
    return <div className="loading">Loading network telemetry…</div>;
  }

  const n = network || {};
  const kpis = [
    {
      title: "Active Flows",
      value: n.total_flows ?? "-",
      subtitle: "Recent window",
    },
    {
      title: "Packets",
      value: Number(n.total_packets || 0).toLocaleString(),
      subtitle: "Aggregated",
    },
    {
      title: "Data Volume",
      value: formatBytes(n.total_bytes),
      subtitle: "Total observed",
    },
    {
      title: "Avg Duration",
      value: n.avg_duration != null ? `${Number(n.avg_duration).toFixed(1)}s` : "-",
      subtitle: "Per flow",
    },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Network Operations Center</h1>
          <p>Live flow telemetry · anomaly detection · link health</p>
        </div>
        <div className="system-status">
          <span className="status-dot"></span>
          Live · {topology ? `${deviceStats.totalLinks} links` : "connecting"}
        </div>
      </div>

      <div className="stats-grid">
        {kpis.map((kpi) => (
          <StatCard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="stats-grid risk-strip">
        <StatCard
          title="Incidents"
          value={risk ? risk.total_incidents : "-"}
          subtitle="Total detected"
        />
        <StatCard
          title="Critical"
          value={risk ? risk.critical_incidents : "-"}
          subtitle="Require immediate action"
        />
        <StatCard
          title="Alert Reduction"
          value={risk ? `${risk.alert_reduction_pct}%` : "-"}
          subtitle="Via event correlation"
        />
        <StatCard
          title="Availability"
          value={risk ? `${risk.availability_pct}%` : "-"}
          subtitle="Network uptime estimate"
        />
      </div>

      <div className="dashboard-grid">
        <div className="panel traffic-panel">
          <div className="panel-header">
            <div>
              <h2>Live Traffic Throughput</h2>
              <p>Bytes / poll interval (5s) with packet rate overlay</p>
            </div>
            <span className="live-badge">● LIVE</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={trafficHistory} margin={{ top: 5, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradBytes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.85} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,150,190,0.15)" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#93a4c0" }} />
              <YAxis
                yAxisId="bytes"
                tick={{ fontSize: 11, fill: "#93a4c0" }}
                tickFormatter={(v) => formatBytes(v)}
              />
              <YAxis
                yAxisId="pkts"
                orientation="right"
                tick={{ fontSize: 11, fill: "#a78bfa" }}
                tickFormatter={(v) => `${v}/s`}
              />
              <Tooltip
                contentStyle={{ background: "#111a2c", border: "1px solid #2a3a57", borderRadius: 10 }}
                labelStyle={{ color: "#e6edf7" }}
                formatter={(value, name) => {
                  if (name === "trafficBytes") return [formatBytes(value), "Throughput"];
                  return [`${value} pkt/s`, "Packet rate"];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                yAxisId="bytes"
                type="monotone"
                dataKey="trafficBytes"
                name="Throughput"
                stroke="#38bdf8"
                strokeWidth={2}
                fill="url(#gradBytes)"
              />
              <Line
                yAxisId="pkts"
                type="monotone"
                dataKey="packetsPerSec"
                name="Packet rate"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h2>Protocol Mix</h2>
          <p className="panel-description">Flows by transport protocol</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={protocolDist.length ? protocolDist : [{ name: "No data", count: 1 }]}
                dataKey="count"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {protocolDist.map((entry) => (
                  <Cell key={entry.name} fill={PROTOCOL_COLORS[entry.name] || "#64748b"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#111a2c", border: "1px solid #2a3a57", borderRadius: 10 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="protocol-legend">
            {protocolDist.map((entry) => (
              <div key={entry.name} className="protocol-legend-item">
                <span
                  className="protocol-dot"
                  style={{ background: PROTOCOL_COLORS[entry.name] || "#64748b" }}
                />
                <span>{entry.name}</span>
                <strong>
                  {entry.count} · {formatBytes(entry.bytes)}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Top Destinations</h2>
          <p className="panel-description">Traffic volume by destination IP</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={topDestinations}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,150,190,0.15)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#93a4c0" }} tickFormatter={(v) => formatBytes(v)} />
              <YAxis
                type="category"
                dataKey="destination"
                width={78}
                tick={{ fontSize: 10.5, fill: "#93a4c0", fontFamily: "monospace" }}
              />
              <Tooltip
                contentStyle={{ background: "#111a2c", border: "1px solid #2a3a57", borderRadius: 10 }}
                formatter={(value) => [formatBytes(value), "Bytes"]}
              />
              <Bar dataKey="bytes" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Device &amp; Link Health</h2>
              <p>
                {deviceStats
                  ? `${deviceStats.totalLinks} monitored links · ${deviceStats.congested} congested · ${deviceStats.warning} warning`
                  : "Loading device inventory…"}
              </p>
            </div>
            <span className="live-badge">● LIVE</span>
          </div>

          <div className="device-chips">
            {deviceStats
              ? deviceStats.nodes.map((node) => {
                  const level = nodeHealth(node, deviceStats.links);
                  return (
                    <div key={node.id} className={`device-chip ${level}`}>
                      <span className="device-chip-dot"></span>
                      <strong>{node.id}</strong>
                      <small>{node.label}</small>
                    </div>
                  );
                })
              : null}
          </div>

          <div className="link-list">
            {(deviceStats?.links || []).map((link, index) => (
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

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Live Network Flows</h2>
              <p>Raw flow telemetry with anomaly flags</p>
            </div>
            <span className="live-badge">● STREAM</span>
          </div>
          <div className="table-wrap">
            <table className="data-table flow-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Dest</th>
                  <th>Proto</th>
                  <th>Bytes</th>
                  <th>Pkts</th>
                  <th>Dur</th>
                  <th>Flag</th>
                </tr>
              </thead>
              <tbody>
                {visibleFlows.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty-row">No flows yet.</td>
                  </tr>
                )}
                {visibleFlows.map((flow) => {
                  const flag = flagFlow(flow);
                  return (
                    <tr key={flow.flow_id}>
                      <td className="mono">{flow.source_ip}</td>
                      <td className="mono">
                        {flow.destination_ip}:{flow.destination_port}
                      </td>
                      <td>{flow.protocol}</td>
                      <td>{formatBytes(flow.bytes)}</td>
                      <td>{flow.packets}</td>
                      <td>{flow.duration}s</td>
                      <td>
                        {flag ? (
                          <span className={`flag-badge ${flag.cls}`} title={flag.title}>
                            {flag.label}
                          </span>
                        ) : (
                          <span className="flag-badge normal">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h2>Top Talkers</h2>
          <p className="panel-description">Traffic volume by source IP</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={topTalkers}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,150,190,0.15)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#93a4c0" }} tickFormatter={(v) => formatBytes(v)} />
              <YAxis
                type="category"
                dataKey="source"
                width={78}
                tick={{ fontSize: 10.5, fill: "#93a4c0", fontFamily: "monospace" }}
              />
              <Tooltip
                contentStyle={{ background: "#111a2c", border: "1px solid #2a3a57", borderRadius: 10 }}
                formatter={(value) => [formatBytes(value), "Bytes"]}
              />
              <Bar dataKey="bytes" fill="#a78bfa" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h2>Flagged Activity</h2>
          <p className="panel-description">Anomaly flags raised on live flows</p>
          {flaggedFlows.length === 0 && (
            <p className="muted">No suspicious flows detected — traffic looks clean.</p>
          )}
          <div className="flagged-list">
            {flaggedFlows.map((flow) => (
              <div key={flow.flow_id} className="flagged-item">
                <span className={`flag-badge ${flow._flag.cls}`}>{flow._flag.label}</span>
                <span className="mono">
                  {flow.source_ip} → {flow.destination_ip}:{flow.destination_port}
                </span>
                <span>
                  {formatBytes(flow.bytes)} · {flow.protocol}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NetworkDashboard;