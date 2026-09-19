import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as assessmentService from '../../services/assessmentService';
import Spinner from '../../components/Spinner';

export default function AssessmentResult() {
  const { id: attemptId } = useParams();
  const [attempt, setAttempt] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await assessmentService.getResult(attemptId);
        setAttempt(res.data.data);
      } catch (err) {
        if (err.status === 409) {
          // Still in progress (e.g. page reloaded mid-test) — try to finish it.
          try {
            await assessmentService.finishAssessment(attemptId);
            const res = await assessmentService.getResult(attemptId);
            setAttempt(res.data.data);
            return;
          } catch (err2) {
            setError(err2.message);
            return;
          }
        }
        setError(err.message);
      }
    })();
  }, [attemptId]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (attempt === undefined) return <div className="skeleton" style={{ height: 300 }} />;

  const { result, status, terminationReason, violations, skills } = attempt;

  return (
    <div>
      <h1>Assessment Result</h1>

      {status === 'terminated' && (
        <div className="alert alert-error">
          This assessment was terminated: {terminationReason}. The result below reflects only the questions
          answered before termination.
        </div>
      )}

      <div className="grid grid-cols-3">
        <div className="card">
          <h3>Overall score</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {result.totalScore}%
          </p>
          <p>
            {result.correctCount} correct / {result.wrongCount} wrong
          </p>
        </div>
        <div className="card">
          <h3>Accuracy</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{result.accuracy}%</p>
        </div>
        <div className="card">
          <h3>Time taken</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {Math.floor(result.timeTakenSeconds / 60)}m {result.timeTakenSeconds % 60}s
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Skill-wise performance</h3>
        {skills.map((skill) => (
          <div className="result-skill-row" key={skill}>
            <span>{skill}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 200 }}>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${result.skillScores[skill] ?? 0}%` }} />
              </div>
              <strong>{result.skillScores[skill] ?? 0}%</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Test integrity</h3>
        <div className="grid grid-cols-4">
          <div>
            <p style={{ marginBottom: 0 }}>Warnings</p>
            <strong>{violations.warnings}</strong>
          </div>
          <div>
            <p style={{ marginBottom: 0 }}>Tab switches</p>
            <strong>{violations.tabSwitches}</strong>
          </div>
          <div>
            <p style={{ marginBottom: 0 }}>Window blur</p>
            <strong>{violations.windowBlur}</strong>
          </div>
          <div>
            <p style={{ marginBottom: 0 }}>Fullscreen exits</p>
            <strong>{violations.fullscreenExits}</strong>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/candidate/assessment" className="btn btn-secondary">
          Take another assessment
        </Link>
        <Link to="/candidate/interview" state={{ sourceAssessmentAttemptId: attemptId }} className="btn btn-primary">
          Start AI Voice Interview
        </Link>
        <Link to="/candidate/progress" className="btn btn-secondary">
          View progress
        </Link>
      </div>
    </div>
  );
}
