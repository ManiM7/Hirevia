import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as assessmentService from '../../services/assessmentService';
import Spinner from '../../components/Spinner';

export default function AssessmentStart() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    setError('');
    setStarting(true);
    try {
      // Always test every skill detected from the resume (plus whatever
      // the backend adds from area of interest / career objective /
      // certifications, and Aptitude) — no manual subset selection.
      const res = await assessmentService.startAssessment(profile.skills);
      navigate(`/candidate/assessment/${res.data.data.attemptId}`, { state: { firstQuestion: res.data.data } });
    } catch (err) {
      if (err.status === 409 && err.details?.attemptId) {
        navigate(`/candidate/assessment/${err.details.attemptId}`);
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
        <p>Upload and analyze your resume first so we know which skills to test.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Start a skill assessment</h1>
      <p>
        Questions are generated from every skill detected on your resume, plus your area of interest, career
        objective, and certifications, and an Aptitude section. Difficulty adapts as you answer — correct answers
        raise the bar, incorrect ones hold steady until you find your level.
      </p>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>You&apos;ll be tested on</h3>
        <div className="skill-picker">
          {profile.skills.map((skill) => (
            <span className="skill-chip selected" key={skill} style={{ cursor: 'default' }}>
              {skill}
            </span>
          ))}
          <span className="skill-chip selected" style={{ cursor: 'default' }}>
            Aptitude
          </span>
        </div>

        <div className="alert alert-info" style={{ marginTop: 16 }}>
          Once started, you cannot go back to a previous question, and the test runs in fullscreen with tab/window
          monitoring. Leaving the test twice will end it automatically.
        </div>

        <button className="btn btn-primary" onClick={handleStart} disabled={starting}>
          {starting ? <Spinner /> : 'Start Assessment'}
        </button>
      </div>
    </div>
  );
}
