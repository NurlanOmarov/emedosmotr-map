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
  | 'state_medical'
  | 'private_medical'
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
  phone: string | null;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  notification_settings: Record<string, string[]>;
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
  doctors_count: number;
  connected_computers_count: number;
  internet_status: boolean;
  internet_type: string | null;
  internet_speed_mbps: number | null;
  has_local_network: boolean;
  status: StatusType;
  comment: string | null;
  last_updated_at: string;
  created_at: string;
}

export interface Task {
  id: string;
  location_id: string | null;
  location_name: string | null;
  region_id: number | null;
  settlement_id: number | null;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  assignee_name: string | null;
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

export const LOCATION_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  military_office: { label: 'Военкомат', color: '#DC2626' },
  district_hospital: { label: 'ЦРБ', color: '#2563EB' },
  state_medical: { label: 'Гос. мед.', color: '#0891B2' },
  private_medical: { label: 'Частная мед.', color: '#7C3AED' },
  private_clinic: { label: 'Частная клиника', color: '#9333EA' },
  medical_center: { label: 'Медцентр', color: '#059669' },
  relay_server_location: { label: 'Сервер', color: '#64748B' },
};

export interface MedicalEquipment {
  id: string;
  organization_id: string;
  equipment_type: string;
  count: number;
  free_ports: number;
  connection_status: boolean;
  port_status: string;
  ecg_model: string | null;
  smart_ecg_compatible: boolean;
  serial_number: string | null;
  last_service_date: string | null;
  notes: string | null;
  updated_at: string;
}

export const STATUS_COLORS: Record<string, string> = {
  ready: '#22C55E',
  in_progress: '#F59E0B',
  critical: '#EF4444',
};

// ─── Research Types ─────────────────────────────────────────────────────────

export type ResearchType =
  | 'lab_oak'
  | 'lab_oam'
  | 'lab_micro'
  | 'ecg'
  | 'fluro'
  | 'usound'
  | 'echo_kg'
  | 'additional';

export interface MedicalResearch {
  id: string;
  organization_id: string;
  research_type: string;
  input_method: 'manual' | 'auto';
  integration_type: string | null;
  specialist_name: string | null;
  specialist_position: string | null;
  room_number: string | null;
  phone: string | null;
  equipment_id: string | null;
  status: StatusType;
  notes: string | null;
  problems: string | null;
  has_image: boolean;
  image_source: string | null;
  has_conclusion: boolean;
  conclusion_source: string | null;
  is_available: boolean;
  is_connected: boolean;
  staff_trained: boolean;
  has_data_stream: boolean;
  updated_at: string;
  created_at: string;
}

export const RESEARCH_LABELS: Record<string, string> = {
  lab_oak: 'ОАК (Лабораторное)',
  lab_oam: 'ОАМ (Лабораторное)',
  lab_micro: 'Микрореакция (Лабораторное)',
  ecg: 'ЭКГ',
  fluro: 'Флюорография',
  usound: 'УЗИ',
  echo_kg: 'Эхокардиография',
  additional: 'Дополнительное',
};

export const MANDATORY_RESEARCH_TYPES: ResearchType[] = [
  'lab_oak',
  'lab_oam',
  'lab_micro',
  'ecg',
  'fluro',
  'usound',
  'echo_kg'
];
