import { api } from './api.js';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  me: () => api.get('/auth/me'),
};

export const readingApi = {
  status: () => api.get('/reading/me/status'),
  submitTask: (taskId) => api.post(`/reading/tasks/${taskId}/submit`),
  startSession: (bookId) => api.post(`/reading/books/${bookId}/session`),
  // Pages are fetched with the auth + session headers (an <img src> cannot send them) and shown from a blob URL.
  async page(bookId, pageNumber, sessionToken) {
    const res = await api.raw(`/reading/books/${bookId}/pages/${pageNumber}`, { headers: { 'X-Reading-Session': sessionToken } });
    return URL.createObjectURL(await res.blob());
  },
  saveProgress: (bookId, currentPage, opts) => api.patch(`/reading/progress/${bookId}`, { currentPage }, opts),
};

export const adminApi = {
  books: () => api.get('/admin/books'),
  uploadBook: (form) => api.upload('/admin/books', form),
  updateBook: (id, data) => api.patch(`/admin/books/${id}`, data),
  reprocessBook: (id) => api.post(`/admin/books/${id}/reprocess`),
  deleteBook: (id) => api.delete(`/admin/books/${id}`),
  tasks: () => api.get('/admin/tasks'),
  createTask: (data) => api.post('/admin/tasks', data),
  updateTask: (id, data) => api.patch(`/admin/tasks/${id}`, data),
  requests: (status) => api.get(`/admin/reading/requests${status ? `?status=${status}` : ''}`),
  approve: (id) => api.patch(`/admin/reading/requests/${id}/approve`),
  reject: (id, reason) => api.patch(`/admin/reading/requests/${id}/reject`, { reason }),
};

export const mentorshipApi = {
  status: () => api.get('/mentorship/status'),
  paymentInfo: () => api.get('/mentorship/payment-info'),
  submitPayment: (form) => api.upload('/mentorship/payments', form),
  // Local testing only: the server answers 404 unless MENTORSHIP_TEST_MODE=true (never in production).
  testActivate: () => api.post('/mentorship/test-activate'),
};

adminApi.mentorshipPayments = (status) => api.get(`/admin/mentorship/payments${status ? `?status=${status}` : ''}`);
adminApi.approvePayment = (id) => api.patch(`/admin/mentorship/payments/${id}/approve`);
adminApi.rejectPayment = (id, reason) => api.patch(`/admin/mentorship/payments/${id}/reject`, { reason });
// The screenshot is private: fetched with the admin token and shown from a blob URL.
adminApi.paymentScreenshot = async (id) => URL.createObjectURL(await (await api.raw(`/admin/mentorship/payments/${id}/screenshot`)).blob());

adminApi.platforms = () => api.get('/admin/platforms');
adminApi.createPlatform = (form) => api.upload('/admin/platforms', form);
adminApi.updatePlatform = (id, form) => api.uploadPatch(`/admin/platforms/${id}`, form);
adminApi.deletePlatform = (id) => api.delete(`/admin/platforms/${id}`);
