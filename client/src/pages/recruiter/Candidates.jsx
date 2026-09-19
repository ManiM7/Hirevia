import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as recruiterService from '../../services/recruiterService';
import Spinner from '../../components/Spinner';
import Avatar from '../../components/Avatar';

const emptyFilters = {
  skills: '',
  location: '',
  role: '',
  experienceMin: '',
  experienceMax: '',
  atsMin: '',
  assessmentMin: '',
};

export default function RecruiterCandidates() {
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const runSearch = async (filtersToUse, pageToUse) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: pageToUse, limit: 12 };
      Object.entries(filtersToUse).forEach(([k, v]) => {
        if (v !== '' && v != null) params[k] = v;
      });
      const res = await recruiterService.searchCandidates(params);
      setResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch(appliedFilters, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  return (
    <div>
      <h1>Find candidates</h1>

      <form className="card" onSubmit={handleSearch}>
        <div className="form-row">
          <div className="field">
            <label>Skills (comma-separated)</label>
            <input placeholder="node, react" value={filters.skills} onChange={update('skills')} />
          </div>
          <div className="field">
            <label>Location</label>
            <input value={filters.location} onChange={update('location')} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Role</label>
            <input value={filters.role} onChange={update('role')} />
          </div>
          <div className="field">
            <label>Experience (years)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="0" placeholder="Min" value={filters.experienceMin} onChange={update('experienceMin')} />
              <input type="number" min="0" placeholder="Max" value={filters.experienceMax} onChange={update('experienceMax')} />
            </div>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Minimum ATS score</label>
            <input type="number" min="0" max="100" value={filters.atsMin} onChange={update('atsMin')} />
          </div>
          <div className="field">
            <label>Minimum assessment score</label>
            <input type="number" min="0" max="100" value={filters.assessmentMin} onChange={update('assessmentMin')} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Search'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={handleReset}>
            Reset
          </button>
        </div>
      </form>

      {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}

      {result && (
        <>
          <p style={{ marginTop: 24 }}>{result.pagination.total} candidate(s) found</p>
          <div className="grid grid-cols-3">
            {result.data.map((c) => (
              <div className="card candidate-card" key={c._id}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Avatar photoFilename={c.profilePhoto} name={c.fullName} />
                  <div>
                    <strong>{c.fullName}</strong>
                    <p style={{ margin: 0 }}>{c.currentRole || 'Role not set'}</p>
                  </div>
                </div>
                <p style={{ margin: '8px 0' }}>
                  {c.location} · {c.yearsOfExperience} yrs exp
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {(c.skills || []).slice(0, 5).map((s) => (
                    <span className="badge badge-neutral" key={s}>
                      {s}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, marginBottom: 12 }}>
                  <span>ATS: <strong>{c.atsScore ?? '—'}</strong></span>
                  <span>Assessment: <strong>{c.assessmentScore ?? '—'}</strong></span>
                  {c.platformMatch != null && <span>Match: <strong>{c.platformMatch}%</strong></span>}
                </div>
                <Link to={`/recruiter/candidates/${c._id}`} className="btn btn-secondary btn-sm">
                  View Profile
                </Link>
              </div>
            ))}
          </div>

          {result.pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {result.pagination.page} of {result.pagination.totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= result.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
