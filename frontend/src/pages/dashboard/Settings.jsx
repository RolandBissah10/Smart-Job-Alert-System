import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Trash2 } from 'lucide-react';
import { getMe, changePassword, changeEmail, setAlertsPaused, deleteAccount } from '../../services/api';

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [alertsPaused, setAlertsPausedState] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [pauseSaving, setPauseSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    getMe()
      .then((data) => {
        setEmail(data.email);
        setAlertsPausedState(data.alerts_paused);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSaving(true);
    try {
      await changeEmail(newEmail, emailCurrentPassword);
      // The current token still carries the old email as its subject, so it
      // stops matching any account as soon as the change lands - send them
      // to log back in with the new address rather than leave them on a
      // dashboard that's about to start 404-ing on every request.
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      setEmailError(err.message);
      setEmailSaving(false);
    }
  };

  const handleTogglePause = async () => {
    setPauseSaving(true);
    try {
      const result = await setAlertsPaused(!alertsPaused);
      setAlertsPausedState(result.alerts_paused);
    } catch (err) {
      alert(err.message);
    } finally {
      setPauseSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  if (loading) return <p className="loading-text">Loading settings...</p>;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Settings</h2>
          <p>Manage your account, password, and alert preferences</p>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginBottom: 24 }}>
        <h3 className="profile-panel-title">Change Password</h3>
        <form onSubmit={handleChangePassword}>
          <div className="profile-section">
            <label className="profile-label">Current Password</label>
            <input
              type="password"
              className="profile-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="profile-section">
            <label className="profile-label">New Password</label>
            <input
              type="password"
              className="profile-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="profile-section">
            <label className="profile-label">Confirm New Password</label>
            <input
              type="password"
              className="profile-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {passwordError && <p className="alert alert-error">{passwordError}</p>}
          {passwordSuccess && <p className="alert alert-success">Password updated successfully!</p>}
          <button className="button" type="submit" disabled={passwordSaving}>
            {passwordSaving ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div className="dashboard-card" style={{ marginBottom: 24 }}>
        <h3 className="profile-panel-title">Change Email</h3>
        <p className="profile-panel-text">
          Current email: <strong>{email}</strong>
        </p>
        <form onSubmit={handleChangeEmail}>
          <div className="profile-section">
            <label className="profile-label">New Email</label>
            <input
              type="email"
              className="profile-input"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <div className="profile-section">
            <label className="profile-label">Current Password</label>
            <input
              type="password"
              className="profile-input"
              value={emailCurrentPassword}
              onChange={(e) => setEmailCurrentPassword(e.target.value)}
              required
            />
          </div>
          {emailError && <p className="alert alert-error">{emailError}</p>}
          <button className="button" type="submit" disabled={emailSaving}>
            {emailSaving ? 'Updating...' : 'Update Email'}
          </button>
        </form>
      </div>

      <div className="dashboard-card" style={{ marginBottom: 24 }}>
        <h3 className="profile-panel-title">Alert Preferences</h3>
        <p className="profile-panel-text">
          {alertsPaused
            ? "Alerts are paused - you won't receive any job alert emails until you resume them."
            : "Alerts are active - you'll receive job alert emails as usual."}
        </p>
        <button
          className={`button ${alertsPaused ? '' : 'button-secondary'}`}
          onClick={handleTogglePause}
          disabled={pauseSaving}
        >
          {alertsPaused ? <Bell size={16} /> : <BellOff size={16} />}
          {pauseSaving ? 'Saving...' : alertsPaused ? 'Resume Alerts' : 'Pause Alerts'}
        </button>
      </div>

      <div className="dashboard-card">
        <h3 className="profile-panel-title" style={{ color: 'var(--error)' }}>Danger Zone</h3>
        <p className="profile-panel-text">
          Permanently delete your account and all associated data (saved jobs, tracker status, alert configs, and alert history). This cannot be undone.
        </p>
        {!confirmDelete ? (
          <button className="button button-danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} />
            Delete Account
          </button>
        ) : (
          <div>
            <div className="profile-section">
              <label className="profile-label">Enter your password to confirm</label>
              <input
                type="password"
                className="profile-input"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
            {deleteError && <p className="alert alert-error">{deleteError}</p>}
            <div className="reset-confirm">
              <span>This will permanently delete your account. Sure?</span>
              <button
                className="button button-danger"
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
              <button
                className="button button-secondary"
                onClick={() => { setConfirmDelete(false); setDeletePassword(''); setDeleteError(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
