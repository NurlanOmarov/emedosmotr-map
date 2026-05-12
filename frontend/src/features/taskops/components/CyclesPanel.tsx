import { useState } from 'react';
import styled from 'styled-components';
import { useProjectCycles, useCreateCycle, useProjectTasks } from '../api';
import type { TaskopsCycle } from '../types';
import api from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';

const Panel = styled.div`
  padding: 20px 24px;
  overflow-y: auto;
  height: 100%;
`;

const SectionTitle = styled.h2`
  font-size: 15px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0 0 16px;
`;

const CycleCard = styled.div`
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
`;

const CycleHeader = styled.div<{ $closed?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: ${(p) => p.theme.colors.bgSecondary};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  opacity: ${(p) => (p.$closed ? 0.6 : 1)};
`;

const CycleName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  flex: 1;
`;

const CycleDates = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const ClosedBadge = styled.span`
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(107,114,128,0.15);
  color: #6b7280;
`;

const ProgressBar = styled.div<{ $pct: number }>`
  height: 3px;
  background: ${(p) => p.theme.colors.border};
  position: relative;
  &::after {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: ${(p) => p.$pct}%;
    background: ${(p) => p.theme.colors.primary};
    border-radius: 2px;
    transition: width 0.3s;
  }
`;

const CycleBody = styled.div`
  padding: 10px 16px;
`;

const CycleStats = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 10px;
`;

const Stat = styled.div`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
  strong { color: ${(p) => p.theme.colors.textPrimary}; font-size: 18px; display: block; }
`;

const CloseBtn = styled.button`
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid ${(p) => p.theme.colors.border};
  background: none;
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  &:hover { background: ${(p) => p.theme.colors.bgHover}; color: ${(p) => p.theme.colors.textPrimary}; }
`;

const Divider = styled.div`
  height: 1px;
  background: ${(p) => p.theme.colors.border};
  margin: 20px 0 16px;
`;

const Form = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
`;

const Input = styled.input`
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${(p) => p.theme.colors.primary}; }
`;

const DateInput = styled(Input)`
  width: 140px;
`;

const CreateBtn = styled.button`
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  &:disabled { opacity: 0.5; }
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

  return (
    <CycleCard>
      <ProgressBar $pct={pct} />
      <CycleHeader $closed={cycle.is_closed}>
        <CycleName>{cycle.name}</CycleName>
        <CycleDates>{formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}</CycleDates>
        {cycle.is_closed
          ? <ClosedBadge>закрыт</ClosedBadge>
          : <CloseBtn onClick={handleClose}>Закрыть</CloseBtn>
        }
      </CycleHeader>
      <CycleBody>
        <CycleStats>
          <Stat><strong>{total}</strong>задач</Stat>
          <Stat><strong>{done}</strong>готово</Stat>
          <Stat><strong>{total - done}</strong>в работе</Stat>
          <Stat><strong>{pct}%</strong>прогресс</Stat>
        </CycleStats>
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
      <SectionTitle>Спринты</SectionTitle>

      {isLoading && <div style={{ color: '#9ca3af', fontSize: 13 }}>Загрузка...</div>}

      {active.length > 0 && (
        <>
          {active.map((c) => <CycleView key={c.id} cycle={c} projectId={projectId} />)}
          <Divider />
        </>
      )}

      {closed.map((c) => <CycleView key={c.id} cycle={c} projectId={projectId} />)}

      <Divider />
      <SectionTitle style={{ fontSize: 13, marginBottom: 10 }}>Новый спринт</SectionTitle>
      <Form>
        <Input
          placeholder="Название спринта"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <DateInput
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <DateInput
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <CreateBtn
          onClick={handleCreate}
          disabled={!name.trim() || !startDate || !endDate || createCycle.isPending}
        >
          Создать
        </CreateBtn>
      </Form>
    </Panel>
  );
}
