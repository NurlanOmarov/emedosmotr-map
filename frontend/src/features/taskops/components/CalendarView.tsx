import { useState, useMemo } from 'react';
import styled from 'styled-components';
import type { TaskopsTask } from '../types';
import { STATUS_COLORS } from '../types';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  flex-shrink: 0;
`;

const MonthTitle = styled.h2`
  font-size: 15px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0;
  flex: 1;
`;

const NavBtn = styled.button`
  background: none;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 14px;
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  &:hover { color: ${(p) => p.theme.colors.textPrimary}; background: ${(p) => p.theme.colors.bgHover}; }
`;

const TodayBtn = styled(NavBtn)`
  font-size: 12px;
`;

const Grid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 1fr;
  overflow: hidden;
`;

const DayHeader = styled.div`
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.theme.colors.textSecondary};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  border-right: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.bgSecondary};
`;

const DayCell = styled.div<{ $isToday?: boolean; $outside?: boolean }>`
  padding: 6px 8px;
  border-right: 1px solid ${(p) => p.theme.colors.border};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  overflow: hidden;
  background: ${(p) =>
    p.$isToday ? `${p.theme.colors.primary}12` : 'transparent'};
  opacity: ${(p) => (p.$outside ? 0.4 : 1)};
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DayNum = styled.div<{ $isToday?: boolean }>`
  font-size: 12px;
  font-weight: ${(p) => (p.$isToday ? 700 : 400)};
  color: ${(p) => (p.$isToday ? p.theme.colors.primary : p.theme.colors.textSecondary)};
  margin-bottom: 2px;
`;

const TaskChip = styled.div<{ $color: string }>`
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  background: ${(p) => p.$color}30;
  color: ${(p) => p.$color};
  border-left: 2px solid ${(p) => p.$color};
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  &:hover { background: ${(p) => p.$color}50; }
`;

const MORE = styled.div`
  font-size: 10px;
  color: ${(p) => p.theme.colors.textSecondary};
  padding: 1px 4px;
`;

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface Props {
  tasks: TaskopsTask[];
  onTaskClick?: (id: string) => void;
}

export function CalendarView({ tasks, onTaskClick }: Props) {
  const [offset, setOffset] = useState(0); // months from today

  const { year, month, days } = useMemo(() => {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + offset);
    const y = base.getFullYear();
    const m = base.getMonth();

    // First day of month (0=Sun..6=Sat), normalize to Mon=0
    const firstDow = new Date(y, m, 1).getDay();
    const startOffset = firstDow === 0 ? 6 : firstDow - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();

    const cells: { date: Date; outside: boolean }[] = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({ date: new Date(y, m - 1, daysInPrev - i), outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(y, m, d), outside: false });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: new Date(y, m + 1, cells.length - daysInMonth - startOffset + 1), outside: true });
    }

    return { year: y, month: m, days: cells };
  }, [offset]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskopsTask[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = t.due_date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  const monthName = new Date(year, month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <Wrapper>
      <Header>
        <NavBtn onClick={() => setOffset((o) => o - 1)}>‹</NavBtn>
        <MonthTitle style={{ textTransform: 'capitalize' }}>{monthName}</MonthTitle>
        {offset !== 0 && <TodayBtn onClick={() => setOffset(0)}>Сегодня</TodayBtn>}
        <NavBtn onClick={() => setOffset((o) => o + 1)}>›</NavBtn>
      </Header>

      <Grid>
        {WEEKDAYS.map((d) => (
          <DayHeader key={d}>{d}</DayHeader>
        ))}

        {days.map((cell, i) => {
          const key = cell.date.toISOString().slice(0, 10);
          const cellTasks = tasksByDate.get(key) ?? [];
          const isToday = cell.date.getTime() === today.getTime();

          return (
            <DayCell key={i} $isToday={isToday} $outside={cell.outside}>
              <DayNum $isToday={isToday}>{cell.date.getDate()}</DayNum>
              {cellTasks.slice(0, 3).map((t) => (
                <TaskChip
                  key={t.id}
                  $color={STATUS_COLORS[t.status]}
                  onClick={() => onTaskClick?.(t.id)}
                  title={t.title}
                >
                  {t.title}
                </TaskChip>
              ))}
              {cellTasks.length > 3 && (
                <MORE>+{cellTasks.length - 3} ещё</MORE>
              )}
            </DayCell>
          );
        })}
      </Grid>
    </Wrapper>
  );
}
