import { useEffect, useState } from "react";
import { Shield, Trash2, UserPlus, Users, Key } from "lucide-react";
import { apiClient } from "../../lib/api";
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

interface Homeowner {
  id: number;
  username: string;
  role: string;
}

interface AppUser {
  id: number;
  username: string;
  role: string;
  face_profile_count: number;
  access_type: string;
  has_device_access: boolean;
}

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [homeowners, setHomeowners] = useState<Homeowner[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteHomeownerConfirm, setDeleteHomeownerConfirm] = useState<number | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newAccount, setNewAccount] = useState({ username: "", password: "" });
  const hasReachedLimit = accounts.length >= 2;

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setFormError("");
    try {
      const [accountsRes, homeownersRes, appUsersRes] = await Promise.all([
        apiClient.get<BackendAdminAccount[]>("/api/auth/admin/accounts"),
        apiClient.get<Homeowner[]>("/api/auth/admin/homeowners").catch(() => ({ data: [] as Homeowner[] })),
        apiClient.get<AppUser[]>("/api/auth/admin/app-users").catch(() => ({ data: [] as AppUser[] })),
      ]);
      setAccounts(accountsRes.data.map(mapAdminAccount));
      setHomeowners(homeownersRes.data);
      setAppUsers(appUsersRes.data);
    } catch {
      setFormError("Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = async () => {
    if (!newAccount.username.trim() || !newAccount.password.trim()) {
      setFormError("Username and password are required.");
      return;
    }
    if (hasReachedLimit) {
      setFormError("Only 2 admin accounts are allowed.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const response = await apiClient.post<BackendAdminAccount>("/api/auth/admin/accounts", {
        username: newAccount.username.trim(),
        password: newAccount.password,
      });
      setAccounts((prev) => [...prev, mapAdminAccount(response.data)]);
      setNewAccount({ username: "", password: "" });
      setShowModal(false);
    } catch {
      setFormError("Failed to create admin account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/api/auth/admin/accounts/${id}`);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirm(null);
    } catch {
      setFormError("Failed to delete admin account.");
    }
  };

  const handleDeleteHomeowner = async (id: number) => {
    try {
      await apiClient.delete(`/api/auth/admin/homeowners/${id}`);
      setHomeowners((prev) => prev.filter((h) => h.id !== id));
      setDeleteHomeownerConfirm(null);
    } catch {
      setFormError("Failed to delete homeowner.");
    }
  };

  const handleResetPassword = async (id: number) => {
    if (!newPassword.trim() || newPassword.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    try {
      await apiClient.put(`/api/auth/admin/homeowners/${id}/password`, { password: newPassword });
      setResetPasswordId(null);
      setNewPassword("");
    } catch {
      setFormError("Failed to reset password.");
    }
  };

  return (
    <div className="admin-accounts">
      {/* Admin Accounts Section */}
      <div className="admin-accounts-header">
        <h1 className="admin-accounts-title">Admin Accounts</h1>
        <button className="admin-add-btn" onClick={() => setShowModal(true)} disabled={hasReachedLimit}>
          <UserPlus size={15} />
          Add Account
        </button>
      </div>
      <p className="admin-accounts-desc">
        Manage dashboard administrator accounts. Maximum: 2 admin accounts.
      </p>
      {formError && <p className="modal-error">{formError}</p>}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}>Loading...</td></tr>
            ) : accounts.length === 0 ? (
              <tr><td colSpan={4}>No admin accounts found.</td></tr>
            ) : (
              accounts.map((account) => (
                <tr key={account.id}>
                  <td className="admin-username">@{account.username}</td>
                  <td>
                    <span className="role-badge role-badge--admin">
                      <Shield size={12} />
                      {account.role}
                    </span>
                  </td>
                  <td>{new Date(account.createdAt).toLocaleString()}</td>
                  <td>
                    {deleteConfirm === account.id ? (
                      <div className="admin-confirm">
                        <span>Remove?</span>
                        <button className="confirm-yes" onClick={() => void handleDelete(account.id)}>Yes</button>
                        <button className="confirm-no" onClick={() => setDeleteConfirm(null)}>No</button>
                      </div>
                    ) : (
                      <button className="admin-delete-btn" onClick={() => setDeleteConfirm(account.id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Homeowners Section */}
      <div className="admin-section">
        <h2 className="admin-section-title">
          <Users size={18} />
          Homeowners
        </h2>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {homeowners.length === 0 ? (
                <tr><td colSpan={3}>No homeowners found.</td></tr>
              ) : (
                homeowners.map((hw) => (
                  <tr key={hw.id}>
                    <td className="admin-username">@{hw.username}</td>
                    <td>
                      <span className="role-badge role-badge--homeowner">{hw.role.replace(/_/g, " ")}</span>
                    </td>
                    <td>
                      <div className="admin-actions-row">
                        {resetPasswordId === hw.id ? (
                          <div className="reset-password-inline">
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="New password"
                              className="modal-input reset-input"
                            />
                            <button className="confirm-yes" onClick={() => void handleResetPassword(hw.id)}>Save</button>
                            <button className="confirm-no" onClick={() => { setResetPasswordId(null); setNewPassword(""); }}>Cancel</button>
                          </div>
                        ) : (
                          <button className="admin-action-btn" onClick={() => setResetPasswordId(hw.id)}>
                            <Key size={14} /> Reset Password
                          </button>
                        )}
                        {deleteHomeownerConfirm === hw.id ? (
                          <div className="admin-confirm">
                            <span>Remove?</span>
                            <button className="confirm-yes" onClick={() => void handleDeleteHomeowner(hw.id)}>Yes</button>
                            <button className="confirm-no" onClick={() => setDeleteHomeownerConfirm(null)}>No</button>
                          </div>
                        ) : (
                          <button className="admin-delete-btn" onClick={() => setDeleteHomeownerConfirm(hw.id)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* App Users Overview */}
      <div className="admin-section">
        <h2 className="admin-section-title">
          <Users size={18} />
          App Users Overview
        </h2>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Faces</th>
                <th>Access</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {appUsers.length === 0 ? (
                <tr><td colSpan={5}>No users found.</td></tr>
              ) : (
                appUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="admin-username">@{user.username}</td>
                    <td>
                      <span className={`role-badge role-badge--${user.role.includes("admin") ? "admin" : "homeowner"}`}>
                        {user.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>{user.face_profile_count}</td>
                    <td>{user.access_type}</td>
                    <td>
                      <span className={user.has_device_access ? "text-green" : "text-gray"}>
                        {user.has_device_access ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setFormError(""); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Add Admin Account</h2>
            <p className="modal-desc">New accounts can log into the IRIS admin dashboard immediately.</p>
            <div className="modal-field">
              <label>Username</label>
              <input type="text" value={newAccount.username} onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })} placeholder="e.g. maria" className="modal-input" />
            </div>
            <div className="modal-field">
              <label>Password</label>
              <input type="password" value={newAccount.password} onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })} placeholder="Enter password" className="modal-input" />
            </div>
            {formError && <p className="modal-error">{formError}</p>}
            {hasReachedLimit && <p className="modal-error">Admin limit reached (2 accounts).</p>}
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => { setShowModal(false); setFormError(""); }}>Cancel</button>
              <button className="modal-confirm" onClick={() => void handleAdd()} disabled={submitting || hasReachedLimit}>{submitting ? "Adding..." : "Add Account"}</button>
            </div>
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
