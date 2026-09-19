import { useEffect, useState } from 'react';
import * as recruiterService from '../../services/recruiterService';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';

const COMPANY_TYPES = ['MNC', 'Startup', 'Product Company', 'Service Company', 'Other'];

export default function RecruiterCompany() {
  const toast = useToast();
  const [company, setCompany] = useState(undefined);
  const [form, setForm] = useState({});
  const [logo, setLogo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await recruiterService.getMyCompany();
        setCompany(res.data.data);
        setForm(res.data.data);
      } catch {
        setCompany(null);
      }
    })();
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const formData = new FormData();
      ['name', 'website', 'type', 'location', 'description'].forEach((k) => formData.append(k, form[k] || ''));
      if (logo) formData.append('companyLogo', logo);
      const res = await recruiterService.updateMyCompany(formData);
      setCompany(res.data.data);
      toast.success('Company profile updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (company === undefined) return <div className="skeleton" style={{ height: 200 }} />;
  if (company === null) return <div className="alert alert-error">No company profile found for your account.</div>;

  return (
    <div>
      <h1>Company profile</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label>Company logo</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
        </div>
        <div className="form-row">
          <div className="field">
            <label>Company name</label>
            <input required value={form.name || ''} onChange={update('name')} />
          </div>
          <div className="field">
            <label>Company type</label>
            <select value={form.type || 'Startup'} onChange={update('type')}>
              {COMPANY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Website</label>
            <input value={form.website || ''} onChange={update('website')} />
          </div>
          <div className="field">
            <label>Location</label>
            <input value={form.location || ''} onChange={update('location')} />
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea rows={4} value={form.description || ''} onChange={update('description')} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? <Spinner /> : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
