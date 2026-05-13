import { useState, useMemo } from 'react';
import styled, { css } from 'styled-components';
import type { TaskopsTask } from '../types';
import { STATUS_COLORS } from '../types';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: ${(p) => p.theme.colors.bg};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.bgSecondary};
  flex-shrink: 0;
  gap: 16px;

  @media (max-width: 640px) {
    padding: 12px 16px;
    gap: 8px;
  }
`;

const MonthTitle = styled.h2`
  font-size: 17px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0;
  flex: 1;
  text-transform: capitalize;
`;

const NavGroup = styled.div`
  display: flex;
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 2px;
`;

const NavBtn = styled.button`
  background: none;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 16px;
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover {
    background: ${(p) => p.theme.colors.bgHover};
    color: ${(p) => p.theme.colors.textPrimary};
  }

  &:active {
    transform: scale(0.95);
  }
`;

const TodayBtn = styled.button`
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${(p) => p.theme.colors.primary};
    background: ${(p) => p.theme.colors.bgHover};
  }
`;

const Grid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 1fr;
  overflow: hidden;
  border-left: 1px solid ${(p) => p.theme.colors.border};
  border-top: 1px solid ${(p) => p.theme.colors.border};

  @media (max-width: 768px) {
    grid-auto-rows: minmax(80px, 1fr);
    overflow-y: auto;
  }
`;

const DayHeader = styled.div`
  padding: 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${(p) => p.theme.colors.textSecondary};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  border-right: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.bgSecondary};
  text-align: center;
`;

const DayCell = styled.div<{ $isToday?: boolean; $outside?: boolean }>`
  padding: 8px;
  border-right: 1px solid ${(p) => p.theme.colors.border};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  overflow: hidden;
  background: ${(p) =>
    p.$isToday ? p.theme.colors.bg : 'transparent'};
  opacity: ${(p) => (p.$outside ? 0.35 : 1)};
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: background 0.2s;

  &:hover {
    background: ${(p) => p.theme.colors.bgHover + '33'};
  }
`;

const DayNum = styled.div<{ $isToday?: boolean }>`
  font-size: 13px;
  font-weight: ${(p) => (p.$isToday ? 800 : 500)};
  color: ${(p) => (p.$isToday ? p.theme.colors.primary : p.theme.colors.textSecondary)};
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  ${(p) =>
    p.$isToday &&
    css`
      &::after {
        content: 'Сегодня';
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        background: ${p.theme.colors.primary};
        color: #fff;
        padding: 1px 5px;
        border-radius: 4px;
      }
    `}
`;

const TaskChip = styled.div<{ $color: string }>`
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  background: ${(p) => p.$color}15;
  color: ${(p) => p.$color};
  border-left: 3px solid ${(p) => p.$color};
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);

  &:hover {
    background: ${(p) => p.$color}25;
    transform: translateX(2px);
  }
`;

const MoreTasks = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textSecondary};
  padding: 2px 6px;
  background: ${(p) => p.theme.colors.bgSecondary};
  border-radius: 4px;
  align-self: flex-start;
  margin-top: 2px;
`;

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface Props {
  tasks: TaskopsTask[];
  onTaskClick?: (id: string) => void;
}

export function CalendarView({ tasks, onTaskClick }: Props) {
  const [offset, setOffset] = useState(0);

  const { year, month, days } = useMemo(() => {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + offset);
    const y = base.getFullYear();
    const m = base.getMonth();

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
        <MonthTitle>{monthName}</MonthTitle>
        <TodayBtn onClick={() => setOffset(0)}>Сегодня</TodayBtn>
        <NavGroup>
          <NavBtn onClick={() => setOffset((o) => o - 1)}>‹</NavBtn>
          <NavBtn onClick={() => setOffset((o) => o + 1)}>›</NavBtn>
        </NavGroup>
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
              {cellTasks.slice(0, 4).map((t) => (
                <TaskChip
                  key={t.id}
                  $color={STATUS_COLORS[t.status]}
                  onClick={() => onTaskClick?.(t.id)}
                  title={t.title}
                >
                  {t.title}
                </TaskChip>
              ))}
              {cellTasks.length > 4 && (
                <MoreTasks>+{cellTasks.length - 4} ещё</MoreTasks>
              )}
            </DayCell>
          );
        })}
      </Grid>
    </Wrapper>
  );
}

