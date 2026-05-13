import { useState } from 'react';
import styled from 'styled-components';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { 
  LuUser, 
  LuX, 
  LuTriangleAlert, 
  LuChevronRight 
} from 'react-icons/lu';
import { useDashboard, useUserTasks, useAssignableUsers } from '../api';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { useTaskopsStore } from '../store/useTaskopsStore';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../types';

// ─── Layout ──────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
`;

const Page = styled.div`
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
`;

const PageTitle = styled.h1`
  font-size: 18px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0 0 20px;
`;

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 24px;
`;

const KpiCard = styled.div<{ $accent?: string }>`
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  padding: 16px;
  border-top: 3px solid ${(p) => p.$accent || p.theme.colors.primary};
`;

const KpiValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textPrimary};
  line-height: 1;
  margin-bottom: 6px;
`;

const KpiLabel = styled.div`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
`;

const Card = styled.div`
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  padding: 16px;
`;

const CardTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 14px;
`;

const RiskRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  cursor: pointer;
  &:last-child { border-bottom: none; }
  &:hover { opacity: 0.8; }
`;

const RiskTitle = styled.span`
  flex: 1;
  font-size: 12px;
  color: ${(p) => p.theme.colors.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DueDate = styled.span<{ $overdue?: boolean }>`
  font-size: 11px;
  color: ${(p) => (p.$overdue ? '#ef4444' : p.theme.colors.textSecondary)};
  white-space: nowrap;
`;

const Empty = styled.div`
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const LoadingWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

// ─── Assignee bar (clickable) ─────────────────────────────────────────────────

const AssigneeBar = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  background: ${(p) => p.$active ? p.theme.colors.primaryGlow : 'transparent'};
  border: 1px solid ${(p) => p.$active ? p.theme.colors.primary : 'transparent'};
  transition: all 0.1s;
  &:hover { background: ${(p) => p.theme.colors.bgHover}; }
`;

const AssigneeAvatar = styled.div<{ $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${(p) => p.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
`;

const AssigneeName = styled.span`
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: ${(p) => p.theme.colors.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TaskCountBadge = styled.span<{ $color: string }>`
  font-size: 11px;
  font-weight: 700;
  background: ${(p) => p.$color}22;
  color: ${(p) => p.$color};
  border-radius: 12px;
  padding: 2px 8px;
  flex-shrink: 0;
`;

// ─── User task drawer ─────────────────────────────────────────────────────────

const UserDrawer = styled.div`
  width: 380px;
  min-width: 380px;
  border-left: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.bgCard};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const DrawerHeader = styled.div`
  padding: 16px 18px 12px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const DrawerTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
`;

const DrawerClose = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 20px;
  padding: 2px 6px;
  border-radius: 5px;
  &:hover { background: ${(p) => p.theme.colors.bgHover}; color: ${(p) => p.theme.colors.textPrimary}; }
`;

const DrawerToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  padding: 8px 18px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const DrawerList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
`;

const DrawerTaskRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 18px;
  cursor: pointer;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  transition: background 0.1s;
  &:hover { background: ${(p) => p.theme.colors.bgHover}; }
  &:last-child { border-bottom: none; }
`;

const DrawerTaskInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DrawerTaskTitle = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${(p) => p.theme.colors.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 3px;
`;

const DrawerTaskMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const AVATAR_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
];

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [includeDone, setIncludeDone] = useState(false);
  const [byAssigneeLimit, setByAssigneeLimit] = useState(10);
  const [riskTasksLimit, setRiskTasksLimit] = useState(10);

  const { data, isLoading } = useDashboard({
    by_assignee_limit: byAssigneeLimit,
    risk_tasks_limit: riskTasksLimit,
  });

  const { data: assignableUsers = [] } = useAssignableUsers();
  const { openSidePanel, activeTaskId, sidePanelOpen, closeSidePanel } = useTaskopsStore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: userTasks = [], isLoading: tasksLoading } = useUserTasks(selectedUserId, includeDone);

  const selectedUser = assignableUsers.find((u) => u.id === selectedUserId);

  if (isLoading) return <LoadingWrap>Загрузка...</LoadingWrap>;
  if (!data) return null;

  const { kpi, done_by_week, by_assignee, risk_tasks } = data;

  const weekLabels = done_by_week.map((d) => {
    const [, week] = d.week.split('-W');
    return { ...d, label: `Нед ${week}` };
  });

  // Map assignee bar data to user ids for click
  const assigneeMap = new Map(assignableUsers.map((u) => [u.full_name, u.id]));

  const handleAssigneeClick = (name: string) => {
    const uid = assigneeMap.get(name) ?? null;
    if (uid === selectedUserId) {
      setSelectedUserId(null);
    } else {
      setSelectedUserId(uid);
      closeSidePanel();
    }
  };

  return (
    <Wrapper>
      <Page>
        <PageTitle>Дашборд</PageTitle>

        {/* ── KPI ──────────────────────────────────────────────────────── */}
        <KpiRow>
          <KpiCard $accent="#6b7280">
            <KpiValue>{kpi.total}</KpiValue>
            <KpiLabel>Всего задач</KpiLabel>
          </KpiCard>
          <KpiCard $accent="#3b82f6">
            <KpiValue>{kpi.open}</KpiValue>
            <KpiLabel>Открытых</KpiLabel>
          </KpiCard>
          <KpiCard $accent="#f59e0b">
            <KpiValue>{kpi.in_progress}</KpiValue>
            <KpiLabel>В работе</KpiLabel>
          </KpiCard>
          <KpiCard $accent="#10b981">
            <KpiValue>{kpi.done}</KpiValue>
            <KpiLabel>Выполнено</KpiLabel>
          </KpiCard>
          <KpiCard $accent="#ef4444">
            <KpiValue>{kpi.overdue}</KpiValue>
            <KpiLabel>Просрочено</KpiLabel>
          </KpiCard>
        </KpiRow>

        {/* ── Charts ────────────────────────────────────────────────────── */}
        <Row>
          <Card>
            <CardTitle>Выполненные задачи по неделям</CardTitle>
            {weekLabels.length === 0 ? (
              <Empty>Нет данных</Empty>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekLabels} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v) => [`${v} задач`, 'Выполнено']}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {weekLabels.map((_, i) => (
                      <Cell key={i} fill="#10b981" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* ── Assignee load — now clickable ────────────────────────── */}
          <Card>
            <CardTitle>Нагрузка по исполнителям — нажмите для деталей</CardTitle>
            {by_assignee.length === 0 ? (
              <Empty>Нет данных</Empty>
            ) : (
              <div>
                {by_assignee.map((a, i) => {
                  const uid = assigneeMap.get(a.name);
                  const isActive = uid === selectedUserId;
                  const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  const overloaded = a.count >= 8;
                  const badge = overloaded ? '#ef4444' : a.count >= 5 ? '#f59e0b' : '#10b981';
                  return (
                    <AssigneeBar
                      key={a.name}
                      $active={isActive}
                      onClick={() => handleAssigneeClick(a.name)}
                      title="Нажмите, чтобы увидеть задачи сотрудника"
                    >
                      <AssigneeAvatar $color={color}>{initials(a.name)}</AssigneeAvatar>
                      <AssigneeName>{a.name}</AssigneeName>
                      <TaskCountBadge $color={badge}>{a.count} задач</TaskCountBadge>
                      <LuChevronRight size={14} style={{ color: '#9ca3af' }} />
                    </AssigneeBar>
                  );
                })}
                {by_assignee.length >= byAssigneeLimit && (
                  <ShowMoreBtn onClick={() => setByAssigneeLimit(l => l + 10)}>
                    Показать больше сотрудников
                  </ShowMoreBtn>
                )}
              </div>
            )}
          </Card>
        </Row>

        {/* ── Risk tasks ────────────────────────────────────────────────── */}
        <Card>
          <CardTitle>Риски — задачи под угрозой срыва ({risk_tasks.length})</CardTitle>
          {risk_tasks.length === 0 ? (
            <Empty>Все задачи в норме</Empty>
          ) : (
            risk_tasks.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < today;
              return (
                <RiskRow key={task.id} onClick={() => openSidePanel(task.id)}>
                  <StatusBadge status={task.status} />
                  <RiskTitle>{task.title}</RiskTitle>
                  <PriorityBadge priority={task.priority} />
                  {task.due_date && (
                    <DueDate $overdue={!!isOverdue}>
                      {new Date(task.due_date).toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'short',
                      })}
                    </DueDate>
                  )}
                </RiskRow>
              );
            })
          )}
          {risk_tasks.length >= riskTasksLimit && (
            <ShowMoreBtn 
              style={{ marginTop: 8, width: '100%' }}
              onClick={() => setRiskTasksLimit(l => l + 20)}
            >
              Показать больше рискованных задач
            </ShowMoreBtn>
          )}
        </Card>
      </Page>

      {/* ── User task drawer ──────────────────────────────────────────────── */}
      {selectedUserId && !sidePanelOpen && (
        <UserDrawer>
          <DrawerHeader>
            <DrawerTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LuUser size={18} /> {selectedUser?.full_name ?? 'Сотрудник'}
            </DrawerTitle>
            <DrawerClose onClick={() => setSelectedUserId(null)}>
              <LuX size={18} />
            </DrawerClose>
          </DrawerHeader>

          <DrawerToggle>
            <input
              type="checkbox"
              checked={includeDone}
              onChange={(e) => setIncludeDone(e.target.checked)}
            />
            Показать завершённые
          </DrawerToggle>

          <DrawerList>
            {tasksLoading && (
              <div style={{ padding: 20, fontSize: 13, color: '#9ca3af' }}>Загрузка...</div>
            )}
            {!tasksLoading && userTasks.length === 0 && (
              <Empty>
                {includeDone ? 'Нет задач' : 'Нет активных задач'}
              </Empty>
            )}
            {userTasks.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < today
                && task.status !== 'done' && task.status !== 'cancelled';
              return (
                <DrawerTaskRow key={task.id} onClick={() => openSidePanel(task.id)}>
                  <div style={{ paddingTop: 2 }}>
                    <StatusBadge status={task.status} />
                  </div>
                  <DrawerTaskInfo>
                    <DrawerTaskTitle>{task.title}</DrawerTaskTitle>
                    <DrawerTaskMeta>
                      <span style={{
                        color: PRIORITY_COLORS[task.priority],
                        fontWeight: 600,
                        fontSize: 10,
                      }}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                      {task.due_date && (
                        <span style={{ color: isOverdue ? '#ef4444' : undefined }}>
                          · {new Date(task.due_date).toLocaleDateString('ru-RU', {
                            day: 'numeric', month: 'short',
                          })}
                          {isOverdue && <LuTriangleAlert size={12} style={{ marginLeft: 4, verticalAlign: 'middle', color: '#ef4444' }} />}
                        </span>
                      )}
                    </DrawerTaskMeta>
                  </DrawerTaskInfo>
                </DrawerTaskRow>
              );
            })}
          </DrawerList>
        </UserDrawer>
      )}

      {/* ── Task detail panel ────────────────────────────────────────────── */}
      {sidePanelOpen && activeTaskId && (
        <TaskDetailPanel taskId={activeTaskId} onClose={closeSidePanel} />
      )}
    </Wrapper>
  );
}

const ShowMoreBtn = styled.button`
  width: 100%;
  padding: 8px;
  background: transparent;
  border: 1px dashed ${(p) => p.theme.colors.border};
  border-radius: 8px;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 12px;
  cursor: pointer;
  margin-top: 4px;
  &:hover {
    border-color: ${(p) => p.theme.colors.primary};
    color: ${(p) => p.theme.colors.primary};
    background: ${(p) => p.theme.colors.bgHover};
  }
`;
