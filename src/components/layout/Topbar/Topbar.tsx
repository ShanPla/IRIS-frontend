import { useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getStoredPiAddress } from "../../../lib/api";
import { Wifi, WifiOff } from "lucide-react";
import "./Topbar.css";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/logs": "Event Logs",
  "/profiles": "Face Profiles",
  "/users": "User Management",
  "/admin-accounts": "Admin Accounts",
  "/system-health": "System Health",
  "/settings": "Settings",
};

export default function Topbar() {
  const { session } = useAuth();
  const location = useLocation();
  const piAddress = getStoredPiAddress();
  const title = pageTitles[location.pathname] ?? "IRIS";

  return (
    <header className="topbar">
      <h2 className="topbar-title">{title}</h2>
      <div className="topbar-right">
        <div className={`topbar-pi ${piAddress ? "topbar-pi--connected" : "topbar-pi--disconnected"}`}>
          {piAddress ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{piAddress ?? "No Pi connected"}</span>
        </div>
        <div className="topbar-user">
          <span className="topbar-username">{session?.user.username}</span>
          <span className="topbar-role">{session?.user.role}</span>
        </div>
      </div>
    </header>
  );
}

