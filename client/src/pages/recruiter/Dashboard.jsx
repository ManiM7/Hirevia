import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as connectionService from '../../services/connectionService';
import { formatSlot } from '../../utils/connectionStatus';

export default function RecruiterDashboard() {
  const { profile } = useAuth();
  const [scheduled, setScheduled] = useState(undefined);

  useEffect(() => {
    (async () => {
      try {
        const res = await connectionService.listConnections('scheduled');
        setScheduled(res.data.data);
      } catch {
        setScheduled([]);
      }
    })();
  }, []);

  return (
    <div>
      <h1>Welcome back{profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}</h1>
      <p>Search verified candidates by skill, experience, ATS score, and assessment performance.</p>

      <div className="grid grid-cols-2">
        <div className="card">
          <h3>Company</h3>
          {profile?.company ? (
            <>
              <p>{profile.company.name}</p>
              <p>
                {profile.company.type} · {profile.company.location || 'Location not set'}
              </p>
            </>
          ) : (
            <p>No company profile yet.</p>
          )}
          <Link to="/recruiter/company" className="btn btn-secondary btn-sm">
            Manage company
          </Link>
        </div>

        <div className="card">
          <h3>Find candidates</h3>
          <p>Search by skill, technology, role, location, experience, ATS score, and assessment score.</p>
          <Link to="/recruiter/candidates" className="btn btn-primary btn-sm">
            Search candidates
          </Link>
        </div>
      </div>

      {scheduled?.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3>Scheduled Interviews</h3>
          {scheduled.map((c) => (
            <Link to={`/recruiter/connections/${c._id}`} key={c._id} className="result-skill-row" style={{ display: 'flex' }}>
              <span>
                {c.candidate?.fullName} — {formatSlot(c.selectedSlot)}
              </span>
              <span className="badge badge-success">Scheduled</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
