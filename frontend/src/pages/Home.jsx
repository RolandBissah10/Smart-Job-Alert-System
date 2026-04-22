import { Link } from 'react-router-dom';
import { Bell, Search, Heart, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="page page-center">
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1>Smart Job Alert</h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
          Get tailored job notifications without searching job boards manually.
          Never miss your dream job again.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ textAlign: 'center' }}>
            <Search size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Smart Matching</h3>
            <p>AI-powered job matching based on your skills and preferences.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Bell size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Instant Alerts</h3>
            <p>Get notified immediately when relevant jobs are posted.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Heart size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Save & Track</h3>
            <p>Save interesting jobs and track your application progress.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Zap size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Lightning Fast</h3>
            <p>Automated scraping from multiple job sources in real-time.</p>
          </div>
        </div>

        <div className="button-row">
          <Link className="button" to="/signup" style={{ textDecoration: 'none' }}>Get Started Free</Link>
          <Link className="button button-secondary" to="/login" style={{ textDecoration: 'none' }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
