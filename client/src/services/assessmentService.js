import api from './api';

export function startAssessment(skills) {
  return api.post('/assessments/start', { skills });
}

export function getQuestion(attemptId) {
  return api.get(`/assessments/${attemptId}/question`);
}

export function submitAnswer(attemptId, submittedAnswer) {
  return api.post(`/assessments/${attemptId}/answer`, { submittedAnswer });
}

export function reportViolation(attemptId, type) {
  return api.post(`/assessments/${attemptId}/violation`, { type });
}

export function finishAssessment(attemptId) {
  return api.post(`/assessments/${attemptId}/finish`);
}

export function getResult(attemptId) {
  return api.get(`/assessments/${attemptId}/result`);
}
