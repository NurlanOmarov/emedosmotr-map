import { useState } from 'react';
import styled from 'styled-components';
import { useProjectCycles, useCreateCycle, useProjectTasks } from '../api';
import type { TaskopsCycle } from '../types';
import api from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const Panel = styled.div`
  padding: 24px;
  overflow-y: auto;
  height: 100%;
  background: ${(p) => p.theme.colors.bg};

  @media (max-width: 640px) {
    padding: 16px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0 0 20px;
  display: flex;
  align-items: center;
  gap: 10px;

  &::before {
    content: '';
    width: 4px;
    height: 16px;
    background: ${(p) => p.theme.colors.primary};
    border-radius: 2px;
  }
`;

const CycleCard = styled.div`
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 14px;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    box-shadow: 0 6px 16px rgba(0,0,0,0.08);
  }
`;

const CycleHeader = styled.div<{ $closed?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: ${(p) => p.theme.colors.bgSecondary};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  opacity: ${(p) => (p.$closed ? 0.7 : 1)};

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
`;

const CycleName = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textPrimary};
  flex: 1;
`;

const CycleDates = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${(p) => p.theme.colors.textSecondary};
  background: ${(p) => p.theme.colors.bg};
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid ${(p) => p.theme.colors.border};
`;

const ClosedBadge = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(107,114,128,0.1);
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ProgressBarWrapper = styled.div`
  height: 6px;
  background: ${(p) => p.theme.colors.border};
  position: relative;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number }>`
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: ${(p) => p.$pct}%;
  background: linear-gradient(90deg, ${(p) => p.theme.colors.primary}, ${(p) => p.theme.colors.primary}dd);
  border-radius: 0 3px 3px 0;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
`;

const CycleBody = styled.div`
  padding: 20px;
`;

const CycleStats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: ${(p) => p.theme.colors.bg};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  
  span {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: ${(p) => p.theme.colors.textSecondary};
    letter-spacing: 0.05em;
  }

  strong {
    font-size: 20px;
    font-weight: 800;
    color: ${(p) => p.theme.colors.textPrimary};
  }
`;

const CloseBtn = styled.button`
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.bgCard};
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #ef4444;
    color: #ef4444;
    background: #ef444411;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${(p) => p.theme.colors.border};
  margin: 32px 0 24px;
`;

const Form = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 12px;
  align-items: flex-end;
  background: ${(p) => p.theme.colors.bgSecondary};
  padding: 20px;
  border-radius: 14px;
  border: 1px solid ${(p) => p.theme.colors.border};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${(p) => p.theme.colors.textSecondary};
  letter-spacing: 0.05em;
`;

const Input = styled.input`
  background: ${(p) => p.theme.colors.bgCard};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${(p) => p.theme.colors.primary};
    box-shadow: 0 0 0 3px ${(p) => p.theme.colors.primary}22;
  }
`;

