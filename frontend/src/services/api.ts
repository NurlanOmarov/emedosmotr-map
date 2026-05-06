import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = res.data.access_token;
        localStorage.setItem('access_token', newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Geo
export const geoApi = {
  getRegions: (includeGeometry = false) =>
    api.get('/geo/regions', { params: { include_geometry: includeGeometry } }),
  getRegion: (id: number) => api.get(`/geo/regions/${id}`),
  getSettlements: (regionId?: number) =>
    api.get('/geo/settlements', { params: regionId ? { region_id: regionId } : {} }),
};

// Locations
export const locationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/locations', { params }),
  getMapFeatures: (params?: Record<string, unknown>) =>
    api.get('/locations/map/features', { params }),
  get: (id: string) => api.get(`/locations/${id}`),
  create: (data: unknown) => api.post('/locations', data),
  update: (id: string, data: unknown) => api.put(`/locations/${id}`, data),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/locations/${id}/status`, { status, reason }),
  delete: (id: string) => api.delete(`/locations/${id}`),
  getCommission: (id: string) => api.get(`/locations/${id}/commission`),
  createCommission: (id: string, data: unknown) =>
    api.post(`/locations/${id}/commission`, data),
  getMedicalOrgs: (id: string) => api.get(`/locations/${id}/medical-orgs`),
  createMedicalOrg: (id: string, data: unknown) =>
    api.post(`/locations/${id}/medical-orgs`, data),
};

// Tasks
export const tasksApi = {
  list: (params?: Record<string, unknown>) => api.get('/tasks', { params }),
  myTasks: () => api.get('/tasks/my'),
  get: (id: string) => api.get(`/tasks/${id}`),
  create: (data: unknown) => api.post('/tasks', data),
  update: (id: string, data: unknown) => api.put(`/tasks/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/tasks/${id}/status`, { status }),
  addComment: (id: string, content: string) =>
    api.post(`/tasks/${id}/comments`, { content }),
};

// Analytics
export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
  regions: () => api.get('/analytics/regions'),
};

// Users
export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: unknown) => api.post('/users', data),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};
