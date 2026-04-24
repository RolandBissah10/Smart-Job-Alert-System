import { useState, useEffect, useCallback } from 'react';
import { getDashboard } from '../../services/api';
import { Bell, RefreshCw } from 'lucide-react';

const REFRESH_INTERVAL = 24 * 60 * 60 * 1000;

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    getDashboard()
      .then((data) => {
        setAlerts(data.recent_alerts || []);
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

  if (loading) return <p className="loading-text">Loading alerts...</p>;

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Alert History</h2>
          <p>Last 10 jobs delivered to your email</p>
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

      {alerts.length === 0 ? (
        <div className="empty-state">
          <Bell size={48} />
          <h3>No alerts yet</h3>
          <p>
            Complete your profile and run the pipeline to start receiving job alerts
            via email.
          </p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert, i) => (
            <div key={i} className="alert-item">
              <div className="alert-icon">
                <Bell size={20} />
              </div>
              <div className="alert-info">
                <strong>{alert.job_title || 'Job alert sent'}</strong>
                {alert.job_company && (
                  <span className="alert-meta"> at {alert.job_company}</span>
                )}
                {alert.sent_at && (
                  <span className="alert-date">
                    {new Date(alert.sent_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              {alert.job_url && (
                <a
                  href={alert.job_url}
                  target="_blank"
                  rel="noreferrer"
                  className="job-link"
                >
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
