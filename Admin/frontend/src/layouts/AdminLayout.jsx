import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  MdDashboard,
  MdPeople,
  MdDirectionsCar,
  MdBadge,
  MdWarning,
  MdHistory,
  MdSettings,
  MdLogout,
  MdMenu,
  MdClose,
  MdDarkMode,
  MdLightMode,
} from 'react-icons/md';

const navGroups = [
  {
    title: 'Overview',
    items: [{ path: '/', Icon: MdDashboard, label: 'Dashboard', end: true }],
  },
  {
    title: 'Governance',
    items: [
      { path: '/users', Icon: MdPeople, label: 'Users' },
      { path: '/audit', Icon: MdHistory, label: 'Audit Log' },
    ],
  },
  {
    title: 'Fleet Oversight',
    items: [
      { path: '/vehicles', Icon: MdDirectionsCar, label: 'Vehicles' },
      { path: '/drivers', Icon: MdBadge, label: 'Drivers' },
      { path: '/risk', Icon: MdWarning, label: 'Risk Intelligence' },
    ],
  },
  {
    title: 'Configuration',
    items: [{ path: '/system', Icon: MdSettings, label: 'System' }],
  },
];

const THEME_KEY = 'admin-theme';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState('checking');
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');

  const currentPage = navGroups
    .flatMap((group) => group.items)
    .find((item) => (item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    const check = () => {
      api
        .get('/system/health')
        .then(({ data }) => {
          if (active) setHealth(data.status === 'ok' ? 'ok' : 'down');
        })
        .catch(() => {
          if (active) setHealth('down');
        });
    };
    check();
    const timer = setInterval(check, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const displayName =
    user?.full_name ||
    (user?.username
      ? user.username.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Administrator');

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <span className="admin-brand-mark">F</span>
          <span className="admin-brand-text">
            <strong>FleetAI</strong>
            <span>Admin Control</span>
          </span>
        </div>

        <nav>
          {navGroups.map((group) => (
            <div className="admin-nav-group" key={group.title}>
              <h4>{group.title}</h4>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}
                >
                  <item.Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <span className="admin-avatar">{displayName[0] || 'A'}</span>
          <span className="admin-user-meta">
            <strong className="truncate">{displayName}</strong>
            <span>{user?.role || 'admin'}</span>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            <MdLogout size={17} />
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="btn btn-ghost btn-icon sidebar-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <MdClose size={20} /> : <MdMenu size={20} />}
          </button>

          <div className="admin-page-context">
            <span>ADMIN CONSOLE</span>
            <strong>{currentPage?.label || 'Dashboard'}</strong>
          </div>

          <div className="admin-topbar-spacer" />

          <span className={`admin-health ${health === 'ok' ? 'is-ok' : health === 'down' ? 'is-down' : ''}`}>
            <i />
            {health === 'checking'
              ? 'Checking API'
              : health === 'ok'
              ? 'API connected'
              : 'API unreachable'}
          </span>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <MdLightMode size={16} /> : <MdDarkMode size={16} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
