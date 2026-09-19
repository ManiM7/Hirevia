import api from './api';

export function createConnection(candidateId, message) {
  return api.post('/connections', { candidateId, message });
}

export function listConnections(status) {
  return api.get('/connections', { params: status ? { status } : {} });
}

export function getConnection(id) {
  return api.get(`/connections/${id}`);
}

export function submitAvailability(id, slots, message) {
  return api.post(`/connections/${id}/availability`, { slots, message });
}

export function declineConnection(id, reason) {
  return api.post(`/connections/${id}/decline`, { reason });
}

export function scheduleInterview(id, slotId, title) {
  return api.post(`/connections/${id}/schedule`, { slotId, title });
}

export function cancelConnection(id, reason) {
  return api.post(`/connections/${id}/cancel`, { reason });
}
