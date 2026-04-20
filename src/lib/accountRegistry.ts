import type { AppUserAccount } from "../types/iris";

const ACTIVE_WINDOW_MS = 30 * 60 * 1000;

function isRecentlyActive(lastActive: string | null | undefined, now: Date): boolean {
  if (!lastActive) return false;

  const parsed = new Date(lastActive);
  return !Number.isNaN(parsed.getTime()) && now.getTime() - parsed.getTime() < ACTIVE_WINDOW_MS;
}

export interface RegistryAccountSummary {
  topLevelHomeowners: AppUserAccount[];
  totalTopLevelHomeowners: number;
  totalSecondaryHomeowners: number;
  totalHomeowners: number;
  totalFaces: number;
  activeHomeowners: number;
}

export function summarizeRegistryAccounts(accounts: AppUserAccount[], now = new Date()): RegistryAccountSummary {
  const nestedSecondaryIds = new Set<number>();
  for (const account of accounts) {
    for (const secondary of account.secondary_users ?? []) {
      nestedSecondaryIds.add(secondary.id);
    }
  }

  const topLevelHomeowners = accounts.filter(
    (account) => account.role !== "admin" && !nestedSecondaryIds.has(account.id)
  );

  const totalSecondaryHomeowners = topLevelHomeowners.reduce(
    (sum, account) => sum + (account.secondary_users?.length ?? 0),
    0
  );

  const totalFaces = topLevelHomeowners.reduce((sum, account) => {
    const secondaryFaces = (account.secondary_users ?? []).reduce(
      (secondarySum, secondary) => secondarySum + (secondary.face_profile_count ?? 0),
      0
    );
    return sum + (account.face_profile_count ?? 0) + secondaryFaces;
  }, 0);

  const activeHomeowners = topLevelHomeowners.reduce((sum, account) => {
    const activeSecondaryUsers = (account.secondary_users ?? []).reduce(
      (secondarySum, secondary) => secondarySum + (isRecentlyActive(secondary.last_active, now) ? 1 : 0),
      0
    );

    return sum + (isRecentlyActive(account.last_active, now) ? 1 : 0) + activeSecondaryUsers;
  }, 0);

  return {
    topLevelHomeowners,
    totalTopLevelHomeowners: topLevelHomeowners.length,
    totalSecondaryHomeowners,
    totalHomeowners: topLevelHomeowners.length + totalSecondaryHomeowners,
    totalFaces,
    activeHomeowners,
  };
}

export function accountMatchesSearch(account: AppUserAccount, search: string): boolean {
  const searchTerm = search.trim().toLowerCase();
  if (!searchTerm) return true;

  const username = (account.username ?? "").toLowerCase();
  const deviceId = (account.associated_device_id ?? "").toLowerCase();
  if (username.includes(searchTerm) || deviceId.includes(searchTerm)) {
    return true;
  }

  return (account.secondary_users ?? []).some((secondary) =>
    secondary.username.toLowerCase().includes(searchTerm)
  );
}

export function getTopLevelRoleLabel(account: AppUserAccount): string {
  return account.role === "homeowner_primary" ? "Primary User" : "Homeowner User";
}
