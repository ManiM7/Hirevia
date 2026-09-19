import api from './api';

export function registerCandidate(formData) {
  return api.post('/auth/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export function registerRecruiter(formData) {
  return api.post('/auth/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export function login(email, password) {
  return api.post('/auth/login', { email, password });
}

export function changePassword(currentPassword, newPassword) {
  return api.post('/auth/change-password', { currentPassword, newPassword });
}

export function logout() {
  return api.post('/auth/logout');
}

export function fetchMe() {
  return api.get('/auth/me');
}

export function forgotPassword(email) {
  return api.post('/auth/forgot-password', { email });
}

export function resetPassword(email, token, newPassword) {
  return api.post('/auth/reset-password', { email, token, newPassword });
}
