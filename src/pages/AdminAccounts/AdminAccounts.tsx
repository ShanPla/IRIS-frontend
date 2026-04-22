import { useEffect, useId, useState } from "react";
import { 
  Shield, 
  Trash2, 
  UserPlus, 
  X, 
  Lock, 
  User, 
  Fingerprint, 
  ShieldCheck, 
  Activity
} from "lucide-react";
import { apiClient, getApiErrorMessage } from "../../lib/api";
import "./AdminAccounts.css";

interface AdminAccount {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

interface BackendAdminAccount {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export default function AdminAccounts() {
  const usernameInputId = useId();
  const passwordInputId = useId();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: "", password: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadAdmins();
  }, []);

  async function loadAdmins() {
    setLoading(true);
    setFormError("");
    try {
      const res = await apiClient.get<BackendAdminAccount[]>("/api/auth/admin/accounts");
      setAccounts(res.data.map(mapAdminAccount));
    } catch {
      setFormError("Failed to load administrative hierarchy.");
    } finally {
      setLoading(false);
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.username || !newAdmin.password) {
      setFormError("Identity and Cipher are required.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/api/auth/admin/accounts", {
        username: newAdmin.username,
        password: newAdmin.password,
        role: "admin"
      });
      setShowAddModal(false);
      setNewAdmin({ username: "", password: "" });
      void loadAdmins();
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Failed to authorize new admin."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/api/auth/admin/accounts/${id}`);
      setAccounts((current) => current.filter((a) => a.id !== id));
      setDeleteConfirm(null);
    } catch {
      setFormError("Failed to revoke admin privileges.");
    }
  };

  return (
    <div className="admin-accounts-container">
      {/* Dynamic Header */}
      <header className="admin-header-row">
        <div>
          <p className="admin-eyebrow">Clearance Level 01</p>
          <h1 className="admin-title">Administrative Accounts</h1>
        </div>

        <div className="registry-stats">
          <div className="stat-item">
            <span className="stat-label">Active Nodes</span>
            <span className="stat-value primary">{loading ? ".." : accounts.length} / 3</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Hierarchy Sync</span>
            <span className="stat-value text-success">NOMINAL</span>
          </div>
        </div>
      </header>

      {formError && (
        <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl mb-12 flex items-center gap-3 animate-float">
          <ShieldCheck size={18} />
          <span className="text-sm font-medium">{formError}</span>
        </div>
      )}

      {/* Identity Grid */}
      <div className="identity-grid">
        {loading ? (
            <div className="col-span-full py-40 flex flex-col items-center gap-6">
                <Fingerprint className="animate-pulse text-primary/20" size={64} />
                <p className="text-slate-500 italic uppercase tracking-widest text-[10px]">Synchronizing Hierarchy Registry...</p>
            </div>
        ) : (
          <>
            {accounts.map((account) => (
              <div key={account.id} className="admin-identity-block">
                <div className="block-header">
                  <div className="block-avatar">
                    <Shield size={24} />
                  </div>
                  <span className="block-badge">Verified Node</span>
                </div>

                <div className="block-identity-info">
                  <h3 className="block-username">@{account.username}</h3>
                  <p className="block-role-label">Global Core Administrator</p>
                </div>

                <div className="block-details">
                  <div className="detail-row">
                    <span className="detail-label">Node Status</span>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--app-primary)]"></span>
                        <span className="detail-value text-white font-bold">Active</span>
                    </div>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Identity ID</span>
                    <span className="detail-value mono">IR-{account.id.padStart(4, '0')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Commission Date</span>
                    <span className="detail-value">{new Date(account.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Clearance</span>
                    <span className="detail-value">Root Access</span>
                  </div>
                </div>

                <div className="block-actions">
                  <button type="button" className="block-btn">
                    <Activity size={14} className="mr-2" /> Audit
                  </button>
                  {deleteConfirm === account.id ? (
                    <div className="flex-1 flex gap-2">
                         <button type="button" className="block-btn danger flex-1" onClick={() => void handleDelete(account.id)}>Confirm</button>
                         <button type="button" className="block-btn w-12" onClick={() => setDeleteConfirm(null)} aria-label="Cancel revoke"><X size={14} /></button>
                    </div>
                  ) : (
                    <button type="button" className="block-btn danger" onClick={() => setDeleteConfirm(account.id)}>
                      <Trash2 size={14} className="mr-2" /> Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}

            {accounts.length < 3 && (
              <button type="button" className="add-identity-block" onClick={() => setShowAddModal(true)}>
                <div className="add-icon-circle">
                  <UserPlus size={32} />
                </div>
                <h4 className="add-title">Authorize New Node</h4>
                <p className="add-subtitle">{3 - accounts.length} slots remaining in core</p>
              </button>
            )}
          </>
        )}
      </div>

      {/* Modern Commission Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-surface">
            <header className="modal-header-top">
              <div>
                <h2 className="modal-main-title">New Commission</h2>
                <p className="modal-desc">Authorize a new administrative node.</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowAddModal(false)} aria-label="Close new admin dialog">
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleAddAdmin} className="form-stack">
              <div>
                <label className="cyber-label" htmlFor={usernameInputId}>Terminal Identity</label>
                <div className="cyber-field">
                  <User size={18} className="cyber-field-icon" />
                  <input 
                    id={usernameInputId}
                    name="new-admin-username"
                    placeholder="Enter unique username"
                    value={newAdmin.username}
                    onChange={e => setNewAdmin({...newAdmin, username: e.target.value})}
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label className="cyber-label" htmlFor={passwordInputId}>Encryption Cipher</label>
                <div className="cyber-field">
                  <Lock size={18} className="cyber-field-icon" />
                  <input 
                    id={passwordInputId}
                    name="new-admin-password"
                    type="password"
                    placeholder="Set secure access key"
                    value={newAdmin.password}
                    onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button type="button" className="action-btn-ghost flex-1 h-14 rounded-2xl" onClick={() => setShowAddModal(false)}>Abort</button>
                <button 
                  type="submit" 
                  className="action-btn primary flex-1 h-14 rounded-2xl font-bold" 
                  disabled={submitting}
                >
                  {submitting ? "Processing..." : "Commission Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function mapAdminAccount(account: BackendAdminAccount): AdminAccount {
  return {
    id: String(account.id),
    username: account.username,
    role: account.role,
    createdAt: account.created_at,
  };
}
