import { useEffect, useState } from 'react';
import * as resumeService from '../../services/resumeService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';

function ScoreRing({ score }) {
  const color = score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
  return (
    <div className="score-ring" style={{ '--ring-color': color }}>
      <span className="score-ring-value">{score}</span>
      <span className="score-ring-max">/100</span>
    </div>
  );
}

export default function CandidateResume() {
  const { refresh } = useAuth();
  const toast = useToast();
  const [resume, setResume] = useState(undefined);
  const [ats, setAts] = useState(undefined);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [r, a] = await Promise.all([resumeService.getResume(), resumeService.getAts()]);
      setResume(r.data.data);
      setAts(a.data.data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      await resumeService.uploadResume(file);
      toast.success('Resume uploaded successfully');
      setAts(null);
      await load();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAnalyze = async () => {
    setError('');
    setAnalyzing(true);
    try {
      const res = await resumeService.analyzeResume();
      setAts(res.data.data);
      toast.success(`ATS analysis complete — score ${res.data.data.totalScore}/100`);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (resume === undefined) return <div className="skeleton" style={{ height: 200 }} />;

  return (
    <div>
      <h1>Resume &amp; ATS Analysis</h1>
      <p>Upload a PDF or DOCX resume to get a real, measurable ATS score and skill detection.</p>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Resume</h3>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            {uploading ? <Spinner dark /> : resume ? 'Replace resume' : 'Upload resume'}
            <input type="file" accept=".pdf,.docx" hidden onChange={handleFile} disabled={uploading} />
          </label>
        </div>
        {resume ? (
          <div>
            <p>
              <strong>{resume.originalFilename}</strong> ({resume.fileType.toUpperCase()})
            </p>
            {resume.parsed?.skills?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {resume.parsed.skills.map((s) => (
                  <span className="badge" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p>No resume uploaded yet. Accepted formats: PDF, DOCX.</p>
        )}
      </div>

      {resume && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>ATS Analysis</h3>
            <button className="btn btn-primary btn-sm" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? <Spinner /> : ats ? 'Re-analyze' : 'Analyze Resume'}
            </button>
          </div>

          {!ats && <p>Run the analysis to see your ATS score, section breakdown, and recommendations.</p>}

          {ats && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <ScoreRing score={ats.totalScore} />
                <div>
                  {ats.totalScore < 80 ? (
                    <p style={{ margin: 0 }}>Your resume can be improved. See the weak areas below.</p>
                  ) : (
                    <p style={{ margin: 0 }}>Strong resume — see the breakdown below.</p>
                  )}
                </div>
              </div>

              <h4 style={{ marginTop: 24 }}>Section breakdown</h4>
              <div className="section-score-grid">
                {Object.entries(ats.sectionScores).map(([key, { score, max }]) => (
                  <div className="section-score-item" key={key}>
                    <div className="section-score-label">{key}</div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${(score / max) * 100}%` }} />
                    </div>
                    <div className="section-score-value">
                      {score}/{max}
                    </div>
                  </div>
                ))}
              </div>

              {ats.weaknesses.length > 0 && (
                <>
                  <h4 style={{ marginTop: 24 }}>Needs improvement</h4>
                  <ul className="bullet-list">
                    {ats.weaknesses.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </>
              )}

              {ats.recommendations.length > 0 && (
                <>
                  <h4 style={{ marginTop: 24 }}>Recommendations</h4>
                  <ul className="bullet-list">
                    {ats.recommendations.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
