import { useEffect, useState } from 'react';
import * as adminService from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState(undefined);
  const [roleFilter, setRoleFilter] = useState('');

  const load = async () => {
    const res = await adminService.listUsers({ limit: 100, ...(roleFilter ? { role: roleFilter } : {}) });
    setUsers(res.data.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const toggleDisabled = async (u) => {
    try {
      await adminService.setUserDisabled(u._id, !u.isDisabled);
      toast.success(u.isDisabled ? 'User re-enabled' : 'User disabled');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <h1>Users</h1>
      <div className="field" style={{ maxWidth: 220 }}>
        <label>Filter by role</label>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All</option>
          <option value="candidate">Candidate</option>
          <option value="recruiter">Recruiter</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {users === undefined ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td data-label="Email">{u.email}</td>
                  <td data-label="Role">{u.role}</td>
                  <td data-label="Status">
                    <span className={`badge ${u.isDisabled ? 'badge-danger' : 'badge-success'}`}>
                      {u.isDisabled ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td data-label="Last login">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'}</td>
                  <td data-label="">
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleDisabled(u)}>
                      {u.isDisabled ? 'Enable' : 'Disable'}
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
