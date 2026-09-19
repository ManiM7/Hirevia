import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as notificationService from '../services/notificationService';

function timeAgo(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await notificationService.listNotifications({ limit: 50 });
        setNotifications(res.data.data);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  const handleClick = async (n) => {
    if (!n.read) {
      try {
        await notificationService.markNotificationRead(n._id);
        setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      } catch {
        // non-fatal
      }
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (notifications === undefined) return <div className="skeleton" style={{ height: 200 }} />;

  const connectionsBase = user.role === 'candidate' ? '/candidate/connections' : '/recruiter/connections';

  return (
    <div>
      <h1>Notifications</h1>

      {notifications.length === 0 ? (
        <div className="card">
          <p>No notifications yet.</p>
        </div>
      ) : (
        notifications.map((n) => {
          const target = n.metadata?.connectionId ? `${connectionsBase}/${n.metadata.connectionId}` : null;
          const content = (
            <div className={`card notification-row ${n.read ? '' : 'unread'}`}>
              <div style={{ flex: 1 }}>
                <strong>{n.title}</strong>
                <p style={{ margin: '4px 0 0' }}>{n.message}</p>
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>{timeAgo(n.createdAt)}</span>
            </div>
          );
          return target ? (
            <Link to={target} key={n._id} onClick={() => handleClick(n)} style={{ textDecoration: 'none', color: 'inherit' }}>
              {content}
            </Link>
          ) : (
            <div key={n._id} onClick={() => handleClick(n)}>
              {content}
            </div>
          );
        })
      )}
    </div>
  );
}
