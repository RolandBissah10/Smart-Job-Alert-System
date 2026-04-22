import { useState, useEffect } from 'react';
import { getJobFeed, getSavedJobs } from '../../services/api';
import JobCard from '../../components/JobCard';
import { Zap } from 'lucide-react';

export default function Jobs({ onNavigate }) {
  const [feed, setFeed] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      getJobFeed().catch((err) => ({ error: err.message })),
      getSavedJobs().catch(() => []),
    ])
      .then(([feedData, saved]) => {
        setFeed(feedData);
        setSavedJobs(saved);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const isJobSaved = (job) =>
    savedJobs.some((s) => s.job_id === (job._id || job.url));

  const refreshSaved = () => getSavedJobs().then(setSavedJobs).catch(console.error);

  if (loading) return <p className="loading-text">Loading your job feed...</p>;

  if (feed?.profile_required) {
    return (
      <div className="empty-state">
        <Zap size={48} />
        <h3>Complete your profile first</h3>
        <p>We need to know your skills and preferences to show you matching jobs.</p>
        <button className="button" onClick={() => onNavigate('profile')}>
          Set Up Profile
        </button>
      </div>
    );
  }

  const jobs = feed?.jobs || [];

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Your Job Feed</h2>
          <p>{jobs.length} personalized match{jobs.length !== 1 ? 'es' : ''}</p>
        </div>
        <button className="button button-secondary" onClick={load}>Refresh</button>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {jobs.length === 0 ? (
        <div className="empty-state">
          <p>No jobs found yet. Run the pipeline to scrape fresh listings.</p>
        </div>
      ) : (
        <div className="jobs-grid">
          {jobs.map(({ job, score, reasons }, i) => (
            <div key={job._id || i} className="job-card-wrapper">
              {score > 0 && (
                <div className="match-info">
                  <span className="match-score">Score: {score}</span>
                  {reasons?.length > 0 && (
                    <span className="match-reasons">Matches: {reasons.join(', ')}</span>
                  )}
                </div>
              )}
              <JobCard
                job={job}
                isSaved={isJobSaved(job)}
                onSaveToggle={refreshSaved}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
