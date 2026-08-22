import { useState, useEffect, useCallback } from 'react';
import { getAnalytics } from '../../services/api';
import { RefreshCw } from 'lucide-react';
import BarChart from '../../components/charts/BarChart';
import HorizontalBarList from '../../components/charts/HorizontalBarList';

const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

const SENIORITY_COLORS = [
  'var(--chart-ordinal-1)',
  'var(--chart-ordinal-2)',
  'var(--chart-ordinal-3)',
  'var(--chart-ordinal-4)',
  'var(--chart-ordinal-5)',
  'var(--chart-ordinal-6)',
  'var(--chart-ordinal-7)',
];

function formatAlertDate(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Analytics({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    getAnalytics()
      .then((d) => {
        setData(d);
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
          <span className="analytics-hero-value">{data.average_score}%</span>
          <span className="analytics-hero-label">Average match score across your current job feed</span>
        </div>
      )}

      <div className="analytics-charts-grid">
        <div className="analytics-chart-card">
          <h3>Match Score Distribution</h3>
          <p className="analytics-chart-subtitle">How your current matching jobs score, bucketed</p>
          <BarChart
            data={scoreDistribution}
            emptyMessage={data?.profile_complete ? 'No matching jobs right now.' : 'Set up your profile or CV to see match scores.'}
          />
        </div>

        <div className="analytics-chart-card">
          <h3>Top Skills in Demand</h3>
          <p className="analytics-chart-subtitle">Most frequent skills across your matching jobs</p>
          <HorizontalBarList
            data={topSkills}
            emptyMessage={data?.profile_complete ? 'No skills found in your current matches yet.' : 'Set up your profile or CV to see this.'}
          />
        </div>

        <div className="analytics-chart-card">
          <h3>Seniority Mix of Your Matches</h3>
          <p className="analytics-chart-subtitle">Experience level of jobs matching your profile, intern to director</p>
          <HorizontalBarList
            data={seniorityMix}
            colors={SENIORITY_COLORS}
            emptyMessage={data?.profile_complete ? 'No seniority data in your current matches yet.' : 'Set up your profile or CV to see this.'}
          />
        </div>

        <div className="analytics-chart-card">
          <h3>Alerts Sent (Last 14 Days)</h3>
          <p className="analytics-chart-subtitle">How many job alerts you've received per day</p>
          <BarChart
            data={alertsOverTime}
            emptyMessage="No alerts sent in the last 14 days."
          />
          {!hasAnyAlerts && data?.profile_complete && (
            <p className="analytics-chart-subtitle" style={{ marginTop: 8, marginBottom: 0 }}>
              Run the pipeline or wait for the next scheduled run to start receiving alerts.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
