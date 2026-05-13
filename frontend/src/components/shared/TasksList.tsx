import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { 
  LuPlus, 
  LuCheck, 
  LuPencil, 
  LuTrash2, 
  LuBuilding2, 
  LuGlobe, 
  LuUser, 
  LuClock 
} from 'react-icons/lu';
import { tasksApi } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { 
  TASK_PRIORITY_COLOR, 
  TASK_STATUS_LABEL, 
  TaskCard, 
  TaskTitle, 
  TaskMeta, 
  TaskBadge 
} from './TaskComponents';
import { TaskModal } from './TaskModal';

const ListLoading = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  text-align: center;
  padding: 20px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const EmptyTasks = styled.div`
  padding: 24px;
  text-align: center;
  background: ${({ theme }) => theme.colors.bgSecondary}44;
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
`;

const EmptyTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const EmptySubtitle = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 4px;
`;

export function TasksList({ 
  locationId, 
  regionId, 
  settlementId 
}: { 
  locationId?: string | null, 
  regionId?: number | null, 
  settlementId?: number | null 
}) {
  const qc = useQueryClient();
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

  const queryKey = ['tasks', { locationId, regionId, settlementId }];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => tasksApi.list({ 
      location_id: locationId || undefined, 
      region_id: regionId || undefined,
      settlement_id: settlementId || undefined,
      per_page: 50 
    }).then(r => r.data?.items ?? r.data ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => tasksApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setIsAdding(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => tasksApi.update(data.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setEditingTask(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    }
  });

  if (isLoading) return <ListLoading>Загрузка задач...</ListLoading>;

  const tasks = Array.isArray(data) ? data : [];

  const getTimeInfo = (dueDate: string) => {
    if (!dueDate) return null;
    const diff = new Date(dueDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    let color = 'var(--text-muted)';
    if (days < 0) color = 'var(--critical)'; // Overdue
    else if (days <= 2) color = 'var(--in-progress)'; // Soon
    else if (days <= 7) color = 'var(--primary)'; // Upcoming
    
    const label = days < 0 ? `Просрочено на ${Math.abs(days)}д.` : 
                  days === 0 ? 'Сегодня' :
                  days === 1 ? 'Завтра' : `Осталось ${days}д.`;
                  
    return { label, color };
  };

  return (
    <>
      <SectionHeader>
        <SectionLabel>
          Список задач
        </SectionLabel>
        <Button size="xs" variant="ghost" onClick={() => setIsAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <LuPlus size={14} />
          <span>Новая задача</span>
        </Button>
      </SectionHeader>

      {tasks.length === 0 ? (
        <EmptyTasks>
          <div style={{ marginBottom: 8, color: 'var(--ready)' }}><LuCheck size={32} /></div>
          <EmptyTitle>Нет открытых задач</EmptyTitle>
          <EmptySubtitle>Все задачи выполнены или ещё не созданы</EmptySubtitle>
        </EmptyTasks>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map((task: any) => {
            const timeInfo = getTimeInfo(task.due_date);
            const isClosed = ['done', 'cancelled'].includes(task.status);
            
            return (
              <TaskCard key={task.id} style={{ opacity: isClosed ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <TaskTitle style={{ textDecoration: isClosed ? 'line-through' : 'none' }}>
                    {task.title}
                  </TaskTitle>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <TaskBadge $color={TASK_PRIORITY_COLOR[task.priority] ?? 'var(--text-muted)'}>
                      {task.priority}
                    </TaskBadge>
                    {!isClosed && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button 
                          onClick={() => setEditingTask(task)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2, opacity: 0.6 }}
                        ><LuPencil size={12} /></button>
                        <button 
                          onClick={() => { if(confirm('Удалить задачу?')) deleteMutation.mutate(task.id) }}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2, opacity: 0.6 }}
                        ><LuTrash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                </div>
                
                <TaskMeta>
                  <TaskBadge $color={task.status === 'done' ? 'var(--ready)' : 'var(--text-muted)'}>
                    {TASK_STATUS_LABEL[task.status] ?? task.status}
                  </TaskBadge>

                  {!locationId && (
                    <span style={{ 
                      fontSize: 10, 
                      fontWeight: 700, 
                      padding: '2px 6px', 
                      borderRadius: 4, 
                      background: task.location_id ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                      color: task.location_id ? 'var(--primary)' : 'var(--text-muted)',
                      border: `1px solid ${task.location_id ? 'var(--primary)' : 'var(--border)'}44`,
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      {task.location_id ? <LuBuilding2 size={10} /> : <LuGlobe size={10} />}
                      {task.location_id ? (task.location_name || 'Объект') : 'Общая'}
                    </span>
                  )}
                  
                  {task.assignee_name && (
                    <span style={{ 
                      fontSize: 11, 
                      color: 'var(--text-secondary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 4, 
                      background: 'var(--bg-secondary)', 
                      padding: '2px 8px', 
                      borderRadius: 10, 
                      border: '1px solid var(--border)' 
                    }}>
                      <LuUser size={11} /> {task.assignee_name}
                    </span>
                  )}

                  {timeInfo && !isClosed && (
                    <span style={{ fontSize: 11, color: timeInfo.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <LuClock size={11} /> {timeInfo.label}
                    </span>
                  )}

                  {task.due_date && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      (до {new Date(task.due_date).toLocaleDateString('ru-RU')})
                    </span>
                  )}
                </TaskMeta>
                
                {task.description && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{task.description}</div>
                )}
              </TaskCard>
            );
          })}
        </div>
      )}

      {isAdding && (
        <TaskModal 
          locationId={locationId} 
          regionId={regionId}
          settlementId={settlementId}
          onClose={() => setIsAdding(false)} 
          onSave={(data) => createMutation.mutate(data)} 
        />
      )}

      {editingTask && (
        <TaskModal 
          task={editingTask}
          onClose={() => setEditingTask(null)} 
          onSave={(data) => updateMutation.mutate(data)} 
        />
      )}
    </>
  );
}
