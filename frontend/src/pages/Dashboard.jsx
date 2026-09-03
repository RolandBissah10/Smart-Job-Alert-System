import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, Briefcase, Kanban,
  Bell, BarChart2, LogOut, Menu, X, Sun, Moon, Settings as SettingsIcon,
} from 'lucide-react';
import Overview from './dashboard/Overview';
import Profile from './dashboard/Profile';
import Jobs from './dashboard/Jobs';
import Saved from './dashboard/Saved';
import Alerts from './dashboard/Alerts';
import Analytics from './dashboard/Analytics';
import Settings from './dashboard/Settings';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'jobs', label: 'Job Feed', icon: Briefcase },
  { id: 'saved', label: 'Tracker', icon: Kanban },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const SECTION_COMPONENTS = {
  overview: Overview,
  profile: Profile,
  jobs: Jobs,
  saved: Saved,
  alerts: Alerts,
  analytics: Analytics,
  settings: Settings,
};

export default function Dashboard() {
  const [section, setSection] = useState(
    () => localStorage.getItem('dashboardSection') || 'overview'
  );
  // Sections stay mounted once visited so switching tabs doesn't wipe their
  // local state (pagination, scroll position, in-progress form edits, etc.) -
  // only the active one is shown, the rest sit hidden via CSS.
  const [visitedSections, setVisitedSections] = useState(() => new Set([section]));
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [darkMode, setDarkMode] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark'
  );
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setEmail(localStorage.getItem('userEmail') || '');
    setUsername(localStorage.getItem('username') || '');
  }, [navigate]);

  const handleSectionChange = (id) => {
    setSection(id);
    setVisitedSections((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    localStorage.setItem('dashboardSection', id);
    setSidebarOpen(false);
  };

  const handleProfileChange = () => {
    setDashboardRefreshKey((prev) => prev + 1);
  };

  const handleLogout = () => {
    const keysToRemove = ['token', 'refreshToken', 'userEmail', 'username', 'dashboardSection', 'customSkills', 'customRoles'];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    // Remove per-industry custom skill keys
    Object.keys(localStorage)
      .filter((k) => k.startsWith('customSkills_'))
      .forEach((k) => localStorage.removeItem(k));
    navigate('/login');
  };

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span>Smart Job Alert</span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`sidebar-item ${section === id ? 'active' : ''}`}
              onClick={() => handleSectionChange(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {username && (
            <div className="sidebar-welcome">Welcome, {username}!</div>
          )}
          <div className="sidebar-user">{email}</div>
          <div className="sidebar-footer-actions">
            <button className="sidebar-icon-btn" onClick={toggleDark} title="Toggle theme">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="sidebar-icon-btn sidebar-logout" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="dashboard-content">
        <div className="dashboard-topbar">
          <div className="topbar-left">
            <button
              className="sidebar-menu-btn"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <h2 className="topbar-title">
              {NAV_ITEMS.find((i) => i.id === section)?.label}
            </h2>
          </div>
          <div className="topbar-actions">
            <button className="topbar-icon-btn" onClick={toggleDark} aria-label="Toggle theme" title="Toggle theme">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="topbar-icon-btn topbar-logout" onClick={handleLogout} aria-label="Logout" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div className="dashboard-section">
          {Array.from(visitedSections).map((id) => {
            const SectionComponent = SECTION_COMPONENTS[id];
            return (
              <div key={id} hidden={section !== id}>
                <SectionComponent
                  onNavigate={handleSectionChange}
                  refreshKey={dashboardRefreshKey}
                  onProfileChange={handleProfileChange}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
