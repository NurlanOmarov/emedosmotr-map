import styled from 'styled-components';
import type { TaskopsTask } from '../types';
import { StatusBadge, PriorityBadge } from './StatusBadge';

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
`;

const Title = styled.span`
  flex: 1;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

export function TaskRow({ task, selected, onClick }: TaskRowProps) {
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'done' &&
    task.status !== 'cancelled';

  return (
    <Row $selected={selected} onClick={onClick}>
      <StatusBadge status={task.status} />
      <Title>{task.title}</Title>
      <PriorityBadge priority={task.priority} />
      {task.assignee_name && <AssigneeChip>{task.assignee_name}</AssigneeChip>}
      {task.due_date && (
        <Meta style={{ color: isOverdue ? '#ef4444' : undefined }}>
          {new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </Meta>
      )}
    </Row>
  );
}
