import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup } from '../services/api';
import { User, Mail, Phone, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      await signup({ username, email, contact, password, keywords: [], location: 'remote' });
      setSuccess('Account created successfully. Please log in.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page page-center">
      <div>
        <h1>Create your account</h1>
        <p>Join thousands of professionals getting notified about their dream jobs.</p>
        <form onSubmit={handleSubmit} className="form-grid">

          {/* Username */}
          <label>
            <span><User size={18} /> Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              placeholder="johndoe"
              required
            />
          </label>

          {/* Email */}
          <label>
            <span><Mail size={18} /> Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="john@example.com"
              required
            />
          </label>

          {/* Contact */}
          <label>
            <span><Phone size={18} /> Contact</span>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              type="tel"
              placeholder="+1 555 000 0000"
              required
            />
          </label>

          {/* Password */}
          <label>
            <span><Lock size={18} /> Password</span>
            <div className="password-wrapper">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {/* Confirm Password */}
          <label>
            <span><Lock size={18} /> Confirm Password</span>
            <div className="password-wrapper">
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showConfirm ? 'text' : 'password'}
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button type="submit" className="button">
            <UserPlus size={18} />
            Sign Up
          </button>
        </form>

        {error && <p className="alert alert-error">{error}</p>}
        {success && <p className="alert alert-success">{success}</p>}

        <p className="auth-footer">
          Already have an account? <a href="/login">Log in</a>
        </p>
      </div>
    </div>
  );
}
