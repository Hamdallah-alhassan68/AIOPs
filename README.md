# AIOps-Based Intelligent Network Monitoring & Incident Management System

A production-style **Network Operations Center (NOC) console** for the
**Nairobi Digital Bank (NDB)** pilot. The platform continuously collects
telemetry, detects anomalies with an **Isolation Forest** model, correlates
events, creates incidents, performs **root cause analysis**, recommends
actions, **simulates reroutes** for congested links and visualizes network
health and SLA KPIs in near real time.

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Backend  | Python 3 · FastAPI · scikit-learn · pandas · joblib · SQLite |
| Frontend | React 19 · Vite · Recharts (no runtime deps beyond React) |
| Model    | Isolation Forest pipeline (`models/isolation_forest_pipeline.pkl`) |

---

## Architecture (deliverables mapping)

```
Network Devices (Routers / Switches / Firewalls / SD-WAN)
        |
        v
Telemetry Collection  (SQLite `network_flows` + POST /monitoring/flows)
        |
        v
Data Pipeline Layer    services/feature_service.py   (bytes_per_packet, …)
        |
        v
Anomaly Detection     services/anomaly_service.py   (Isolation Forest)
        |
        v
Risk Classification   services/risk_service.py      (Healthy → Critical)
        |
        v
Incident Management   services/incident_service.py  (Open → … → Closed)
        |
        +-----------+-----------+-----------+----------+
        v           v                       v          v
  Correlation   Root Cause             Reroute    SLA / KPIs
  (coalescing)  Analysis             Simulation
  services/     services/            services/    services/
  correlation_  rca_service.py       reroute_     sla_service.py
  service.py    recommendation_      service.py
                service.py
        |
        v
Dashboard & Reporting  (React NOC console)
```

| Deliverable | Status | Where |
| ----------- | ------ | ----- |
| 1. Reference architecture | ✅ | `backened/app.py` + this doc |
| 2. Data pipeline | ✅ | `backened/services/feature_service.py` |
| 3. Anomaly detection (Isolation Forest) | ✅ | `backened/services/anomaly_service.py` |
| 4. Risk classification | ✅ | `backened/services/risk_service.py` |
| 5. Incident management lifecycle | ✅ | `backened/services/incident_service.py` |
| 6. Event correlation (alert fatigue) | ✅ | `backened/services/correlation_service.py` |
| 7. Root cause analysis | ✅ | `backened/services/rca_service.py` |
| 8. Recommendation engine | ✅ | `backened/services/recommendation_service.py` |
| 9. Reroute simulation engine | ✅ | `backened/services/reroute_service.py` |
| 10. Analytics dashboard platform | ✅ | `frontend/src/` (5 pages) |
| 11. Pilot evaluation report / KPIs | ✅ | SLA page + `/dashboard/sla` |

---

## Quick Start

### 1. Seed demo data (optional but recommended)

```bash
cd backened
pip install -r requirements.txt
python scripts/seed_telemetry.py
```

The seeder inserts ~120 normal flows plus burst windows (traffic spike, port
scan, abnormal transfer) and pushes each window through the full AIOps
pipeline, creating realistic incidents for the dashboards.

### 2. Start the API

```bash
cd backened
uvicorn app:app --reload --port 8000
```

Interactive API docs: http://127.0.0.1:8000/docs

### 3. Start the UI

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## API Surface

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET  | `/health` | service health |
| GET  | `/monitoring/flows` · `/monitoring/summary` | telemetry read |
| POST | `/monitoring/flows` | ingest one netflow → full AIOps pipeline |
| POST | `/monitoring/simulate` | inject a burst, get window analysis |
| GET  | `/dashboard/network` | network KPIs |
| GET  | `/dashboard/risk` | risk, correlation, SLA summary + latest incident |
| GET  | `/dashboard/sla` | pilot KPIs (availability, MTTR, alert reduction) |
| GET  | `/dashboard/incidents` | incidents + correlated events |
| GET  | `/dashboard/reroute/topology` | reference WAN topology |
| POST | `/dashboard/reroute/simulate` | run a reroute simulation |
| GET  | `/incidents/?severity=&status=&limit=` | filter incidents |
| GET  | `/incidents/{id}` · `/incidents/summary` | incident detail |
| PATCH| `/incidents/{id}` `{status}` | lifecycle transition |

Incident status workflow: `Open → Acknowledged → Investigating → Resolved → Closed`.

---

## Project Layout

```
backened/
  app.py                     # FastAPI app + lifespan migration
  database/                  # SQLite access + schema migration
  routes/                    # HTTP API routers
  services/                  # AIOps intelligence services
  scripts/seed_telemetry.py  # demo data generator
  models/                    # trained isolation forest pipeline
  test_*.py                  # component smoke tests
frontend/
  src/App.jsx                # page router
  src/components/            # Sidebar, Header, StatCard
  src/pages/                 # Network, Risk, Incidents, Reroute, SLA
  src/services/api.js        # fetch-based API client
  src/App.css                # NOC dark console theme
```

---

## Operators Guide

- **Network Monitoring** – live traffic, top destinations, protocol mix, health.
- **AIOps Risk** – risk gauge, anomaly score, root cause + evidence, and AI
  recommended actions for the newest incident.
- **Incidents** – search/filter by severity/status, transition lifecycle
  states directly from the table.
- **Reroute Simulator** – pick a destination, set the shift %, and see the
  congested link drop predicted after redirecting traffic via the alternate
  path.
- **SLA & Reports** – availability, SLA compliance, MTTR, alert reduction and
  severity/status distributions used for the pilot evaluation report.

## Notes & Next Steps

- Move SQLite to time-series storage (e.g., InfluxDB/TimescaleDB) at scale.
- Add SNMP/syslog/NetFlow collectors and a settings page for thresholds.
- Introduce RBAC/AD login, audit trail and runbook automation (auto-remediate).
- Retrain the Isolation Forest on production data; add drift monitoring.
- Add paging/on-call escalation and alert channels (email, Teams, PagerDuty).
