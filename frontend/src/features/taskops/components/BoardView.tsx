import { useState } from 'react';
import styled from 'styled-components';
import {
  DndContext,
  DragEndEvent,
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

const Board = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  align-items: flex-start;
`;

const COLUMNS: TaskopsTaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

interface Props {
  projectId: string;
  tasks: TaskopsTask[];
  selectedTaskId?: string | null;
  onTaskClick?: (taskId: string) => void;
}

export function BoardView({ projectId, tasks, selectedTaskId, onTaskClick }: Props) {
  const qc = useQueryClient();
  const [activeTask, setActiveTask] = useState<TaskopsTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const tasksByStatus = COLUMNS.reduce(
    (acc, status) => ({
      ...acc,
      [status]: tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position),
    }),
    {} as Record<TaskopsTaskStatus, TaskopsTask[]>
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(tasks.find((t) => t.id === active.id) ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    // Target: either a column id or a card's task id
    const overTask = tasks.find((t) => t.id === over.id);
    const targetStatus: TaskopsTaskStatus = overTask
      ? overTask.status
      : (COLUMNS.includes(over.id as TaskopsTaskStatus) ? (over.id as TaskopsTaskStatus) : draggedTask.status);

    if (draggedTask.status === targetStatus) return;

    // Optimistic update
    const queryKey = ['taskops', 'tasks', projectId, { per_page: 200 }];
    qc.setQueryData<{ items: TaskopsTask[] }>(queryKey, (old) =>
      old
        ? { ...old, items: old.items.map((t) => (t.id === draggedTask.id ? { ...t, status: targetStatus } : t)) }
        : old
    );
    qc.setQueryData<TaskopsTask>(['taskops', 'task', draggedTask.id], (old) =>
      old ? { ...old, status: targetStatus } : old
    );

    api
      .patch(`/v1/taskops/tasks/${draggedTask.id}`, { status: targetStatus })
      .catch(() => qc.invalidateQueries({ queryKey: ['taskops', 'tasks', projectId] }));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Board>
        {COLUMNS.map((status) => (
          <DroppableColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status] ?? []}
            selectedTaskId={selectedTaskId}
            onTaskClick={onTaskClick}
          />
        ))}
      </Board>

      <DragOverlay>
        {activeTask && <SortableCard task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
}
