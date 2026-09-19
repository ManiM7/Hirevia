import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as interviewService from '../../services/interviewService';
import Spinner from '../../components/Spinner';

export default function InterviewStart() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const supported = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const handleStart = async () => {
    setError('');
    setStarting(true);
    try {
      const res = await interviewService.startInterview(location.state?.sourceAssessmentAttemptId);
      navigate(`/candidate/interview/${res.data.data.attemptId}`, { state: { firstQuestion: res.data.data } });
    } catch (err) {
      if (err.status === 409 && err.details?.attemptId) {
        navigate(`/candidate/interview/${err.details.attemptId}`);
        return;
      }
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  if (!profile?.skills || profile.skills.length === 0) {
    return (
      <div className="card">
        <h2>No skills detected yet</h2>
        <p>Upload and analyze your resume first so we can personalize your interview questions.</p>
      </div>
    );
  }

  if (!profile.gender) {
    return (
      <div className="card">
        <h2>Set your gender first</h2>
        <p>
          The AI interviewer voice is chosen to be the opposite of your own gender, and we only ever use what you
          set in your profile — never a guess. Set it once and you&apos;re ready to go.
        </p>
        <Link to="/candidate/profile" className="btn btn-primary">
          Go to profile
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1>AI Voice Interview</h1>
      <p>
        Questions are generated from your real skills, area of interest, career objective, certifications, and
        experience — including live follow-ups based on what you actually say. Answer out loud using your
        microphone.
      </p>

      {!supported && (
        <div className="alert alert-warning">
          Your browser doesn&apos;t support speech recognition. Please use Chrome or Edge for the voice interview.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>Before you start</h3>
        <ul className="bullet-list">
          <li>Make sure your microphone is enabled and you&apos;re in a quiet environment.</li>
          <li>
            The AI interviewer voice will be {profile.gender === 'male' ? 'a female' : 'a male'} voice, matched to
            your profile.
          </li>
          <li>You&apos;ll speak your answer, then confirm the transcript before submitting.</li>
          <li>Questions never repeat across your past attempts.</li>
        </ul>
        <button className="btn btn-primary" onClick={handleStart} disabled={starting || !supported}>
          {starting ? <Spinner /> : 'Start Interview'}
        </button>
      </div>
    </div>
  );
}
