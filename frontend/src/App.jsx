import { useState } from "react";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import NetworkDashboard from "./pages/NetworkDashboard";
import RiskDashboard from "./pages/RiskDashboard";

import "./App.css";


function App() {

  const [currentPage, setCurrentPage] =
    useState("network");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);


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
          title={
            currentPage === "network"
              ? "Network Operations"
              : "AIOps Risk Intelligence"
          }
          onMenuClick={() =>
            setSidebarOpen(true)
          }
        />

        {currentPage === "network" && (
          <NetworkDashboard />
        )}

        {currentPage === "risk" && (
          <RiskDashboard />
        )}

      </main>

    </div>

  );
}

export default App;