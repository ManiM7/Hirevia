import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from 'recharts';
import * as resumeService from '../../services/resumeService';

const DIFFICULTY_RANK = { Easy: 1, Medium: 2, Hard: 3, Expert: 4 };

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function CandidateProgress() {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await resumeService.getProgress();
        setData(res.data.data);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  const scoreSeries = useMemo(() => {
    if (!data) return [];
    return data.attempts.map((a, i) => ({
      name: formatDate(a.createdAt),
      attempt: i + 1,
      Score: a.result.totalScore,
      Accuracy: a.result.accuracy,
    }));
  }, [data]);

  const skillAverages = useMemo(() => {
    if (!data) return [];
    const totals = {};
    for (const a of data.attempts) {
      for (const [skill, score] of Object.entries(a.result.skillScores || {})) {
        totals[skill] = totals[skill] || { sum: 0, count: 0 };
        totals[skill].sum += score;
        totals[skill].count += 1;
      }
    }
    return Object.entries(totals)
      .map(([skill, { sum, count }]) => ({ skill, avgScore: Math.round(sum / count) }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [data]);

  const difficultyBySkill = useMemo(() => {
    if (!data) return {};
    const map = {};
    for (const a of data.attempts) {
      for (const [skill, state] of Object.entries(a.skillState || {})) {
        const rank = DIFFICULTY_RANK[state.highestDifficultyReached] || 0;
        if (!map[skill] || rank > DIFFICULTY_RANK[map[skill]]) {
          map[skill] = state.highestDifficultyReached;
        }
      }
    }
    return map;
  }, [data]);

  const weeklyActivity = useMemo(() => {
    if (!data) return [];
    const buckets = {};
    for (const a of data.attempts) {
      const d = new Date(a.createdAt);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      buckets[key] = (buckets[key] || 0) + 1;
    }
    return Object.entries(buckets)
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([week, count]) => ({ week: formatDate(week), Assessments: count }));
  }, [data]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (data === undefined) return <div className="skeleton" style={{ height: 300 }} />;

  if (data.attempts.length === 0) {
    return (
      <div className="card">
        <h2>No assessment history yet</h2>
        <p>Complete at least one skill assessment to see your progress here.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Progress</h1>

      <div className="card">
        <h3>Score &amp; accuracy over time</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={scoreSeries} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--chart-muted)" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} stroke="var(--chart-muted)" tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Score" stroke="var(--chart-series-1)" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Accuracy" stroke="var(--chart-series-2)" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2" style={{ marginTop: 24 }}>
        <div className="card">
          <h3>Skill-wise performance</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={skillAverages} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="skill" stroke="var(--chart-muted)" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis domain={[0, 100]} stroke="var(--chart-muted)" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="avgScore" name="Avg score" fill="var(--chart-series-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Weekly activity</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyActivity} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="week" stroke="var(--chart-muted)" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke="var(--chart-muted)" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="Assessments" fill="var(--chart-series-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Difficulty progression</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {Object.entries(difficultyBySkill).map(([skill, difficulty]) => (
            <div key={skill} className="difficulty-pill">
              <span>{skill}</span>
              <span className={`badge badge-${difficulty === 'Expert' ? 'success' : difficulty === 'Hard' ? 'warning' : 'neutral'}`}>
                {difficulty}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
