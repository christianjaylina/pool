import axios from 'axios';

// For production, use the full API URL; for local dev, use proxy
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // Client-side: check if we have a production API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      return `${apiUrl}/api`;
    }
  }
  // Fallback to local proxy
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      // Backend expects token in 'x-auth-token' header
      config.headers['x-auth-token'] = token;
    }
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-redirect on 401 - let the AuthContext handle auth state
    // This prevents race conditions where an API call fails before auth is loaded
    // The (user)/layout.tsx will handle redirecting unauthenticated users
    console.error('API Error:', error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: { fName: string; lName: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// Reservations API
export const reservationsApi = {
  getAll: () => api.get('/reservations/admin/all'),
  getMyReservations: () => api.get('/reservations/history'),
  create: (data: { date: string; startTime: string; endTime: string; guests: number }) =>
    api.post('/reservations/request', data),
  cancel: (id: number) => api.put(`/reservations/${id}/cancel`),
  approve: (id: number) => api.put(`/reservations/admin/status/${id}`, { newStatus: 'approved' }),
  reject: (id: number, reason?: string) => api.put(`/reservations/admin/status/${id}`, { newStatus: 'rejected', reason }),
  adminCancel: (id: number, reason: string) => api.put(`/reservations/admin/cancel/${id}`, { reason }),
  adminCreate: (data: { userId: number; date: string; startTime: string; endTime: string; guests: number }) =>
    api.post('/reservations/admin/create', data),
  getPending: () => api.get('/reservations/admin/pending'),
  getAvailability: (date: string) => api.get(`/reservations/availability/${date}`),
  getSlotStatus: (date: string) => api.get(`/reservations/slot-status/${date}`),
};

// Users API
export const usersApi = {
  getAll: () => api.get('/users/admin/renters'),
  toggleActive: (id: number, isActive: boolean) => api.put(`/users/admin/status/${id}`, { isActive }),
  setMaxGuests: (id: number, maxGuests: number | null) => api.put(`/users/admin/max-guests/${id}`, { maxGuests }),
  updateUserInfo: (id: number, data: { fName?: string; lName?: string; email?: string }) => 
    api.put(`/users/admin/update/${id}`, data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: { fName?: string; lName?: string; currentPassword?: string; newPassword?: string }) =>
    api.put('/auth/profile', data),
};

// Pool Settings API
export const poolApi = {
  getSettings: () => api.get('/reservations/admin/settings'),
  getPublicSettings: () => api.get('/reservations/pool-settings'),
  updateSettings: (data: any) => api.put('/reservations/admin/settings', data),
  blockSlot: (data: { date: string; startTime: string; endTime: string; reason: string }) =>
    api.post('/reservations/admin/block', data),
  getBlockedSlots: () => api.get('/reservations/admin/blocked'),
  removeBlockedSlot: (id: number) => api.delete(`/reservations/admin/blocked/${id}`),
};

// Notifications API
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Admin Logs API
export const logsApi = {
  getAll: () => api.get('/reservations/admin/logs'),
};

// Swimming Lessons API
export const swimmingLessonsApi = {
  getAll: () => api.get('/reservations/admin/swimming-lessons'),
  getByDate: (date: string) => api.get(`/reservations/admin/swimming-lessons/${date}`),
  create: (data: { date: string; startTime: string; endTime: string; participants: number; instructorName?: string; notes?: string }) =>
    api.post('/reservations/admin/swimming-lessons', data),
  delete: (id: number) => api.delete(`/reservations/admin/swimming-lessons/${id}`),
};

// Feedback API
export const feedbackApi = {
  submit: (data: { subject: string; message: string; rating: number }) =>
    api.post('/feedback', data),
  getAll: () => api.get('/feedback/admin/all'),
  getMy: () => api.get('/feedback/my'),
};

export default api;
