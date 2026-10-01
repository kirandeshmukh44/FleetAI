import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  MdDashboard,
  MdLocationOn,
  MdDirectionsCar,
  MdPeople,
  MdSpeed,
  MdWarning,
  MdLocalGasStation,
  MdBarChart,
  MdSettings,
  MdLogout,
  MdMenu,
  MdClose,
} from 'react-icons/md';

const menuGroups = [
  {
    title: 'Workspace',
    items: [
      { path: '/dashboard', Icon: MdDashboard, label: 'Overview' },
      { path: '/tracking', Icon: MdLocationOn, label: 'Live Tracking' },
    ],
  },
  {
    title: 'Fleet Management',
    items: [
      { path: '/vehicles', Icon: MdDirectionsCar, label: 'Vehicles' },
      { path: '/drivers', Icon: MdPeople, label: 'Drivers' },
      { path: '/driver-behavior', Icon: MdSpeed, label: 'Driver Behavior' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { path: '/risk-prediction', Icon: MdWarning, label: 'Risk Analysis' },
      { path: '/fuel-analytics', Icon: MdLocalGasStation, label: 'Fuel Analytics' },
      { path: '/reports', Icon: MdBarChart, label: 'Reports' },
    ],
  },
];

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 800);
  const [databaseStatus, setDatabaseStatus] = useState('checking');
  const currentPage = menuGroups
    .flatMap((group) => group.items)
    .find((item) => location.pathname.startsWith(item.path));

  useEffect(() => {
    let active = true;
    api
      .get('/health')
      .then(({ data }) => {
        if (active)
          setDatabaseStatus(
            data.status === 'ok' ? `connected · ${data.database}` : 'unavailable'
          );
      })
      .catch(() => {
        if (active) setDatabaseStatus('unavailable');
      });
    return () => {
      active = false;
    };
  }, []);

  /* Close sidebar on route change on mobile */
  useEffect(() => {
    if (window.innerWidth <= 800) setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {/* Mobile scrim overlay */}
      {sidebarOpen && window.innerWidth <= 800 && (
        <button
          className="sidebar-scrim is-visible"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`app-sidebar ${sidebarOpen ? 'is-open' : 'is-collapsed'}`}>
        {/* Brand */}
        <Link className="app-brand" to="/dashboard" onClick={() => setSidebarOpen(false)}>
          <span className="app-brand-mark">
            <i /><i /><i />
          </span>
          <span>
            Fleet<span>AI</span>
            <small>TRANSPORT INTELLIGENCE</small>
          </span>
        </Link>

        {/* Workspace */}
        <div className="sidebar-workspace">
          <span className="workspace-avatar">F</span>
          <span>
            <b>Fleet workspace</b>
            <small>Operations</small>
          </span>
          <span className="workspace-chevron">⌄</span>
        </div>

        {/* Navigation */}
        <nav className="app-navigation" aria-label="Fleet workspace navigation">
          {menuGroups.map((group) => (
            <div className="navigation-group" key={group.title}>
              <p>{group.title}</p>
              {group.items.map((item) => {
                const active =
                  location.pathname === item.path ||
                  (item.path !== '/dashboard' &&
                    location.pathname.startsWith(item.path));
                return (
                  <Link
                    className={`app-nav-link ${active ? 'is-active' : ''}`}
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth <= 800) setSidebarOpen(false);
                    }}
                  >
                    <span className="app-nav-icon" aria-hidden="true">
                      <item.Icon size={18} />
                    </span>
                    <span>{item.label}</span>
                    {active && <span className="active-mark" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: Settings + User */}
        <div className="sidebar-bottom">
          <Link
            className={`app-nav-link ${location.pathname === '/settings' ? 'is-active' : ''}`}
            to="/settings"
            onClick={() => {
              if (window.innerWidth <= 800) setSidebarOpen(false);
            }}
          >
            <span className="app-nav-icon">
              <MdSettings size={18} />
            </span>
            <span>Settings</span>
          </Link>

          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="user-identity">
              <b>{user?.username || 'Administrator'}</b>
              <small>{user?.role || 'Fleet administrator'}</small>
            </span>
            <button
              className="logout-button"
              type="button"
              title="Log out"
              aria-label="Log out"
              onClick={logout}
            >
              <MdLogout size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle"
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <MdClose size={20} /> : <MdMenu size={20} />}
            </button>
            <div className="page-context">
              <span>FLEET WORKSPACE</span>
              <b>{currentPage?.label || 'Settings'}</b>
            </div>
          </div>

          <div className="topbar-right">
            <span
              className={`workspace-health ${
                databaseStatus === 'unavailable' ? 'is-unavailable' : ''
              }`}
            >
              <i />
              {databaseStatus === 'checking'
                ? 'Checking database'
                : databaseStatus === 'unavailable'
                ? 'Database unavailable'
                : `Database ${databaseStatus}`}
            </span>
            <span className="topbar-divider" />
            <div className="topbar-user">
              <span className="user-avatar small">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </span>
              <span>{user?.username || 'Admin'}</span>
            </div>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
