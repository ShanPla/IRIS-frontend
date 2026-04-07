import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import "./StatusBadge.css";

export type BadgeStatus = "authorized" | "unknown" | "unverifiable" | "possible_threat";

const config: Record<BadgeStatus, { label: string; icon: React.ReactNode; className: string }> = {
  authorized: {
    label: "Authorized",
    icon: <ShieldCheck size={13} />,
    className: "status-badge status-badge--authorized",
  },
  unknown: {
    label: "Intruder Detected",
    icon: <ShieldAlert size={13} />,
    className: "status-badge status-badge--unknown",
  },
  possible_threat: {
    label: "Possible Threat",
    icon: <ShieldQuestion size={13} />,
    className: "status-badge status-badge--possible-threat",
  },
  unverifiable: {
    label: "Unverifiable",
    icon: <ShieldQuestion size={13} />,
    className: "status-badge status-badge--unverifiable",
  },
};

interface StatusBadgeProps {
  status: BadgeStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, icon, className } = config[status] ?? config.unverifiable;
  return (
    <span className={className}>
      {icon}
      {label}
    </span>
  );
}

