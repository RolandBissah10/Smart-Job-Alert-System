import { useCallback, useEffect, useState } from 'react';
import { getDashboard, runPipeline } from '../../services/api';
import { Briefcase, Heart, Bell, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

const REFRESH_INTERVAL = 24 * 60 * 60 * 1000;

export default function Overview({ onNavigate, refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');
  const username = localStorage.getItem('username') || '';

  const loadDashboard = useCallback(() => {
    return getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => loadDashboard(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadDashboard, refreshKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg('');
    try {
      await loadDashboard();
      setRefreshMsg('Dashboard refreshed successfully.');
    } catch (err) {
      setRefreshMsg(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(''), 5000);
    }
  };

  const handleRunPipeline = async () => {
    setRunningPipeline(true);
    setRefreshMsg('');
    try {
      await runPipeline();
      await loadDashboard();
      setRefreshMsg('Pipeline completed and dashboard updated.');
    } catch (err) {
      setRefreshMsg(`Pipeline failed: ${err.message}`);
    } finally {
      setRunningPipeline(false);
      setTimeout(() => setRefreshMsg(''), 5000);
    }
  };

  if (loading) return <p className="loading-text">Loading dashboard...</p>;

  return (
    <div>
      <div className="overview-greeting">
        <div>
          <h2>{username ? `Welcome back, ${username}!` : 'Welcome back!'}</h2>
          <p>Here is a summary of your job alert activity.</p>
        </div>
        <div className="section-header-actions">
          <button
            className="button button-secondary"
            onClick={handleRefresh}
            disabled={refreshing || runningPipeline}
            title="Reload dashboard stats and alerts"
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
          </button>
          <button
            className="button"
            onClick={handleRunPipeline}
            disabled={runningPipeline || refreshing}
            title="Scrape fresh jobs and run the matching pipeline"
          >
            <RefreshCw size={16} className={runningPipeline ? 'spin' : ''} />
            {runningPipeline ? 'Running Pipeline...' : 'Run Pipeline'}
          </button>
        </div>
      </div>
      {refreshMsg && (
        <p className={`alert ${refreshMsg.startsWith('Refresh failed') ? 'alert-error' : 'alert-success'}`}>
          {refreshMsg}
        </p>
      )}
      {data && !data.profile_complete && (
        <div className="profile-prompt">
          <AlertCircle size={20} />
          <div>
            <strong>Add a profile or CV to get personalized job matches</strong>
            <p>Use your structured profile, an uploaded CV, or both together to start receiving relevant alerts.</p>
          </div>
          <button className="button" onClick={() => onNavigate('profile')}>
            Open Matching Setup
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
