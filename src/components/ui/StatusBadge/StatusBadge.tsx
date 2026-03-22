import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import "./StatusBadge.css";

export type BadgeStatus = "authorized" | "unknown" | "unverifiable";

const config: Record<BadgeStatus, { label: string; icon: React.ReactNode; className: string }> = {
  authorized: {
    label: "Authorized",
    icon: <ShieldCheck size={13} />,
    className: "status-badge status-badge--authorized",
  },
  unknown: {
    label: "Unknown Person",
    icon: <ShieldAlert size={13} />,
    className: "status-badge status-badge--unknown",
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

