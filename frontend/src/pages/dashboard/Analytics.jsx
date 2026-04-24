import { useState, useEffect, useCallback } from 'react';
import { getDashboard } from '../../services/api';
import { BarChart2, TrendingUp, Target, Zap, RefreshCw } from 'lucide-react';

const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    getDashboard()
      .then((d) => {
        setData(d);
        setLastUpdated(new Date());
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <p className="loading-text">Loading analytics...</p>;

  const profile = data?.profile || {};
  const hasProfile = !!(profile.tech_stack?.length || profile.roles?.length);

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Analytics</h2>
          <p>Your activity and match insights</p>
        </div>
        <div className="section-header-actions">
          {updatedLabel && (
            <span className="section-header-updated">Updated {updatedLabel}</span>
          )}
          <button
            className="button button-secondary refresh-btn"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="analytics-body">
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
    </div>
  );
}
