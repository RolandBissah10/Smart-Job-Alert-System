import { useState } from 'react';
import { saveJob, unsaveJob } from '../services/api';
import { ExternalLink, Heart, HeartOff, Clock } from 'lucide-react';

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

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
      <div className="job-meta-row">
        {job.location && <p className="job-meta">Location: {job.location}</p>}
        {job.created_at && (
          <p className="job-meta job-freshness">
            <Clock size={12} />
            {timeAgo(job.created_at)}
          </p>
        )}
      </div>
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
