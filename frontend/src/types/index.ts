export type UserRole =
  | 'superadmin'
  | 'director'
  | 'regional_manager'
  | 'engineer'
  | 'operator'
  | 'analyst';

export type LocationType =
  | 'military_office'
  | 'district_hospital'
  | 'private_clinic'
  | 'medical_center'
  | 'relay_server_location';

export type StatusType = 'ready' | 'in_progress' | 'critical';

export type TaskStatus = 'new' | 'assigned' | 'in_progress' | 'waiting' | 'done' | 'cancelled';

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export type TaskType =
  | 'equipment_setup'
  | 'internet_setup'
  | 'training'
  | 'inspection'
  | 'data_upload'
  | 'maintenance'
  | 'other';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  region_id: number | null;
  is_active: boolean;
  avatar_url: string | null;
  last_login_at: string | null;
}

export interface Region {
  region_id: number;
  name: string;
  code: string | null;
  center_lat: number | null;
  center_lon: number | null;
  geometry_json?: object | null;
}

export interface Settlement {
  settlement_id: number;
  region_id: number | null;
  name: string;
  latitude: number;
  longitude: number;
  status: string | null;
  population: number | null;
}

export interface Location {
  id: string;
  settlement_id: number | null;
  region_id: number;
  name: string;
  type: LocationType;
  address: string | null;
  lat: number | null;
  lon: number | null;
  status: StatusType;
  status_reason: string | null;
  upload_mode: 'auto' | 'manual' | 'mixed';
  has_relay_server: boolean;
  is_active: boolean;
  notes: string | null;
  tasks_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface Commission {
  id: string;
  location_id: string;
  address: string | null;
  computers_available: number;
  computers_required: number;
  internet_status: boolean;
  internet_speed_mbps: number | null;
  status: StatusType;
  comment: string | null;
  last_updated_at: string;
  created_at: string;
}

export interface Task {
  id: string;
  location_id: string | null;
  region_id: number | null;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface MapFilters {
  regions: number[];
  locationTypes: LocationType[];
  statuses: StatusType[];
  hasActiveTasks: boolean;
  assignedToMe: boolean;
}

export interface BreadcrumbItem {
  label: string;
  regionId?: number;
  zoom?: number;
}
