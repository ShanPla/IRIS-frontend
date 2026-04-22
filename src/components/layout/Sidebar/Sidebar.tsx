import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, HardDrive, ShieldCheck, LogOut, Users } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { TextScramble } from "../../ui/text-scramble";
import "./Sidebar.css";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const links = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/devices", label: "Devices", icon: HardDrive },
  { to: "/profiles", label: "Accounts", icon: Users },
  { to: "/admin-accounts", label: "Admin", icon: ShieldCheck },
];

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const initials = session?.user.username?.slice(0, 2).toUpperCase() ?? "IR";

  const handleLogout = () => {
    onCloseMobile();
    logout();
    navigate("/login");
  };

  return (
    <aside className={`sidebar-aside ${mobileOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar-header">
        <div className="flex items-center gap-3">
          <div className="sidebar-avatar glass-monolith">
            {initials}
          </div>
          <div>
            <h3 className="sidebar-brand-title">IRIS CORE</h3>
            <p className="sidebar-brand-subtitle">Active Session</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
            }
          >
            <Icon size={18} className="sidebar-icon" />
            <TextScramble text={label} className="sidebar-label" />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} className="mr-3" />
          <span className="font-['Inter'] uppercase tracking-widest text-[11px] font-bold">Logout</span>
        </button>
      </div>
    </aside>
  );
}
