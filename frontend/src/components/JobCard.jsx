import { useState } from 'react';
import { saveJob, unsaveJob } from '../services/api';
import { ExternalLink, Heart, HeartOff } from 'lucide-react';

export default function JobCard({ job, isSaved = false, onSaveToggle }) {
  const [saving, setSaving] = useState(false);

  const handleSaveToggle = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (isSaved) {
        await unsaveJob(job._id || job.url);
      } else {
        await saveJob(job._id || job.url);
      }
      onSaveToggle && onSaveToggle(job);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="job-card">
      <div className="job-card-header">
        <div>
          <h3>{job.title}</h3>
          <p className="job-company">{job.company}</p>
        </div>
        {job.source && <span className="tag">{job.source}</span>}
      </div>
      {job.location && <p className="job-meta">Location: {job.location}</p>}
      {job.description && <p className="job-description">{job.description}</p>}
      <div className="job-actions">
        {job.url && (
          <a className="job-link" href={job.url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            View listing
          </a>
        )}
        <button
          className={`button ${isSaved ? 'button-secondary' : ''}`}
          onClick={handleSaveToggle}
          disabled={saving}
        >
          {saving ? (
            'Saving...'
          ) : isSaved ? (
            <>
              <HeartOff size={16} />
              Unsave
            </>
          ) : (
            <>
              <Heart size={16} />
              Save
            </>
          )}
        </button>
      </div>
    </article>
  );
}
