import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as interviewService from '../../services/interviewService';

const DIMENSIONS = [
  ['overallScore', 'Overall score'],
  ['technicalKnowledge', 'Technical knowledge'],
  ['communication', 'Communication'],
  ['answerRelevance', 'Answer relevance'],
  ['confidenceClarity', 'Confidence / clarity'],
];

export default function InterviewResult() {
  const { id: attemptId } = useParams();
  const [attempt, setAttempt] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await interviewService.getResult(attemptId);
        setAttempt(res.data.data);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [attemptId]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (attempt === undefined) return <div className="skeleton" style={{ height: 300 }} />;

  const { report, questions } = attempt;

  return (
    <div>
      <h1>Interview Report</h1>

      <div className="grid grid-cols-3">
        {DIMENSIONS.map(([key, label]) => (
          <div className="card" key={key}>
            <h3>{label}</h3>
            <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{report[key]}%</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Skills demonstrated</h3>
        {report.skillsDemonstrated?.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {report.skillsDemonstrated.map((s) => (
              <span className="badge" key={s}>
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p>No specific skills were clearly demonstrated in the answers.</p>
        )}
      </div>

      <div className="grid grid-cols-2" style={{ marginTop: 24 }}>
        <div className="card">
          <h3>Strengths</h3>
          {report.strengths?.length ? (
            <ul className="bullet-list">
              {report.strengths.map((s) => <li key={s}>{s}</li>)}
            </ul>
          ) : (
            <p>Not enough data to identify strengths yet.</p>
          )}
        </div>
        <div className="card">
          <h3>Weaknesses &amp; improvement suggestions</h3>
          {report.weaknesses?.length ? (
            <ul className="bullet-list">
              {report.weaknesses.map((w) => <li key={w}>{w}</li>)}
            </ul>
          ) : (
            <p>No significant weaknesses detected.</p>
          )}
          {report.improvementSuggestions?.length > 0 && (
            <ul className="bullet-list">
              {report.improvementSuggestions.map((s) => <li key={s}>{s}</li>)}
            </ul>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Transcript</h3>
        {questions.map((q, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>
              {q.isFollowUp && <span className="badge badge-neutral" style={{ marginRight: 6 }}>Follow-up</span>}
              {q.questionText}
            </p>
            <p style={{ margin: 0 }}>{q.answerText || <em>No answer recorded</em>}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <Link to="/candidate/dashboard" className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
