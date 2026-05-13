import { useMemo, useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  LuCalendar, 
  LuList, 
  LuPanelLeftClose, 
  LuMapPin 
} from 'react-icons/lu';
import type { TaskopsTask } from '../types';
import { STATUS_COLORS } from '../types';

const ROW_H = 38;
const LEFT_W_DEFAULT = 240;
const HEADER_H = 40;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: ${(p) => p.theme.colors.bg};
`;

const Toolbar = styled.div`
  height: 48px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  background: ${(p) => p.theme.colors.bgSecondary};
  flex-shrink: 0;

  @media (max-width: 640px) {
    padding: 0 8px;
    gap: 8px;
    overflow-x: auto;
    &::-webkit-scrollbar { display: none; }
  }
`;

const ToolbarButton = styled.button`
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  color: ${(p) => p.theme.colors.textPrimary};
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    background: ${(p) => p.theme.colors.bgHover};
    border-color: ${(p) => p.theme.colors.borderHover};
  }

  &:active {
    transform: translateY(1px);
  }
`;

const ZoomGroup = styled.div`
  display: flex;
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 2px;
`;

const ZoomButton = styled.button<{ $active?: boolean }>`
  background: ${(p) => (p.$active ? p.theme.colors.bg : 'transparent')};
  border: none;
  color: ${(p) => (p.$active ? p.theme.colors.textPrimary : p.theme.colors.textSecondary)};
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: ${(p) => (p.$active ? '0 1px 2px rgba(0,0,0,0.1)' : 'none')};
  transition: all 0.15s;

  &:hover {
    color: ${(p) => p.theme.colors.textPrimary};
  }
`;

const Container = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const LeftPane = styled.div<{ $collapsed: boolean }>`
  width: ${(p) => (p.$collapsed ? '0px' : `${LEFT_W_DEFAULT}px`)};
  min-width: ${(p) => (p.$collapsed ? '0px' : `${LEFT_W_DEFAULT}px`)};
  border-right: ${(p) => (p.$collapsed ? 'none' : `1px solid ${p.theme.colors.border}`)};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 768px) {
    width: ${(p) => (p.$collapsed ? '0px' : '180px')};
    min-width: ${(p) => (p.$collapsed ? '0px' : '180px')};
  }
`;

const LeftHeader = styled.div`
  height: ${HEADER_H}px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.bgSecondary};
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 11px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  flex-shrink: 0;
`;

const LeftRows = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const LeftRow = styled.div<{ $selected?: boolean; $isEven?: boolean }>`
  height: ${ROW_H}px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  font-size: 12px;
  color: ${(p) => p.theme.colors.textPrimary};
  cursor: pointer;
  background: ${(p) =>
    p.$selected
      ? p.theme.colors.bgHover
      : p.$isEven
      ? 'transparent'
      : p.theme.colors.bgSecondary + '44'};
  white-space: nowrap;
  
  &:hover {
    background: ${(p) => p.theme.colors.bgHover};
  }
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
  background: ${(p) => p.theme.colors.bg};
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
  z-index: 10;
  background: ${(p) => p.theme.colors.bgSecondary};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  backdrop-filter: blur(8px);
`;

const TimeLabel = styled.div<{ $w: number }>`
  width: ${(p) => p.$w}px;
  min-width: ${(p) => p.$w}px;
  border-right: 1px solid ${(p) => p.theme.colors.border};
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
`;

const GridLine = styled.div<{ $left: number }>`
  position: absolute;
  top: ${HEADER_H}px;
  left: ${(p) => p.$left}px;
  width: 1px;
  bottom: 0;
  background: ${(p) => p.theme.colors.border};
  opacity: 0.5;
  z-index: 1;
  pointer-events: none;
`;

const RowBackground = styled.div<{ $top: number; $isEven?: boolean }>`
  position: absolute;
  top: ${(p) => p.$top}px;
  left: 0;
  right: 0;
  height: ${ROW_H}px;
  background: ${(p) => (p.$isEven ? 'transparent' : p.theme.colors.bgSecondary + '44')};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  z-index: 0;
