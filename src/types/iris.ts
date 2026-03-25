export type SecurityMode = "home" | "away";

export type EventStatus = "authorized" | "unknown" | "unverifiable";
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
}
