import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup } from '../services/api';
import { Mail, Lock, Search, MapPin, UserPlus } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('remote');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      await signup({
        email,
        password,
        keywords: keywords.split(',').map((value) => value.trim()).filter(Boolean),
        location,
      });
      setSuccess('Account created successfully. Please log in.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page page-center">
      <div>
        <h1>Create your alert account</h1>
        <p>Join thousands of professionals getting notified about their dream jobs.</p>
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
          <label>
            <span>
              <Search size={18} />
              Keywords (comma separated)
            </span>
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="python, backend, django" />
          </label>
          <label>
            <span>
              <MapPin size={18} />
              Preferred location
            </span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="remote" />
          </label>
          <button type="submit" className="button">
            <UserPlus size={18} />
            Sign Up
          </button>
        </form>
        {error && <p className="alert alert-error">{error}</p>}
        {success && <p className="alert alert-success">{success}</p>}
      </div>
    </div>
  );
}
