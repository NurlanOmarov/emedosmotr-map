import styled from 'styled-components';
import { LuMapPin, LuClipboardList, LuMessageSquare } from 'react-icons/lu';
import type { TaskopsTask } from '../types';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { useUpdateTask } from '../api';
import type { TaskopsTaskStatus } from '../types';

const Row = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  cursor: pointer;
  transition: background 0.1s;
  background: ${(p) => (p.$selected ? p.theme.colors.bgHover : 'transparent')};

  &:hover {
    background: ${(p) => p.theme.colors.bgHover};
  }

  @media (max-width: 640px) {
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 16px;
  }
`;

const Title = styled.span`
  flex: 1;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 640px) {
    width: 100%;
    flex: none;
    white-space: normal;
    font-size: 14px;
    font-weight: 500;
  }
`;

const Meta = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
  white-space: nowrap;
`;

const AssigneeChip = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  padding: 1px 8px;
  white-space: nowrap;
`;

interface TaskRowProps {
  task: TaskopsTask;
  selected?: boolean;
  onClick?: () => void;
}

const STATUS_CYCLE: TaskopsTaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

export function TaskRow({ task, selected, onClick }: TaskRowProps) {
  const update = useUpdateTask(task.id);
  
  const handleStatusCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = STATUS_CYCLE.indexOf(task.status);
    const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    update.mutate({ status: nextStatus });
  };

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'done' &&
    task.status !== 'cancelled';

  return (
    <Row $selected={selected} onClick={onClick}>
      <div onClick={handleStatusCycle} title="Сменить статус (клик)">
        <StatusBadge status={task.status} />
      </div>
      <Title>{task.title}</Title>
      {task.location_name && (
        <Meta style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 3 }}>
          <LuMapPin size={11} /> {task.location_name}
        </Meta>
      )}
      <PriorityBadge priority={task.priority} />
      {task.assignee_name && <AssigneeChip>{task.assignee_name}</AssigneeChip>}
      {(task.subtask_count ?? 0) > 0 && (
        <Meta title="Подзадачи" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <LuClipboardList size={11} /> {task.completed_subtask_count}/{task.subtask_count}
        </Meta>
      )}
      {(task.comment_count ?? 0) > 0 && (
        <Meta title="Комментарии" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <LuMessageSquare size={11} /> {task.comment_count}
        </Meta>
      )}
      {task.due_date && (
        <Meta style={{ color: isOverdue ? '#ef4444' : undefined }}>
          {new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </Meta>
      )}
    </Row>
  );
}
