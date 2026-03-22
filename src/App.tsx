import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PiConfiguredRoute from "./components/auth/PiConfiguredRoute";
import Sidebar from "./components/layout/Sidebar/Sidebar";
import Topbar from "./components/layout/Topbar/Topbar";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Logs from "./pages/Logs/Logs";
import Profiles from "./pages/Profiles/Profiles";
import Settings from "./pages/Settings/Settings";
import AdminAccounts from "./pages/AdminAccounts/AdminAccounts";
import UserManagement from "./pages/UserManagement/UserManagement";
import SystemHealth from "./pages/SystemHealth/SystemHealth";
import Setup from "./pages/Setup/Setup";
import LiveFeed from "./pages/LiveFeed/LiveFeed";
import { hasPiBackendConfigured } from "./lib/api";

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function PostLoginLanding() {
  const { session, bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={hasPiBackendConfigured() ? "/dashboard" : "/setup"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PostLoginLanding />} />
          <Route path="/setup" element={
            <ProtectedRoute>
              <AdminLayout><Setup /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <PiConfiguredRoute>
                <AdminLayout><Dashboard /></AdminLayout>
              </PiConfiguredRoute>
            </ProtectedRoute>
          } />
          <Route path="/logs" element={
            <ProtectedRoute>
              <PiConfiguredRoute>
                <AdminLayout><Logs /></AdminLayout>
              </PiConfiguredRoute>
            </ProtectedRoute>
          } />
          <Route path="/profiles" element={
            <ProtectedRoute>
              <PiConfiguredRoute>
                <AdminLayout><Profiles /></AdminLayout>
              </PiConfiguredRoute>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <PiConfiguredRoute>
                <AdminLayout><Settings /></AdminLayout>
              </PiConfiguredRoute>
            </ProtectedRoute>
          } />
          <Route path="/admin-accounts" element={
            <ProtectedRoute>
              <PiConfiguredRoute>
                <AdminLayout><AdminAccounts /></AdminLayout>
              </PiConfiguredRoute>
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute>
              <PiConfiguredRoute>
                <AdminLayout><UserManagement /></AdminLayout>
              </PiConfiguredRoute>
            </ProtectedRoute>
          } />
          <Route path="/system-health" element={
            <ProtectedRoute>
              <PiConfiguredRoute>
                <AdminLayout><SystemHealth /></AdminLayout>
              </PiConfiguredRoute>
            </ProtectedRoute>
          } />
          <Route path="/live-feed" element={
            <ProtectedRoute>
              <PiConfiguredRoute>
                <AdminLayout><LiveFeed /></AdminLayout>
              </PiConfiguredRoute>
            </ProtectedRoute>
          } />
          <Route path="*" element={<PostLoginLanding />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
