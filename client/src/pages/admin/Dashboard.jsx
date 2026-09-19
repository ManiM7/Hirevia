import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as adminService from '../../services/adminService';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const [users, questions, suspicious, companies] = await Promise.all([
        adminService.listUsers({ limit: 1 }),
        adminService.listQuestions({ limit: 1 }),
        adminService.listSuspiciousAssessments(),
        adminService.listCompanies(),
      ]);
      setStats({
        users: users.data.pagination.total,
        questions: questions.data.pagination.total,
        suspicious: suspicious.data.data.length,
        companies: companies.data.data.length,
      });
    })();
  }, []);

  if (!stats) return <div className="skeleton" style={{ height: 150 }} />;

  return (
    <div>
      <h1>Admin</h1>
      <div className="grid grid-cols-4">
        <Link to="/admin/users" className="card">
          <h3>Users</h3>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{stats.users}</p>
        </Link>
        <Link to="/admin/questions" className="card">
          <h3>Questions</h3>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{stats.questions}</p>
        </Link>
        <Link to="/admin/assessments" className="card">
          <h3>Flagged assessments</h3>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{stats.suspicious}</p>
        </Link>
        <Link to="/admin/companies" className="card">
          <h3>Companies</h3>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{stats.companies}</p>
        </Link>
      </div>
    </div>
  );
}
