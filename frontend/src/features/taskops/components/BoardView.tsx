import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { DroppableColumn, SortableCard } from './TaskBoardColumn';
import type { TaskopsTask, TaskopsTaskStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../types';

const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const MobileTabs = styled.div`
  display: none;
  padding: 8px 16px;
  gap: 8px;
  overflow-x: auto;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.bgSecondary};
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MobileTab = styled.button<{ $active: boolean; $color: string }>`
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid ${(p) => (p.$active ? p.$color : p.theme.colors.border)};
  background: ${(p) => (p.$active ? p.$color + '22' : p.theme.colors.bgCard)};
  color: ${(p) => (p.$active ? p.$color : p.theme.colors.textSecondary)};
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
`;

const Board = styled.div`
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  overflow-x: auto;
  overflow-y: hidden;
  align-items: flex-start;
  background: ${(p) => p.theme.colors.bg};

  @media (max-width: 768px) {
    padding: 12px;
    gap: 0;
    overflow-x: hidden; /* We'll use tabs to switch */
  }
`;

const COLUMNS: TaskopsTaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

interface Props {
  projectId?: string | null;
  tasks: TaskopsTask[];
  selectedTaskId?: string | null;
  onTaskClick?: (taskId: string) => void;
}

export function BoardView({ projectId: _projectId = null, tasks, selectedTaskId, onTaskClick }: Props) {
  const qc = useQueryClient();
  const [activeTask, setActiveTask] = useState<TaskopsTask | null>(null);
  const [localTasks, setLocalTasks] = useState<TaskopsTask[]>(tasks);
  const [mobileActiveStatus, setMobileActiveStatus] = useState<TaskopsTaskStatus>('todo');

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const tasksByStatus = COLUMNS.reduce(
    (acc, status) => ({
      ...acc,
      [status]: localTasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position),
    }),
    {} as Record<TaskopsTaskStatus, TaskopsTask[]>
  );

  const resolveTargetStatus = (overId: string, currentTasks: TaskopsTask[], fallback: TaskopsTaskStatus): TaskopsTaskStatus => {
    const overTask = currentTasks.find((t) => t.id === overId);
    if (overTask) return overTask.status;
    if (COLUMNS.includes(overId as TaskopsTaskStatus)) return overId as TaskopsTaskStatus;
    return fallback;
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(localTasks.find((t) => t.id === active.id) ?? null);
  };

  // Update local state mid-drag so SortableContext knows the card changed columns
  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const draggedTask = localTasks.find((t) => t.id === active.id);
    if (!draggedTask) return;
    const targetStatus = resolveTargetStatus(String(over.id), localTasks, draggedTask.status);
    if (draggedTask.status === targetStatus) return;
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === draggedTask.id ? { ...t, status: targetStatus } : t))
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;

    const originalTask = tasks.find((t) => t.id === active.id);
    if (!originalTask) return;

    const draggedTask = localTasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    const targetStatus = draggedTask.status; // already updated by onDragOver

    if (originalTask.status === targetStatus) return;

    // Sync optimistic update to query cache
    const updateTaskInPaginated = (old: any) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.map((t) => (t.id === draggedTask.id ? { ...t, status: targetStatus } : t));
      }
      if (old.items) {
        return {
          ...old,
          items: old.items.map((t: any) => (t.id === draggedTask.id ? { ...t, status: targetStatus } : t)),
        };
      }
      return old;
    };

    qc.setQueriesData({ queryKey: ['taskops', 'inbox'] }, updateTaskInPaginated);
    qc.setQueriesData({ queryKey: ['taskops', 'tasks'] }, updateTaskInPaginated);
    qc.setQueriesData({ queryKey: ['taskops', 'assigned'] }, updateTaskInPaginated);
    qc.setQueryData(['taskops', 'task', draggedTask.id], (old: any) =>
      old ? { ...old, status: targetStatus } : old
    );

    api
      .patch(`/v1/taskops/tasks/${draggedTask.id}`, { status: targetStatus })
      .catch(() => {
        setLocalTasks(tasks);
        qc.invalidateQueries({ queryKey: ['taskops', 'inbox'] });
        qc.invalidateQueries({ queryKey: ['taskops', 'tasks'] });
        qc.invalidateQueries({ queryKey: ['taskops', 'assigned'] });
      });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <BoardContainer>
        <MobileTabs>
          {COLUMNS.map((s) => (
            <MobileTab
              key={s}
              $active={mobileActiveStatus === s}
              $color={STATUS_COLORS[s]}
              onClick={() => setMobileActiveStatus(s)}
            >
              {STATUS_LABELS[s]} {tasksByStatus[s]?.length || 0}
            </MobileTab>
          ))}
        </MobileTabs>

        <Board>
          {COLUMNS.map((status) => (
            <DroppableColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status] ?? []}
              selectedTaskId={selectedTaskId}
              onTaskClick={onTaskClick}
              $isHiddenOnMobile={mobileActiveStatus !== status}
            />
          ))}
        </Board>
      </BoardContainer>

      <DragOverlay>
        {activeTask && <SortableCard task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
}
