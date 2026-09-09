import { useEffect, useState } from "react";

import api from "../services/api";
import StatCard from "../components/StatCard";


function RiskDashboard() {

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);


  useEffect(() => {

    const loadRiskData = () => {

      api.get("/dashboard/risk")

        .then((response) => {

          setData(response.data);
          setError(null);

        })

        .catch((error) => {

          console.error(error);

          setError(
            "Unable to connect to AIOps backend"
          );

        });

    };


    // Load immediately
    loadRiskData();


    // Refresh risk information every 5 seconds
    const interval = setInterval(
      loadRiskData,
      5000
    );


    return () => clearInterval(interval);

  }, []);


  if (error) {

    return (
      <div className="error-message">
        {error}
      </div>
    );

  }


  if (!data) {

    return (
      <div className="loading">
        Loading risk intelligence...
      </div>
    );

  }


  // Get the latest incident from the correlated event
  const latestIncident =
    data.latest_event?.incidents?.[0] || null;


  const riskLevel =
    latestIncident?.severity || "Healthy";


  const riskScore =
    latestIncident?.risk_score ?? 10;


  const anomalyScore =
    latestIncident?.anomaly_score ?? null;


  const riskClass = riskLevel
    .toLowerCase()
    .replace(/\s+/g, "-");


  return (

    <div className="dashboard">


      {/* ==========================================
          PAGE HEADER
          ========================================== */}

      <div className="dashboard-header">

        <div>

          <h1>
            AIOps Risk Intelligence
          </h1>

          <p>
            Machine learning based network risk
            and anomaly analysis
          </p>

        </div>


        <div className="system-status">

          <span className="status-dot"></span>

          AI Monitoring Active

        </div>

      </div>


      {/* ==========================================
          INCIDENT KPI CARDS
          ========================================== */}

      <div className="stats-grid">

        <StatCard
          title="Total Incidents"
          value={data.total_incidents}
          subtitle="Detected incidents"
        />


        <StatCard
          title="High Risk"
          value={data.high_risk_incidents}
          subtitle="High-risk incidents"
        />


        <StatCard
          title="Critical"
          value={data.critical_incidents}
          subtitle="Critical incidents"
        />


        <StatCard
          title="Correlated Events"
          value={data.correlated_events}
          subtitle="Related events"
        />

      </div>


      {/* ==========================================
          RISK OVERVIEW
          ========================================== */}

      <div className="risk-dashboard-grid">


        {/* Risk Score */}

        <div className={`panel risk-main-card ${riskClass}`}>

          <div className="panel-header">

            <div>

              <h2>
                Current Network Risk
              </h2>

              <p>
                AI-generated risk assessment
              </p>

            </div>


            <span
              className={`risk-badge ${riskClass}`}
            >
              {riskLevel}
            </span>

          </div>


          <div className="risk-score-display">

            <strong>
              {riskScore}
            </strong>

            <span>
              / 100
            </span>

          </div>


          <div className="risk-progress">

            <div
              className={`risk-progress-bar ${riskClass}`}
              style={{
                width: `${riskScore}%`
              }}
            ></div>

          </div>


          <div className="risk-scale">

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


        </div>


        {/* Anomaly Score */}

        <div className="panel anomaly-card">

          <h2>
            Anomaly Detection
          </h2>

          <p>
            Isolation Forest assessment
          </p>


          <div className="anomaly-score">

            {anomalyScore !== null
              ? anomalyScore.toFixed(4)
              : "—"
            }

          </div>


          <div className="anomaly-status">

            {anomalyScore !== null &&
            anomalyScore < 0 ? (

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

        </div>

      </div>


      {/* ==========================================
          LATEST INCIDENT
          ========================================== */}

      <div className="panel">


        <div className="panel-header">

          <div>

            <h2>
              Latest Risk Event
            </h2>

            <p>
              Most recent incident detected by
              the AIOps engine
            </p>

          </div>

        </div>


        {latestIncident ? (

          <div className="incident-details">


            <div className="incident-detail">

              <span>
                Incident ID
              </span>

              <strong>
                #{latestIncident.incident_id}
              </strong>

            </div>


            <div className="incident-detail">

              <span>
                Severity
              </span>

              <strong
                className={`risk-text ${riskClass}`}
              >
                {latestIncident.severity}
              </strong>

            </div>


            <div className="incident-detail">

              <span>
                Risk Score
              </span>

              <strong>
                {latestIncident.risk_score} / 100
              </strong>

            </div>


            <div className="incident-detail">

              <span>
                Anomaly Score
              </span>

              <strong>
                {latestIncident.anomaly_score.toFixed(4)}
              </strong>

            </div>


            <div className="incident-detail">

              <span>
                Status
              </span>

              <strong>
                {latestIncident.status}
              </strong>

            </div>


            <div className="incident-detail">

              <span>
                Detected At
              </span>

              <strong>
                {latestIncident.created_at}
              </strong>

            </div>


          </div>

        ) : (

          <div className="no-incidents">

            <div className="healthy-icon">
              ✓
            </div>

            <h3>
              No Active Incidents
            </h3>

            <p>
              The AIOps engine has not detected
              any abnormal network behavior.
            </p>

          </div>

        )}

      </div>


      {/* ==========================================
          EVENT CORRELATION
          ========================================== */}

      <div className="dashboard-grid">


        <div className="panel">

          <h2>
            Event Correlation
          </h2>

          <p className="panel-description">
            Related network incidents grouped by
            the AIOps correlation engine.
          </p>


          <div className="correlation-number">

            {data.correlated_events}

          </div>


          <span className="correlation-label">
            Correlated Events

          </span>

        </div>


        <div className="panel">

          <h2>
            Risk Assessment
          </h2>


          <div className="risk-explanation">

            {riskLevel === "Critical" && (

              <>
                <strong>
                  Critical network risk
                </strong>

                <p>
                  The machine learning model has
                  identified highly abnormal network
                  behavior. Immediate investigation
                  is recommended.
                </p>
              </>

            )}


            {riskLevel === "High Risk" && (

              <>
                <strong>
                  High network risk
                </strong>

                <p>
                  Significant abnormal behavior has
                  been detected and should be
                  investigated.
                </p>
              </>

            )}


            {riskLevel === "Medium Risk" && (

              <>
                <strong>
                  Moderate network risk
                </strong>

                <p>
                  The network shows unusual behavior
                  that should be monitored.
                </p>
              </>

            )}


            {riskLevel === "Low Risk" && (

              <>
                <strong>
                  Low network risk
                </strong>

                <p>
                  Minor deviations from normal
                  network behavior have been detected.
                </p>
              </>

            )}


            {riskLevel === "Healthy" && (

              <>
                <strong>
                  Network operating normally
                </strong>

                <p>
                  No significant abnormal behavior
                  has been detected.
                </p>
              </>

            )}

          </div>

        </div>

      </div>


      {/* ==========================================
          RECOMMENDATIONS - NEXT AIOPS FEATURE
          ========================================== */}

      <div className="panel recommendation-placeholder">

        <div className="panel-header">

          <div>

            <h2>
              AI Recommendations
            </h2>

            <p>
              Recommended actions based on detected
              network risk
            </p>

          </div>

          <span className="coming-soon-badge">
            AIOps
          </span>

        </div>


        <div className="recommendation-content">

          <div className="recommendation-icon">
            AI
          </div>

          <div>

            <h3>
              Intelligent Response Recommendations
            </h3>

            <p>
              The next stage of the AIOps engine will
              identify the probable root cause and
              recommend actions such as traffic
              investigation, firewall review, or
              alternative routing.
            </p>

          </div>

        </div>

      </div>


    </div>

  );

}


export default RiskDashboard;