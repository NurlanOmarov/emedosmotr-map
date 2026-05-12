import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsService } from '@/services/websocket';
import type { TaskopsTask, TaskopsComment } from '../types';

export function useTaskopsWS(projectId?: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    wsService.connect('/ws/taskops');

    const offTaskCreated = wsService.on('taskops:task:created', (data: TaskopsTask) => {
      if (projectId && data.project_id !== projectId) return;
      qc.invalidateQueries({ queryKey: ['taskops', 'tasks', data.project_id] });
      qc.invalidateQueries({ queryKey: ['taskops', 'inbox'] });
    });

    const offTaskUpdated = wsService.on('taskops:task:updated', (data: TaskopsTask) => {
      // Update individual task cache
      qc.setQueryData<TaskopsTask>(['taskops', 'task', data.id], (old) =>
        old ? { ...old, ...data } : data
      );
      // Update list cache (status may have changed)
      qc.setQueryData<{ items: TaskopsTask[] }>(
        ['taskops', 'tasks', data.project_id, { per_page: 200 }],
        (old) =>
          old
            ? { ...old, items: old.items.map((t) => (t.id === data.id ? { ...t, ...data } : t)) }
            : old
      );
      qc.invalidateQueries({ queryKey: ['taskops', 'inbox'] });
    });

    const offTaskDeleted = wsService.on('taskops:task:deleted', (data: { id: string; project_id: string }) => {
      qc.setQueryData<{ items: TaskopsTask[] }>(
        ['taskops', 'tasks', data.project_id, { per_page: 200 }],
        (old) => old ? { ...old, items: old.items.filter((t) => t.id !== data.id) } : old
      );
      qc.invalidateQueries({ queryKey: ['taskops', 'inbox'] });
    });

    const offCommentCreated = wsService.on('taskops:comment:created', (data: TaskopsComment) => {
      qc.invalidateQueries({ queryKey: ['taskops', 'comments', data.task_id] });
    });

    const offCycleClosed = wsService.on('taskops:cycle:closed', (data: { project_id: string }) => {
      qc.invalidateQueries({ queryKey: ['taskops', 'cycles', data.project_id] });
      qc.invalidateQueries({ queryKey: ['taskops', 'tasks', data.project_id] });
    });

    return () => {
      offTaskCreated();
      offTaskUpdated();
      offTaskDeleted();
      offCommentCreated();
      offCycleClosed();
    };
  }, [projectId, qc]);
}
