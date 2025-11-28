import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: { fName: string; lName: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
};

// Reservations API
export const reservationsApi = {
  getAll: () => api.get('/reservations'),
  getMyReservations: () => api.get('/reservations/my'),
  create: (data: { date: string; start_time: string; end_time: string; guests: number }) =>
    api.post('/reservations', data),
  cancel: (id: number) => api.put(`/reservations/${id}/cancel`),
  approve: (id: number) => api.put(`/reservations/${id}/approve`),
  reject: (id: number, reason: string) => api.put(`/reservations/${id}/reject`, { reason }),
  getPending: () => api.get('/reservations/pending'),
};

// Users API
export const usersApi = {
  getAll: () => api.get('/users'),
  toggleActive: (id: number) => api.put(`/users/${id}/toggle-active`),
  getProfile: () => api.get('/users/profile'),
};

// Pool Settings API
export const poolApi = {
  getSettings: () => api.get('/pool/settings'),
  updateSettings: (data: any) => api.put('/pool/settings', data),
  getAvailability: (date: string) => api.get(`/pool/availability?date=${date}`),
  blockSlot: (data: { date: string; start_time: string; end_time: string }) =>
    api.post('/pool/block', data),
  unblockSlot: (id: number) => api.delete(`/pool/block/${id}`),
};

// Notifications API
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Feedback API
export const feedbackApi = {
  submit: (data: { subject: string; message: string; rating: number }) =>
    api.post('/feedback', data),
  getAll: () => api.get('/feedback'),
};

// Admin Logs API
export const logsApi = {
  getAll: () => api.get('/logs'),
};

export default api;
