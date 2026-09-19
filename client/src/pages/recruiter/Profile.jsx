import { useEffect, useState } from 'react';
import * as recruiterService from '../../services/recruiterService';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';

export default function RecruiterProfilePage() {
  const toast = useToast();
  const [form, setForm] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await recruiterService.getMyProfile();
      setForm(res.data.data);
    })();
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await recruiterService.updateMyProfile({ fullName: form.fullName, phone: form.phone });
      setForm(res.data.data);
      toast.success('Profile updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (form === undefined) return <div className="skeleton" style={{ height: 200 }} />;

  return (
    <div>
      <h1>Your profile</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="field">
            <label>Full name</label>
            <input required value={form.fullName || ''} onChange={update('fullName')} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input required value={form.phone || ''} onChange={update('phone')} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? <Spinner /> : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
