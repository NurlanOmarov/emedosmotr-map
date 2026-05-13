import styled from 'styled-components';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskopsTask, TaskopsTaskStatus } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import { PriorityBadge } from './StatusBadge';

// ─── Column ────────────────────────────────────────────────────────────────

const Column = styled.div<{ $isOver?: boolean; $isHiddenOnMobile?: boolean }>`
  display: flex;
  flex-direction: column;
  width: 280px;
  min-width: 280px;
  max-height: 100%;
  background: ${(p) => (p.$isOver ? p.theme.colors.bgHover : p.theme.colors.bgSecondary + '66')};
  border-radius: 12px;
  border: 1px solid ${(p) => p.theme.colors.border};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  @media (max-width: 768px) {
    display: ${(p) => (p.$isHiddenOnMobile ? 'none' : 'flex')};
    width: 100%;
    min-width: 100%;
    border: none;
    background: transparent;
  }
`;

const ColumnHeader = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  flex-shrink: 0;
`;

const ColumnDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`;

const ColumnTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  flex: 1;
`;

const ColumnCount = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
  background: ${(p) => p.theme.colors.bgCard};
  border-radius: 10px;
  padding: 1px 7px;
`;

const ColumnBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100px;
  scrollbar-width: thin;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${(p) => p.theme.colors.border}; border-radius: 10px; }
`;

// ─── Card ────────────────────────────────────────────────────────────────────

const Card = styled.div<{ $isDragging?: boolean; $selected?: boolean }>`
  background: ${(p) => (p.$selected ? p.theme.colors.bgHover : p.theme.colors.bgCard)};
  border: 1px solid ${(p) => (p.$selected ? p.theme.colors.primary : p.theme.colors.border)};
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  opacity: ${(p) => (p.$isDragging ? 0.4 : 1)};
  transition: all 0.18s ease-out;
  box-shadow: ${(p) => (p.$isDragging ? p.theme.shadows.lg : '0 1px 2px rgba(0,0,0,0.05)')};

  &:hover {
    border-color: ${(p) => (p.$selected ? p.theme.colors.primary : p.theme.colors.borderHover)};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  @media (max-width: 640px) {
    padding: 14px;
  }
`;

const CardTitle = styled.div`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textPrimary};
  line-height: 1.4;
  margin-bottom: 8px;
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const AssigneeChip = styled.span`
  font-size: 10px;
  color: ${(p) => p.theme.colors.textSecondary};
  background: ${(p) => p.theme.colors.bgSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  padding: 1px 7px;
`;

const DueDate = styled.span<{ $overdue?: boolean }>`
  font-size: 10px;
  color: ${(p) => (p.$overdue ? '#ef4444' : p.theme.colors.textSecondary)};
  margin-left: auto;
`;

const LabelPip = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`;

// ─── SortableCard ──────────────────────────────────────────────────────────

interface CardProps {
  task: TaskopsTask;
  selected?: boolean;
  onClick?: () => void;
}

export function SortableCard({ task, selected, onClick }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'done' &&
    task.status !== 'cancelled';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      $isDragging={isDragging}
      $selected={selected}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <CardTitle>{task.title}</CardTitle>
      <CardMeta>
        <PriorityBadge priority={task.priority} />
        {task.labels.map((l) => (
          <LabelPip key={l.id} $color={l.color} title={l.name} />
        ))}
        {task.assignee_name && <AssigneeChip>{task.assignee_name}</AssigneeChip>}
        {task.due_date && (
          <DueDate $overdue={!!isOverdue}>
            {new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </DueDate>
        )}
      </CardMeta>
    </Card>
  );
}

// ─── DroppableColumn ──────────────────────────────────────────────────────

interface ColumnProps {
  status: TaskopsTaskStatus;
  tasks: TaskopsTask[];
  selectedTaskId?: string | null;
  onTaskClick?: (taskId: string) => void;
  $isHiddenOnMobile?: boolean;
}

export function DroppableColumn({ status, tasks, selectedTaskId, onTaskClick, $isHiddenOnMobile }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <Column $isOver={isOver} $isHiddenOnMobile={$isHiddenOnMobile}>
      <ColumnHeader $color={STATUS_COLORS[status]}>
        <ColumnDot $color={STATUS_COLORS[status]} />
        <ColumnTitle>{STATUS_LABELS[status]}</ColumnTitle>
        <ColumnCount>{tasks.length}</ColumnCount>
      </ColumnHeader>
      <ColumnBody ref={setNodeRef}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableCard
              key={task.id}
              task={task}
              selected={selectedTaskId === task.id}
              onClick={() => onTaskClick?.(task.id)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: '#6b7280',
              padding: '16px 0',
              pointerEvents: 'none',
            }}
          >
            Перетащите задачи сюда
          </div>
        )}
      </ColumnBody>
    </Column>
  );
}
