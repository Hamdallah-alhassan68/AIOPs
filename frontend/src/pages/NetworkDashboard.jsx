import { useEffect, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import api from "../services/api";
import StatCard from "../components/StatCard";


function NetworkDashboard() {

  const [data, setData] = useState(null);
const [flows, setFlows] = useState([]);
const [error, setError] = useState(null);
const [riskData, setRiskData] = useState(null);
const [trafficHistory, setTrafficHistory] = useState([]);


  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

 useEffect(() => {

  const loadDashboard = async () => {

    try {

      const [
        networkResponse,
        riskResponse,
        flowsResponse
      ] = await Promise.all([

        api.get("/dashboard/network"),

        api.get("/dashboard/risk"),

        api.get("/monitoring/flows?limit=20")

      ]);

      setData(networkResponse.data);

      setRiskData(riskResponse.data);

      const newFlows =
        flowsResponse.data.flows || [];

      setFlows(newFlows);

      /*
       * Convert real backend flows
       * into chart data.
       */

      // Create one real-time snapshot from the current flows
const totalBytes = newFlows.reduce(
  (sum, flow) =>
    sum + (Number(flow.bytes) || 0),
  0
);

const totalPackets = newFlows.reduce(
  (sum, flow) =>
    sum + (Number(flow.packets) || 0),
  0
);

const snapshot = {
  time: new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }),
  traffic: totalBytes,
  packets: totalPackets
};

// Keep the last 12 snapshots
setTrafficHistory((previous) => [
  ...previous,
  snapshot
].slice(-12));

      setError(null);

    } catch (error) {

      console.error(
        "Dashboard error:",
        error
      );

      setError(
        "Unable to connect to AIOps backend"
      );

    }

  };

  // Load immediately
  loadDashboard();

  // Refresh every 5 seconds
  const interval = setInterval(
    loadDashboard,
    5000
  );

  return () =>
    clearInterval(interval);

}, []);

  // =====================================================
  // LOADING
  // =====================================================

  if (error) {

    return (
      <div className="error-message">
        {error}
      </div>
    );

  }


  if (!data || !riskData) {
  return (
    <div className="loading">
      Loading network data...
    </div>
  );
}

  // =====================================================
  // TOP DESTINATIONS
  // =====================================================

  const topDestinations = Object.entries(

    flows.reduce(
      (acc, flow) => {

        const ip =
          flow.destination_ip || "Unknown";

        acc[ip] =
          (acc[ip] || 0) + 1;

        return acc;

      },
      {}
    )

  )
    .sort(
      (a, b) => b[1] - a[1]
    )
    .slice(0, 5);


  // =====================================================
  // PROTOCOL DISTRIBUTION
  // =====================================================

  const protocolCounts = flows.reduce(

    (acc, flow) => {

      const protocol =
        flow.protocol?.toUpperCase() ||
        "UNKNOWN";

      acc[protocol] =
        (acc[protocol] || 0) + 1;

      return acc;

    },

    {}

  );


  const protocolData = Object.entries(
    protocolCounts
  ).map(
    ([name, value]) => ({
      name,
      value
    })
  );


  const COLORS = [
    "#2563eb",
    "#16a34a",
    "#f59e0b",
    "#dc2626"
  ];


  // =====================================================
  // RISK INFORMATION
  // =====================================================

  const latestIncident =
    riskData.latest_event
      ?.incidents?.[0] || null;


  const riskLevel =
    latestIncident?.severity ||
    "Healthy";


  const riskScore =
    latestIncident?.risk_score ??
    10;


  const riskClass =
    riskLevel
      .toLowerCase()
      .replace(/\s+/g, "-");


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <div className="dashboard">


      {/* =================================================
          HEADER
      ================================================= */}

      <div className="dashboard-header">

        <div>

          <h1>
            Network Monitoring
          </h1>

          <p>
            Real-time AIOps network visibility
            and anomaly monitoring
          </p>

        </div>


        <div className="system-status">

          <span className="status-dot"></span>

          System Operational

        </div>

      </div>



      {/* =================================================
          KPI CARDS
      ================================================= */}

      <div className="stats-grid">

        <StatCard
          title="Network Flows"
          value={data.total_flows}
          subtitle="Recent flows"
        />

        <StatCard
          title="Packets"
          value={data.total_packets}
          subtitle="Total packets"
        />

        <StatCard
          title="Traffic"
          value={data.total_bytes}
          subtitle="Total bytes"
        />

        <StatCard
          title="Destinations"
          value={data.unique_destinations}
          subtitle="Unique IPs"
        />

      </div>



      {/* =================================================
          DESTINATIONS + PROTOCOL
      ================================================= */}

      <div className="dashboard-grid">


        {/* TOP DESTINATIONS */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Top Destinations
              </h2>

              <p>
                Most contacted destination IPs
              </p>

            </div>

          </div>


          <div className="destination-list">

            {topDestinations.length > 0 ? (

              topDestinations.map(
                ([ip, count]) => (

                  <div
                    key={ip}
                    className="destination-item"
                  >

                    <span>
                      {ip}
                    </span>

                    <strong>
                      {count}
                      {" "}
                      flow
                      {count > 1 ? "s" : ""}
                    </strong>

                  </div>

                )
              )

            ) : (

              <p>
                No destination data available.
              </p>

            )}

          </div>

        </div>



        {/* PROTOCOL DISTRIBUTION */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Protocol Distribution
              </h2>

              <p>
                Network traffic by protocol
              </p>

            </div>

          </div>


          <div className="chart-container">

            <ResponsiveContainer
              width="100%"
              height={330}
            >

              <PieChart>

                <Pie
                  data={protocolData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={135}
                  label
                >

                  {protocolData.map(
                    (entry, index) => (

                      <Cell
                        key={index}
                        fill={
                          COLORS[
                            index %
                            COLORS.length
                          ]
                        }
                      />

                    )
                  )}

                </Pie>

                <Tooltip />

                <Legend />

              </PieChart>

            </ResponsiveContainer>

          </div>

        </div>

      </div>



      {/* =================================================
          LIVE NETWORK TRAFFIC
      ================================================= */}

      <div className="panel traffic-panel">

        <div className="panel-header">

          <div>

            <h2>
              Network Traffic
            </h2>

            <p>
              Live network traffic volume
            </p>

          </div>


          <span className="live-badge">
            ● LIVE
          </span>

        </div>


        <div className="chart-container">

          <ResponsiveContainer
            width="100%"
            height={320}
          >

            <AreaChart
              data={trafficHistory}
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="time"
              />

              <YAxis />

              <Tooltip
      formatter={(value) =>
        `${Number(value).toLocaleString()} bytes`
      }
    />


              <Area
                type="monotone"
                dataKey="traffic"
                stroke="#2563eb"
                fill="#2563eb"
                fillOpacity={0.15}
                name="Bytes"
                isAnimationActive={true}
               animationDuration={800}

              />

            </AreaChart>

          </ResponsiveContainer>

        </div>

      </div>



      {/* =================================================
          NETWORK HEALTH
      ================================================= */}

      <div className="dashboard-grid">


        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Network Health
              </h2>

              <p>
                Current network status
              </p>

            </div>

          </div>


          <div className="health-status">

            <div className="health-circle">
              ✓
            </div>

            <h3>
              {data.network_health}
            </h3>

            <p>
              Network operating normally
            </p>

          </div>


          <div className="health-metrics">

            <div>

              <span>
                Availability
              </span>

              <strong>
                99.9%
              </strong>

            </div>


            <div>

              <span>
                Avg Duration
              </span>

              <strong>
                {data.avg_duration?.toFixed(1)} s
              </strong>

            </div>


            <div>

              <span>
                Avg TTL
              </span>

              <strong>
                {data.avg_ttl?.toFixed(0)}
              </strong>

            </div>

          </div>

        </div>


        {/* PACKET ACTIVITY */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Packet Activity
              </h2>

              <p>
                Live packets observed
              </p>

            </div>

          </div>


          <div className="chart-container">

            <ResponsiveContainer
              width="100%"
              height={300}
            >

              <LineChart
                data={trafficHistory}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="time"
                />

                <YAxis />

                 <Tooltip
      formatter={(value) =>
        `${Number(value).toLocaleString()} packets`
      }
    />


                <Line
                  type="monotone"
                  dataKey="packets"
                  stroke="#16a34a"
                  strokeWidth={3}
                dot={true}
                isAnimationActive={true}
                 animationDuration={800}
                  name="Packets"
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </div>

      </div>



      {/* =================================================
          AIOPS RISK
      ================================================= */}

      <div className="panel risk-panel">

        <div className="panel-header">

          <div>

            <h2>
              AIOps Risk & Anomaly Detection
            </h2>

            <p>
              Machine learning based network
              risk assessment
            </p>

          </div>


          <span
            className={`risk-badge ${riskClass}`}
          >
            {riskLevel}
          </span>

        </div>



        {/* RISK OVERVIEW */}

        <div className="risk-overview">


          <div
            className={`risk-score-card ${riskClass}`}
          >

            <span className="risk-label">
              Current Risk Score
            </span>

            <strong className="risk-score">
              {riskScore}
            </strong>

            <span className="risk-max">
              / 100
            </span>

          </div>


          <div className="risk-stat">

            <span>
              Total Incidents
            </span>

            <strong>
              {riskData.total_incidents}
            </strong>

          </div>


          <div className="risk-stat">

            <span>
              Critical Incidents
            </span>

            <strong>
              {riskData.critical_incidents}
            </strong>

          </div>


          <div className="risk-stat">

            <span>
              Correlated Events
            </span>

            <strong>
              {riskData.correlated_events}
            </strong>

          </div>

        </div>



        {/* RISK DETAILS */}

        <div className="risk-details">


          <div className="risk-detail-card">

            <h3>
              Latest Risk Event
            </h3>


            {latestIncident ? (

              <>

                <div className="incident-row">

                  <span>
                    Severity
                  </span>

                  <strong
                    className={`risk-text ${riskClass}`}
                  >
                    {latestIncident.severity}
                  </strong>

                </div>


                <div className="incident-row">

                  <span>
                    Anomaly Score
                  </span>

                  <strong>
                    {Number(
                      latestIncident.anomaly_score
                    ).toFixed(4)}
                  </strong>

                </div>


                <div className="incident-row">

                  <span>
                    Risk Score
                  </span>

                  <strong>
                    {latestIncident.risk_score}
                    {" "}/ 100
                  </strong>

                </div>


                <div className="incident-row">

                  <span>
                    Status
                  </span>

                  <strong>
                    {latestIncident.status}
                  </strong>

                </div>


                <div className="incident-row">

                  <span>
                    Detected At
                  </span>

                  <strong>
                    {latestIncident.created_at}
                  </strong>

                </div>

              </>

            ) : (

              <div className="no-risk-event">

                <strong>
                  No active incidents
                </strong>

                <p>
                  No network anomalies have
                  been detected.
                </p>

              </div>

            )}

          </div>



          {/* RISK ASSESSMENT */}

          <div className="risk-detail-card">

            <h3>
              Risk Assessment
            </h3>


            <div className="risk-meter">

              <div
                className={`risk-meter-fill ${riskClass}`}
                style={{
                  width: `${riskScore}%`
                }}
              ></div>

            </div>


            <div className="risk-meter-labels">

              <span>
                Low
              </span>

              <span>
                Medium
              </span>

              <span>
                High
              </span>

              <span>
                Critical
              </span>

            </div>


            <p className="risk-description">

              {riskLevel === "Critical"

                ? "The machine learning model has detected highly abnormal network behavior requiring immediate investigation."

                : riskLevel === "High Risk"

                ? "Abnormal network behavior has been detected and should be investigated."

                : riskLevel === "Medium Risk"

                ? "Some network behavior appears unusual and should be monitored."

                : riskLevel === "Low Risk"

                ? "Minor deviations from normal network behavior have been detected."

                : "Network activity is currently within the expected behavioral range."

              }

            </p>

          </div>

        </div>

      </div>



      {/* =================================================
          AIOPS STATUS + ALERTS
      ================================================= */}

      <div className="dashboard-grid">


        <div className="panel">

          <h2>
            Anomaly Detection
          </h2>


          <div className="aiops-status">

            <div className="aiops-icon">
              AI
            </div>


            <div>

              <h3>
                Monitoring Active
              </h3>

              <p>
                Isolation Forest is monitoring
                network traffic for abnormal
                behavior.
              </p>

            </div>

          </div>

        </div>



        <div className="panel">

          <h2>
            Recent Alerts
          </h2>


          <div className="alert-item">

            <span className="alert-indicator"></span>


            <div>

              <strong>

                {riskData.critical_incidents > 0

                  ? `${riskData.critical_incidents} critical incident detected`

                  : "No critical alerts"

                }

              </strong>


              <p>

                {riskData.critical_incidents > 0

                  ? "The network requires investigation based on the detected anomaly."

                  : "Network activity is currently within expected thresholds."

                }

              </p>

            </div>

          </div>

        </div>

      </div>


    </div>

  );

}


export default NetworkDashboard;