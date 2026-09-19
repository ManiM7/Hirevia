import { useState } from 'react';
import * as authService from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';

export default function RecruiterSettings() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Password changed. Please log in again.');
      await logout();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Settings</h1>
      <div className="card">
        <h3>Account</h3>
        <p>Email: {user.email}</p>
      </div>
      <form className="card" style={{ marginTop: 24 }} onSubmit={handleSubmit}>
        <h3>Change password</h3>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="field">
          <label>Current password</label>
          <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="field">
          <label>New password</label>
          <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <div className="hint">At least 8 characters, with uppercase, lowercase, a number, and a special character.</div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? <Spinner /> : 'Change password'}
        </button>
      </form>
    </div>
  );
}