`;

const TaskBar = styled.div<{ $left: number; $width: number; $top: number; $color: string; $selected?: boolean }>`
  position: absolute;
  left: ${(p) => p.$left}px;
  width: ${(p) => Math.max(p.$width, 10)}px;
  top: ${(p) => p.$top}px;
  height: 24px;
  background: ${(p) => p.$color};
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  z-index: 5;
  transition: all 0.2s;
  border: 2px solid ${(p) => (p.$selected ? '#fff' : 'transparent')};
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    filter: brightness(1.1);
    z-index: 6;
  }
`;

const TodayLine = styled.div<{ $left: number }>`
  position: absolute;
  top: 0;
  left: ${(p) => p.$left}px;
  width: 2px;
  bottom: 0;
  background: ${(p) => p.theme.colors.primary};
  z-index: 8;
  pointer-events: none;
  
  &::after {
    content: 'Сегодня';
    position: absolute;
    top: 45px;
    left: 4px;
    background: ${(p) => p.theme.colors.primary};
    color: #fff;
    font-size: 9px;
    padding: 2px 4px;
    border-radius: 3px;
    font-weight: 700;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 14px;
  gap: 12px;
  text-align: center;
  padding: 20px;
`;

type ZoomLevel = 'day' | 'week' | 'month';

const ZOOM_CONFIG = {
  day: { width: 40, label: 'Дни', format: (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) },
  week: { width: 120, label: 'Недели', format: (d: Date) => `Нед ${getWeekNumber(d)}, ${d.getFullYear()}` },
  month: { width: 200, label: 'Месяцы', format: (d: Date) => d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) },
};

function getWeekNumber(d: Date) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function startOfRange(d: Date, zoom: ZoomLevel) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  if (zoom === 'day') c.setDate(c.getDate() - 7);
  else if (zoom === 'week') c.setDate(c.getDate() - 28);
  else {
    c.setDate(1);
    c.setMonth(c.getMonth() - 3);
  }
  return c;
}

function addStep(d: Date, zoom: ZoomLevel) {
  const c = new Date(d);
  if (zoom === 'day') c.setDate(c.getDate() + 1);
  else if (zoom === 'week') c.setDate(c.getDate() + 7);
  else c.setMonth(c.getMonth() + 1);
  return c;
}

interface Props {
  tasks: TaskopsTask[];
  selectedTaskId?: string | null;
  onTaskClick?: (id: string) => void;
}

export function GanttView({ tasks, selectedTaskId, onTaskClick }: Props) {
  const rightRef = useRef<HTMLDivElement>(null);
  const leftRowsRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 768);
  const [zoom, setZoom] = useState<ZoomLevel>('day');

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const visibleTasks = useMemo(
    () => tasks.filter((t) => t.due_date || t.start_date),
    [tasks]
  );

  const rangeStart = useMemo(() => startOfRange(today, zoom), [today, zoom]);
  const rangeEnd = useMemo(() => {
    const d = new Date(rangeStart);
    if (zoom === 'day') d.setDate(d.getDate() + 60);
    else if (zoom === 'week') d.setDate(d.getDate() + 180);
    else d.setMonth(d.getMonth() + 12);
    return d;
  }, [rangeStart, zoom]);

  const stepW = ZOOM_CONFIG[zoom].width;
  
  const timeSteps = useMemo(() => {
    const result: { date: Date; left: number }[] = [];
    let d = new Date(rangeStart);
    let i = 0;
    while (d < rangeEnd) {
      result.push({ date: new Date(d), left: i * stepW });
      d = addStep(d, zoom);
      i++;
    }
    return result;
  }, [rangeStart, rangeEnd, zoom, stepW]);

  const totalW = timeSteps.length * stepW;
  const totalH = visibleTasks.length * ROW_H + HEADER_H;

  const getOffset = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const msDiff = d.getTime() - rangeStart.getTime();
    const daysDiff = msDiff / 86400000;
    
    if (zoom === 'day') return daysDiff * stepW;
    if (zoom === 'week') return (daysDiff / 7) * stepW;
    
    // Monthly is trickier due to variable month lengths
    let months = (d.getFullYear() - rangeStart.getFullYear()) * 12 + (d.getMonth() - rangeStart.getMonth());
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const monthFraction = (d.getDate() - 1) / daysInMonth;
    return (months + monthFraction) * stepW;
  };

  const todayOffset = getOffset(today.toISOString());

  const scrollToToday = () => {
    if (rightRef.current) {
      rightRef.current.scrollLeft = todayOffset - rightRef.current.clientWidth / 3;
    }
  };

  useEffect(() => {
    const timer = setTimeout(scrollToToday, 100);
    return () => clearTimeout(timer);
  }, [zoom]);

  const syncScroll = (src: 'left' | 'right') => (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = (e.target as HTMLDivElement).scrollTop;
    if (src === 'right' && leftRowsRef.current) leftRowsRef.current.scrollTop = scrollTop;
    if (src === 'left' && rightRef.current) rightRef.current.scrollTop = scrollTop;
  };

  if (visibleTasks.length === 0) {
    return (
      <EmptyState>
        <LuCalendar size={48} style={{ opacity: 0.3 }} />
        <div style={{ fontWeight: 600, fontSize: 16 }}>Нет задач с датами</div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Добавьте срок выполнения к задачам, чтобы они появились на таймлайне
        </div>
      </EmptyState>
    );
  }

  return (
    <Wrapper>
      <Toolbar>
        <ToolbarButton onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <><LuList size={14} /> Список</> : <><LuPanelLeftClose size={14} /> Скрыть</>}
        </ToolbarButton>
        
        <ToolbarButton onClick={scrollToToday}>
          <LuMapPin size={14} /> Сегодня
        </ToolbarButton>

        <div style={{ flex: 1 }} />

        <ZoomGroup>
          {(['day', 'week', 'month'] as ZoomLevel[]).map((z) => (
            <ZoomButton
              key={z}
              $active={zoom === z}
              onClick={() => setZoom(z)}
            >
              {ZOOM_CONFIG[z].label}
            </ZoomButton>
          ))}
        </ZoomGroup>
      </Toolbar>

      <Container>
        <LeftPane $collapsed={isCollapsed}>
          <LeftHeader>Задача</LeftHeader>
          <LeftRows ref={leftRowsRef} onScroll={syncScroll('left')}>
            {visibleTasks.map((task, i) => (
              <LeftRow
                key={task.id}
                $selected={selectedTaskId === task.id}
                $isEven={i % 2 === 0}
                onClick={() => onTaskClick?.(task.id)}
                title={task.title}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: STATUS_COLORS[task.status],
                    flexShrink: 0,
                    marginRight: 10,
                    boxShadow: `0 0 4px ${STATUS_COLORS[task.status]}aa`
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
              {timeSteps.map((s, i) => (
                <TimeLabel key={i} $w={stepW}>
                  {ZOOM_CONFIG[zoom].format(s.date)}
                </TimeLabel>
              ))}
            </HeaderRow>

            {timeSteps.map((s, i) => (
              <GridLine key={i} $left={s.left} />
            ))}

            {visibleTasks.map((_, i) => (
              <RowBackground
                key={i}
                $top={HEADER_H + i * ROW_H}
                $isEven={i % 2 === 0}
              />
            ))}

            <TodayLine $left={todayOffset} />

            {visibleTasks.map((task, idx) => {
              const start = task.start_date || task.due_date!;
              const end = task.due_date || task.start_date!;
              const left = getOffset(start);
              const endX = getOffset(end) + (zoom === 'day' ? stepW : zoom === 'week' ? stepW / 7 : stepW / 30);
              const width = Math.max(endX - left, 12);
              const top = HEADER_H + idx * ROW_H + (ROW_H - 24) / 2;

              return (
                <TaskBar
                  key={task.id}
                  $left={left}
                  $width={width}
                  $top={top}
                  $color={STATUS_COLORS[task.status]}
                  $selected={selectedTaskId === task.id}
                  onClick={() => onTaskClick?.(task.id)}
                  title={`${task.title}\nСтатус: ${task.status}\nСрок: ${new Date(end).toLocaleDateString()}`}
                >
                  {width > 60 && task.title}
                </TaskBar>
              );
            })}
          </TimelineInner>
        </RightPane>
      </Container>
    </Wrapper>
  );
}

