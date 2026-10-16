import { api } from './api.js';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, phone, password) => api.post('/auth/register', { name, email, phone, password }),
  me: () => api.get('/auth/me'),
};

export const readingApi = {
  library: () => api.get('/reading/library'),
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
  addBookFromLink: (data) => api.post('/admin/books/from-link', data),
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

adminApi.webinarRegistrations = (search) => api.get(`/admin/webinar/registrations${search ? `?search=${encodeURIComponent(search)}` : ''}`);
adminApi.platforms = () => api.get('/admin/platforms');
adminApi.createPlatform = (form) => api.upload('/admin/platforms', form);
adminApi.updatePlatform = (id, form) => api.uploadPatch(`/admin/platforms/${id}`, form);
adminApi.deletePlatform = (id) => api.delete(`/admin/platforms/${id}`);

adminApi.testimonials = () => api.get('/admin/testimonials');
adminApi.createTestimonial = (data) => api.post('/admin/testimonials', data);
adminApi.updateTestimonial = (id, data) => api.patch(`/admin/testimonials/${id}`, data);
adminApi.deleteTestimonial = (id) => api.delete(`/admin/testimonials/${id}`);

adminApi.profitShots = () => api.get('/admin/profit-shots');
adminApi.createProfitShot = (form) => api.upload('/admin/profit-shots', form);
adminApi.updateProfitShot = (id, form) => api.uploadPatch(`/admin/profit-shots/${id}`, form);
adminApi.deleteProfitShot = (id) => api.delete(`/admin/profit-shots/${id}`);

adminApi.galleryImages = () => api.get('/admin/gallery');
adminApi.createGalleryImage = (form) => api.upload('/admin/gallery', form);
adminApi.updateGalleryImage = (id, form) => api.uploadPatch(`/admin/gallery/${id}`, form);
adminApi.deleteGalleryImage = (id) => api.delete(`/admin/gallery/${id}`);

adminApi.setTestimonialPhoto = (id, form) => api.upload(`/admin/testimonials/${id}/photo`, form);
adminApi.clearTestimonialPhoto = (id) => api.delete(`/admin/testimonials/${id}/photo`);

// Social links (Admin -> Social Links). Public GET returns only the links that were set by an admin.
export const siteLinksApi = { get: () => api.get('/site-links') };
adminApi.siteLinks = () => api.get('/admin/site-links');
adminApi.saveSiteLinks = (data) => api.patch('/admin/site-links', data);
