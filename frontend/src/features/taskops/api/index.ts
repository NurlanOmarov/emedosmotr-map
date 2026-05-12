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
} from '../types';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
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

export function useProjectTasks(projectId: string, filter: TasksFilter = {}) {
  return useQuery<PaginatedResponse<TaskopsTask>>({
    queryKey: ['taskops', 'tasks', projectId, filter],
    queryFn: () =>
      api
        .get(`/v1/taskops/projects/${projectId}/tasks`, { params: filter })
        .then((r) => r.data),
    enabled: !!projectId,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskops', 'tasks', projectId] }),
  });
}

export function useUpdateTask(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TaskopsTask> & { label_ids?: string[] }) =>
      api.patch(`/v1/taskops/tasks/${taskId}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taskops', 'task', taskId] });
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

export function useMyInbox() {
  return useQuery<TaskopsTask[]>({
    queryKey: ['taskops', 'inbox'],
    queryFn: () => api.get('/v1/taskops/me/inbox').then((r) => r.data),
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

export function useAuditLog(projectId?: string) {
  return useQuery<AuditLogEntry[]>({
    queryKey: ['taskops', 'audit-log', projectId ?? 'global'],
    queryFn: () =>
      api
        .get('/v1/taskops/audit-log', { params: projectId ? { project_id: projectId } : {} })
        .then((r) => r.data),
    staleTime: 30_000,
  });
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export function useGoals() {
  return useQuery<TaskopsGoal[]>({
    queryKey: ['taskops', 'goals'],
    queryFn: () => api.get('/v1/taskops/goals').then((r) => r.data),
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

export function useDashboard() {
  return useQuery<TaskopsDashboard>({
    queryKey: ['taskops', 'dashboard'],
    queryFn: () => api.get('/v1/taskops/dashboard').then((r) => r.data),
    staleTime: 60_000,
  });
}
