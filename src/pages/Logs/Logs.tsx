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

interface ExpandedEvent {
  id: number;
  event_type: string | null;
  matched_name: string | null;
  snapshot_path: string | null;
  alarm_triggered: boolean | null;
  notification_sent: boolean | null;
  mode: string | null;
  notes: string | null;
  timestamp: string | null;
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
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [eventDetail, setEventDetail] = useState<Record<number, ExpandedEvent>>({});

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

  const loadEventDetail = async (id: number) => {
    if (eventDetail[id]) return;
    try {
      const response = await apiClient.get<ExpandedEvent>(`/api/events/${id}`);
      setEventDetail((prev) => ({ ...prev, [id]: response.data }));
    } catch {
      // silently ignore — detail panel will just stay empty
    }
  };

  const handleRowClick = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      void loadEventDetail(id);
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
          {events.map((event) => {
            const isExpanded = expandedId === event.id;
            const detail = eventDetail[event.id];

            return (
              <div key={event.id}>
                <div
                  className={`logs-row ${isExpanded ? "logs-row--expanded" : ""}`}
                  onClick={() => handleRowClick(event.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleRowClick(event.id); }}
                >
                  <AlertCard
                    id={event.id}
                    status={statusMap[event.event_type]}
                    matchedName={event.matched_name}
                    timestamp={event.timestamp}
                    snapshotUrl={buildApiUrl(event.snapshot_path)}
                    alarmTriggered={event.alarm_triggered}
                  />
                </div>

                {isExpanded && (
                  <div className="event-detail-expanded">
                    {!detail ? (
                      <p className="event-detail-loading">Loading details...</p>
                    ) : (
                      <>
                        <div className="event-detail-grid">
                          <div className="event-detail-field">
                            <span className="event-detail-label">Mode</span>
                            <span className="event-detail-value">{detail.mode ?? "—"}</span>
                          </div>
                          <div className="event-detail-field">
                            <span className="event-detail-label">Alarm Triggered</span>
                            <span className="event-detail-value">{detail.alarm_triggered ? "Yes" : "No"}</span>
                          </div>
                          <div className="event-detail-field">
                            <span className="event-detail-label">Notification Sent</span>
                            <span className="event-detail-value">{detail.notification_sent ? "Yes" : "No"}</span>
                          </div>
                          {detail.notes && (
                            <div className="event-detail-field">
                              <span className="event-detail-label">Notes</span>
                              <span className="event-detail-value">{detail.notes}</span>
                            </div>
                          )}
                        </div>
                        {detail.snapshot_path && (
                          <img
                            className="event-detail-snapshot"
                            src={buildApiUrl(detail.snapshot_path)}
                            alt="Event snapshot"
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
