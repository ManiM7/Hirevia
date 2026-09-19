import api from './api';

export function startInterview(sourceAssessmentAttemptId) {
  return api.post('/interviews/start', sourceAssessmentAttemptId ? { sourceAssessmentAttemptId } : {});
}

export function getQuestion(attemptId) {
  return api.get(`/interviews/${attemptId}/question`);
}

export function submitAnswer(attemptId, answerText, answerTimeMs) {
  return api.post(`/interviews/${attemptId}/answer`, { answerText, answerTimeMs });
}

export function finishInterview(attemptId) {
  return api.post(`/interviews/${attemptId}/finish`);
}

export function getResult(attemptId) {
  return api.get(`/interviews/${attemptId}/result`);
}

export function getHistory() {
  return api.get('/candidates/interviews');
}
