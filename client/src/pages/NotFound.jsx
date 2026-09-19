import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="auth-shell">
      <div className="card" style={{ textAlign: 'center', maxWidth: 420 }}>
        <h2>Page not found</h2>
        <p>The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/" className="btn btn-primary">
          Go home
        </Link>
      </div>
    </div>
  );
}
