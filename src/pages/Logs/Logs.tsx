import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiClient, buildApiUrl } from "../../lib/api";
import AlertCard from "../../components/ui/AlertCard/AlertCard";
import type { BadgeStatus } from "../../components/ui/StatusBadge/StatusBadge";
import "./Logs.css";

interface BackendEvent {
  id: number;
  event_type: "authorized" | "unknown" | "unverifiable";
  snapshot_path: string | null;
  alarm_triggered: boolean;
  timestamp: string;
  matched_name: string | null;
}

interface EventsResponse {
  items: BackendEvent[];
  total: number;
  limit: number;
  offset: number;
}

const LIMIT = 20;

const statusMap: Record<BackendEvent["event_type"], BadgeStatus> = {
  authorized: "authorized",
  unknown: "unknown",
  unverifiable: "unverifiable",
};

export default function Logs() {
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<BackendEvent["event_type"] | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadEvents(0);
  }, [filter]);

  const loadEvents = async (newOffset: number) => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = {
        limit: LIMIT,
        offset: newOffset,
      };
      if (filter !== "all") params.event_type = filter;

      const response = await apiClient.get<EventsResponse>("/api/events/", { params });
      setEvents(response.data.items);
      setTotal(response.data.total);
      setOffset(newOffset);
    } catch {
      setError("Failed to load events from backend.");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="logs">
      <div className="logs-header">
        <h1 className="logs-title">Event Logs</h1>
        <div className="logs-actions">
          <div className="logs-filters">
            {(["all", "authorized", "unknown", "unverifiable"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`filter-btn ${filter === f ? "filter-btn--active" : ""}`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button
            className="logs-refresh-btn"
            onClick={() => void loadEvents(offset)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      <div className="logs-meta">
        <span>{total} total event{total !== 1 ? "s" : ""}</span>
        {totalPages > 1 && <span>Page {currentPage} of {totalPages}</span>}
      </div>

      {error && <p className="logs-error">{error}</p>}

      {loading ? (
        <p className="logs-empty">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="logs-empty">No events found.</p>
      ) : (
        <div className="logs-list">
          {events.map((event) => (
            <AlertCard
              key={event.id}
              id={event.id}
              status={statusMap[event.event_type]}
              matchedName={event.matched_name}
              timestamp={event.timestamp}
              snapshotUrl={buildApiUrl(event.snapshot_path)}
              alarmTriggered={event.alarm_triggered}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="logs-pagination">
          <button
            className="page-btn"
            disabled={offset === 0 || loading}
            onClick={() => void loadEvents(offset - LIMIT)}
          >
            Previous
          </button>
          <span className="page-info">{currentPage} / {totalPages}</span>
          <button
            className="page-btn"
            disabled={offset + LIMIT >= total || loading}
            onClick={() => void loadEvents(offset + LIMIT)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

