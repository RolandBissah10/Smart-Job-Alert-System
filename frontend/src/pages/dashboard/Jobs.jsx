import { useState, useEffect } from 'react';
import { getJobFeed, getSavedJobs } from '../../services/api';
import JobCard from '../../components/JobCard';
import { Zap, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 6;

export default function Jobs({ onNavigate }) {
  const [feed, setFeed] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = (targetPage = page) => {
    setLoading(true);
    setError('');
    Promise.all([
      getJobFeed(targetPage, PAGE_SIZE).catch((err) => ({ error: err.message })),
      getSavedJobs().catch(() => []),
    ])
      .then(([feedData, saved]) => {
        setFeed(feedData);
        setSavedJobs(saved);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  // Refresh the feed when the user returns to the tab so they see newly scraped jobs
  useEffect(() => {
    const onFocus = () => load(page);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [page]);

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
  const total = feed?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const goTo = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Your Job Feed</h2>
          <p>
            {total > 0
              ? `${total} job${total !== 1 ? 's' : ''} — page ${page} of ${totalPages}`
              : 'No jobs found yet'}
          </p>
        </div>
        <button className="button button-secondary" onClick={() => load(page)}>Refresh</button>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {jobs.length === 0 ? (
        <div className="empty-state">
          <p>No jobs found yet. Run the pipeline to scrape fresh listings.</p>
        </div>
      ) : (
        <>
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

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => goTo(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft size={16} />
                Prev
              </button>

              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
                    ) : (
                      <button
                        key={p}
                        className={`pagination-btn ${p === page ? 'active' : ''}`}
                        onClick={() => goTo(p)}
                      >
                        {p}
                      </button>
                    )
                  )}
              </div>

              <button
                className="pagination-btn"
                onClick={() => goTo(page + 1)}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
