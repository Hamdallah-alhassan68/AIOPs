function Header({ title, subtitle, theme, onToggleTheme, onMenuClick }) {
  return (
    <header className="header">
      <div className="header-left">
        <button
          className="menu-button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          ☰
        </button>

        <div>
          <h1>{title}</h1>
          <p>{subtitle || "Real-time network intelligence"}</p>
        </div>
      </div>

      <div className="header-right">
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label="Switch between dark and light theme"
          title={
            theme === "dark"
              ? "Switch to light theme"
              : "Switch to dark theme"
          }
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>

        <div className="system-status">
          <span className="status-dot"></span>
          <div>
            <strong>AIOps Engine Online</strong>
            <span>Isolation Forest monitoring active</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;