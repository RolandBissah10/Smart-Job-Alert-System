import { useState, useEffect, useCallback } from 'react';
import { getDashboard, getAlerts, createAlert, updateAlert, deleteAlert } from '../../services/api';
import { Bell, RefreshCw, Plus, Pencil, Trash2 } from 'lucide-react';
import ChipInput from '../../components/ChipInput';

const REFRESH_INTERVAL = 24 * 60 * 60 * 1000;

const LOCATION_OPTIONS = ['', 'Remote', 'On-Premises', 'Hybrid'];
const JOB_TYPE_OPTIONS = ['', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const MATCH_SOURCE_OPTIONS = ['', 'profile', 'cv', 'both'];
const FRESHNESS_OPTIONS = [
  { value: '1', label: 'Last 24 hours' },
  { value: '3', label: 'Last 3 days' },
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'any', label: 'Any time' },
];

const emptyForm = {
  name: '',
  roles: [],
  industry: '',
  location: '',
  job_type: '',
  match_source: '',
  freshness_days: '7',
  min_match_score: 0,
  target_companies: [],
};

function criteriaToForm(criteria = {}) {
  return {
    roles: criteria.roles || [],
    industry: criteria.industry || '',
    location: criteria.location || '',
    job_type: criteria.job_type || '',
    match_source: criteria.match_source || '',
    freshness_days: criteria.freshness_days == null ? 'any' : String(criteria.freshness_days),
    min_match_score: criteria.min_match_score ?? 0,
    target_companies: criteria.target_companies || [],
  };
}

function formToCriteria(form) {
  return {
    roles: form.roles.length ? form.roles : null,
    industry: form.industry.trim() || null,
    location: form.location || null,
    job_type: form.job_type || null,
    match_source: form.match_source || null,
    freshness_days: form.freshness_days === 'any' ? null : Number(form.freshness_days),
    min_match_score: Number(form.min_match_score) || 0,
    target_companies: form.target_companies.length ? form.target_companies : null,
  };
}

