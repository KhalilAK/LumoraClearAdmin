import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

export function Layout() {
  const { mode, toggleMode } = useTheme();
  const { logout } = useAuth();

  return (
    <div className="page-shell">
      <header className="hero-header">
        <div className="hero-inner">
          <div className="brand">
            <img src={logo} alt="" className="brand-mark" />
            LumoraClear Admin
          </div>

          <nav className="nav-tabs">
            <NavLink to="/database" className={({ isActive }) => `nav-tab${isActive ? " active" : ""}`}>
              Database
            </NavLink>
            <NavLink to="/colors" className={({ isActive }) => `nav-tab${isActive ? " active" : ""}`}>
              Color Scheme
            </NavLink>
          </nav>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-button" onClick={toggleMode} title="Toggle admin UI theme">
              {mode === "dark" ? "☀️" : "🌙"}
            </button>
            <button className="icon-button" onClick={() => logout()} title="Log out">
              ⏻
            </button>
          </div>
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
