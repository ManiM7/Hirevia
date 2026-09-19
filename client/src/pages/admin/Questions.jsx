import { useEffect, useState } from 'react';
import * as adminService from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/Spinner';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert'];
const TYPES = ['mcq', 'code-output', 'debugging', 'conceptual'];

const emptyForm = {
  skill: '',
  type: 'mcq',
  difficulty: 'Easy',
  question: '',
  codeSnippet: '',
  options: '',
  correctAnswer: '',
  explanation: '',
};

export default function AdminQuestions() {
  const toast = useToast();
  const [questions, setQuestions] = useState(undefined);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [skillFilter, setSkillFilter] = useState('');

  const load = async () => {
    const res = await adminService.listQuestions({ limit: 100, ...(skillFilter ? { skill: skillFilter } : {}) });
    setQuestions(res.data.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillFilter]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await adminService.createQuestion({
        ...form,
        options: form.options.split(',').map((o) => o.trim()).filter(Boolean),
      });
      toast.success('Question created');
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (q) => {
    await adminService.updateQuestion(q._id, { isActive: !q.isActive });
    load();
  };

  const remove = async (q) => {
    await adminService.deleteQuestion(q._id);
    toast.success('Question deleted');
    load();
  };

  return (
    <div>
      <h1>Question bank</h1>

      <form className="card" onSubmit={handleSubmit}>
        <h3>Add question</h3>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-row">
          <div className="field">
            <label>Skill</label>
            <input required value={form.skill} onChange={update('skill')} placeholder="JavaScript" />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.type} onChange={update('type')}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Difficulty</label>
          <select value={form.difficulty} onChange={update('difficulty')}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Question</label>
          <textarea rows={2} required value={form.question} onChange={update('question')} />
        </div>
        <div className="field">
          <label>Code snippet (optional)</label>
          <textarea rows={3} value={form.codeSnippet} onChange={update('codeSnippet')} />
        </div>
        <div className="field">
          <label>Options (comma-separated)</label>
          <input required value={form.options} onChange={update('options')} placeholder="Option A, Option B, Option C" />
        </div>
        <div className="field">
          <label>Correct answer (must match one option exactly)</label>
          <input required value={form.correctAnswer} onChange={update('correctAnswer')} />
        </div>
        <div className="field">
          <label>Explanation</label>
          <textarea rows={2} value={form.explanation} onChange={update('explanation')} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? <Spinner /> : 'Add question'}
        </button>
      </form>

      <div className="field" style={{ maxWidth: 240, marginTop: 24 }}>
        <label>Filter by skill</label>
        <input value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} placeholder="e.g. React" />
      </div>

      {questions === undefined ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Difficulty</th>
                <th>Question</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q._id}>
                  <td data-label="Skill">{q.skill}</td>
                  <td data-label="Difficulty">{q.difficulty}</td>
                  <td data-label="Question" style={{ maxWidth: 320 }}>{q.question}</td>
                  <td data-label="Status">
                    <span className={`badge ${q.isActive ? 'badge-success' : 'badge-neutral'}`}>
                      {q.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td data-label="" style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(q)}>
                      {q.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(q)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
