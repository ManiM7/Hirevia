/**
 * Renders a candidate's real uploaded profile photo when one exists,
 * otherwise a clean letter-initial placeholder. `photoFilename` is the
 * bare filename stored on CandidateProfile.profilePhoto — served from the
 * backend's public /uploads/photos static route.
 */
export default function Avatar({ photoFilename, name, size = 44 }) {
  const initial = name?.trim()?.[0]?.toUpperCase() || '?';

  if (photoFilename) {
    return (
      <img
        src={`/uploads/photos/${photoFilename}`}
        alt={name ? `${name}'s profile photo` : 'Profile photo'}
        className="avatar-img"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>
      {initial}
    </div>
  );
}
