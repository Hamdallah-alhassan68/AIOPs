const NAV_GROUPS = [
  {
    section: "Monitoring",
    items: [
      { id: "network", label: "Network Monitoring", icon: "◈" },
      { id: "risk", label: "AIOps Risk", icon: "◉" },
    ],
  },
  {
    section: "Operations",
    items: [
      { id: "incidents", label: "Incidents", icon: "⚠" },
      { id: "reroute", label: "Reroute Simulator", icon: "⇄" },
      { id: "sla", label: "SLA & Reports", icon: "▤" },
    ],
  },
];

function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen }) {
  const handleNavigation = (page) => {
    setCurrentPage(page);
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo-wrap">
            <div className="logo">AIOps</div>
            <div className="logo-subtitle">Network Intelligence</div>
          </div>

          <button
            className="sidebar-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
          >
            ×
          </button>
        </div>

        <nav>
          {NAV_GROUPS.map((group) => (
            <div key={group.section} className="nav-group">
              <div className="nav-section-label">{group.section}</div>

              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${
                    currentPage === item.id ? "active" : ""
                  }`}
                  onClick={() => handleNavigation(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot"></span>
          NOC Console v1.0
        </div>
      </aside>
    </>
  );
}

export default Sidebar;