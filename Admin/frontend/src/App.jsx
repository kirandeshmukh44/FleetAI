import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
const DriversPage = lazy(() => import('./pages/DriversPage'));
const RiskPage = lazy(() => import('./pages/RiskPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const SystemPage = lazy(() => import('./pages/SystemPage'));

import AdminLayout from './layouts/AdminLayout';

function RouteLoader({ label }) {
  return (
    <div className="route-loader" role="status" aria-live="polite">
      <div className="route-loader-brand">
        <span className="route-loader-mark">F</span>
        <span>FleetAI Admin</span>
      </div>
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <RouteLoader label="Verifying administrator session…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

function LoginRoute() {
  const { user, loading } = useAuth();

  if (loading) return <RouteLoader label="Checking existing session…" />;
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoader label="Loading admin modules…" />}>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/" element={<ProtectedRoute><OverviewPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
            <Route path="/vehicles" element={<ProtectedRoute><VehiclesPage /></ProtectedRoute>} />
            <Route path="/drivers" element={<ProtectedRoute><DriversPage /></ProtectedRoute>} />
            <Route path="/risk" element={<ProtectedRoute><RiskPage /></ProtectedRoute>} />
            <Route path="/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
            <Route path="/system" element={<ProtectedRoute><SystemPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
