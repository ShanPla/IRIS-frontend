import { Fragment, useEffect, useMemo, useState } from "react";
import {
  User,
  Users,
  Search,
  ShieldCheck,
  Fingerprint,
  ChevronDown,
  ChevronUp,
  Activity
} from "lucide-react";
import { apiClient, getApiErrorMessage } from "../../lib/api";
import { accountMatchesSearch, getTopLevelRoleLabel, summarizeRegistryAccounts } from "../../lib/accountRegistry";
import type { AppUserAccount } from "../../types/iris";
import "./Profiles.css";

export default function Profiles() {
  const [accounts, setAccounts] = useState<AppUserAccount[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<AppUserAccount[]>("/api/auth/admin/app-users");
      setAccounts(Array.isArray(res.data) ? res.data : []);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to synchronize core accounts."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAccounts();
    const timer = setInterval(() => void fetchAccounts(), 30000);
    return () => clearInterval(timer);
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const registrySummary = useMemo(() => summarizeRegistryAccounts(accounts), [accounts]);
  const filteredAccounts = useMemo(
    () => registrySummary.topLevelHomeowners.filter((account) => accountMatchesSearch(account, search)),
    [registrySummary.topLevelHomeowners, search]
  );

  return (
    <div className="accounts-container">
      <header className="accounts-header">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div>
            <p className="accounts-eyebrow">Governance / Core Mesh</p>
            <h1 className="accounts-title">Account Hierarchy</h1>
          </div>

          <div className="accounts-summary">
            <div className="summary-item">
              <span className="summary-label">Homeowner Accounts</span>
              <span className="summary-value accent">{loading ? ".." : registrySummary.totalTopLevelHomeowners}</span>
            </div>
            <div className="summary-item border-l border-white/5 pl-8">
              <span className="summary-label">Invited Guests</span>
              <span className="summary-value text-white">{loading ? ".." : registrySummary.totalSecondaryHomeowners}</span>
            </div>
            <div className="summary-item border-l border-white/5 pl-8">
              <span className="summary-label">Fleet Status</span>
              <span className="summary-value text-success">NOMINAL</span>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl mb-8 flex items-center gap-3">
          <ShieldCheck size={18} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <section className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search className="search-input-icon" size={18} />
          <input
            aria-label="Search account hierarchy"
            placeholder="Search by username or device identifier (e.g. B2D4)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="action-btn" onClick={() => void fetchAccounts()}>
          <Activity size={14} className="mr-2" /> Refresh Mesh
        </button>
      </section>

      <div className="accounts-registry-wrapper">
        <table className="accounts-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}></th>
              <th>Identity</th>
              <th>Status</th>
              <th>Hardware Context</th>
              <th>Sub-Nodes</th>
              <th className="text-right">Commissioned</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-32 text-center text-slate-500 italic">
                  <div className="flex flex-col items-center gap-4">
                    <Fingerprint className="animate-pulse text-primary/20" size={56} />
                    <span className="uppercase tracking-[0.2em] text-[10px] font-bold">Synchronizing Global Hierarchy...</span>
                  </div>
                </td>
              </tr>
            ) : filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-32 text-center text-slate-500 italic">
                  {registrySummary.totalTopLevelHomeowners === 0
                    ? "No homeowner accounts registered in core storage."
                    : "No homeowner accounts matched the current filters."}
                </td>
              </tr>
            ) : (
              filteredAccounts.map((acc) => (
                <Fragment key={acc.id}>
                  <tr
                    className="row-primary"
                    onClick={() => toggleExpand(acc.id)}
                  >
                    <td>
                      {acc?.secondary_users && acc.secondary_users.length > 0 && (
                        expandedId === acc.id ? <ChevronUp size={16} className="text-primary" /> : <ChevronDown size={16} className="text-slate-600" />
                      )}
                    </td>
                    <td>
                      <div className="user-identity-cell">
                        <div className="user-avatar-box">
                          <User size={20} />
                        </div>
                        <div className="user-info-stack">
                          <span className="user-name-text">@{acc?.username || "unknown"}</span>
                          <span className="user-role-tag">{getTopLevelRoleLabel(acc)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="status-pill-cyber">
                        <span className="status-dot-pulse"></span>
                        Online
                      </span>
                    </td>
                    <td>
                      {acc?.associated_device_id ? (
                        <div className="flex items-center">
                          <span className="device-id-prefix">{acc.associated_device_id}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Node Connected</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-700 uppercase font-bold">No Device Linked</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-600" />
                        <span className="invited-count-badge">{acc?.secondary_users?.length || 0} Invited Users</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-white/80 font-mono">
                          {acc?.created_at ? new Date(acc.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "---"}
                        </span>
                        <span className="text-[9px] text-slate-600 uppercase mt-1">Registry Verified</span>
                      </div>
                    </td>
                  </tr>

                  {expandedId === acc.id && acc?.secondary_users && acc.secondary_users.length > 0 && (
                    <tr className="expanded-area">
                      <td colSpan={6}>
                        <div className="secondary-registry animate-in fade-in slide-in-from-top-2">
                          <div className="secondary-header">
                            <div className="w-1 h-3 bg-primary/40 rounded-full" />
                            <h3 className="secondary-title">Associated Secondary Users for Node {acc.associated_device_id || "ID-ALPHA"}</h3>
                          </div>

                          <div className="secondary-list">
                            {(acc.secondary_users || []).map((sec) => (
                              <div key={sec.id} className="secondary-user-card">
                                <div className="secondary-user-info">
                                  <div className="secondary-avatar">
                                    {(sec?.username || "??").slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      {acc.associated_device_id && <span className="text-[10px] font-mono text-primary/60">{acc.associated_device_id}</span>}
                                      <p className="secondary-name">@{sec?.username || "unknown"}</p>
                                    </div>
                                    <p className="secondary-role text-[9px] uppercase tracking-wider text-slate-500 font-bold">Secondary User</p>
                                  </div>
                                </div>
                                <div className="status-pill-cyber">
                                  <span className="status-dot-pulse"></span>
                                  Online
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
