import { useEffect, useState } from 'react';
import { getDashboard } from '../../services/api';
import { Briefcase, Heart, Bell, TrendingUp, AlertCircle } from 'lucide-react';

export default function Overview({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const username = localStorage.getItem('username') || '';

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading-text">Loading dashboard...</p>;

  return (
    <div>
      <div className="overview-greeting">
        <h2>
          {username ? `Welcome back, ${username}!` : 'Welcome back!'}
        </h2>
        <p>Here is a summary of your job alert activity.</p>
      </div>
      {data && !data.profile_complete && (
        <div className="profile-prompt">
          <AlertCircle size={20} />
          <div>
            <strong>Complete your profile to get personalized job matches</strong>
            <p>Tell us about your skills and preferences to start receiving alerts.</p>
          </div>
          <button className="button" onClick={() => onNavigate('profile')}>
            Set Up Profile
          </button>
        </div>
      )}


      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Briefcase size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{data?.stats?.total_jobs ?? 0}</span>
            <span className="stat-label">Total Jobs</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Heart size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{data?.stats?.saved_jobs ?? 0}</span>
            <span className="stat-label">Saved Jobs</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Bell size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{data?.stats?.alerts_sent ?? 0}</span>
            <span className="stat-label">Alerts Received</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><TrendingUp size={24} /></div>
          <div className="stat-info">
            <span className="stat-value stat-value-sm">{data?.profile_complete ? 'Active' : 'Pending'}</span>
            <span className="stat-label">Match Status</span>
          </div>
        </div>
      </div>

      {data?.recent_alerts?.length > 0 && (
        <div className="recent-section">
          <h3>Recent Alerts</h3>
          <div className="recent-list">
            {data.recent_alerts.map((alert, i) => (
              <div key={i} className="recent-item">
                <Bell size={16} />
                <span>{alert.job_title || 'Job alert sent'}</span>
                {alert.job_company && (
                  <span className="recent-meta">at {alert.job_company}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
