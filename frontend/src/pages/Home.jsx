import { Link } from 'react-router-dom';
import { Bell, Search, Heart, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="home-page">
      <div className="home-hero">
        <h1>Smart Job Alert</h1>
        <p>
          Get tailored job notifications without searching job boards manually.
          Never miss your dream job again.
        </p>
        <div className="home-cta">
          <Link className="button" to="/signup" style={{ textDecoration: 'none' }}>
            Get Started Free
          </Link>
          <Link className="button button-secondary" to="/login" style={{ textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>

      <div className="home-features">
        <div className="feature-card">
          <Search size={32} color="var(--primary)" />
          <h3>Smart Matching</h3>
          <p>AI-powered job matching based on your skills and preferences.</p>
        </div>
        <div className="feature-card">
          <Bell size={32} color="var(--primary)" />
          <h3>Instant Alerts</h3>
          <p>Get notified immediately when relevant jobs are posted.</p>
        </div>
        <div className="feature-card">
          <Heart size={32} color="var(--primary)" />
          <h3>Save &amp; Track</h3>
          <p>Save interesting jobs and track your application progress.</p>
        </div>
        <div className="feature-card">
          <Zap size={32} color="var(--primary)" />
          <h3>Lightning Fast</h3>
          <p>Automated scraping from multiple job sources in real-time.</p>
        </div>
      </div>
    </div>
  );
}
