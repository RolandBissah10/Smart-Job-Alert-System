import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup } from '../services/api';
import { User, Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      await signup({ username, email, password });
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
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
          <h1>Create your account</h1>
          <p>Sign up in seconds. Set up your job preferences after login.</p>
        </div>
        <form onSubmit={handleSubmit} className="form-grid">

          <label>
            <span><User size={18} /> Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              placeholder="e.g. Roland"
              required
              disabled={isLoading}
            />
          </label>

          <label>
            <span><Mail size={18} /> Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </label>

          <label>
            <span><Lock size={18} /> Password</span>
            <div className="password-wrapper">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <span><Lock size={18} /> Confirm Password</span>
            <div className="password-wrapper">
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showConfirm ? 'text' : 'password'}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirm((v) => !v)}
                disabled={isLoading}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button type="submit" className="button" disabled={isLoading}>
            <UserPlus size={18} />
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {error && <p className="alert alert-error">{error}</p>}
        {success && <p className="alert alert-success">{success}</p>}

        <div className="auth-footer-links">
          <p className="auth-footer">
            Already have an account? <a href="/login">Log in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
