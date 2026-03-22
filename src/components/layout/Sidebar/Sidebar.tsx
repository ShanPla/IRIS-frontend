import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ScrollText, Users, Settings,
  LogOut, ShieldCheck, Activity, Server, UserCog, Video,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { getStoredPiAddress, hasPiBackendConfigured } from "../../../lib/api";
import "./Sidebar.css";

const fullLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/logs", label: "Event Logs", icon: ScrollText },
  { to: "/profiles", label: "Face Profiles", icon: Users },
  { to: "/users", label: "User Management", icon: UserCog },
  { to: "/admin-accounts", label: "Admin Accounts", icon: ShieldCheck },
  { to: "/live-feed", label: "Live Feed", icon: Video },
  { to: "/system-health", label: "System Health", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
];

const setupLinks = [
  { to: "/setup", label: "Set Raspberry Pi IP", icon: Server },
];

export default function Sidebar() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const piAddress = getStoredPiAddress();
  const piConfigured = hasPiBackendConfigured();
  const links = piConfigured ? fullLinks : setupLinks;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">IRIS</div>

      {piAddress && (
        <div className="sidebar-pi-badge">
          <Server size={11} />
          {piAddress}
        </div>
      )}
      {!piConfigured && (
        <p className="sidebar-warning">
          Limited mode: set Raspberry Pi IP to unlock all modules.
        </p>
      )}

      <nav className="sidebar-nav">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-icon"><ShieldCheck size={14} /></div>
          <div>
            <p className="sidebar-user-name">{session?.user.name}</p>
            <p className="sidebar-user-role">{session?.user.role}</p>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </aside>
  );
}
