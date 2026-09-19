const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const { uploadDir, maxPhotoSize, maxResumeSize } = require('../config/env');

const ROOT = path.join(__dirname, '..', uploadDir);

function ensureDir(sub) {
  const dir = path.join(ROOT, sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return `${crypto.randomUUID()}${ext}`;
}

function makeStorage(sub) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, ensureDir(sub)),
    filename: (req, file, cb) => cb(null, safeFilename(file.originalname)),
  });
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const RESUME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);
const RESUME_EXTENSIONS = new Set(['.pdf', '.docx']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function fileFilterFor(allowedMimes, allowedExts, label) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedMimes.has(file.mimetype) || !allowedExts.has(ext)) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `Only ${label} files are allowed`));
    }
    cb(null, true);
  };
}

const uploadPhoto = multer({
  storage: makeStorage('photos'),
  limits: { fileSize: maxPhotoSize },
  fileFilter: fileFilterFor(IMAGE_TYPES, IMAGE_EXTENSIONS, 'JPEG/PNG/WEBP image'),
});

const uploadLogo = multer({
  storage: makeStorage('logos'),
  limits: { fileSize: maxPhotoSize },
  fileFilter: fileFilterFor(IMAGE_TYPES, IMAGE_EXTENSIONS, 'JPEG/PNG/WEBP image'),
});

const uploadResume = multer({
  storage: makeStorage('resumes'),
  limits: { fileSize: maxResumeSize },
  fileFilter: fileFilterFor(RESUME_TYPES, RESUME_EXTENSIONS, 'PDF or DOCX'),
});

// Registration accepts either a candidate profile photo or a recruiter's
// company logo, depending on role — both are plain images.
const uploadRegistrationImages = multer({
  storage: makeStorage('photos'),
  limits: { fileSize: maxPhotoSize },
  fileFilter: fileFilterFor(IMAGE_TYPES, IMAGE_EXTENSIONS, 'JPEG/PNG/WEBP image'),
}).fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 },
]);

module.exports = { uploadPhoto, uploadLogo, uploadResume, uploadRegistrationImages, ROOT };
