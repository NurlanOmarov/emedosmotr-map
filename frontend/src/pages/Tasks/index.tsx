import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { tasksApi } from '@/services/api';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
  color: #F1F5F9;
  letter-spacing: -0.03em;
`;

const FilterTabs = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(255,255,255,0.04);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
`;

const Tab = styled(motion.button)<{ $active: boolean }>`
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
  background: ${({ $active }) => $active ? 'rgba(59,130,246,0.2)' : 'transparent'};
  color: ${({ $active }) => $active ? '#60A5FA' : '#64748B'};
  border: ${({ $active }) => $active ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent'};
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
  background: rgba(20, 30, 50, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 150ms, background 150ms;
  display: flex;
  gap: 14px;
  align-items: flex-start;

  &:hover {
    background: rgba(30, 42, 68, 0.9);
    border-color: rgba(255,255,255,0.1);
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
  color: #F1F5F9;
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
  color: #64748B;
  background: rgba(255,255,255,0.04);
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
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
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

  const tasks: Task[] = data?.items ?? [];

  return (
    <Page initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <TopBar>
        <div>
          <PageTitle>
            {user?.role === 'engineer' ? 'Мои задачи' : 'Задачи'}
          </PageTitle>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
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
          <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
            <motion.div
              style={{ width: 32, height: 32, border: '3px solid rgba(59,130,246,0.3)', borderTopColor: '#3B82F6', borderRadius: '50%', margin: '0 auto 12px' }}
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
            >
              <PriorityDot $priority={task.priority} />
              <TaskInfo>
                <TaskTitle>{task.title}</TaskTitle>
                <TaskMeta>
                  <StatusChip $status={task.status}>{STATUS_LABELS[task.status]}</StatusChip>
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
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: '#22C55E',
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
            style={{ textAlign: 'center', padding: 60, color: '#475569' }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#64748B' }}>Задач не найдено</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              {statusFilter ? 'Попробуйте другой фильтр' : 'Новые задачи появятся здесь'}
            </div>
          </motion.div>
        )}
      </List>
    </Page>
  );
}
