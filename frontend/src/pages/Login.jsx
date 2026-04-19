import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const data = await login({ email, password });
      localStorage.setItem('token', data.access_token);
      setMessage('Login successful. Redirecting...');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="page page-center">
      <div>
        <h1>Welcome back</h1>
        <p>Sign in to access your personalized job alerts.</p>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            <span>
              <Mail size={18} />
              Email
            </span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            <span>
              <Lock size={18} />
              Password
            </span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          <button type="submit" className="button">
            <LogIn size={18} />
            Login
          </button>
        </form>
        {message && <p className="alert">{message}</p>}
      </div>
    </div>
  );
}
