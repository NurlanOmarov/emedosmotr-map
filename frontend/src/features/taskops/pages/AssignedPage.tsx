import styled from 'styled-components';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  LuList, 
  LuColumns2, 
  LuInbox, 
  LuSearch, 
  LuUser, 
  LuChevronDown, 
  LuTriangleAlert 
} from 'react-icons/lu';
import { useMyAssigned } from '../api';
import { TaskRow } from '../components/TaskRow';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { BoardView } from '../components/BoardView';
import { useTaskopsStore } from '../store/useTaskopsStore';
import type { TaskopsTask } from '../types';
import { STATUS_LABELS } from '../types';

// ─── Styled ────────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  height: 100%;
`;

const Main = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PageHeader = styled.div`
  padding: 16px 24px 12px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 12px;
  flex-wrap: wrap;
`;

const PageTitle = styled.h1`
  font-size: 18px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0;
`;

const PageSubtitle = styled.p`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
  margin: 4px 0 0;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const ViewToggle = styled.div`
  display: flex;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 7px;
  overflow: hidden;
`;

const ViewBtn = styled.button<{ $active: boolean }>`
  background: ${(p) => p.$active ? p.theme.colors.primary : 'transparent'};
  color: ${(p) => p.$active ? '#fff' : p.theme.colors.textSecondary};
  border: none;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 4px;
  &:hover { background: ${(p) => p.$active ? p.theme.colors.primary : p.theme.colors.bgHover}; }
`;

const FilterBar = styled.div`
  padding: 8px 16px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  background: ${(p) => p.theme.colors.bgSecondary};
  flex-wrap: wrap;
`;

const FilterLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid ${(p) => p.$active ? p.theme.colors.primary : p.theme.colors.border};
  background: ${(p) => p.$active ? p.theme.colors.primary + '18' : 'transparent'};
  color: ${(p) => p.$active ? p.theme.colors.primary : p.theme.colors.textSecondary};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  &:hover { border-color: ${(p) => p.theme.colors.primary}; }
`;

const DoneToggle = styled.button<{ $active: boolean }>`
  background: ${(p) => p.$active ? p.theme.colors.bgHover : 'transparent'};
  color: ${(p) => p.theme.colors.textSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 7px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
`;

const TaskList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const AssigneeGroup = styled.div``;

const AssigneeHeader = styled.div<{ $collapsed: boolean }>`
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.theme.colors.textSecondary};
  background: ${(p) => p.theme.colors.bgSecondary};
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
  &:hover { background: ${(p) => p.theme.colors.bgHover}; }