const CreateBtn = styled.button`
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 10px;
  padding: 11px 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${(p) => p.theme.colors.primary}44;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface Props {
  projectId: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function CycleView({ cycle, projectId }: { cycle: TaskopsCycle; projectId: string }) {
  const qc = useQueryClient();
  const { data: tasksResp } = useProjectTasks(projectId, { cycle_id: cycle.id, per_page: 200 });
  const tasks = tasksResp?.items ?? [];
  const done = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleClose = async () => {
    if (!confirm(`Закрыть цикл "${cycle.name}"? Незавершённые задачи можно перенести в бэклог.`)) return;
    await api.patch(`/v1/taskops/cycles/${cycle.id}/close`);
    qc.invalidateQueries({ queryKey: ['taskops', 'cycles', projectId] });
    qc.invalidateQueries({ queryKey: ['taskops', 'tasks', projectId] });
  };

  const burndownData = (() => {
    const start = new Date(cycle.start_date);
    const end = new Date(cycle.end_date);
    const totalTasks = tasks.length;
    if (totalTasks === 0) return [];

    const days = [];
    const curr = new Date(start);
    while (curr <= end) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    const now = new Date();
    return days.map((day) => {
      const endOfDay = new Date(day);
      endOfDay.setHours(23, 59, 59, 999);

      const remaining = tasks.filter((t) => {
        if (!t.completed_at) return true;
        return new Date(t.completed_at) > endOfDay;
      }).length;

      const dayIdx = (day.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const ideal = totalTasks - (totalTasks / totalDays) * dayIdx;

      return {
        name: day.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        remaining: day > now ? null : remaining,
        ideal: Math.max(0, Math.round(ideal * 10) / 10),
      };
    });
  })();

  return (
    <CycleCard>
      <ProgressBarWrapper>
        <ProgressFill $pct={pct} />
      </ProgressBarWrapper>
      <CycleHeader $closed={cycle.is_closed}>
        <CycleName>{cycle.name}</CycleName>
        <CycleDates>{formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}</CycleDates>
        {cycle.is_closed
          ? <ClosedBadge>закрыт</ClosedBadge>
          : <CloseBtn onClick={handleClose}>Закрыть спринт</CloseBtn>
        }
      </CycleHeader>
      <CycleBody>
        <CycleStats>
          <Stat><span>Всего</span><strong>{total}</strong></Stat>
          <Stat><span>Готово</span><strong>{done}</strong></Stat>
          <Stat><span>В работе</span><strong>{total - done}</strong></Stat>
          <Stat><span>Прогресс</span><strong>{pct}%</strong></Stat>
        </CycleStats>

        {total > 0 && (
          <div style={{ height: 200, marginTop: 24, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#9ca3af" opacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  fontSize={11} 
                  tick={{ fill: '#6b7280', fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  fontSize={11} 
                  tick={{ fill: '#6b7280', fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false} 
                  width={25}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }} 
                />
                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 20 }} 
                />
                <Line 
                  name="Идеальный график" 
                  type="monotone" 
                  dataKey="ideal" 
                  stroke="#9ca3af" 
                  strokeDasharray="6 6" 
                  dot={false} 
                  strokeWidth={1.5}
                />
                <Line 
                  name="Фактический остаток" 
                  type="monotone" 
                  dataKey="remaining" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CycleBody>
    </CycleCard>
  );
}

export function CyclesPanel({ projectId }: Props) {
  const { data: cycles = [], isLoading } = useProjectCycles(projectId);
  const createCycle = useCreateCycle(projectId);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleCreate = () => {
    if (!name.trim() || !startDate || !endDate) return;
    createCycle.mutate(
      { name: name.trim(), start_date: startDate, end_date: endDate },
      {
        onSuccess: () => {
          setName('');
          setStartDate('');
          setEndDate('');
        },
      }
    );
  };

  const active = cycles.filter((c) => !c.is_closed);
  const closed = cycles.filter((c) => c.is_closed);

  return (
    <Panel>
      <SectionTitle>Текущие и будущие спринты</SectionTitle>

      {isLoading && <div style={{ color: '#9ca3af', fontSize: 13, padding: '20px 0' }}>Загрузка...</div>}

      {active.length === 0 && !isLoading && (
        <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed #e5e7eb', borderRadius: '14px', color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
          Нет активных спринтов. Создайте новый ниже.
        </div>
      )}

      {active.map((c) => <CycleView key={c.id} cycle={c} projectId={projectId} />)}

      <Divider />
      
      <SectionTitle>Новый спринт</SectionTitle>
      <Form>
        <FormField>
          <Label htmlFor="sprint-name">Название</Label>
          <Input
            id="sprint-name"
            placeholder="Например: Спринт 15"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </FormField>
        <FormField>
          <Label htmlFor="sprint-start">Начало</Label>
          <Input
            id="sprint-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </FormField>
        <FormField>
          <Label htmlFor="sprint-end">Конец</Label>
          <Input
            id="sprint-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </FormField>
        <CreateBtn
          onClick={handleCreate}
          disabled={!name.trim() || !startDate || !endDate || createCycle.isPending}
        >
          {createCycle.isPending ? 'Создание...' : 'Создать спринт'}
        </CreateBtn>
      </Form>

      {closed.length > 0 && (
        <>
          <Divider />
          <SectionTitle>Завершённые спринты</SectionTitle>
          {closed.map((c) => <CycleView key={c.id} cycle={c} projectId={projectId} />)}
        </>
      )}
    </Panel>
  );
}

