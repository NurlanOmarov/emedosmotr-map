import styled from 'styled-components';
import { useAssignableUsers } from '../api';
import { STATUS_LABELS, PRIORITY_LABELS } from '../types';
import type { TaskopsTaskStatus, TaskopsTaskPriority } from '../types';

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.bgCard};
  flex-shrink: 0;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
`;

const FilterItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const Select = styled.select`
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 3px 6px;
  font-size: 12px;
  cursor: pointer;
  &:focus { outline: none; border-color: ${(p) => p.theme.colors.primary}; }
`;

const Input = styled.input`
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  width: 160px;
  &:focus { outline: none; border-color: ${(p) => p.theme.colors.primary}; }
  &::placeholder { color: ${(p) => p.theme.colors.textSecondary}; opacity: 0.6; }
`;

const ResetBtn = styled.button`
  background: none;
  border: none;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 12px;
  cursor: pointer;
  padding: 4px;
  opacity: 0.6;
  &:hover { opacity: 1; color: ${(p) => p.theme.colors.critical}; }
`;

interface FilterState {
  status?: string;
  priority?: string;
  assignee_id?: string;
  cycle_id?: string;
  q?: string;
}

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const STATUSES: TaskopsTaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
const PRIORITIES: TaskopsTaskPriority[] = ['p0_urgent', 'p1_high', 'p2_medium', 'p3_low'];

export function FiltersBar({ filters, onChange }: Props) {
  const { data: users = [] } = useAssignableUsers();

  const update = (key: keyof FilterState, value: string | undefined) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return (
    <Bar>
      <FilterItem>
        <Input 
          placeholder="Поиск по названию..." 
          value={filters.q || ''} 
          onChange={(e) => update('q', e.target.value)}
        />
      </FilterItem>

      <FilterItem>
        <span>Статус:</span>
        <Select 
          value={filters.status || ''} 
          onChange={(e) => update('status', e.target.value)}
        >
          <option value="">Все</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </Select>
      </FilterItem>

      <FilterItem>
        <span>Приоритет:</span>
        <Select 
          value={filters.priority || ''} 
          onChange={(e) => update('priority', e.target.value)}
        >
          <option value="">Все</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
        </Select>
      </FilterItem>

      <FilterItem>
        <span>Исполнитель:</span>
        <Select 
          value={filters.assignee_id || ''} 
          onChange={(e) => update('assignee_id', e.target.value)}
        >
          <option value="">Все</option>
          <option value="unassigned">Не назначен</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </Select>
      </FilterItem>

      {hasFilters && (
        <ResetBtn onClick={() => onChange({})}>Сбросить ×</ResetBtn>
      )}
    </Bar>
  );
}
