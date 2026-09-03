import { useState, useEffect } from 'react';
import { getSavedJobs } from '../../services/api';
import TrackerCard, { STATUSES, STATUS_LABELS } from '../../components/TrackerCard';
import { Heart } from 'lucide-react';

export default function Saved({ refreshKey, onProfileChange }) {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = () => {
    setLoading(true);
    getSavedJobs()
      .then(setSavedJobs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [refreshKey]);

  // A status/notes/unsave edit here also affects Overview's saved-jobs count
  // and the Job Feed's heart icons, which live in other (possibly hidden) tabs.
  const handleCardChange = () => {
    load();
    onProfileChange?.();
  };

  if (loading) return <p className="loading-text">Loading tracker...</p>;

  const byStatus = (status) =>
    savedJobs
      .filter((job) => (job.status || 'saved') === status)
      .sort((a, b) => new Date(b.saved_at || 0) - new Date(a.saved_at || 0));

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Application Tracker</h2>
          <p>
            {savedJobs.length} job{savedJobs.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
      </div>

      {savedJobs.length === 0 ? (
        <div className="empty-state">
          <Heart size={48} />
          <h3>No saved jobs yet</h3>
          <p>Browse the Job Feed and save positions you are interested in.</p>
        </div>
      ) : (
        <>
          <div className="tracker-filter-bar">
            <button
              className={`tracker-filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
              <span className="tracker-filter-count">{savedJobs.length}</span>
            </button>
            {STATUSES.map((status) => (
              <button
                key={status}
                className={`tracker-filter-chip status-${status} ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                <span className="tracker-status-dot" />
                {STATUS_LABELS[status]}
                <span className="tracker-filter-count">{byStatus(status).length}</span>
              </button>
            ))}
          </div>

          <div className="tracker-list">
            {(statusFilter === 'all' ? STATUSES : [statusFilter]).map((status) => {
              const jobs = byStatus(status);
              if (jobs.length === 0 && statusFilter === 'all') return null;
              return (
                <div key={status} className="tracker-section">
                  <div className={`tracker-section-header status-${status}`}>
                    <span className="tracker-section-label">
                      <span className="tracker-status-dot" />
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="tracker-section-count">{jobs.length}</span>
                  </div>
                  {jobs.length === 0 ? (
                    <p className="tracker-section-empty">Nothing in {STATUS_LABELS[status]} yet.</p>
                  ) : (
                    <div className="tracker-section-grid">
                      {jobs.map((job) => (
                        <TrackerCard key={job.job_id} job={job} onChange={handleCardChange} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
