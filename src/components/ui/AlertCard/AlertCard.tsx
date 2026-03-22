import StatusBadge from "../StatusBadge/StatusBadge";
import SnapshotCard from "../SnapshotCard/SnapshotCard";
import type { BadgeStatus } from "../StatusBadge/StatusBadge";
import "./AlertCard.css";

interface AlertCardProps {
  id: number;
  status: BadgeStatus;
  matchedName?: string | null;
  timestamp: string;
  snapshotUrl?: string;
  alarmTriggered: boolean;
}

export default function AlertCard({
  status,
  matchedName,
  timestamp,
  snapshotUrl,
  alarmTriggered,
}: AlertCardProps) {
  return (
    <div className={`alert-card ${alarmTriggered ? "alert-card--alarm" : ""}`}>
      <SnapshotCard url={snapshotUrl} size="md" />
      <div className="alert-card-body">
        <div className="alert-card-top">
          <StatusBadge status={status} />
          {alarmTriggered && (
            <span className="alert-card-alarm-tag">Alarm Triggered</span>
          )}
        </div>
        {matchedName && (
          <p className="alert-card-name">{matchedName}</p>
        )}
        <p className="alert-card-time">
          {new Date(timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

