import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import type {
  TaskopsProject,
  TaskopsTask,
  TaskopsComment,
  TaskopsCycle,
  TaskopsProjectMember,
  TaskopsGoal,
  TaskopsDashboard,
  TaskopsDependencyType,
  TaskopsNote,
} from '../types';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface AssignableUser {
  id: string;
  full_name: string;
  role: string;
}

export function useAssignableUsers() {
  return useQuery<AssignableUser[]>({
    queryKey: ['taskops', 'assignable-users'],
    queryFn: () => api.get('/v1/taskops/assignable-users').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

// ─── Projects ────────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery<TaskopsProject[]>({
    queryKey: ['taskops', 'projects'],
    queryFn: () => api.get('/v1/taskops/projects').then((r) => r.data),
  });
}

export function useProject(id: string) {
  return useQuery<TaskopsProject>({
    queryKey: ['taskops', 'projects', id],
    queryFn: () => api.get(`/v1/taskops/projects/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TaskopsProject>) =>
      api.post('/v1/taskops/projects', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskops', 'projects'] }),
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TaskopsProject>) =>
      api.patch(`/v1/taskops/projects/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taskops', 'projects'] });
      qc.invalidateQueries({ queryKey: ['taskops', 'projects', id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/taskops/projects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskops', 'projects'] }),
  });
}

// Special system project for standalone assignments (поручения)
export const ORDERS_PROJECT_NAME = '📝 Поручения';
export const MAP_INCIDENTS_PROJECT_NAME = '🚩 Инциденты с карты';

export function useGetOrCreateOrdersProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<TaskopsProject> => {
      const projects: TaskopsProject[] = await api.get('/v1/taskops/projects').then((r) => r.data);
      const existing = projects.find((p) => p.name === ORDERS_PROJECT_NAME);
      if (existing) return existing;
      return api.post('/v1/taskops/projects', {
        name: ORDERS_PROJECT_NAME,
        description: 'Системный контейнер для разовых поручений без проекта',
      }).then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskops', 'projects'] }),
  });
}

export function useGetOrCreateIncidentsProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<TaskopsProject> => {
      const projects: TaskopsProject[] = await api.get('/v1/taskops/projects').then((r) => r.data);
      const existing = projects.find((p) => p.name === MAP_INCIDENTS_PROJECT_NAME);
      if (existing) return existing;
      return api.post('/v1/taskops/projects', {
        name: MAP_INCIDENTS_PROJECT_NAME,
        description: 'Системный контейнер для инцидентов, созданных на карте объектов',
      }).then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskops', 'projects'] }),
  });
}

// ─── Project Members ─────────────────────────────────────────────────────────

export function useProjectMembers(projectId: string) {
  return useQuery<TaskopsProjectMember[]>({
    queryKey: ['taskops', 'projects', projectId, 'members'],
    queryFn: () => api.get(`/v1/taskops/projects/${projectId}/members`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { user_id: string; role: string }) =>
      api.post(`/v1/taskops/projects/${projectId}/members`, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['taskops', 'projects', projectId, 'members'] }),
  });
}

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/v1/taskops/projects/${projectId}/members/${userId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['taskops', 'projects', projectId, 'members'] }),
  });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

interface TasksFilter {
  status?: string;
  priority?: string;
  assignee_id?: string;
  cycle_id?: string;
  q?: string;
  page?: number;
  per_page?: number;
}

export function useProjectTasks(
  projectId: string,
  filter: TasksFilter = {},
  options: { enabled?: boolean } = {}
) {
  return useQuery<PaginatedResponse<TaskopsTask>>({
    queryKey: ['taskops', 'tasks', projectId, filter],
    queryFn: () =>
      api
        .get(`/v1/taskops/projects/${projectId}/tasks`, { params: filter })
        .then((r) => r.data),
    enabled: !!projectId && (options.enabled !== false),
  });
}

