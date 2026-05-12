import { useRef, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import type { TaskopsTask } from '../types';
import { TaskRow } from './TaskRow';

// Shows tasks in batches of PAGE_SIZE; loads more when user scrolls near bottom.
const PAGE_SIZE = 50;

const Scroll = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const Sentinel = styled.div`
  height: 1px;
`;

interface Props {
  tasks: TaskopsTask[];
  selectedTaskId?: string | null;
  onTaskClick?: (id: string) => void;
}

export function VirtualTaskList({ tasks, selectedTaskId, onTaskClick }: Props) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const visible = tasks.slice(0, limit);

  const loadMore = useCallback(() => {
    setLimit((l) => Math.min(l + PAGE_SIZE, tasks.length));
  }, [tasks.length]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [tasks.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <Scroll>
      {visible.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          selected={selectedTaskId === task.id}
          onClick={() => onTaskClick?.(task.id)}
        />
      ))}
      {limit < tasks.length && <Sentinel ref={sentinelRef} />}
    </Scroll>
  );
}
