import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/api';
import { Lock, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword(token, newPassword);
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="auth-card">
        <div className="auth-card-header">
          <h1>Reset password</h1>
          <p>Choose a new password for your account.</p>
        </div>

        {!token ? (
          <p className="alert alert-error">
            This reset link is missing its token. Please request a new one.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              <span><Lock size={18} /> New password</span>
              <div className="password-wrapper">
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <label>
              <span><Lock size={18} /> Confirm password</span>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading}
              />
            </label>
            <button type="submit" className="button" disabled={isLoading}>
              <KeyRound size={18} />
              {isLoading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}

        {error && (
          <p className="alert alert-error">
            {error}
            {' '}
            <a href="/forgot-password">Request a new link</a>
          </p>
        )}
        {success && <p className="alert alert-success">{success}</p>}

        <div className="auth-footer-links">
          <p className="auth-footer">
            <a href="/login">Back to login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
