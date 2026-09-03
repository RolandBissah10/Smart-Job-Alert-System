import { useState, useEffect, useCallback } from 'react';
import { getAnalytics, getDashboard } from '../../services/api';
import { RefreshCw, TrendingUp, Zap, Layers, Bell, Target } from 'lucide-react';
import BarChart from '../../components/charts/BarChart';
import HorizontalBarList from '../../components/charts/HorizontalBarList';
import LineChart from '../../components/charts/LineChart';
import DonutChart from '../../components/charts/DonutChart';

// Matches the backend's job-feed cache TTL, so a poll always has a real
// chance of seeing fresh data rather than re-fetching the same cached result.
const REFRESH_INTERVAL = 5 * 60 * 1000;

const SENIORITY_COLORS = [
  'var(--chart-ordinal-1)',
  'var(--chart-ordinal-2)',
  'var(--chart-ordinal-3)',
  'var(--chart-ordinal-4)',
  'var(--chart-ordinal-5)',
  'var(--chart-ordinal-6)',
  'var(--chart-ordinal-7)',
];

// Same source ramp as the seniority donut - reused, not reinvented - spread
// across 5 steps so the score buckets read light-to-dark (low to high match).
const SCORE_COLORS = [
  'var(--chart-ordinal-1)',
  'var(--chart-ordinal-3)',
  'var(--chart-ordinal-4)',
  'var(--chart-ordinal-6)',
  'var(--chart-ordinal-7)',
];

function formatAlertDate(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Analytics({ refreshKey }) {
  const [data, setData] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    Promise.all([getAnalytics(), getDashboard()])
      .then(([analytics, dash]) => {
        setData(analytics);
        setDashboard(dash);
        setLastUpdated(new Date());
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load, refreshKey]);

  if (loading) return <p className="loading-text">Loading analytics...</p>;

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const scoreDistribution = (data?.score_distribution || []).map((b) => ({ label: b.label, value: b.count }));
  const topSkills = (data?.top_skills || []).map((s) => ({ label: s.skill, value: s.count }));
  const seniorityMix = (data?.seniority_mix || []).map((s) => ({ label: s.level, value: s.count }));
  const alertsOverTime = (data?.alerts_over_time || []).map((a) => ({ label: formatAlertDate(a.date), value: a.count }));
  const hasAnyAlerts = alertsOverTime.some((a) => a.value > 0);

  const profile = dashboard?.profile || {};
  const hasMatchInput = !!(
    profile.skills?.length ||
    profile.tech_stack?.length ||
    profile.roles?.length ||
    dashboard?.cv_uploaded
  );

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Analytics</h2>
          <p>Trends and breakdowns behind your matches - not a repeat of the Overview numbers</p>
        </div>
        <div className="section-header-actions">
          {updatedLabel && (
            <span className="section-header-updated">Updated {updatedLabel}</span>
          )}
          <button
            className="button button-secondary refresh-btn"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {!data?.profile_complete && (
        <p className="alert alert-info" style={{ marginBottom: 24 }}>
          Set up your profile or upload a CV to see match-quality analytics (skills, score, seniority mix).
          Alert history below still works either way.
        </p>
      )}

      {data?.profile_complete && (
        <div className="analytics-hero-stat">
          <div className="analytics-hero-icon"><Target size={22} /></div>
          <div>
            <span className="analytics-hero-value">{data.average_score}%</span>
            <span className="analytics-hero-label">Average match score across your current job feed</span>
          </div>
        </div>
      )}

      <div className="analytics-charts-grid">
        <div className="analytics-chart-card">
          <div className="analytics-chart-card-header">
            <div className="analytics-chart-icon"><TrendingUp size={18} /></div>
            <div>
              <h3>Match Score Distribution</h3>
              <p className="analytics-chart-subtitle">How your current matching jobs score, bucketed</p>
            </div>
          </div>
          <BarChart
            data={scoreDistribution}
            colors={SCORE_COLORS}
            emptyMessage={data?.profile_complete ? 'No matching jobs right now.' : 'Set up your profile or CV to see match scores.'}
          />
        </div>

        <div className="analytics-chart-card">
          <div className="analytics-chart-card-header">
            <div className="analytics-chart-icon"><Zap size={18} /></div>
            <div>
              <h3>Top Skills in Demand</h3>
              <p className="analytics-chart-subtitle">Most frequent skills across your matching jobs</p>
            </div>
          </div>
          <HorizontalBarList
            data={topSkills}
            emptyMessage={data?.profile_complete ? 'No skills found in your current matches yet.' : 'Set up your profile or CV to see this.'}
          />
        </div>

        <div className="analytics-chart-card">
          <div className="analytics-chart-card-header">
            <div className="analytics-chart-icon"><Layers size={18} /></div>
            <div>
              <h3>Seniority Mix of Your Matches</h3>
              <p className="analytics-chart-subtitle">Experience level of jobs matching your profile, intern to director</p>
            </div>
          </div>
          <DonutChart
            data={seniorityMix}
            colors={SENIORITY_COLORS}
            emptyMessage={data?.profile_complete ? 'No seniority data in your current matches yet.' : 'Set up your profile or CV to see this.'}
          />
        </div>
      </div>

      <div className="analytics-chart-card analytics-chart-card-wide">
        <div className="analytics-chart-card-header">
          <div className="analytics-chart-icon"><Bell size={18} /></div>
          <div>
            <h3>Alerts Sent (Last 14 Days)</h3>
            <p className="analytics-chart-subtitle">How many job alerts you've received per day</p>
          </div>
        </div>
        <LineChart
          data={alertsOverTime}
          emptyMessage="No alerts sent in the last 14 days."
        />
        {!hasAnyAlerts && data?.profile_complete && (
          <p className="analytics-chart-subtitle" style={{ marginTop: 8, marginBottom: 0 }}>
            Run the pipeline or wait for the next scheduled run to start receiving alerts.
          </p>
        )}
      </div>

      {hasMatchInput && (
        <div className="analytics-profile-summary">
          <h3>Your Profile Summary</h3>
          {dashboard?.match_source && (
            <div className="profile-summary-row">
              <span className="summary-label">Match Source</span>
              <span className="chip selected readonly">{dashboard.match_source}</span>
            </div>
          )}
          {(profile.skills?.length > 0 || profile.tech_stack?.length > 0) && (
            <div className="profile-summary-row">
              <span className="summary-label">Skills</span>
              <div className="chip-grid small">
                {(profile.skills || profile.tech_stack).map((t) => (
                  <span key={t} className="chip selected readonly">{t}</span>
                ))}
              </div>
            </div>
          )}
          {profile.roles?.length > 0 && (
            <div className="profile-summary-row">
              <span className="summary-label">Roles</span>
              <div className="chip-grid small">
                {profile.roles.map((r) => (
                  <span key={r} className="chip selected readonly">{r}</span>
                ))}
              </div>
            </div>
          )}
          {profile.experience_level && (
            <div className="profile-summary-row">
              <span className="summary-label">Experience</span>
              <span className="chip selected readonly">{profile.experience_level}</span>
            </div>
          )}
          {profile.location && (
            <div className="profile-summary-row">
              <span className="summary-label">Location</span>
              <span>{profile.location}</span>
            </div>
          )}
          {profile.job_type && (
            <div className="profile-summary-row">
              <span className="summary-label">Job Type</span>
              <span>{profile.job_type}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
