import styled from 'styled-components';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useDashboard } from '../api';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { useTaskopsStore } from '../store/useTaskopsStore';

const Page = styled.div`
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

export function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { openSidePanel } = useTaskopsStore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isLoading) return <LoadingWrap>Загрузка...</LoadingWrap>;
  if (!data) return null;

  const { kpi, done_by_week, by_assignee, risk_tasks } = data;

  const weekLabels = done_by_week.map((d) => {
    const [, week] = d.week.split('-W');
    return { ...d, label: `Нед ${week}` };
  });

  return (
    <Page>
      <PageTitle>Дашборд</PageTitle>

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

        <Card>
          <CardTitle>Открытые задачи по исполнителям</CardTitle>
          {by_assignee.length === 0 ? (
            <Empty>Нет данных</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={by_assignee}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={90}
                />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [`${v} задач`]} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {by_assignee.map((_, i) => (
                    <Cell key={i} fill="#6366f1" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Row>

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
      </Card>
    </Page>
  );
}
