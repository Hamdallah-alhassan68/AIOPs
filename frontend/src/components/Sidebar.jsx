function Sidebar({
  currentPage,
  setCurrentPage,
  isOpen,
  setIsOpen
}) {

  const handleNavigation = (page) => {
    setCurrentPage(page);
    setIsOpen(false);
  };

  return (
    <>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${
          isOpen ? "sidebar-open" : ""
        }`}
      >

        <div className="sidebar-header">

          <div>

            <div className="logo">
              AIOps
            </div>

            <div className="logo-subtitle">
              Network Intelligence
            </div>

          </div>

          {/* Close button only appears on mobile */}
          <button
            className="sidebar-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
          >
            ×
          </button>

        </div>

        <nav>

          <button
            className={
              currentPage === "network"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              handleNavigation("network")
            }
          >
            Network Monitoring
          </button>

          <button
            className={
              currentPage === "risk"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              handleNavigation("risk")
            }
          >
            AIOps Risk
          </button>

        </nav>

      </aside>
    </>
  );
}

export default Sidebar;