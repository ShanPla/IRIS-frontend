export type SecurityMode = "home" | "away";

export type EventStatus = "authorized" | "unknown" | "unverifiable" | "possible_threat" | "uncertain_presence";       
export type UserRole = "admin" | "homeowner_primary" | "homeowner_invited";

export interface SecurityEvent {
  id: string;
  timestamp: string;
  status: EventStatus;
  snapshotUrl?: string;
  alarmTriggered: boolean;
}

export interface FaceProfile {
  id: string;
  name: string;
  addedAt: string;
  imageUrl?: string;
  registeredBy?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

export interface SystemHealth {
  mode: "home" | "away";
  alarm_active: boolean;
  updated_at: string;
}

export interface AppUserPermission {
  can_view_events: boolean;
  can_silence_alarm: boolean;
  can_change_mode: boolean;
  can_manage_profiles: boolean;
}

export interface AppUserSecondary {
    id: number;
    username: string;
    role: string;
    created_at: string;
    face_profile_count: number;
    permissions: AppUserPermission | null;
    last_active: string | null;
}

export interface AppUserAccount {
  id: number;
  username: string;
  role: string;
  invited_by: number | null;
  fcm_token: string | null;
  created_at: string;
  face_profile_count: number;
  access_type: string;
  has_device_access: boolean;
  permissions: AppUserPermission | null;
  secondary_users: AppUserSecondary[];
  associated_device_id: string | null;
  last_active: string | null;
}

export interface PiNodeStatus {
  device_id: string;
  device_name: string;
  tunnel_url: string | null;
  local_ip: string | null;
  cpu_usage: number | null;
  cpu_temp: number | null;
  ram_usage: number | null;
  uptime_seconds: number | null;
  total_events_today: number;
  total_faces: number;
  status: "online" | "offline";
  last_heartbeat: string;
}

export interface FleetStatus {
  total_nodes: number;
  online_nodes: number;
  total_events: number;
  total_events_today: number;
  total_faces: number;
  nodes: PiNodeStatus[];
}
