import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, Briefcase, Heart,
  Bell, BarChart2, LogOut, Menu, X, Sun, Moon,
} from 'lucide-react';
import Overview from './dashboard/Overview';
import Profile from './dashboard/Profile';
import Jobs from './dashboard/Jobs';
import Saved from './dashboard/Saved';
import Alerts from './dashboard/Alerts';
import Analytics from './dashboard/Analytics';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'jobs', label: 'Job Feed', icon: Briefcase },
  { id: 'saved', label: 'Saved', icon: Heart },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
];

export default function Dashboard() {
  const [section, setSection] = useState(
    () => localStorage.getItem('dashboardSection') || 'overview'
  );
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
    localStorage.setItem('dashboardSection', id);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('username');
    localStorage.removeItem('dashboardSection');
    localStorage.removeItem('customTechs');
    localStorage.removeItem('customRoles');
    navigate('/login');
  };

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  const SectionComponent = {
    overview: Overview,
    profile: Profile,
    jobs: Jobs,
    saved: Saved,
    alerts: Alerts,
    analytics: Analytics,
  }[section];

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
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="dashboard-content">
        <div className="dashboard-topbar">
          <button className="sidebar-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <h2 className="topbar-title">
            {NAV_ITEMS.find((i) => i.id === section)?.label}
          </h2>
        </div>
        <div className="dashboard-section">
          <SectionComponent onNavigate={handleSectionChange} />
        </div>
      </div>
    </div>
  );
}
