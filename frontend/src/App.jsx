import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import NetworkDashboard from "./pages/NetworkDashboard";
import RiskDashboard from "./pages/RiskDashboard";
import IncidentsPage from "./pages/IncidentsPage";
import ReroutePage from "./pages/ReroutePage";
import SlaPage from "./pages/SlaPage";

import "./App.css";


const PAGE_META = {
  network: {
    title: "Network Operations",
    subtitle: "Real-time telemetry and anomaly monitoring",
  },
  risk: {
    title: "AIOps Risk Intelligence",
    subtitle: "Machine-learning network risk and anomaly analysis",
  },
  incidents: {
    title: "Incident Workspace",
    subtitle: "Manage the AIOps incident lifecycle",
  },
  reroute: {
    title: "Reroute Simulator",
    subtitle: "Simulate alternate paths during congestion",
  },
  sla: {
    title: "SLA & Operations Report",
    subtitle: "Availability, MTTR and pilot evaluation KPIs",
  },
};

function getInitialTheme() {
  try {
    const stored = localStorage.getItem("aiops-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* localStorage unavailable */
  }
  return "dark";
}

function App() {
  const [currentPage, setCurrentPage] = useState("network");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.body.dataset.theme = theme;
    try {
      localStorage.setItem("aiops-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((previous) => (previous === "dark" ? "light" : "dark"));
  };

  const meta = PAGE_META[currentPage] || PAGE_META.network;

  return (
    <div className="app">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <main className="main">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          theme={theme}
          onToggleTheme={toggleTheme}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {currentPage === "network" && <NetworkDashboard />}
        {currentPage === "risk" && <RiskDashboard />}
        {currentPage === "incidents" && <IncidentsPage />}
        {currentPage === "reroute" && <ReroutePage />}
        {currentPage === "sla" && <SlaPage />}
      </main>
    </div>
  );
}

export default App;