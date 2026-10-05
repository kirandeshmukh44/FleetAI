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
  MdEditNote,
  MdPerson,
  MdCalendarToday,
  MdEmail,
  MdShield,
  MdLightMode,
  MdDarkMode,
} from 'react-icons/md';

const menuGroups = [
  {
    title: 'Workspace',
    items: [
      { path: '/dashboard', Icon: MdDashboard, label: 'Overview' },
      { path: '/tracking', Icon: MdLocationOn, label: 'Live Tracking' },
      { path: '/data-entry', Icon: MdEditNote, label: 'Data Entry' },
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [databaseStatus, setDatabaseStatus] = useState('checking');
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('fleet-theme') || 'light');
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
    if (window.innerWidth <= 800) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
    setProfileOpen(false);
  }, [location.pathname]);

  /* Handle window resize */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 800) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('fleet-theme', theme);
  }, [theme]);

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : null;
  const displayName = user?.full_name || (user?.username
    ? user.username.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
    : 'Administrator');

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

          {/* User Profile Card */}
          <div className="sidebar-user-card">
            <div
              className="sidebar-user-card-trigger"
              role="button"
              tabIndex={0}
              onClick={() => setProfileOpen((o) => !o)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setProfileOpen((o) => !o);
              }}
              aria-expanded={profileOpen}
              aria-label="Toggle profile details"
            >
              <div className="user-avatar">
                {displayName[0] || 'A'}
              </div>
              <span className="user-identity">
                <b>{displayName}</b>
                <small>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Fleet Admin'}</small>
              </span>
              <button
                className="logout-button"
                type="button"
                title="Log out"
                aria-label="Log out"
                onClick={(e) => { e.stopPropagation(); logout(); }}
              >
                <MdLogout size={18} />
              </button>
            </div>

            {profileOpen && (
              <div className="sidebar-profile-panel">
                <div className="profile-panel-header">
                  <div className="profile-avatar-lg">
                    {displayName[0] || 'A'}
                  </div>
                  <div>
                    <strong>{displayName}</strong>
                    <span className="profile-role-badge">
                      <MdShield size={11} />
                      {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin'}
                    </span>
                  </div>
                </div>
                <div className="profile-detail-rows">
                  {user?.email && (
                    <div className="profile-detail-row">
                      <MdEmail size={14} className="profile-detail-icon" />
                      <span>{user.email}</span>
                    </div>
                  )}
                  {joinDate && (
                    <div className="profile-detail-row">
                      <MdCalendarToday size={14} className="profile-detail-icon" />
                      <span>Joined {joinDate}</span>
                    </div>
                  )}
                  <div className="profile-detail-row">
                    <MdPerson size={14} className="profile-detail-icon" />
                    <span>ID #{user?.id || '—'}</span>
                  </div>
                </div>
                <button className="profile-logout-btn" onClick={logout}>
                  <MdLogout size={15} />
                  Sign out
                </button>
              </div>
            )}
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
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
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
                {displayName[0] || 'A'}
              </span>
              <span>{displayName}</span>
            </div>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
