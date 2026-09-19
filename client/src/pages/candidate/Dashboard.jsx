import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as connectionService from '../../services/connectionService';
import { formatSlot } from '../../utils/connectionStatus';

export default function CandidateDashboard() {
  const { user, profile } = useAuth();
  const [upcoming, setUpcoming] = useState(undefined);

  useEffect(() => {
    (async () => {
      try {
        const res = await connectionService.listConnections('scheduled');
        setUpcoming(res.data.data);
      } catch {
        setUpcoming([]);
      }
    })();
  }, []);

  if (!profile) {
    return <div className="skeleton" style={{ height: 200 }} />;
  }

  return (
    <div>
      <h1>Welcome back{profile.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}</h1>
      <p>Here&apos;s where your profile, resume, and assessments stand today.</p>

      <div className="grid grid-cols-3">
        <div className="card">
          <h3>Profile</h3>
          <p style={{ marginBottom: 4 }}>Completeness</p>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${profile.profileCompleteness}%` }} />
          </div>
          <p style={{ marginTop: 8 }}>{profile.profileCompleteness}% complete</p>
          <Link to="/candidate/profile" className="btn btn-secondary btn-sm">
            Edit profile
          </Link>
        </div>

        <div className="card">
          <h3>Resume &amp; ATS</h3>
          {profile.resume ? (
            <>
              <p>Resume uploaded.</p>
              <p>
                ATS Score: <strong>{profile.atsScore != null ? `${profile.atsScore}/100` : 'Not analyzed yet'}</strong>
              </p>
            </>
          ) : (
            <p>No resume uploaded yet.</p>
          )}
          <Link to="/candidate/resume" className="btn btn-secondary btn-sm">
            {profile.resume ? 'View resume' : 'Upload resume'}
          </Link>
        </div>

        <div className="card">
          <h3>Assessments</h3>
          {profile.assessmentStats?.testsCompleted > 0 ? (
            <>
              <p>Completed: {profile.assessmentStats.testsCompleted}</p>
              <p>Average score: {profile.assessmentStats.averageScore}%</p>
            </>
          ) : (
            <p>No assessments taken yet.</p>
          )}
          <Link to="/candidate/assessment" className="btn btn-secondary btn-sm">
            {profile.assessmentStats?.testsCompleted > 0 ? 'Take another test' : 'Start assessment'}
          </Link>
        </div>

        <div className="card">
          <h3>AI Voice Interview</h3>
          {profile.interviewScore != null ? (
            <p>Latest score: {profile.interviewScore}%</p>
          ) : (
            <p>No AI voice interview completed yet.</p>
          )}
          <Link to="/candidate/interview" className="btn btn-secondary btn-sm">
            {profile.interviewScore != null ? 'Retake interview' : 'Start interview'}
          </Link>
        </div>
      </div>

      {upcoming?.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3>Upcoming Interviews</h3>
          {upcoming.map((c) => (
            <Link to={`/candidate/connections/${c._id}`} key={c._id} className="result-skill-row" style={{ display: 'flex' }}>
              <span>
                {c.company?.name || c.recruiter?.fullName} — {formatSlot(c.selectedSlot)}
              </span>
              <span className="badge badge-success">Scheduled</span>
            </Link>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Skills</h3>
        {profile.skills?.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {profile.skills.map((s) => (
              <span className="badge" key={s}>
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p>Skills will appear here automatically once you upload and analyze your resume.</p>
        )}
      </div>
    </div>
  );
}
