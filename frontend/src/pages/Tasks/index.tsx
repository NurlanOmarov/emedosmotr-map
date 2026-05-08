import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled, { useTheme } from 'styled-components';
import { tasksApi } from '@/services/api';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { TaskModal } from '@/components/shared/TaskModal';
import type { Task, TaskStatus } from '@/types';

const Page = styled(motion.div)`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  padding: 20px 24px 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
`;

const PageTitle = styled.h1`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.03em;
`;

const FilterTabs = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const Tab = styled(motion.button)<{ $active: boolean }>`
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
  background: ${({ $active, theme }) => $active ? theme.colors.primary + '22' : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.textSecondary};
  border: ${({ $active, theme }) => $active ? `1px solid ${theme.colors.primary}44` : '1px solid transparent'};
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TaskCard = styled(motion.div)`
  background: ${({ theme }) => theme.colors.bgCard};
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 150ms, background 150ms;
  display: flex;
  gap: 14px;
  align-items: flex-start;

  &:hover {
    background: ${({ theme }) => theme.colors.bgHover};
    border-color: ${({ theme }) => theme.colors.borderHover};
  }
`;

const PriorityDot = styled.div<{ $priority: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
  background: ${({ $priority }) =>
    ({ critical: '#DC2626', high: '#F97316', normal: '#3B82F6', low: '#6B7280' }[$priority] ?? '#6B7280')};
  box-shadow: 0 0 8px ${({ $priority }) =>
    ({ critical: 'rgba(220,38,38,0.6)', high: 'rgba(249,115,22,0.5)', normal: 'rgba(59,130,246,0.5)', low: 'transparent' }[$priority] ?? 'transparent')};
`;

const TaskInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TaskTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TaskMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const MetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.bgSecondary};
  border-radius: 6px;
  padding: 3px 8px;
`;

const StatusChip = styled.span<{ $status: TaskStatus }>`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  background: ${({ $status }) =>
    ({
      new: 'rgba(107,114,128,0.15)',
      assigned: 'rgba(59,130,246,0.15)',
      in_progress: 'rgba(245,158,11,0.15)',
      waiting: 'rgba(139,92,246,0.15)',
      done: 'rgba(34,197,94,0.15)',
      cancelled: 'rgba(239,68,68,0.1)',
    }[$status])};
  color: ${({ $status }) =>
    ({
      new: '#9CA3AF',
      assigned: '#60A5FA',
      in_progress: '#FCD34D',
      waiting: '#A78BFA',
      done: '#4ADE80',
      cancelled: '#EF4444',
    }[$status])};
`;

const ObjectBadge = styled.span<{ $isGeneral: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${({ $isGeneral }) => $isGeneral ? 'rgba(148, 163, 184, 0.1)' : 'rgba(14, 165, 233, 0.1)'};
  color: ${({ $isGeneral }) => $isGeneral ? '#94A3B8' : '#38BDF8'};
  border: 1px solid ${({ $isGeneral }) => $isGeneral ? 'rgba(148, 163, 184, 0.2)' : 'rgba(14, 165, 233, 0.2)'};
`;

const AssigneeChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.bgSecondary};
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};

  svg {
    width: 12px;
    height: 12px;
    opacity: 0.7;
  }
`;

const STATUS_LABELS: Record<TaskStatus, string> = {
  new: '🆕 Новая',
  assigned: '👤 Назначена',
  in_progress: '⚡ В работе',
  waiting: '⏳ Ожидание',
  done: '✅ Завершена',
  cancelled: '❌ Отменена',
};

const TYPE_LABELS: Record<string, string> = {
  equipment_setup: '🔧 Оборудование',
  internet_setup: '🌐 Интернет',
  training: '📚 Обучение',
  inspection: '🔍 Инспекция',
  data_upload: '📤 Загрузка данных',
  maintenance: '🛠️ Обслуживание',
  other: '📋 Другое',
};

const FILTER_TABS = [
  { label: 'Все', value: '' },
  { label: 'Новые', value: 'new' },
  { label: 'В работе', value: 'in_progress' },
  { label: 'Завершены', value: 'done' },
];

export function TasksPage() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const qc = useQueryClient();

  const queryFn = user?.role === 'engineer'
    ? () => tasksApi.myTasks().then((r) => ({ data: { items: r.data } }))
    : () => tasksApi.list({ status: statusFilter || undefined, per_page: 100 });

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, user?.id],
    queryFn: () => queryFn().then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tasksApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateTask = useMutation({
    mutationFn: (data: any) => tasksApi.update(data.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
    },
  });

  const tasks: Task[] = data?.items ?? [];

  return (
    <Page initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <TopBar>
        <div>
          <PageTitle>
            {user?.role === 'engineer' ? 'Мои задачи' : 'Задачи'}
          </PageTitle>
          <div style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 4 }}>
            {tasks.length} задач{tasks.length !== 1 ? '' : 'а'}
          </div>
        </div>

        <FilterTabs>
          {FILTER_TABS.map((t) => (
            <Tab
              key={t.value}
              $active={statusFilter === t.value}
              onClick={() => setStatusFilter(t.value)}
              whileTap={{ scale: 0.97 }}
            >
              {t.label}
            </Tab>
          ))}
        </FilterTabs>
      </TopBar>

      <List>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: theme.colors.textSecondary }}>
            <motion.div
              style={{ width: 32, height: 32, border: `3px solid ${theme.colors.primaryGlow}`, borderTopColor: theme.colors.primary, borderRadius: '50%', margin: '0 auto 12px' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            Загрузка...
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {tasks.map((task, i) => (
            <TaskCard
              key={task.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 200, damping: 20 }}
              layout
              onClick={() => setEditingTask(task)}
            >
              <PriorityDot $priority={task.priority} />
              <TaskInfo>
                <TaskTitle>{task.title}</TaskTitle>
                <TaskMeta>
                  <StatusChip $status={task.status}>{STATUS_LABELS[task.status]}</StatusChip>
                  
                  <ObjectBadge $isGeneral={!task.location_id}>
                    {task.location_id ? `🏢 ${task.location_name || 'Объект'}` : '🌐 Общая задача'}
                  </ObjectBadge>

                  {task.assignee_name && (
                    <AssigneeChip>
                      👤 {task.assignee_name}
                    </AssigneeChip>
                  )}

                  <MetaChip>{TYPE_LABELS[task.type] || task.type}</MetaChip>
                  
                  {task.due_date && (
                    <MetaChip>
                      📅 {new Date(task.due_date).toLocaleDateString('ru-RU')}
                    </MetaChip>
                  )}
                </TaskMeta>
              </TaskInfo>

              {user?.role === 'engineer' && task.status !== 'done' && task.status !== 'cancelled' && (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatus.mutate({ id: task.id, status: 'done' });
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: theme.colors.readyBg,
                    border: `1px solid ${theme.colors.ready}4d`,
                    color: theme.colors.ready,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✓ Завершить
                </motion.button>
              )}
            </TaskCard>
          ))}
        </AnimatePresence>

        {!isLoading && tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: 60, color: theme.colors.textSecondary }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: theme.colors.textMuted }}>Задач не найдено</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              {statusFilter ? 'Попробуйте другой фильтр' : 'Новые задачи появятся здесь'}
            </div>
          </motion.div>
        )}
      </List>

      {editingTask && (
        <TaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(data) => updateTask.mutate(data)}
        />
      )}
    </Page>
  );
}
