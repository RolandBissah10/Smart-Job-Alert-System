import { useState, useEffect } from 'react';
import { getDashboard } from '../../services/api';
import { Bell } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((data) => setAlerts(data.recent_alerts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading-text">Loading alerts...</p>;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Alert History</h2>
          <p>Jobs delivered to your email</p>
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
