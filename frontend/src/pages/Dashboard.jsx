import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, Briefcase, Kanban,
  Bell, BarChart2, LogOut, Menu, X, Sun, Moon, Settings as SettingsIcon, HelpCircle,
} from 'lucide-react';
import Overview from './dashboard/Overview';
import Profile from './dashboard/Profile';
import Jobs from './dashboard/Jobs';
import Saved from './dashboard/Saved';
import Alerts from './dashboard/Alerts';
import Analytics from './dashboard/Analytics';
import Settings from './dashboard/Settings';
import NotificationBell from '../components/NotificationBell';
import TourGuide from '../components/TourGuide';
import { getNotifications, markNotificationsSeen } from '../services/api';

// Matches the other dashboard polling intervals - this doesn't need to be
// near-instant, just frequent enough that a badge shows up without a reload.
const NOTIFICATIONS_REFRESH_INTERVAL = 5 * 60 * 1000;

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'jobs', label: 'Job Feed', icon: Briefcase },
  { id: 'saved', label: 'Tracker', icon: Kanban },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const TOUR_STEPS = [
  {
    title: 'Welcome to Smart Job Alert!',
    text: "Here's a quick, 2-minute tour of where everything lives. Skip anytime with the X.",
  },
  {
    selector: '[data-tour="overview"]',
    title: 'Overview',
    text: 'Your at-a-glance dashboard — key stats, and a button to manually run the matching pipeline whenever you want fresh results.',
  },
  {
    selector: '[data-tour="profile"]',
    title: 'Profile',
    text: "Set up your matching profile, upload a CV, or both — this is what decides which jobs you'll be shown.",
  },
  {
    selector: '[data-tour="jobs"]',
    title: 'Job Feed',
    text: 'Every job matched to your profile, with a match score, search, and sorting.',
  },
  {
    selector: '[data-tour="saved"]',
    title: 'Tracker',
    text: 'Save jobs here and move them through Saved → Applied → Interview → Offer/Rejected, with notes per application.',
  },
  {
    selector: '[data-tour="alerts"]',
    title: 'Alerts',
    text: 'Create custom alerts for specific roles, companies, or search criteria beyond your main profile.',
  },
  {
    selector: '[data-tour="analytics"]',
    title: 'Analytics',
    text: 'Trends behind your matches — score distribution, top skills in demand, and your alert history.',
  },
  {
    selector: '[data-tour="settings"]',
    title: 'Settings',
    text: 'Change your password or email, pause alerts temporarily, or delete your account.',
  },
  {
    selector: '[data-tour="notifications"]',
    title: 'Notifications',
    text: "New job matches show up here too — even on the rare occasion the alert email doesn't arrive.",
  },
  {
    title: "That's it!",
    text: 'Come back to this tour anytime from the help icon next to the theme toggle.',
  },
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
  const [notifications, setNotifications] = useState({ items: [], unread_count: 0 });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
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

  // Auto-start once for a first-time visitor, after the layout has settled.
  useEffect(() => {
    if (localStorage.getItem('tourCompleted')) return;
    const timer = setTimeout(() => startTour(), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTour = () => {
    setSidebarOpen(true); // sidebar items need to be visible/on-screen to spotlight on mobile
    setTourActive(true);
  };

  const finishTour = () => {
    setTourActive(false);
    setSidebarOpen(false);
    localStorage.setItem('tourCompleted', 'true');
  };

  useEffect(() => {
    const loadNotifications = () => {
      getNotifications().then(setNotifications).catch(console.error);
    };
    loadNotifications();
    const interval = setInterval(loadNotifications, NOTIFICATIONS_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const handleToggleNotifications = () => {
    setNotificationsOpen((wasOpen) => {
      const opening = !wasOpen;
      if (opening && notifications.unread_count > 0) {
        markNotificationsSeen()
          .then(() => setNotifications((prev) => ({ ...prev, unread_count: 0 })))
          .catch(console.error);
      }
      return opening;
    });
  };

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
              data-tour={id}
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
            <div data-tour="notifications">
              <NotificationBell
                notifications={notifications}
                open={notificationsOpen}
                onToggle={handleToggleNotifications}
                onClose={() => setNotificationsOpen(false)}
                triggerClassName="sidebar-icon-btn"
                placement="sidebar"
              />
            </div>
            <button className="sidebar-icon-btn" onClick={startTour} title="Take a tour">
              <HelpCircle size={18} />
            </button>
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
            <NotificationBell
              notifications={notifications}
              open={notificationsOpen}
              onToggle={handleToggleNotifications}
              onClose={() => setNotificationsOpen(false)}
              triggerClassName="topbar-icon-btn"
            />
            <button className="topbar-icon-btn" onClick={startTour} aria-label="Take a tour" title="Take a tour">
              <HelpCircle size={18} />
            </button>
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

      {tourActive && <TourGuide steps={TOUR_STEPS} onFinish={finishTour} />}
    </div>
  );
}
