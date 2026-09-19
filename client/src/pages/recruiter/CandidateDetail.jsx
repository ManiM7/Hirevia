import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as recruiterService from '../../services/recruiterService';
import { backendOrigin } from '../../services/api';
import * as connectionService from '../../services/connectionService';
import { useToast } from '../../context/ToastContext';
import Avatar from '../../components/Avatar';
import Spinner from '../../components/Spinner';

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RecruiterCandidateDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [data, setData] = useState(undefined);
  const [error, setError] = useState('');

  const [showConnectForm, setShowConnectForm] = useState(false);
  const [connectMessage, setConnectMessage] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [existingConnectionId, setExistingConnectionId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await recruiterService.getCandidate(id);
        setData(res.data.data);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [id]);

  const handleConnect = async (e) => {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await connectionService.createConnection(id, connectMessage);
      setExistingConnectionId(res.data.data._id);
      setShowConnectForm(false);
      toast.success('Connection request sent');
    } catch (err) {
      if (err.status === 409 && err.details?.connectionId) {
        setExistingConnectionId(err.details.connectionId);
        setShowConnectForm(false);
      } else {
        toast.error(err.message);
      }
    } finally {
      setConnecting(false);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (data === undefined) return <div className="skeleton" style={{ height: 300 }} />;

  const { profile, resume, atsAnalysis, assessmentHistory, latestInterview, summary } = data;

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar photoFilename={profile.profilePhoto} name={profile.fullName} size={64} />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>{profile.fullName}</h1>
          <p style={{ margin: 0 }}>
            {profile.currentRole || 'Role not set'} · {profile.location}
          </p>
        </div>
        {existingConnectionId ? (
          <Link to={`/recruiter/connections/${existingConnectionId}`} className="btn btn-secondary">
            View Connection
          </Link>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowConnectForm((s) => !s)}>
            Connect
          </button>
        )}
      </div>

      {showConnectForm && (
        <form className="card" style={{ marginTop: 16 }} onSubmit={handleConnect}>
          <div className="field">
            <label>Message to {profile.fullName} (optional)</label>
            <textarea
              rows={3}
              value={connectMessage}
              onChange={(e) => setConnectMessage(e.target.value)}
              placeholder="Introduce yourself and the role you have in mind..."
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={connecting}>
            {connecting ? <Spinner /> : 'Send Connection Request'}
          </button>
        </form>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Candidate Overview</h3>
        <p style={{ margin: 0 }}>{summary.text}</p>
      </div>

      <div className="grid grid-cols-2" style={{ marginTop: 24 }}>
        <div className="card">
          <h3>Basic information</h3>
          <dl className="detail-list">
            <div><dt>Experience</dt><dd>{profile.yearsOfExperience} years ({profile.experienceLevel})</dd></div>
            <div><dt>Preferred role</dt><dd>{profile.preferredRole || '—'}</dd></div>
            <div><dt>Preferred location</dt><dd>{profile.preferredLocation || '—'}</dd></div>
            <div><dt>Education</dt><dd>{profile.highestEducation || '—'}</dd></div>
            <div><dt>Profile completeness</dt><dd>{profile.profileCompleteness}%</dd></div>
            <div><dt>Last active</dt><dd>{formatDate(profile.lastActive)}</dd></div>
          </dl>
        </div>

        <div className="card">
          <h3>Skills</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(profile.skills || []).map((s) => (
              <span className="badge" key={s}>
                {s}
              </span>
            ))}
          </div>

          <h3 style={{ marginTop: 20 }}>Resume</h3>
          {resume ? (
            <a href={`${backendOrigin}/api/recruiters/candidates/${id}/resume/file`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
              View resume ({resume.fileType.toUpperCase()})
            </a>
          ) : (
            <p>No resume on file.</p>
          )}
        </div>
      </div>

      {atsAnalysis && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3>ATS Analysis — {atsAnalysis.totalScore}/100</h3>
          <div className="section-score-grid">
            {Object.entries(atsAnalysis.sectionScores).map(([key, { score, max }]) => (
              <div className="section-score-item" key={key}>
                <div className="section-score-label">{key}</div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${(score / max) * 100}%` }} />
                </div>
                <div className="section-score-value">{score}/{max}</div>
              </div>
            ))}
          </div>
          {atsAnalysis.weaknesses.length > 0 && (
            <>
              <h4 style={{ marginTop: 16 }}>Weak areas</h4>
              <ul className="bullet-list">
                {atsAnalysis.weaknesses.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {latestInterview && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3>AI Voice Interview — {latestInterview.report.overallScore}/100</h3>
          <div className="grid grid-cols-4">
            <div>
              <p style={{ marginBottom: 0 }}>Technical knowledge</p>
              <strong>{latestInterview.report.technicalKnowledge}%</strong>
            </div>
            <div>
              <p style={{ marginBottom: 0 }}>Communication</p>
              <strong>{latestInterview.report.communication}%</strong>
            </div>
            <div>
              <p style={{ marginBottom: 0 }}>Answer relevance</p>
              <strong>{latestInterview.report.answerRelevance}%</strong>
            </div>
            <div>
              <p style={{ marginBottom: 0 }}>Confidence / clarity</p>
              <strong>{latestInterview.report.confidenceClarity}%</strong>
            </div>
          </div>
          {latestInterview.report.strengths?.length > 0 && (
            <>
              <h4 style={{ marginTop: 16 }}>Strengths</h4>
              <ul className="bullet-list">
                {latestInterview.report.strengths.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </>
          )}
          {latestInterview.report.weaknesses?.length > 0 && (
            <>
              <h4 style={{ marginTop: 16 }}>Weaknesses</h4>
              <ul className="bullet-list">
                {latestInterview.report.weaknesses.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Assessment history</h3>
        {assessmentHistory.length === 0 ? (
          <p>No assessments completed yet.</p>
        ) : (
          assessmentHistory
            .slice()
            .reverse()
            .map((a) => (
              <div key={a._id} className="result-skill-row">
                <div>
                  <strong>{formatDate(a.createdAt)}</strong> — {a.skills.join(', ')}
                  {a.status === 'terminated' && <span className="badge badge-danger" style={{ marginLeft: 8 }}>Terminated</span>}
                </div>
                <div>{a.result.totalScore}%</div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
