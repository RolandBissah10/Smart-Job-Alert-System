import { useState } from 'react';
import { unsaveJob, updateSavedJob } from '../services/api';
import { ExternalLink, HeartOff, Clock } from 'lucide-react';

export const STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'];

export const STATUS_LABELS = {
  saved: 'Saved',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

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

export default function TrackerCard({ job, onChange }) {
  const [notes, setNotes] = useState(job.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [unsaving, setUnsaving] = useState(false);

  const handleStatusChange = async (e) => {
    const status = e.target.value;
    setChangingStatus(true);
    try {
      await updateSavedJob(job.job_id, { status });
      onChange && onChange();
    } catch (err) {
      alert(err.message);
    } finally {
      setChangingStatus(false);
    }
  };

  const handleNotesBlur = async () => {
    if (notes === (job.notes || '')) return;
    setSavingNotes(true);
    try {
      await updateSavedJob(job.job_id, { notes });
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleUnsave = async () => {
    if (unsaving) return;
    setUnsaving(true);
    try {
      await unsaveJob(job.job_id);
      onChange && onChange();
    } catch (err) {
      alert(err.message);
      setUnsaving(false);
    }
  };

  return (
    <article className="job-card tracker-card">
      <div className="job-card-header">
        <div>
          <h3>{job.title}</h3>
          <p className="job-company">{job.company}</p>
        </div>
      </div>
      <div className="job-meta-row">
        {job.location && <p className="job-meta">Location: {job.location}</p>}
        {job.saved_at && (
          <p className="job-meta job-freshness">
            <Clock size={12} />
            Saved {timeAgo(job.saved_at)}
          </p>
        )}
      </div>

      <select
        className="profile-input tracker-status-select"
        value={job.status || 'saved'}
        onChange={handleStatusChange}
        disabled={changingStatus}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      <textarea
        className="profile-input tracker-notes"
        placeholder="Notes - e.g. recruiter contact, interview date..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleNotesBlur}
        rows={2}
      />
      {savingNotes && <span className="tracker-notes-saving">Saving...</span>}

      <div className="job-actions">
        {job.url && (
          <a className="job-link" href={job.url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            View listing
          </a>
        )}
        <button className="button button-secondary" onClick={handleUnsave} disabled={unsaving}>
          <HeartOff size={16} />
          {unsaving ? 'Removing...' : 'Unsave'}
        </button>
      </div>
    </article>
  );
}