export function useTask(taskId: string) {
  return useQuery<TaskopsTask>({
    queryKey: ['taskops', 'task', taskId],
    queryFn: () => api.get(`/v1/taskops/tasks/${taskId}`).then((r) => r.data),
    enabled: !!taskId,
  });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TaskopsTask> & { label_ids?: string[] }) =>
      api.post(`/v1/taskops/projects/${projectId}/tasks`, data).then((r) => r.data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['taskops', 'tasks', projectId] });
      if (res.parent_task_id) {
        qc.invalidateQueries({ queryKey: ['taskops', 'subtasks', res.parent_task_id] });
        qc.invalidateQueries({ queryKey: ['taskops', 'task', res.parent_task_id] });
      }
      qc.invalidateQueries({ queryKey: ['taskops', 'inbox'] });
    },
  });
}

export function useUpdateTask(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TaskopsTask> & { label_ids?: string[] }) =>
      api.patch(`/v1/taskops/tasks/${taskId}`, data).then((r) => r.data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['taskops', 'task', taskId] });
      if (res.parent_task_id) {
        qc.invalidateQueries({ queryKey: ['taskops', 'subtasks', res.parent_task_id] });
        qc.invalidateQueries({ queryKey: ['taskops', 'task', res.parent_task_id] });
      }
      if (projectId) qc.invalidateQueries({ queryKey: ['taskops', 'tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['taskops', 'inbox'] });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.delete(`/v1/taskops/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskops', 'tasks', projectId] }),
  });
}

// ─── Comments ────────────────────────────────────────────────────────────────

export function useTaskComments(taskId: string) {
  return useQuery<TaskopsComment[]>({
    queryKey: ['taskops', 'comments', taskId],
    queryFn: () => api.get(`/v1/taskops/tasks/${taskId}/comments`).then((r) => r.data),
    enabled: !!taskId,
  });
}

export function useAddComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api.post(`/v1/taskops/tasks/${taskId}/comments`, { content }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskops', 'comments', taskId] }),
  });
}

// ─── Inbox ────────────────────────────────────────────────────────────────────

export function useMyInbox(params: { limit?: number; offset?: number } = {}) {
  return useQuery<{ items: TaskopsTask[]; total: number; limit: number; offset: number }>({
    queryKey: ['taskops', 'inbox', params],
    queryFn: () => api.get('/v1/taskops/me/inbox', { params }).then((r) => r.data),
  });
}

export function useMyAssigned(includeDone = false) {
  return useQuery<TaskopsTask[]>({
    queryKey: ['taskops', 'assigned', includeDone],
    queryFn: () =>
      api.get('/v1/taskops/me/assigned', { params: { include_done: includeDone } }).then((r) => r.data),
  });
}

// ─── Cycles ──────────────────────────────────────────────────────────────────

