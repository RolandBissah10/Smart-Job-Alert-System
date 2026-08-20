import { useState } from 'react';
import { requestPasswordReset } from '../services/api';
import { Mail, Send } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      setIsLoading(true);
      await requestPasswordReset(email);
      setSubmitted(true);
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
          <h1>Forgot password?</h1>
          <p>Enter your email and we&apos;ll send you a link to reset your password.</p>
        </div>

        {submitted ? (
          <p className="alert alert-success">
            If an account exists for that email, a reset link has been sent. Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="form-grid">
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
            <button type="submit" className="button" disabled={isLoading}>
              <Send size={18} />
              {isLoading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        {error && <p className="alert alert-error">{error}</p>}

        <div className="auth-footer-links">
          <p className="auth-footer">
            <a href="/login">Back to login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
