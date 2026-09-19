import api from './api';

export function getProfile() {
  return api.get('/candidates/profile');
}

export function updateProfile(formData) {
  return api.put('/candidates/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export function uploadResume(file) {
  const formData = new FormData();
  formData.append('resume', file);
  return api.post('/candidates/resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export function getResume() {
  return api.get('/candidates/resume');
}

export function analyzeResume() {
  return api.post('/candidates/resume/analyze');
}

export function getAts() {
  return api.get('/candidates/ats');
}

export function getProgress() {
  return api.get('/candidates/progress');
}
