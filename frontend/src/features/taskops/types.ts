export type TaskopsTaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskopsTaskPriority = 'p0_urgent' | 'p1_high' | 'p2_medium' | 'p3_low';
export type TaskopsEstimateType = 't_shirt' | 'hours';
export type TaskopsMemberRole = 'owner' | 'writer' | 'reader';
export type TaskopsDependencyType = 'blocks' | 'blocked_by' | 'relates_to';

export interface TaskopsLabel {
  id: string;
  name: string;
  color: string;
}

export interface TaskopsProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  is_external: boolean;
  estimate_type: TaskopsEstimateType;
  owner_id: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  task_count?: number;
  open_task_count?: number;
}

export interface TaskopsTask {
  id: string;
  project_id: string;
  cycle_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  status: TaskopsTaskStatus;
  priority: TaskopsTaskPriority;
  assignee_id: string | null;
  reporter_id: string;
  estimate: string | null;
  start_date: string | null;
  due_date: string | null;
  location_id: string | null;
  is_external_visible: boolean;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee_name: string | null;
  reporter_name: string | null;
  location_name: string | null;
  labels: TaskopsLabel[];
  subtask_count?: number;
  comment_count?: number;
}

export interface TaskopsComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
}

export interface TaskopsCycle {
  id: string;
  project_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  created_at: string;
  task_count?: number;
  done_count?: number;
}

export interface TaskopsProjectMember {
  id: string;
  user_id: string;
  role: TaskopsMemberRole;
  created_at: string;
  user_full_name: string | null;
}

export interface TaskopsDependency {
  id: string;
  source_task_id: string;
  target_task_id: string;
  type: TaskopsDependencyType;
  created_at: string;
}

export interface TaskopsGoal {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'done';
  progress: number;
  due_date: string | null;
  owner_id: string;
  owner_name: string | null;
  created_at: string;
}

export interface TaskopsDashboard {
  kpi: {
    total: number;
    open: number;
    in_progress: number;
    done: number;
    overdue: number;
  };
  done_by_week: { week: string; count: number }[];
  by_assignee: { name: string; count: number }[];
  risk_tasks: TaskopsTask[];
}

// Status display helpers
export const STATUS_LABELS: Record<TaskopsTaskStatus, string> = {
  backlog: 'Бэклог',
  todo: 'К выполнению',
  in_progress: 'В работе',
  in_review: 'На проверке',
  done: 'Выполнено',
  cancelled: 'Отменено',
};

export const PRIORITY_LABELS: Record<TaskopsTaskPriority, string> = {
  p0_urgent: 'Срочно',
  p1_high: 'Высокий',
  p2_medium: 'Средний',
  p3_low: 'Низкий',
};

export const STATUS_COLORS: Record<TaskopsTaskStatus, string> = {
  backlog: '#6b7280',
  todo: '#3b82f6',
  in_progress: '#f59e0b',
  in_review: '#8b5cf6',
  done: '#10b981',
  cancelled: '#ef4444',
};

export const PRIORITY_COLORS: Record<TaskopsTaskPriority, string> = {
  p0_urgent: '#ef4444',
  p1_high: '#f97316',
  p2_medium: '#3b82f6',
  p3_low: '#9ca3af',
};
