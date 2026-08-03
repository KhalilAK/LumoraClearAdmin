import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

const NAV_ITEMS = [
  { to: "/database", label: "Database" },
  { to: "/colors", label: "Color Scheme" },
];

export function Layout() {
  const { mode, toggleMode } = useTheme();
  const { logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="page-shell">
      <header className="hero-header">
        <div className="hero-inner">
          <div className="brand">
            <img src={logo} alt="" className="brand-mark" />
            LumoraClear Admin
          </div>

          <nav className="nav-tabs">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-tab${isActive ? " active" : ""}`}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <button className="icon-button" onClick={toggleMode} title="Toggle admin UI theme">
              {mode === "dark" ? "☀️" : "🌙"}
            </button>
            <button className="btn-logout" onClick={() => logout()}>
              Logout
            </button>
          </div>

          <button className="icon-button hamburger-button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            ☰
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="drawer-overlay" onClick={() => setMenuOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top-row">
              <span className="drawer-title">Menu</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="icon-button" onClick={toggleMode} title="Toggle admin UI theme">
                  {mode === "dark" ? "☀️" : "🌙"}
                </button>
                <button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  ✕
                </button>
              </div>
            </div>

            <nav className="drawer-nav">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `drawer-nav-item${isActive ? " active" : ""}`}>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <button className="btn-logout drawer-logout" onClick={() => logout()}>
              Logout
            </button>
          </div>
        </div>
      )}

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
