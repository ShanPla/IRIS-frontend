import { useEffect, useMemo, useState } from "react";
import { 
  ShieldAlert, 
  RefreshCw, 
  Activity, 
  Radio,
  Server,
  Users,
  Camera,
  Fingerprint,
  ExternalLink
} from "lucide-react";
import { apiClient } from "../../lib/api";
import { summarizeRegistryAccounts } from "../../lib/accountRegistry";
import type { FleetStatus, PiNodeStatus, AppUserAccount } from "../../types/iris";
import "./Dashboard.css";

export default function Dashboard() {
  const [fleet, setFleet] = useState<FleetStatus | null>(null);
  const [accounts, setAccounts] = useState<AppUserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = async (options?: { silent?: boolean }) => {
    if (options?.silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [fleetRes, accountsRes] = await Promise.all([
        apiClient.get<FleetStatus>("/api/fleet/status"),
        apiClient.get<AppUserAccount[]>("/api/auth/admin/app-users")
      ]);
      
      const fleetData = fleetRes.data;
      const accountsData = Array.isArray(accountsRes.data) ? accountsRes.data : [];
      
      setFleet(fleetData);
      setAccounts(accountsData);
    } catch {
      setError("Failed to synchronize with central cloud registry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
    const timer = setInterval(() => void loadData({ silent: true }), 30000);
    return () => clearInterval(timer);
  }, []);

  const registrySummary = useMemo(() => summarizeRegistryAccounts(accounts), [accounts]);

  const stats = useMemo(() => {
    const nodes = fleet?.nodes || [];
    const onlineDevicesCount = nodes.filter(n => n.status === "online").length;
    const offlineDevicesCount = nodes.length - onlineDevicesCount;
    const totalDetectionsCount = nodes.reduce((sum, n) => sum + n.total_events_today, 0);

    return {
        onlineDevices: onlineDevicesCount,
        offlineDevices: offlineDevicesCount,
        totalDetections: totalDetectionsCount,
        totalFaces: registrySummary.totalFaces,
        activeHomeowners: registrySummary.activeHomeowners,
        totalHomeowners: registrySummary.totalHomeowners,
        backendStatus: error ? "Offline" : "Online"
    };
  }, [fleet, registrySummary, error]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 w-full">
          <div>
            <p className="accounts-eyebrow">Fleet Intelligence / Global Mesh</p>
            <h1 className="dashboard-title">Fleet Supervision</h1>
            <div className="dashboard-pulse">
              <span className="pulse-dot"></span>
              <span>
                Backend Connectivity:{" "}
                <strong className={stats.backendStatus === "Online" ? "text-primary" : "text-error"}>
                  {stats.backendStatus}
                </strong>
                {" \u2022 "}
                {stats.onlineDevices} Nodes Synchronized
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="action-btn primary h-12 px-8 rounded-xl" onClick={() => void loadData()}>
              <RefreshCw size={16} className="mr-3" /> 
              {refreshing ? 'Syncing Mesh...' : 'Sync Registry'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error p-5 rounded-2xl mb-10 flex items-center gap-4 animate-float">
          <ShieldAlert size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="kpi-card border-l-2 border-primary">
          <div className="flex justify-between items-start">
            <Radio className="text-primary opacity-50" size={20} />
            <span className="kpi-tag primary">Hardware</span>
          </div>
          <h4 className="kpi-value">{loading ? ".." : stats.onlineDevices} <span className="text-sm opacity-30">/ {stats.onlineDevices + stats.offlineDevices}</span></h4>
          <p className="kpi-label">Devices Online</p>
          {stats.offlineDevices > 0 && <p className="text-[9px] text-error mt-2 font-bold uppercase tracking-tighter">{stats.offlineDevices} Nodes Offline / Error</p>}
        </div>

        <div className="kpi-card border-l-2 border-tertiary">
          <div className="flex justify-between items-start">
            <Activity className="text-tertiary opacity-50" size={20} />
            <span className="kpi-tag tertiary">Total</span>
          </div>
          <h4 className="kpi-value">{loading ? ".." : stats.totalDetections}</h4>
          <p className="kpi-label">Combined Detections</p>
        </div>

        <div className="kpi-card border-l-2 border-success">
          <div className="flex justify-between items-start">
            <Users className="text-success opacity-50" size={20} />
            <span className="kpi-tag" style={{ background: 'rgba(137, 212, 166, 0.1)', color: '#89d4a6' }}>Registry</span>
          </div>
          <h4 className="kpi-value">{loading ? ".." : stats.totalHomeowners}</h4>
          <p className="kpi-label">Registered Homeowners</p>
          <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase tracking-tighter">
             {stats.activeHomeowners} Active Sessions
          </p>
        </div>

        <div className="kpi-card border-l-2 border-primary">
          <div className="flex justify-between items-start">
            <Camera className="text-primary opacity-50" size={20} />
            <span className="kpi-tag primary">Biometrics</span>
          </div>
          <h4 className="kpi-value">{loading ? ".." : stats.totalFaces}</h4>
          <p className="kpi-label">Total Face Identities</p>
        </div>
      </div>

      <div className="mb-16">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <div className="w-1 h-4 bg-primary/40 rounded-full" />
                <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-slate-500">Live Hardware Registry</h3>
            </div>
        </div>

        <div className="registry-grid">
          {loading ? (
            <div className="col-span-full py-40 flex flex-col items-center gap-6">
                <Fingerprint className="animate-pulse text-primary/20" size={64} />
                <p className="text-slate-600 italic uppercase tracking-widest text-[10px]">Polling Mesh Heartbeats...</p>
            </div>
          ) : (
            <>
              {fleet?.nodes.map((node, i) => (
                <NodeCinematicCard key={node.device_id} node={node} index={i} />
              ))}
              {fleet?.nodes.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-600 italic border border-white/5 rounded-3xl">
                  No hardware nodes reported to the hub yet.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="node-card-cinematic">
          <p className="text-[10px] uppercase text-primary mb-3 font-bold tracking-widest">Fleet Intelligence Report</p>
          <p className="text-base text-slate-300 font-serif italic leading-relaxed mb-8 opacity-80">
            "IRIS global mesh is currently operating with <strong>{stats.onlineDevices} online nodes</strong>. 
            There are <strong>{stats.totalHomeowners} homeowners</strong> registered across the cluster. 
            System integrity is currently reported as <strong>{stats.backendStatus}</strong>."
          </p>
          <button className="block-btn w-full h-12 bg-white/5 border-white/10 hover:bg-primary/10 hover:text-primary">
            Download Core Audit Log
          </button>
        </div>

        <div className="node-card-cinematic border-l-2 border-tertiary">
            <div className="flex items-center gap-4 mb-6">
                <Server className="text-tertiary" size={20} />
                <h4 className="text-white font-serif italic text-xl">Aggregator Status</h4>
            </div>
            <div className="space-y-6">
                <FleetProgressUI label="Hub Connectivity" value={stats.backendStatus === "Online" ? 100 : 0} color={stats.backendStatus === "Online" ? "bg-primary" : "bg-error"} />
                <FleetProgressUI label="Mesh Sync Integrity" value={stats.onlineDevices > 0 ? 100 : 0} color="bg-tertiary" />
            </div>
        </div>
      </div>
    </div>
  );
}

function NodeCinematicCard({ node, index }: { node: PiNodeStatus; index: number }) {
  const isOnline = node.status === "online";

  return (
    <div className="node-card-cinematic animate-float" style={{ animationDelay: `${index * 0.1}s` }}>
      <header className="node-header">
        <div>
          <h4 className="node-name-huge">{node.device_name}</h4>
          <p className="node-id-mono">{node.device_id}</p>
        </div>
        <div className="node-status-badge">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span className={`text-[9px] font-extrabold uppercase tracking-widest ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
                {isOnline ? 'Active' : 'Offline'}
            </span>
        </div>
      </header>

      <div className="node-metrics">
        <div className="metric-item">
            <span className="metric-label">Compute</span>
            <span className="metric-value">{node.cpu_usage ?? 0}%</span>
        </div>
        <div className="metric-item">
            <span className="metric-label">Thermal</span>
            <span className="metric-value">{node.cpu_temp ? `${node.cpu_temp}\u00B0C` : '--'}</span>
        </div>
      </div>

      <footer className="node-footer">
        <div>
            <p className="event-count-big">{node.total_events_today}</p>
            <p className="event-label">24H Events</p>
        </div>
        <div className="text-right">
            {node.tunnel_url && (
                <a href={node.tunnel_url} target="_blank" rel="noreferrer" className="icon-btn mb-2">
                    <ExternalLink size={14} />
                </a>
            )}
            <p className="text-[9px] uppercase tracking-tighter text-slate-600 font-bold">
                Heartbeat: {new Date(node.last_heartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
        </div>
      </footer>
    </div>
  );
}

interface FleetProgressUIProps {
  label: string;
  value: number;
  color: string;
}

function FleetProgressUI({ label, value, color }: FleetProgressUIProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <p className="text-[9px] uppercase tracking-[0.15em] text-slate-500 font-bold">{label}</p>
        <span className="text-xs font-serif text-white italic">{value}%</span>
      </div>
      <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden border border-white/5">
        <div className={`${color} h-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.1)]`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}

