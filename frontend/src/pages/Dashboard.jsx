import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchJobs, runPipeline, getSavedJobs } from '../services/api';
import JobCard from '../components/JobCard';
import { RefreshCw, Play, Clock, Heart } from 'lucide-react';

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState('latest'); // 'latest' or 'saved'
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadSavedJobs();
  }, [navigate]);

  const loadJobs = async () => {
    setStatus('Loading jobs...');
    setError('');

    try {
      const data = await fetchJobs();
      setJobs(data.new_jobs || []);
      setStatus(`Fetched ${data.count} new jobs.`);
    } catch (err) {
      setError(err.message);
      setStatus('Unable to fetch jobs.');
    }
  };

  const loadSavedJobs = async () => {
    try {
      const data = await getSavedJobs();
      setSavedJobs(data);
    } catch (err) {
      console.error('Failed to load saved jobs:', err);
    }
  };

  const handleRunPipeline = async () => {
    setStatus('Running pipeline...');
    setError('');
    try {
      const data = await runPipeline();
      setStatus(`Delivered ${data.delivered.length} alerts.`);
    } catch (err) {
      setError(err.message);
      setStatus('Pipeline failed.');
    }
  };

  const handleSaveToggle = (job) => {
    loadSavedJobs(); // Refresh saved jobs
  };

  const isJobSaved = (job) => {
    return savedJobs.some(saved => saved.job_id === (job._id || job.url));
  };

  const displayedJobs = view === 'saved' ? savedJobs.map(saved => ({ ...saved, _id: saved.job_id })) : jobs;

  return (
    <div className="page">
      <div className="dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p>Monitor the latest scraped jobs and manage your saved ones.</p>
        </div>
        <div className="button-row">
          <button className="button" onClick={loadJobs}>
            <RefreshCw size={16} />
            Fetch Jobs
          </button>
          <button className="button button-secondary" onClick={handleRunPipeline}>
            <Play size={16} />
            Run Pipeline
          </button>
        </div>
      </div>

      <div className="view-tabs">
        <button className={`tab ${view === 'latest' ? 'active' : ''}`} onClick={() => setView('latest')}>
          <Clock size={16} />
          Latest Jobs
        </button>
        <button className={`tab ${view === 'saved' ? 'active' : ''}`} onClick={() => setView('saved')}>
          <Heart size={16} />
          Saved Jobs ({savedJobs.length})
        </button>
      </div>

      {status && <p className="status-text">{status}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      <div className="jobs-grid">
        {displayedJobs.length === 0 ? (
          <p>{view === 'saved' ? 'No saved jobs yet.' : 'No jobs loaded yet.'}</p>
        ) : (
          displayedJobs.map((job, index) => (
            <JobCard
              key={job._id || job.url || index}
              job={job}
              isSaved={isJobSaved(job)}
              onSaveToggle={handleSaveToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
