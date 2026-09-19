import api from './api';

export function listUsers(params) {
  return api.get('/admin/users', { params });
}

export function setUserDisabled(id, isDisabled) {
  return api.patch(`/admin/users/${id}/disable`, { isDisabled });
}

export function listQuestions(params) {
  return api.get('/admin/questions', { params });
}

export function createQuestion(data) {
  return api.post('/admin/questions', data);
}

export function updateQuestion(id, data) {
  return api.put(`/admin/questions/${id}`, data);
}

export function deleteQuestion(id) {
  return api.delete(`/admin/questions/${id}`);
}

export function listAssessments(params) {
  return api.get('/admin/assessments', { params });
}

export function listSuspiciousAssessments() {
  return api.get('/admin/assessments/suspicious');
}

export function listCompanies() {
  return api.get('/admin/companies');
}