export function useProjectCycles(projectId: string) {
  return useQuery<TaskopsCycle[]>({
    queryKey: ['taskops', 'cycles', projectId],
    queryFn: () => api.get(`/v1/taskops/projects/${projectId}/cycles`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateCycle(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; start_date: string; end_date: string }) =>
      api.post(`/v1/taskops/projects/${projectId}/cycles`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskops', 'cycles', projectId] }),
  });
}

// ─── Templates ───────────────────────────────────────────────────────────────

export interface TaskopsTemplate {
  id: string;
  name: string;
  task_count: number;
}

export function useTemplates() {
  return useQuery<TaskopsTemplate[]>({
    queryKey: ['taskops', 'templates'],
    queryFn: () => api.get('/v1/taskops/templates').then((r) => r.data),
    staleTime: Infinity,
  });
}

export function useApplyTemplate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      api.post(`/v1/taskops/projects/${projectId}/apply-template?template_id=${templateId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskops', 'tasks', projectId] }),
  });
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  project_id: string | null;
  details: string | null;
  created_at: string;
}

export function useAuditLog(params: { project_id?: string; limit?: number; offset?: number } = {}) {
  return useQuery<{ items: AuditLogEntry[]; total: number; limit: number; offset: number }>({
    queryKey: ['taskops', 'audit-log', params],
    queryFn: () =>
      api
        .get('/v1/taskops/audit-log', { params })
        .then((r) => r.data),
    staleTime: 30_000,
  });
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export function useGoals(params: { limit?: number; offset?: number; sort_by?: string; order?: string } = {}) {
  return useQuery<{ items: TaskopsGoal[]; total: number; limit: number; offset: number }>({
    queryKey: ['taskops', 'goals', params],
    queryFn: () => api.get('/v1/taskops/goals', { params }).then((r) => r.data),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; due_date?: string }) =>
      api.post('/v1/taskops/goals', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskops', 'goals'] }),
  });
}

export function useUpdateGoal(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TaskopsGoal>) =>
      api.patch(`/v1/taskops/goals/${goalId}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskops', 'goals'] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => api.delete(`/v1/taskops/goals/${goalId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskops', 'goals'] }),
  });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useDashboard(params: { by_assignee_limit?: number; risk_tasks_limit?: number } = {}) {
  return useQuery<TaskopsDashboard>({
    queryKey: ['taskops', 'dashboard', params],
    queryFn: () => api.get('/v1/taskops/dashboard', { params }).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useUserTasks(userId: string | null, includeDone = false) {
  return useQuery<TaskopsTask[]>({
    queryKey: ['taskops', 'user-tasks', userId, includeDone],
    queryFn: () =>
      api
        .get(`/v1/taskops/users/${userId}/tasks`, { params: { include_done: includeDone } })
        .then((r) => r.data),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export function useUploadAttachment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api
        .post(`/v1/taskops/tasks/${taskId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['taskops', 'task', taskId] });
      if (res.data?.parent_task_id) {
        qc.invalidateQueries({ queryKey: ['taskops', 'subtasks', res.data.parent_task_id] });
        qc.invalidateQueries({ queryKey: ['taskops', 'task', res.data.parent_task_id] });
      }
      qc.invalidateQueries({ queryKey: ['taskops', 'inbox'] });
    },
  });
}

export function useDeleteAttachment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      api.delete(`/v1/taskops/attachments/${attachmentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taskops', 'task', taskId] });
      qc.invalidateQueries({ queryKey: ['taskops', 'inbox'] });
    },
  });
}

export function useSubtasks(taskId: string) {
  return useQuery<TaskopsTask[]>({
    queryKey: ['taskops', 'subtasks', taskId],
    queryFn: async () => {
      const res = await api.get(`/v1/taskops/tasks/${taskId}/subtasks`);
      return res.data;
    },
    enabled: !!taskId,
  });
}

export function useCreateDependency(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { target_task_id: string; type: TaskopsDependencyType }) =>
      api.post(`/v1/taskops/tasks/${taskId}/dependencies`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taskops', 'task', taskId] });
    },
  });
}

export function useDeleteDependency(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (depId: string) =>
      api.delete(`/v1/taskops/dependencies/${depId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taskops', 'task', taskId] });
    },
  });
}

// ─── Notes ───────────────────────────────────────────────────────────────────

const NOTES_KEY = ['taskops', 'notes'] as const;

export function useNotes(params: { q?: string } = {}) {
  return useQuery<{ items: TaskopsNote[] }>({
    queryKey: [...NOTES_KEY, params],
    queryFn: () => api.get('/v1/taskops/notes', { params }).then((r) => r.data),
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; content?: string }) =>
      api.post('/v1/taskops/notes', data).then((r) => r.data as TaskopsNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}

export function useUpdateNote(noteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; content?: string; is_pinned?: boolean }) =>
      api.patch(`/v1/taskops/notes/${noteId}`, data).then((r) => r.data as TaskopsNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => api.delete(`/v1/taskops/notes/${noteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}
