import { useMemo, useRef } from 'react';
import styled from 'styled-components';
import type { TaskopsTask } from '../types';
import { STATUS_COLORS } from '../types';

const DAY_W = 32; // px per day
const ROW_H = 36;
const LEFT_W = 220;
const HEADER_H = 32;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const Container = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const LeftPane = styled.div`
  width: ${LEFT_W}px;
  min-width: ${LEFT_W}px;
  border-right: 1px solid ${(p) => p.theme.colors.border};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const LeftHeader = styled.div`
  height: ${HEADER_H}px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.bgSecondary};
  display: flex;
  align-items: center;
  padding: 0 14px;
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
`;

const LeftRows = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
`;

const LeftRow = styled.div<{ $selected?: boolean }>`
  height: ${ROW_H}px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  font-size: 12px;
  color: ${(p) => p.theme.colors.textPrimary};
  cursor: pointer;
  background: ${(p) => (p.$selected ? p.theme.colors.bgHover : 'transparent')};
  &:hover { background: ${(p) => p.theme.colors.bgHover}; }
`;

const TaskTitle = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RightPane = styled.div`
  flex: 1;
  overflow: auto;
  position: relative;
`;

const TimelineInner = styled.div<{ $totalW: number; $totalH: number }>`
  width: ${(p) => p.$totalW}px;
  min-height: ${(p) => p.$totalH}px;
  position: relative;
`;

const HeaderRow = styled.div`
  height: ${HEADER_H}px;
  position: sticky;
  top: 0;
  z-index: 5;
  background: ${(p) => p.theme.colors.bgSecondary};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
`;

const WeekLabel = styled.div<{ $w: number }>`
  width: ${(p) => p.$w}px;
  min-width: ${(p) => p.$w}px;
  border-right: 1px solid ${(p) => p.theme.colors.border};
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
  display: flex;
  align-items: center;
  padding: 0 6px;
  white-space: nowrap;
`;

const GridLine = styled.div<{ $left: number; $isToday?: boolean }>`
  position: absolute;
  top: ${HEADER_H}px;
  left: ${(p) => p.$left}px;
  width: 1px;
  bottom: 0;
  background: ${(p) =>
    p.$isToday ? p.theme.colors.primary : p.theme.colors.border};
  opacity: ${(p) => (p.$isToday ? 0.6 : 0.4)};
  z-index: 1;
`;

const TaskBar = styled.div<{ $left: number; $width: number; $top: number; $color: string }>`
  position: absolute;
  left: ${(p) => p.$left}px;
  width: ${(p) => Math.max(p.$width, DAY_W)}px;
  top: ${(p) => p.$top}px;
  height: 22px;
  background: ${(p) => p.$color};
  border-radius: 4px;
  opacity: 0.85;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0 7px;
  font-size: 11px;
  color: #fff;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  z-index: 2;
  transition: opacity 0.1s;
  &:hover { opacity: 1; }
`;

const TodayLine = styled.div<{ $left: number }>`
  position: absolute;
  top: 0;
  left: ${(p) => p.$left}px;
  width: 2px;
  bottom: 0;
  background: ${(p) => p.theme.colors.primary};
  z-index: 4;
  pointer-events: none;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 14px;
  gap: 8px;
`;

function startOfWeek(d: Date) {
  const c = new Date(d);
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function formatWeek(d: Date) {
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

interface Props {
  tasks: TaskopsTask[];
  selectedTaskId?: string | null;
  onTaskClick?: (id: string) => void;
}

export function GanttView({ tasks, selectedTaskId, onTaskClick }: Props) {
  const rightRef = useRef<HTMLDivElement>(null);
  const leftRowsRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Show tasks that have at least a due_date
  const visibleTasks = useMemo(
    () => tasks.filter((t) => t.due_date || t.start_date),
    [tasks]
  );

  // Timeline range: 2 weeks before today → 10 weeks after
  const rangeStart = useMemo(() => startOfWeek(addDays(today, -14)), [today]);
  const rangeEnd = useMemo(() => addDays(rangeStart, 84), [rangeStart]); // 12 weeks total
  const totalDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000);
  const totalW = totalDays * DAY_W;
  const totalH = visibleTasks.length * ROW_H + HEADER_H;

  const todayOffset = Math.round((today.getTime() - rangeStart.getTime()) / 86400000) * DAY_W;

  // Week grid lines + labels
  const weeks = useMemo(() => {
    const result: { date: Date; left: number }[] = [];
    let d = new Date(rangeStart);
    while (d < rangeEnd) {
      const left = Math.round((d.getTime() - rangeStart.getTime()) / 86400000) * DAY_W;
      result.push({ date: new Date(d), left });
      d = addDays(d, 7);
    }
    return result;
  }, [rangeStart, rangeEnd]);

  function dayOffset(dateStr: string) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - rangeStart.getTime()) / 86400000) * DAY_W;
  }

  // Sync vertical scroll between left and right panes
  const syncScroll = (src: 'left' | 'right') => (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = (e.target as HTMLDivElement).scrollTop;
    if (src === 'right' && leftRowsRef.current) leftRowsRef.current.scrollTop = scrollTop;
    if (src === 'left' && rightRef.current) rightRef.current.scrollTop = scrollTop;
  };

  if (visibleTasks.length === 0) {
    return (
      <EmptyState>
        <span style={{ fontSize: 32 }}>📅</span>
        <span>Нет задач с датами</span>
        <span style={{ fontSize: 12 }}>Добавьте срок выполнения к задачам</span>
      </EmptyState>
    );
  }

  return (
    <Wrapper>
      <Container>
        <LeftPane>
          <LeftHeader>Задача</LeftHeader>
          <LeftRows ref={leftRowsRef} onScroll={syncScroll('left')}>
            {visibleTasks.map((task) => (
              <LeftRow
                key={task.id}
                $selected={selectedTaskId === task.id}
                onClick={() => onTaskClick?.(task.id)}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: STATUS_COLORS[task.status],
                    flexShrink: 0,
                    marginRight: 8,
                  }}
                />
                <TaskTitle>{task.title}</TaskTitle>
              </LeftRow>
            ))}
          </LeftRows>
        </LeftPane>

        <RightPane ref={rightRef} onScroll={syncScroll('right')}>
          <TimelineInner $totalW={totalW} $totalH={totalH}>
            <HeaderRow>
              {weeks.map((w, i) => (
                <WeekLabel key={i} $w={DAY_W * 7}>
                  {formatWeek(w.date)}
                </WeekLabel>
              ))}
            </HeaderRow>

            {weeks.map((w, i) => (
              <GridLine key={i} $left={w.left} />
            ))}

            <TodayLine $left={todayOffset} />

            {visibleTasks.map((task, idx) => {
              const start = task.start_date || task.due_date!;
              const end = task.due_date || task.start_date!;
              const left = dayOffset(start);
              const endLeft = dayOffset(end) + DAY_W;
              const width = Math.max(endLeft - left, DAY_W);
              const top = HEADER_H + idx * ROW_H + (ROW_H - 22) / 2;

              return (
                <TaskBar
                  key={task.id}
                  $left={left}
                  $width={width}
                  $top={top}
                  $color={STATUS_COLORS[task.status]}
                  onClick={() => onTaskClick?.(task.id)}
                  title={task.title}
                >
                  {task.title}
                </TaskBar>
              );
            })}
          </TimelineInner>
        </RightPane>
      </Container>
    </Wrapper>
  );
}
