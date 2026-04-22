import { useState, useEffect } from 'react';
import { getSavedJobs } from '../../services/api';
import JobCard from '../../components/JobCard';
import { Heart } from 'lucide-react';

export default function Saved() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getSavedJobs()
      .then(setSavedJobs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <p className="loading-text">Loading saved jobs...</p>;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Saved Jobs</h2>
          <p>
            {savedJobs.length} job{savedJobs.length !== 1 ? 's' : ''} saved
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
        <div className="jobs-grid">
          {savedJobs.map((saved, i) => (
            <JobCard
              key={saved._id || i}
              job={{ ...saved, _id: saved.job_id }}
              isSaved={true}
              onSaveToggle={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
