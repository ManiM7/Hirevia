import { backendOrigin } from '../services/api';

/**
 * Renders a real uploaded photo when one exists, otherwise a clean
 * letter-initial placeholder. `photoFilename` is the bare filename stored
 * on CandidateProfile.profilePhoto or Company.logo. `kind` selects which
 * public static folder it lives in on the backend — candidate photos are
 * stored under uploads/photos, company logos under uploads/logos (see
 * server/middleware/upload.js) — passing the wrong one silently 404s.
 */
export default function Avatar({ photoFilename, name, size = 44, kind = 'photo' }) {
  const initial = name?.trim()?.[0]?.toUpperCase() || '?';
  const folder = kind === 'logo' ? 'logos' : 'photos';

  if (photoFilename) {
    return (
      <img
        src={`${backendOrigin}/uploads/${folder}/${photoFilename}`}
        alt={name ? `${name}'s ${kind === 'logo' ? 'company logo' : 'profile photo'}` : 'Profile photo'}
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
