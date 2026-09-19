import api from './api';

export function searchCandidates(params) {
  return api.get('/recruiters/candidates', { params });
}

export function getCandidate(id) {
  return api.get(`/recruiters/candidates/${id}`);
}

export function getMyProfile() {
  return api.get('/recruiters/profile');
}

export function updateMyProfile(data) {
  return api.put('/recruiters/profile', data);
}

export function getMyCompany() {
  return api.get('/recruiters/company');
}

export function updateMyCompany(formData) {
  return api.put('/recruiters/company', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
}
