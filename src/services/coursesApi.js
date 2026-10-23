import { api, API_URL } from './api.js';

// Student side. The catalog and course pages are public; a logged-in visitor's token (added by the API client)
// adds their progress and access. `progress` needs a login.
export const coursesApi = {
  catalog: () => api.get('/courses'),
  course: (slug) => api.get(`/courses/${encodeURIComponent(slug)}`),
  lesson: (id) => api.get(`/learn/lessons/${id}`),
  saveProgress: (id, data, opts) => api.put(`/learn/lessons/${id}/progress`, data, opts),
  thumbnailUrl: (path) => (path ? `${API_URL}${path}` : null),
};

// Admin side (all routes are ADMIN-only on the server).
export const coursesAdminApi = {
  list: () => api.get('/admin/courses'),
  get: (id) => api.get(`/admin/courses/${id}`),
  create: (data) => api.post('/admin/courses', data),
  update: (id, data) => api.patch(`/admin/courses/${id}`, data),
  remove: (id) => api.delete(`/admin/courses/${id}`),
  setThumbnail: (id, form) => api.upload(`/admin/courses/${id}/thumbnail`, form),
  clearThumbnail: (id) => api.delete(`/admin/courses/${id}/thumbnail`),
  addModule: (courseId, data) => api.post(`/admin/courses/${courseId}/modules`, data),
  updateModule: (id, data) => api.patch(`/admin/course-modules/${id}`, data),
  removeModule: (id) => api.delete(`/admin/course-modules/${id}`),
  reorderModules: (courseId, ids) => api.put(`/admin/courses/${courseId}/modules/order`, { ids }),
  addLesson: (moduleId, data) => api.post(`/admin/course-modules/${moduleId}/lessons`, data),
  updateLesson: (id, data) => api.patch(`/admin/course-lessons/${id}`, data),
  removeLesson: (id) => api.delete(`/admin/course-lessons/${id}`),
  reorderLessons: (moduleId, ids) => api.put(`/admin/course-modules/${moduleId}/lessons/order`, { ids }),
  enrollments: (id) => api.get(`/admin/courses/${id}/enrollments`),
  enroll: (id, email) => api.post(`/admin/courses/${id}/enrollments`, { email }),
  unenroll: (id, userId) => api.delete(`/admin/courses/${id}/enrollments/${userId}`),
};
