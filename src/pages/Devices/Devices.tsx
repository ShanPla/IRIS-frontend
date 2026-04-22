import { useEffect, useState, type ReactNode } from "react";
import {
  Cpu,
  MemoryStick,
  Thermometer,
  Radio,
  RefreshCw,
  Search,
  ChevronRight,
  ExternalLink,
  Activity,
  Calendar,
} from "lucide-react";
import { apiClient, getApiErrorMessage } from "../../lib/api";
import type { FleetStatus, PiNodeStatus } from "../../types/iris";
import "./Devices.css";

function getRegistryErrorMessage(error: unknown): string {
  const detail = getApiErrorMessage(error, "Failed to synchronize with the node registry.");
  if (detail === "Could not validate credentials") {
    return "Session is not authorized for the central registry. Sign in with your Render admin account.";
  }
  return detail;
}

export default function Devices() {
  const [fleet, setFleet] = useState<FleetStatus | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async (options?: { silent?: boolean }) => {
    if (options?.silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiClient.get<FleetStatus>("/api/fleet/status");
      setFleet(res.data);
      setError("");
    } catch (error) {
      setError(getRegistryErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load({ silent: true }), 30000);
    return () => clearInterval(timer);
  }, []);

  const filteredNodes =
    fleet?.nodes.filter(
      (n) =>
        n.device_name.toLowerCase().includes(search.toLowerCase()) ||
        n.device_id.toLowerCase().includes(search.toLowerCase())
    ) || [];

  return (
    <div className="devices-container">
      <section className="devices-header animate-float">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="devices-title">Devices </h1>
            <p className="devices-eyebrow">Registry of Authorized IRIS Hardware Nodes</p>
          </div>

          <div className="stats-strip glass-panel">
            <div className="flex flex-col">
              <span className="stats-label">Total Nodes</span>
              <span className="stats-value text-white">{loading ? "..." : fleet?.total_nodes}</span>
            </div>
            <div className="flex flex-col">
              <span className="stats-label">Online</span>
              <span className="stats-value text-primary">{loading ? "..." : fleet?.online_nodes}</span>
            </div>
            <div className="flex flex-col border-l border-white/5 pl-6">
              <span className="stats-label">24H Fleet Events</span>
              <span className="stats-value text-tertiary">{loading ? "..." : fleet?.total_events_today}</span>
            </div>
          </div>
        </div>
      </section>

      {error && <p className="error-message">{error}</p>}

      <section className="glass-panel mb-8 flex flex-col md:flex-row gap-6 p-6 animate-float items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            aria-label="Search devices"
            className="w-full bg-black/40 border border-white/5 py-3 pl-12 pr-4 rounded-xl text-white outline-none focus:border-primary/50 transition-all"
            placeholder="Search by Node ID or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="action-btn primary" onClick={() => void load()}>
          <RefreshCw size={16} className={`mr-2 ${refreshing ? "animate-spin" : ""}`} /> Sync Registry
        </button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredNodes.map((node, i) => (
          <NodeInventoryCard key={node.device_id} node={node} index={i} />
        ))}
        {!loading && filteredNodes.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500 italic glass-panel">
            No hardware nodes found matching your search criteria.
          </div>
        )}
      </div>
    </div>
  );
}

function NodeInventoryCard({ node, index }: { node: PiNodeStatus; index: number }) {
  const isOnline = node.status === "online";

  return (
    <div className="glass-panel overflow-hidden group animate-float" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="flex flex-col sm:flex-row h-full">
        <div className={`w-2 ${isOnline ? "bg-primary" : "bg-error"} transition-colors duration-500`} />

        <div className="flex-1 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-serif text-white italic mb-1">{node.device_name}</h3>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{node.device_id}</p>
            </div>
            <div className="flex gap-3">
              {node.tunnel_url && (
                <a
                  href={node.tunnel_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 glass-monolith rounded-lg text-slate-400 hover:text-primary transition-colors"
                >
                  <ExternalLink size={16} />
                </a>
              )}
              <div className="p-2 glass-monolith rounded-lg text-slate-400">
                <ChevronRight size={16} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <NodeStat label="CPU" value={`${node.cpu_usage ?? 0}%`} icon={<Cpu size={12} />} color="text-primary" />
            <NodeStat
              label="Temp"
              value={node.cpu_temp ? `${Math.round(node.cpu_temp)}°C` : "--"}
              icon={<Thermometer size={12} />}
              color="text-tertiary"
            />
            <NodeStat label="RAM" value={`${node.ram_usage ?? 0}%`} icon={<MemoryStick size={12} />} color="text-primary" />
            <NodeStat
              label="Network"
              value={isOnline ? "Active" : "Silent"}
              icon={<Radio size={12} />}
              color={isOnline ? "text-primary" : "text-error"}
            />
          </div>

          <div className="pt-6 border-t border-white/5 flex flex-wrap gap-y-4 justify-between items-center">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-slate-500" />
                <div>
                  <p className="text-[8px] uppercase text-slate-500">24H Activity</p>
                  <p className="text-xs text-white font-mono">{node.total_events_today} events</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-500" />
                <div>
                  <p className="text-[8px] uppercase text-slate-500">Last Seen</p>
                  <p className="text-xs text-white font-mono">
                    {new Date(node.last_heartbeat).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[8px] uppercase text-slate-500 mb-1">Local Identity</p>
              <p className="text-[10px] font-mono text-slate-300">{node.local_ip ?? "Hidden"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <span className="text-slate-500">{icon}</span>
        <span className="text-[8px] uppercase text-slate-500 font-bold">{label}</span>
      </div>
      <p className={`text-sm font-serif ${color}`}>{value}</p>
    </div>
  );
}
