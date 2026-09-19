import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as connectionService from '../../services/connectionService';
import Avatar from '../../components/Avatar';
import { STATUS_LABELS, STATUS_BADGE_CLASS, formatSlot } from '../../utils/connectionStatus';

export default function RecruiterConnections() {
  const [connections, setConnections] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await connectionService.listConnections();
        setConnections(res.data.data);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (connections === undefined) return <div className="skeleton" style={{ height: 200 }} />;

  return (
    <div>
      <h1>Candidate Connections</h1>
      <p>Interview connection requests you've sent, and your scheduled interviews.</p>

      {connections.length === 0 ? (
        <div className="card">
          <p>No connection requests yet. Search candidates and click Connect on a profile to get started.</p>
        </div>
      ) : (
        connections.map((c) => (
          <Link to={`/recruiter/connections/${c._id}`} key={c._id} className="card connection-row">
            <Avatar photoFilename={c.candidate?.profilePhoto} name={c.candidate?.fullName} size={44} />
            <div style={{ flex: 1 }}>
              <strong>{c.candidate?.fullName}</strong>
              <p style={{ margin: 0 }}>
                {c.candidate?.currentRole || 'Role not set'}
                {c.status === 'scheduled' && c.selectedSlot?.date ? ` · ${formatSlot(c.selectedSlot)}` : ''}
              </p>
            </div>
            <span className={`badge ${STATUS_BADGE_CLASS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
          </Link>
        ))
      )}
    </div>
  );
}