`;

const CollapseIcon = styled.span<{ $collapsed: boolean }>`
  display: inline-flex;
  align-items: center;
  transition: transform 0.2s;
  transform: ${(p) => p.$collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'};
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 10px;
`;

const Badge = styled.span`
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 10px;
  font-weight: 500;
`;

const OverdueBadge = styled.span`
  background: #fee2e2;
  color: #dc2626;
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 10px;
  font-weight: 600;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 240px;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 14px;
  gap: 8px;
`;

// ─── Component ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'] as const;

export function AssignedPage() {
  const [includeDone, setIncludeDone] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const { data: tasks = [], isLoading } = useMyAssigned(includeDone);
  const [, setSearchParams] = useSearchParams();
  const { activeTaskId, sidePanelOpen, openSidePanel, closeSidePanel } = useTaskopsStore();

  const handleOpenTask = (id: string) => {
    openSidePanel(id);
    setSearchParams({ task: id });
  };

  const handleCloseTask = () => {
    closeSidePanel();
    setSearchParams({});
  };

  const toggleCollapse = (name: string) =>
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));

  // Unique assignees for filter chips
  const assigneeNames = useMemo(() => {
    const names = new Set(tasks.map((t) => t.assignee_name ?? 'Без исполнителя'));
    return Array.from(names).sort();
  }, [tasks]);

  // Filtered tasks
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterAssignee && (t.assignee_name ?? 'Без исполнителя') !== filterAssignee) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      return true;
    });
  }, [tasks, filterAssignee, filterStatus]);

  // Group by assignee
  const byAssignee = useMemo(() => {
    return filtered.reduce<Record<string, TaskopsTask[]>>((acc, t) => {
      const name = t.assignee_name ?? 'Без исполнителя';
      if (!acc[name]) acc[name] = [];
      acc[name].push(t);
      return acc;
    }, {});
  }, [filtered]);

  const now = new Date();
  const countOverdue = (list: TaskopsTask[]) =>
    list.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'done' && t.status !== 'cancelled'
    ).length;

  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const doneTasks = tasks.filter((t) => t.status === 'done' || t.status === 'cancelled');
  const totalOverdue = countOverdue(tasks);


  return (
    <Container>
      <Main>
        <PageHeader>
          <div>
            <PageTitle>Я поручил</PageTitle>
            <PageSubtitle>
              {tasks.length > 0
                ? `${activeTasks.length} активных · ${doneTasks.length} завершённых${totalOverdue > 0 ? ` · ${totalOverdue} просрочено` : ''}`
                : 'Нет поручений'}
            </PageSubtitle>
          </div>
          <HeaderRight>
            <DoneToggle $active={includeDone} onClick={() => setIncludeDone((v) => !v)}>
              {includeDone ? 'Скрыть завершённые' : 'Показать завершённые'}
            </DoneToggle>
            <ViewToggle>
              <ViewBtn $active={viewMode === 'list'} onClick={() => setViewMode('list')} title="Список">
                <LuList size={14} /> Список
              </ViewBtn>
              <ViewBtn $active={viewMode === 'board'} onClick={() => setViewMode('board')} title="Доска">
                <LuColumns2 size={14} /> Доска
              </ViewBtn>
            </ViewToggle>
          </HeaderRight>
        </PageHeader>

        {viewMode === 'list' && (assigneeNames.length > 1 || filterStatus !== null) && (
          <FilterBar>
            <FilterLabel>Исполнитель:</FilterLabel>
            <FilterChip $active={filterAssignee === null} onClick={() => setFilterAssignee(null)}>
              Все
            </FilterChip>
            {assigneeNames.map((name) => (
              <FilterChip
                key={name}
                $active={filterAssignee === name}
                onClick={() => setFilterAssignee(filterAssignee === name ? null : name)}
              >
                {name}
              </FilterChip>
            ))}

            <FilterLabel style={{ marginLeft: 8 }}>Статус:</FilterLabel>
            <FilterChip $active={filterStatus === null} onClick={() => setFilterStatus(null)}>
              Все
            </FilterChip>
            {STATUS_OPTIONS.filter((s) => tasks.some((t) => t.status === s)).map((s) => (
              <FilterChip
                key={s}
                $active={filterStatus === s}
                onClick={() => setFilterStatus(filterStatus === s ? null : s)}
              >
                {STATUS_LABELS[s]}
              </FilterChip>
            ))}
          </FilterBar>
        )}

        {viewMode === 'board' ? (
          <BoardView
            tasks={filtered}
            selectedTaskId={activeTaskId}
            onTaskClick={handleOpenTask}
          />
        ) : (
          <TaskList>
            {isLoading && (
              <div style={{ padding: 20, color: '#9ca3af', fontSize: 13 }}>Загрузка...</div>
            )}

            {!isLoading && tasks.length === 0 && (
              <EmptyState>
                <LuInbox size={32} style={{ opacity: 0.3 }} />
                <span>Нет активных поручений</span>
                <span style={{ fontSize: 12 }}>Задачи, назначенные вами другим, появятся здесь</span>
              </EmptyState>
            )}

            {!isLoading && tasks.length > 0 && filtered.length === 0 && (
              <EmptyState>
                <LuSearch size={28} style={{ opacity: 0.3 }} />
                <span>Ничего не найдено</span>
                <FilterChip $active style={{ cursor: 'pointer' }} onClick={() => { setFilterAssignee(null); setFilterStatus(null); }}>
                  Сбросить фильтры
                </FilterChip>
              </EmptyState>
            )}

            {Object.entries(byAssignee).map(([assigneeName, assigneeTasks]) => {
              const isCollapsed = collapsed[assigneeName] ?? false;
              const overdue = countOverdue(assigneeTasks);
              return (
                <AssigneeGroup key={assigneeName}>
                  <AssigneeHeader $collapsed={isCollapsed} onClick={() => toggleCollapse(assigneeName)}>
                    <CollapseIcon $collapsed={isCollapsed}><LuChevronDown size={14} /></CollapseIcon>
                    <LuUser size={14} />
                    {assigneeName}
                    <Badge>{assigneeTasks.length}</Badge>
                    {overdue > 0 && (
                      <OverdueBadge style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <LuTriangleAlert size={10} /> {overdue} просрочено
                      </OverdueBadge>
                    )}
                  </AssigneeHeader>
                  {!isCollapsed && assigneeTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      selected={activeTaskId === task.id}
                      onClick={() => handleOpenTask(task.id)}
                    />
                  ))}
                </AssigneeGroup>
              );
            })}
          </TaskList>
        )}
      </Main>

      {sidePanelOpen && activeTaskId && (
        <TaskDetailPanel taskId={activeTaskId} onClose={handleCloseTask} />
      )}
    </Container>
  );
}
