import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MdLocalShipping } from 'react-icons/md';

// Pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Drivers = lazy(() => import('./pages/Drivers'));
const Tracking = lazy(() => import('./pages/Tracking'));
const DriverBehavior = lazy(() => import('./pages/DriverBehavior'));
const RiskPrediction = lazy(() => import('./pages/RiskPrediction'));
const FuelAnalytics = lazy(() => import('./pages/FuelAnalytics'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const DataEntry = lazy(() => import('./pages/DataEntry'));

// Layouts
import MainLayout from './layouts/MainLayout';

function FleetLoader({ label }) {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <div className="fleet-loader-brand"><span className="fleet-loader-mark">F</span><span>Fleet<span>AI</span></span></div>
      <div className="fleet-loader-copy">
        <strong>FleetAI</strong>
        <span>{label}</span>
      </div>
      <div className="fleet-loader-scene" aria-hidden="true">
        <span className="fleet-loader-orbit orbit-one" />
        <span className="fleet-loader-orbit orbit-two" />
        <div className="fleet-loader-vehicle"><MdLocalShipping size={42} /></div>
        <div className="fleet-loader-signal"><span /><span /><span /></div>
      </div>
      <div className="fleet-loader-progress"><span /></div>
      <small>Connecting fleet · GPS · analytics</small>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FleetLoader label="Loading secure session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense
          fallback={
            <FleetLoader label="Loading workspace modules..." />
          }
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
            <Route path="/drivers" element={<ProtectedRoute><Drivers /></ProtectedRoute>} />
            <Route path="/tracking" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
            <Route path="/driver-behavior" element={<ProtectedRoute><DriverBehavior /></ProtectedRoute>} />
            <Route path="/risk-prediction" element={<ProtectedRoute><RiskPrediction /></ProtectedRoute>} />
            <Route path="/fuel-analytics" element={<ProtectedRoute><FuelAnalytics /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/data-entry" element={<ProtectedRoute><DataEntry /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
