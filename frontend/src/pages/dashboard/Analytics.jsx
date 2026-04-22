import { useState, useEffect } from 'react';
import { getDashboard } from '../../services/api';
import { BarChart2, TrendingUp, Target, Zap } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading-text">Loading analytics...</p>;

  const profile = data?.profile || {};
  const hasProfile = !!(profile.tech_stack?.length || profile.roles?.length);

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Analytics</h2>
          <p>Your activity and match insights</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><BarChart2 size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{data?.stats?.total_jobs ?? 0}</span>
            <span className="stat-label">Jobs Available</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Target size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{data?.stats?.alerts_sent ?? 0}</span>
            <span className="stat-label">Alerts Sent</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><TrendingUp size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{data?.stats?.saved_jobs ?? 0}</span>
            <span className="stat-label">Jobs Saved</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Zap size={24} /></div>
          <div className="stat-info">
            <span className="stat-value stat-value-sm">{hasProfile ? 'Active' : 'Inactive'}</span>
            <span className="stat-label">Matching</span>
          </div>
        </div>
      </div>

      {hasProfile && (
        <div className="analytics-profile-summary">
          <h3>Your Profile Summary</h3>
          {profile.tech_stack?.length > 0 && (
            <div className="profile-summary-row">
              <span className="summary-label">Tech Stack</span>
              <div className="chip-grid small">
                {profile.tech_stack.map((t) => (
                  <span key={t} className="chip selected readonly">{t}</span>
                ))}
              </div>
            </div>
          )}
          {profile.roles?.length > 0 && (
            <div className="profile-summary-row">
              <span className="summary-label">Roles</span>
              <div className="chip-grid small">
                {profile.roles.map((r) => (
                  <span key={r} className="chip selected readonly">{r}</span>
                ))}
              </div>
            </div>
          )}
          {profile.experience_level && (
            <div className="profile-summary-row">
              <span className="summary-label">Experience</span>
              <span className="chip selected readonly">{profile.experience_level}</span>
            </div>
          )}
          {profile.location && (
            <div className="profile-summary-row">
              <span className="summary-label">Location</span>
              <span>{profile.location}</span>
            </div>
          )}
          {profile.job_type && (
            <div className="profile-summary-row">
              <span className="summary-label">Job Type</span>
              <span>{profile.job_type}</span>
            </div>
          )}
        </div>
      )}

      {!hasProfile && (
        <div className="empty-state" style={{ paddingTop: 32 }}>
          <p>Set up your profile to see personalized analytics and match data.</p>
        </div>
      )}
    </div>
  );
}
