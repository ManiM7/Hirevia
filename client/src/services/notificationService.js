import api from './api';

export function listNotifications(params) {
  return api.get('/notifications', { params });
}

export function markNotificationRead(id) {
  return api.patch(`/notifications/${id}/read`);
}
