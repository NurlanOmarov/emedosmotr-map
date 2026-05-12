import styled from 'styled-components';
import { useMyInbox } from '../api';
import { TaskRow } from '../components/TaskRow';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
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

function groupByDate(tasks: ReturnType<typeof useMyInbox>['data']) {
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
  const { data: tasks = [], isLoading } = useMyInbox();
  const { activeTaskId, sidePanelOpen, openSidePanel, closeSidePanel } = useTaskopsStore();

  const groups = groupByDate(tasks);

  return (
    <Container>
      <Main>
        <PageHeader>
          <PageTitle>Мои задачи</PageTitle>
          <PageSubtitle>
            {tasks.length > 0 ? `${tasks.length} активных задач` : 'Нет активных задач'}
          </PageSubtitle>
        </PageHeader>

        <TaskList>
          {isLoading && (
            <div style={{ padding: 20, color: '#9ca3af', fontSize: 13 }}>Загрузка...</div>
          )}

          {!isLoading && tasks.length === 0 && (
            <EmptyState>
              <span style={{ fontSize: 32 }}>✓</span>
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
                    onClick={() => openSidePanel(task.id)}
                  />
                ))}
              </div>
            );
          })}
        </TaskList>
      </Main>

      {sidePanelOpen && activeTaskId && (
        <TaskDetailPanel taskId={activeTaskId} onClose={closeSidePanel} />
      )}
    </Container>
  );
}
