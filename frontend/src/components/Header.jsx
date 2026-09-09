function Header({ title, onMenuClick }) {

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

          <p>
            Real-time network intelligence
          </p>
        </div>

      </div>


      <div className="system-status">

        <span className="status-dot"></span>

        System Online

      </div>

    </header>

  );
}

export default Header;