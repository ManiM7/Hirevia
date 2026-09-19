import { useEffect, useState } from 'react';
import * as adminService from '../../services/adminService';

export default function AdminAssessments() {
  const [attempts, setAttempts] = useState(undefined);
  const [showSuspiciousOnly, setShowSuspiciousOnly] = useState(true);

  useEffect(() => {
    (async () => {
      const res = showSuspiciousOnly
        ? await adminService.listSuspiciousAssessments()
        : await adminService.listAssessments({ limit: 100 });
      setAttempts(showSuspiciousOnly ? res.data.data : res.data.data);
    })();
  }, [showSuspiciousOnly]);

  return (
    <div>
      <h1>Assessment review</h1>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13 }}>
        <input type="checkbox" checked={showSuspiciousOnly} onChange={(e) => setShowSuspiciousOnly(e.target.checked)} />
        Show only flagged (terminated or with violations)
      </label>

      {attempts === undefined ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : attempts.length === 0 ? (
        <p>No assessments to review.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Skills</th>
                <th>Status</th>
                <th>Score</th>
                <th>Warnings</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a._id}>
                  <td data-label="Candidate">{a.candidate?.fullName || 'Unknown'}</td>
                  <td data-label="Skills">{a.skills?.join(', ')}</td>
                  <td data-label="Status">
                    <span className={`badge ${a.status === 'terminated' ? 'badge-danger' : a.status === 'completed' ? 'badge-success' : 'badge-neutral'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td data-label="Score">{a.result?.totalScore ?? '—'}</td>
                  <td data-label="Warnings">{a.violations?.warnings ?? 0}</td>
                  <td data-label="Date">{new Date(a.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
