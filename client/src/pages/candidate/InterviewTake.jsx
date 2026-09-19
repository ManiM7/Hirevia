import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as interviewService from '../../services/interviewService';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import useSpeechSynthesis from '../../hooks/useSpeechSynthesis';
import Spinner from '../../components/Spinner';

export default function InterviewTake() {
  const { id: attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(location.state?.firstQuestion?.question || null);
  const [aiVoiceGender, setAiVoiceGender] = useState(location.state?.firstQuestion?.aiVoiceGender || 'female');
  const [loading, setLoading] = useState(!question);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editableAnswer, setEditableAnswer] = useState('');
  const [hasSpoken, setHasSpoken] = useState(false);
  const recordStartRef = useRef(null);

  const stt = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  const speakQuestion = useCallback(
    (text, gender) => {
      setHasSpoken(false);
      tts.speak(text, gender, { onEnd: () => setHasSpoken(true) });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tts.speak]
  );

  useEffect(() => {
    if (!question) return;
    speakQuestion(question.questionText, aiVoiceGender);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.questionText]);

  useEffect(() => {
    if (question) return;
    (async () => {
      setLoading(true);
      try {
        const res = await interviewService.getQuestion(attemptId);
        setQuestion(res.data.data);
        setAiVoiceGender(res.data.data.aiVoiceGender);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId, question]);

  useEffect(() => {
    setEditableAnswer(stt.transcript);
  }, [stt.transcript]);

  const handleStartRecording = () => {
    recordStartRef.current = Date.now();
    stt.reset();
    setEditableAnswer('');
    stt.start();
  };

  const handleStopRecording = () => {
    stt.stop();
  };

  const handleSubmit = async () => {
    if (!editableAnswer.trim()) return;
    setSubmitting(true);
    setError('');
    tts.cancel();
    const answerTimeMs = recordStartRef.current ? Date.now() - recordStartRef.current : null;
    try {
      const res = await interviewService.submitAnswer(attemptId, editableAnswer.trim(), answerTimeMs);
      if (res.data.data.finished) {
        navigate(`/candidate/interview/${attemptId}/result`, { replace: true });
        return;
      }
      setEditableAnswer('');
      stt.reset();
      setQuestion(res.data.data.question);
    } catch (err) {
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

  return (
    <div className="test-shell">
      <div className="test-topbar">
        <span className="badge">{question.isFollowUp ? 'Follow-up' : question.topic}</span>
        <span>
          Question {question.questionNumber} of {question.totalQuestions}
        </span>
      </div>

      <div className="progress-bar" style={{ marginBottom: 24 }}>
        <div className="progress-bar-fill" style={{ width: `${(question.questionNumber / question.totalQuestions) * 100}%` }} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!stt.supported && (
        <div className="alert alert-warning">
          Speech recognition isn&apos;t supported in this browser — type your answer below instead.
        </div>
      )}
      {stt.error && <div className="alert alert-error">{stt.error}</div>}

      <div className="card test-question-card">
        <div className="interview-ai-indicator">
          <span className={`interview-ai-dot ${tts.speaking ? 'speaking' : ''}`} />
          {tts.speaking ? `AI interviewer (${aiVoiceGender} voice) is speaking...` : 'AI interviewer'}
        </div>

        <p className="test-question-text">{question.questionText}</p>

        <button className="btn btn-secondary btn-sm" onClick={() => speakQuestion(question.questionText, aiVoiceGender)} disabled={tts.speaking}>
          Replay question
        </button>

        <div className="interview-answer-block">
          <label>Your answer{stt.listening ? ' (listening...)' : ''}</label>
          <textarea
            rows={5}
            value={editableAnswer + (stt.listening && stt.interimTranscript ? ` ${stt.interimTranscript}` : '')}
            onChange={(e) => setEditableAnswer(e.target.value)}
            placeholder={stt.supported ? 'Click "Start speaking" and answer out loud, or type here.' : 'Type your answer here.'}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {stt.supported && !stt.listening && (
            <button className="btn btn-secondary" onClick={handleStartRecording} disabled={!hasSpoken || submitting}>
              🎤 Start speaking
            </button>
          )}
          {stt.supported && stt.listening && (
            <button className="btn btn-danger" onClick={handleStopRecording}>
              ⏹ Stop
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!editableAnswer.trim() || submitting || stt.listening}>
            {submitting ? <Spinner /> : 'Submit Answer'}
          </button>
        </div>
      </div>
    </div>
  );
}
