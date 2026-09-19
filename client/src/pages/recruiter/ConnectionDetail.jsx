import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as connectionService from '../../services/connectionService';
import { useToast } from '../../context/ToastContext';
import Avatar from '../../components/Avatar';
import Spinner from '../../components/Spinner';
import { STATUS_LABELS, STATUS_BADGE_CLASS, formatSlot } from '../../utils/connectionStatus';

export default function RecruiterConnectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [connection, setConnection] = useState(undefined);
  const [error, setError] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const res = await connectionService.getConnection(id);
      setConnection(res.data.data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!selectedSlotId) return;
    setError('');
    setSubmitting(true);
    try {
      await connectionService.scheduleInterview(id, selectedSlotId, title);
      toast.success('Interview scheduled');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      await connectionService.cancelConnection(id, '');
      toast.success('Cancelled');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (error && connection === undefined) return <div className="alert alert-error">{error}</div>;
  if (connection === undefined) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <Avatar photoFilename={connection.candidate?.profilePhoto} name={connection.candidate?.fullName} size={56} />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>{connection.candidate?.fullName}</h1>
          <p style={{ margin: 0 }}>
            {connection.candidate?.currentRole || 'Role not set'}
            {connection.candidate?.location ? ` · ${connection.candidate.location}` : ''}
          </p>
        </div>
        <span className={`badge ${STATUS_BADGE_CLASS[connection.status]}`}>{STATUS_LABELS[connection.status]}</span>
      </div>

      <Link to={`/recruiter/candidates/${connection.candidate?._id}`} className="btn btn-secondary btn-sm" style={{ marginBottom: 16, display: 'inline-block' }}>
        View full candidate profile
      </Link>

      {error && <div className="alert alert-error">{error}</div>}

      {connection.status === 'pending' && (
        <div className="card">
          <h3>Waiting for candidate response</h3>
          <p>You&apos;ll be notified once {connection.candidate?.fullName} shares their availability.</p>
        </div>
      )}

      {connection.status === 'availability_submitted' && (
        <form className="card" onSubmit={handleSchedule}>
          <h3>Candidate&apos;s availability</h3>
          {connection.candidateMessage && <p>Message: {connection.candidateMessage}</p>}
          {connection.availabilitySlots.map((s) => (
            <label className={`slot-option ${selectedSlotId === s._id ? 'selected' : ''}`} key={s._id}>
              <input type="radio" name="slot" value={s._id} checked={selectedSlotId === s._id} onChange={(e) => setSelectedSlotId(e.target.value)} hidden />
              {formatSlot(s)}
            </label>
          ))}

          <div className="field" style={{ marginTop: 16 }}>
            <label>Interview title (optional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Interview: ${connection.candidate?.fullName}`} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={!selectedSlotId || submitting}>
              {submitting ? <Spinner /> : 'Schedule Interview'}
            </button>
            <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={submitting}>
              Cancel request
            </button>
          </div>
        </form>
      )}

      {connection.status === 'scheduled' && (
        <div className="meeting-box">
          <h3>Interview scheduled</h3>
          <p>
            <strong>{formatSlot(connection.selectedSlot)}</strong>
          </p>
          <p>{connection.meeting?.title}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <a href={connection.meeting?.meetingLink} target="_blank" rel="noreferrer" className="btn btn-primary">
              Join Interview
            </a>
            <button className="btn btn-secondary" onClick={handleCancel} disabled={submitting}>
              Cancel Interview
            </button>
          </div>
        </div>
      )}

      {connection.status === 'completed' && (
        <div className="card">
          <h3>Interview completed</h3>
          <p>{formatSlot(connection.selectedSlot)}</p>
        </div>
      )}

      {connection.status === 'cancelled' && (
        <div className="alert alert-error">
          This connection was cancelled by {connection.cancelledBy}.{connection.cancelReason ? ` Reason: ${connection.cancelReason}` : ''}
        </div>
      )}

      <button className="btn btn-secondary" style={{ marginTop: 24 }} onClick={() => navigate('/recruiter/connections')}>
        Back to connections
      </button>
    </div>
  );
}
