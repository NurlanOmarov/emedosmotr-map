import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuList, LuColumns2, LuCheck, LuPlus } from 'react-icons/lu';
import { useMyInbox } from '../api';
import { TaskRow } from '../components/TaskRow';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { BoardView } from '../components/BoardView';
import { useTaskopsStore } from '../store/useTaskopsStore';

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
  padding: 20px 24px 12px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
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
  &:hover:not([disabled]) {
    background: ${(p) => p.$active ? p.theme.colors.primary : p.theme.colors.bgHover};
  }
`;

const NewTaskBtn = styled.button`
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 7px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s;
  &:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.35); }
  &:active { transform: translateY(0); }
`;

const TaskList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const GroupHeader = styled.div`
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

function groupByDate(tasks: any[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const groups: Record<string, typeof tasks> = {
    today: [],
    this_week: [],
    upcoming: [],
    no_date: [],
  };

  for (const task of tasks ?? []) {
    if (!task.due_date) {
      groups.no_date!.push(task);
    } else {
      const d = new Date(task.due_date);
      d.setHours(0, 0, 0, 0);
      if (d <= today) groups.today!.push(task);
      else if (d <= weekEnd) groups.this_week!.push(task);
      else groups.upcoming!.push(task);
    }
  }
  return groups;
}

const GROUP_LABELS: Record<string, string> = {
  today: 'Сегодня / Просроченные',
  this_week: 'На этой неделе',
  upcoming: 'Позже',
  no_date: 'Без срока',
};

export function InboxPage() {
  const [limit, setLimit] = useState(50);
  const { data, isLoading } = useMyInbox({ limit, offset: 0 });
  const tasks = data?.items || [];
  const total = data?.total || 0;
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeTaskId, sidePanelOpen, openSidePanel, closeSidePanel, setQuickCreateOpen } = useTaskopsStore();
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  const handleOpenTask = (id: string) => {
    openSidePanel(id);
    setSearchParams({ task: id });
  };

  const handleCloseTask = () => {
    closeSidePanel();
    setSearchParams({});
  };

  useEffect(() => {
    const urlTaskId = searchParams.get('task');
    if (urlTaskId && urlTaskId !== activeTaskId) {
      openSidePanel(urlTaskId);
    }
  }, []);

  const groups = groupByDate(tasks);

  return (
    <Container>
      <Main>
        <PageHeader>
          <div>
            <PageTitle>Мои задачи</PageTitle>
            <PageSubtitle>
              {tasks.length > 0 ? `${tasks.length} активных задач` : 'Нет активных задач'}
            </PageSubtitle>
          </div>
          <HeaderRight>
            <ViewToggle>
              <ViewBtn $active={viewMode === 'list'} onClick={() => setViewMode('list')} title="Список">
                <LuList size={14} /> Список
              </ViewBtn>
              <ViewBtn $active={viewMode === 'board'} onClick={() => setViewMode('board')} title="Доска">
                <LuColumns2 size={14} /> Доска
              </ViewBtn>
            </ViewToggle>
            <NewTaskBtn onClick={() => setQuickCreateOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LuPlus size={14} /> Задача
            </NewTaskBtn>
          </HeaderRight>
        </PageHeader>

        {viewMode === 'board' ? (
          <BoardView
            tasks={tasks}
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
                <LuCheck size={32} style={{ color: '#10b981', opacity: 0.8 }} />
                <span>Все задачи выполнены!</span>
              </EmptyState>
            )}

            {(['today', 'this_week', 'upcoming', 'no_date'] as const).map((key) => {
              const group = groups[key] ?? [];
              if (group.length === 0) return null;
              return (
                <div key={key}>
                  <GroupHeader>{GROUP_LABELS[key]} ({group.length})</GroupHeader>
                  {group.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      selected={activeTaskId === task.id}
                      onClick={() => handleOpenTask(task.id)}
                    />
                  ))}
                </div>
              );
            })}

            {tasks.length < total && (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <LoadMoreBtn onClick={() => setLimit(prev => prev + 50)}>
                  Загрузить ещё (показано {tasks.length} из {total})
                </LoadMoreBtn>
              </div>
            )}
          </TaskList>
        )}
      </Main>

      {sidePanelOpen && activeTaskId && (
        <TaskDetailPanel taskId={activeTaskId} onClose={handleCloseTask} />
      )}
    </Container>
  );
}

const LoadMoreBtn = styled.button`
  background: ${(p) => p.theme.colors.bgSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  color: ${(p) => p.theme.colors.textPrimary};
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: ${(p) => p.theme.colors.primary};
    background: ${(p) => p.theme.colors.bgHover};
  }
`;
