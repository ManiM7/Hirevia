import { useEffect, useState } from 'react';
import * as adminService from '../../services/adminService';

export default function AdminCompanies() {
  const [companies, setCompanies] = useState(undefined);

  useEffect(() => {
    (async () => {
      const res = await adminService.listCompanies();
      setCompanies(res.data.data);
    })();
  }, []);

  if (companies === undefined) return <div className="skeleton" style={{ height: 200 }} />;

  return (
    <div>
      <h1>Companies</h1>
      <div className="grid grid-cols-3">
        {companies.map((c) => (
          <div className="card" key={c._id}>
            <h3>{c.name}</h3>
            <p>
              {c.type} · {c.location || 'Location not set'}
            </p>
            {c.website && <a href={c.website} target="_blank" rel="noreferrer">{c.website}</a>}
          </div>
        ))}
      </div>
    </div>
  );
}