export default function Alerts({ refreshKey }) {
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadAlerts = useCallback(() => {
    return getAlerts().then(setAlerts).catch(console.error);
  }, []);

  const loadHistory = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    return getDashboard()
      .then((data) => {
        setHistory(data.recent_alerts || []);
        setLastUpdated(new Date());
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAlerts(), loadHistory()]);
    const interval = setInterval(() => { loadAlerts(); loadHistory(); }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadAlerts, loadHistory, refreshKey]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const startEdit = (alert) => {
    setEditingId(alert.id);
    setForm({ name: alert.name, ...criteriaToForm(alert.criteria) });
    setError('');
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Give your alert a name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { name: form.name.trim(), criteria: formToCriteria(form) };
      if (editingId) {
        await updateAlert(editingId, payload);
      } else {
        await createAlert(payload);
      }
      await loadAlerts();
      cancelForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAlert(id);
      await loadAlerts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (alert) => {
    try {
      await updateAlert(alert.id, { is_active: !alert.is_active });
      await loadAlerts();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="loading-text">Loading alerts...</p>;

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Alerts</h2>
          <p>Create alerts for different career paths, companies, or searches</p>
        </div>
        <div className="section-header-actions">
          {!showForm && (
            <button className="button" onClick={startCreate}>
              <Plus size={16} /> New Alert
            </button>
          )}
        </div>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {showForm && (
        <div className="dashboard-card" style={{ marginBottom: 24 }}>
          <h3 className="profile-panel-title">{editingId ? 'Edit Alert' : 'New Alert'}</h3>

          <div className="profile-section">
            <label className="profile-label">Alert Name</label>
            <input
              type="text"
              className="profile-input"
              placeholder="e.g. Dream Companies"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <ChipInput
            label="Roles (optional - defaults to your profile)"
            values={form.roles}
            placeholder="e.g. QA Engineer - press Enter"
            onAdd={(v) => setForm((f) => ({ ...f, roles: [...f.roles, v] }))}
            onRemove={(v) => setForm((f) => ({ ...f, roles: f.roles.filter((r) => r !== v) }))}
          />

          <div className="profile-section">
            <label className="profile-label">Industry (optional)</label>
            <input
              type="text"
              className="profile-input"
              placeholder="e.g. technology"
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            />
          </div>

          <div className="profile-section">
            <label className="profile-label">Location</label>
            <select
              className="profile-input profile-select"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            >
              {LOCATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt || 'Use my profile'}</option>
              ))}
            </select>
          </div>

          <div className="profile-section">
            <label className="profile-label">Job Type</label>
            <select
              className="profile-input profile-select"
              value={form.job_type}
              onChange={(e) => setForm((f) => ({ ...f, job_type: e.target.value }))}
            >
              {JOB_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt || 'Use my profile'}</option>
              ))}
            </select>
          </div>

          <div className="profile-section">
            <label className="profile-label">Match Based On</label>
            <select
              className="profile-input profile-select"
              value={form.match_source}
              onChange={(e) => setForm((f) => ({ ...f, match_source: e.target.value }))}
            >
              {MATCH_SOURCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === '' ? 'Use my current setting' : opt === 'profile' ? 'Profile Only' : opt === 'cv' ? 'CV Only' : 'Profile + CV'}
                </option>
              ))}
            </select>
          </div>

          <div className="profile-section">
            <label className="profile-label">Posted</label>
            <select
              className="profile-input profile-select"
              value={form.freshness_days}
              onChange={(e) => setForm((f) => ({ ...f, freshness_days: e.target.value }))}
            >
              {FRESHNESS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="profile-section">
            <label className="profile-label">Minimum Match Score (0 = no minimum, ignored for company-only alerts)</label>
            <input
              type="number"
              min="0"
              max="100"
              className="profile-input"
              value={form.min_match_score}
              onChange={(e) => setForm((f) => ({ ...f, min_match_score: e.target.value }))}
            />
          </div>

          <ChipInput
            label="Companies (optional - if set, this alert shows jobs from these companies regardless of skill match)"
            values={form.target_companies}
            placeholder="e.g. AmaliTech, Hubtel - press Enter"
            onAdd={(v) => setForm((f) => ({ ...f, target_companies: [...f.target_companies, v] }))}
            onRemove={(v) => setForm((f) => ({ ...f, target_companies: f.target_companies.filter((c) => c !== v) }))}
            withCompanySuggestions
          />

          <div className="wizard-footer" style={{ marginTop: 16 }}>
            <button type="button" className="button button-secondary" onClick={cancelForm} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Alert'}
            </button>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="alerts-list" style={{ marginBottom: 32 }}>
          {alerts.map((alert) => (
            <div key={alert.id} className="alert-item">
              <div className="alert-icon">
                <Bell size={20} />
              </div>
              <div className="alert-info">
                <strong>{alert.name}</strong>
                <span className="alert-meta">
                  {' '}{alert.is_active ? 'Active' : 'Paused'}
                  {alert.criteria?.target_companies?.length ? ` · Companies: ${alert.criteria.target_companies.join(', ')}` : ''}
                  {alert.criteria?.min_match_score ? ` · Min match: ${alert.criteria.min_match_score}%` : ''}
                </span>
              </div>
              <button className="button button-secondary" onClick={() => handleToggleActive(alert)}>
                {alert.is_active ? 'Pause' : 'Resume'}
              </button>
              <button className="button button-secondary" onClick={() => startEdit(alert)}>
                <Pencil size={14} />
              </button>
              <button className="button button-danger" onClick={() => handleDelete(alert.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="section-header">
        <div>
          <h3>Alert History</h3>
          <p>Last 10 jobs delivered to your email</p>
        </div>
        <div className="section-header-actions">
          {updatedLabel && (
            <span className="section-header-updated">Updated {updatedLabel}</span>
          )}
          <button
            className="button button-secondary refresh-btn"
            onClick={() => loadHistory(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <Bell size={48} />
          <h3>No alerts yet</h3>
          <p>
            Complete your profile (or create a named alert above) and run the pipeline to
            start receiving job alerts via email.
          </p>
        </div>
      ) : (
        <div className="alerts-list">
          {history.map((alert, i) => (
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
