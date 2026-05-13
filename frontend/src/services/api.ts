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
        localStorage.removeItem('auth-storage');
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

export const telegramApi = {
  getBindCode: () => api.post<{ code: string }>('/telegram/generate-bind-code'),
};

// Geo
export const geoApi = {
  getOblasts: () => api.get('/geo/oblasts'),
  createOblast: (data: { name: string; code?: string }) => api.post('/geo/oblasts', data),
  deleteOblast: (id: number) => api.delete(`/geo/oblasts/${id}`),
  getRegions: (oblastId?: number, includeGeometry = false) =>
    api.get('/geo/regions', { params: { include_geometry: includeGeometry, ...(oblastId ? { oblast_id: oblastId } : {}) } }),
  getRegion: (id: number) => api.get(`/geo/regions/${id}`),
  updateRegion: (id: number, data: any) => api.put(`/geo/regions/${id}`, data),
  getSettlement: (id: number) => api.get(`/geo/settlements/${id}`),
  getSettlements: (regionId?: number) =>
    api.get('/geo/settlements', { params: regionId ? { region_id: regionId } : {} }),
  createSettlement: (data: any) => api.post('/geo/settlements', data),
  updateSettlement: (id: number, data: any) => api.put(`/geo/settlements/${id}`, data),
  deleteSettlement: (id: number) => api.delete(`/geo/settlements/${id}`),
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
  updateCommission: (id: string, data: unknown) =>
    api.put(`/locations/${id}/commission`, data),
  getMedicalOrgs: (id: string) => api.get(`/locations/${id}/medical-orgs`),
  createMedicalOrg: (id: string, data: unknown) =>
    api.post(`/locations/${id}/medical-orgs`, data),
  getRelayDetail: (id: string) => api.get(`/locations/${id}/relay-detail`),
  updateRelayDetail: (id: string, data: unknown) => api.put(`/locations/${id}/relay-detail`, data),
  uploadImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/locations/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteImage: (id: string, url: string) => api.delete(`/locations/${id}/images`, { params: { url } }),
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
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

// Search
export const searchApi = {
  locations: (q: string) =>
    api.get('/locations', { params: { q, per_page: 10 } }),
  settlements: (q: string) =>
    api.get('/geo/settlements', { params: { q, limit: 10 } }),
  tasks: (q: string) =>
    api.get('/tasks', { params: { q, per_page: 10 } }),
};

// Analytics
export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
  regions: () => api.get('/analytics/regions'),
};

// Users
export const usersApi = {
  listEngineers: (params?: Record<string, unknown>) => api.get('/users/engineers', { params }),
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: unknown) => api.post('/users', data),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Researches
export const researchesApi = {
  list: (orgId: string) => api.get(`/locations/medical-orgs/${orgId}/researches`),
  create: (orgId: string, data: unknown) => api.post(`/locations/medical-orgs/${orgId}/researches`, data),
  update: (id: string, data: unknown) => api.patch(`/locations/researches/${id}`, data),
  getEquipment: (orgId: string) => api.get(`/locations/medical-orgs/${orgId}/equipment`),
  createEquipment: (orgId: string, data: unknown) => api.post(`/locations/medical-orgs/${orgId}/equipment`, data),
  deleteEquipment: (id: string) => api.delete(`/locations/equipment/${id}`),
};

// District Accounts
export const districtAccountsApi = {
  list: (settlementId?: number) =>
    api.get('/district-accounts', { params: settlementId ? { settlement_id: settlementId } : {} }),
  create: (data: any) => api.post('/district-accounts', data),
  upload: (settlementId: number, file: File, replace = false, category?: string) => {
    const formData = new FormData();
    formData.append('settlement_id', settlementId.toString());
    formData.append('file', file);
    formData.append('replace', String(replace));
    if (category) formData.append('category', category);
    return api.post('/district-accounts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id: number, data: any) => api.patch(`/district-accounts/${id}`, data),
  delete: (id: number) => api.delete(`/district-accounts/${id}`),
  bulkDelete: (ids: number[]) => api.post('/district-accounts/bulk-delete', ids),
  clear: (settlementId: number) => api.delete(`/district-accounts/settlement/${settlementId}`),
};

// Roles
export const rolesApi = {
  list: () => api.get('/admin/roles'),
  get: (name: string) => api.get(`/admin/roles/${name}`),
  create: (data: unknown) => api.post('/admin/roles', data),
  update: (name: string, data: unknown) => api.put(`/admin/roles/${name}`, data),
  delete: (name: string) => api.delete(`/admin/roles/${name}`),
  listFeatures: () => api.get('/admin/roles/features'),
  seed: () => api.post('/admin/roles/seed'),
};
