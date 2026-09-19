import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as assessmentService from '../../services/assessmentService';
import useTestIntegrity from '../../hooks/useTestIntegrity';
import Spinner from '../../components/Spinner';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AssessmentTake() {
  const { id: attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(location.state?.firstQuestion?.question || null);
  const [totalQuestions, setTotalQuestions] = useState(location.state?.firstQuestion?.totalQuestions || null);
  const [deadline, setDeadline] = useState(null);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(!question);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const finishingRef = useRef(false);

  const goToResult = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    navigate(`/candidate/assessment/${attemptId}/result`, { replace: true });
  }, [attemptId, navigate]);

  const { warning, dismissWarning } = useTestIntegrity(attemptId, {
    active: !finished,
    onTerminated: goToResult,
  });

  useEffect(() => {
    if (question) return;
    (async () => {
      setLoading(true);
      try {
        const res = await assessmentService.getQuestion(attemptId);
        setQuestion(res.data.data);
        setTotalQuestions(res.data.data.totalQuestions);
        if (res.data.data.timeRemainingSeconds != null) {
          setDeadline(Date.now() + res.data.data.timeRemainingSeconds * 1000);
        }
      } catch (err) {
        if (err.status === 410 || err.status === 409) {
          goToResult();
          return;
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId, question, goToResult]);

  useEffect(() => {
    if (!location.state?.firstQuestion) return;
    setDeadline(Date.now() + location.state.firstQuestion.timeLimitSeconds * 1000);
  }, [location.state]);

  useEffect(() => {
    if (!deadline) return undefined;
    const tick = () => {
      const secs = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(secs);
      if (secs === 0) goToResult();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline, goToResult]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await assessmentService.submitAnswer(attemptId, selected);
      if (res.data.data.finished) {
        setFinished(true);
        goToResult();
        return;
      }
      setQuestion(res.data.data.question);
      setSelected('');
    } catch (err) {
      if (err.status === 410 || err.status === 409) {
        goToResult();
        return;
      }
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !question) {
    return (
      <div className="test-shell">
        <Spinner dark size={28} />
      </div>
    );
  }

  const questionNumber = question.questionNumber;

  return (
    <div className="test-shell">
      {warning && (
        <div className="test-warning-banner" onClick={dismissWarning}>
          Warning {warning.count}/{warning.max}: Please remain on the assessment page. Leaving again will end your
          test.
        </div>
      )}

      <div className="test-topbar">
        <div>
          <span className="badge">{question.skill}</span>{' '}
          <span className="badge badge-neutral">{question.difficulty}</span>
        </div>
        <div className="test-timer">{remaining != null ? formatTime(remaining) : '--:--'}</div>
        <div>
          Question {questionNumber} of {totalQuestions}
        </div>
      </div>

      <div className="progress-bar" style={{ marginBottom: 24 }}>
        <div className="progress-bar-fill" style={{ width: `${(questionNumber / totalQuestions) * 100}%` }} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card test-question-card">
        <p className="test-question-text">{question.question}</p>

        {question.codeSnippet && (
          <pre className="test-code-block">
            <code>{question.codeSnippet}</code>
          </pre>
        )}

        <div className="test-options">
          {question.options?.map((opt, idx) => (
            <label key={idx} className={`test-option ${selected === opt ? 'selected' : ''}`}>
              <input
                type="radio"
                name="answer"
                value={opt}
                checked={selected === opt}
                onChange={() => setSelected(opt)}
                hidden
              />
              {opt}
            </label>
          ))}
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={!selected || submitting}>
          {submitting ? <Spinner /> : questionNumber === totalQuestions ? 'Submit & Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
