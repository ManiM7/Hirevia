export default function Spinner({ dark = false, size = 18 }) {
  return (
    <span
      className={`spinner ${dark ? 'spinner-dark' : ''}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
