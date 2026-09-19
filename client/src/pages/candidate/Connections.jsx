import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as connectionService from '../../services/connectionService';
import Avatar from '../../components/Avatar';
import { STATUS_LABELS, STATUS_BADGE_CLASS, formatSlot } from '../../utils/connectionStatus';

export default function CandidateConnections() {
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
      <h1>Recruiter Connections</h1>
      <p>Interview connection requests from recruiters, and your scheduled interviews.</p>

      {connections.length === 0 ? (
        <div className="card">
          <p>No connection requests yet. When a recruiter connects with you, it will appear here.</p>
        </div>
      ) : (
        connections.map((c) => (
          <Link to={`/candidate/connections/${c._id}`} key={c._id} className="card connection-row">
            <Avatar photoFilename={c.company?.logo} name={c.company?.name || c.recruiter?.fullName} size={44} kind="logo" />
            <div style={{ flex: 1 }}>
              <strong>{c.company?.name || c.recruiter?.fullName}</strong>
              <p style={{ margin: 0 }}>
                {c.recruiter?.fullName}
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
