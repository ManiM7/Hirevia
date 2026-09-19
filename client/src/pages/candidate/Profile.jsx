import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import * as resumeService from '../../services/resumeService';
import Spinner from '../../components/Spinner';
import Avatar from '../../components/Avatar';

const EXPERIENCE_LEVELS = ['Fresher', '0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'];
const GENDERS = ['male', 'female', 'other'];

const FIELDS = [
  ['fullName', 'Full name'],
  ['mobile', 'Mobile number'],
  ['location', 'Location'],
  ['currentRole', 'Current role'],
  ['preferredRole', 'Preferred job role'],
  ['preferredLocation', 'Preferred location'],
  ['highestEducation', 'Highest education'],
  ['githubProfile', 'GitHub profile'],
  ['linkedinProfile', 'LinkedIn profile'],
];

export default function CandidateProfile() {
  const { refresh } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(undefined);
  const [form, setForm] = useState({});
  const [photo, setPhoto] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Revoke the local object URL whenever it changes or the page unmounts,
  // so selecting a new file (or navigating away) doesn't leak memory.
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPhoto(file);
    setPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  useEffect(() => {
    (async () => {
      const res = await resumeService.getProfile();
      setProfile(res.data.data);
      setForm(res.data.data);
    })();
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const formData = new FormData();
      for (const [key] of FIELDS) formData.append(key, form[key] || '');
      formData.append('experienceLevel', form.experienceLevel || 'Fresher');
      formData.append('yearsOfExperience', form.yearsOfExperience ?? 0);
      formData.append('gender', form.gender || '');
      formData.append('areaOfInterest', form.areaOfInterest || '');
      formData.append('careerObjective', form.careerObjective || '');
      if (photo) formData.append('profilePhoto', photo);

      const res = await resumeService.updateProfile(formData);
      setProfile(res.data.data);
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhoto(null);
      setPhotoPreviewUrl(null);
      toast.success('Profile updated');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (profile === undefined) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div>
      <h1>Profile</h1>
      <p>{profile.profileCompleteness}% complete</p>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label>Profile photo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="Selected profile preview" className="avatar-img" style={{ width: 64, height: 64 }} />
            ) : (
              <Avatar photoFilename={profile.profilePhoto} name={profile.fullName} size={64} />
            )}
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handlePhotoChange} />
          </div>
          <div className="hint">JPG, JPEG, PNG, or WEBP. Max size 2MB.</div>
        </div>

        <div className="form-row">
          {FIELDS.slice(0, 2).map(([key, label]) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <input value={form[key] || ''} onChange={update(key)} />
            </div>
          ))}
        </div>
        <div className="form-row">
          {FIELDS.slice(2, 4).map(([key, label]) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <input value={form[key] || ''} onChange={update(key)} />
            </div>
          ))}
        </div>
        <div className="form-row">
          {FIELDS.slice(4, 6).map(([key, label]) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <input value={form[key] || ''} onChange={update(key)} />
            </div>
          ))}
        </div>
        <div className="form-row">
          <div className="field">
            <label>Experience level</label>
            <select value={form.experienceLevel || 'Fresher'} onChange={update('experienceLevel')}>
              {EXPERIENCE_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Years of experience</label>
            <input type="number" min="0" max="60" value={form.yearsOfExperience ?? 0} onChange={update('yearsOfExperience')} />
          </div>
        </div>
        <div className="form-row">
          {FIELDS.slice(6, 8).map(([key, label]) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <input value={form[key] || ''} onChange={update(key)} />
            </div>
          ))}
        </div>

        <div className="form-row">
          <div className="field">
            <label>Gender</label>
            <select value={form.gender || ''} onChange={update('gender')}>
              <option value="">Not set</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </option>
              ))}
            </select>
            <div className="hint">Used only to pick an opposite-gender AI interviewer voice for the voice interview.</div>
          </div>
          <div className="field">
            <label>Area of interest</label>
            <input value={form.areaOfInterest || ''} onChange={update('areaOfInterest')} placeholder="e.g. Backend Development" />
          </div>
        </div>
        <div className="field">
          <label>Career objective</label>
          <textarea rows={2} value={form.careerObjective || ''} onChange={update('careerObjective')} />
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? <Spinner /> : 'Save changes'}
        </button>
      </form>

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
          <p>Skills are detected automatically from your resume.</p>
        )}
      </div>
    </div>
  );
}
