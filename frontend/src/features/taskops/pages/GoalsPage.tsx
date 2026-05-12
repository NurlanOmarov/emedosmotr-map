import { useState } from 'react';
import styled from 'styled-components';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../api';
import type { TaskopsGoal } from '../types';

const Page = styled.div`
  padding: 20px 24px;
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const PageTitle = styled.h1`
  font-size: 18px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0;
`;

const NewBtn = styled.button`
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  &:hover { opacity: 0.9; }
`;

const GoalCard = styled.div`
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
`;

const GoalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
`;

const ProgressRing = styled.svg`
  flex-shrink: 0;
`;

const GoalInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const GoalTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin-bottom: 4px;
`;

const GoalMeta = styled.div`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
  display: flex;
  gap: 12px;
`;

const GoalActions = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const ActionBtn = styled.button`
  background: none;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  &:hover { color: ${(p) => p.theme.colors.textPrimary}; background: ${(p) => p.theme.colors.bgHover}; }
`;

const DeleteBtn = styled(ActionBtn)`
  &:hover { color: #ef4444; border-color: #ef4444; }
`;

const ProgressBar = styled.div`
  height: 6px;
  background: ${(p) => p.theme.colors.bgSecondary};
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number; $done?: boolean }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => (p.$done ? '#10b981' : p.theme.colors.primary)};
  border-radius: 3px;
  transition: width 0.3s;
`;

const SliderWrap = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Slider = styled.input`
  flex: 1;
  accent-color: ${(p) => p.theme.colors.primary};
`;

const SliderLabel = styled.span`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
  min-width: 34px;
  text-align: right;
`;

const StatusBadge = styled.span<{ $done?: boolean }>`
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 10px;
  background: ${(p) => (p.$done ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.12)')};
  color: ${(p) => (p.$done ? '#10b981' : '#6366f1')};
  font-weight: 500;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 240px;
  gap: 10px;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 14px;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
`;

const Modal = styled.div`
  background: ${(p) => p.theme.colors.bgCard};
  border-radius: 12px;
  padding: 24px;
  width: 440px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
`;

const ModalTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0;
`;

const Input = styled.input`
  width: 100%;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 14px;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${(p) => p.theme.colors.primary}; }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const CancelBtn = styled.button`
  background: none;
  border: 1px solid ${(p) => p.theme.colors.border};
  color: ${(p) => p.theme.colors.textPrimary};
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
`;

const SaveBtn = styled.button`
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  &:disabled { opacity: 0.5; }
`;

function ProgressRingIcon({ pct, done }: { pct: number; done: boolean }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - pct / 100);
  return (
    <ProgressRing width={44} height={44} viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle
        cx="22" cy="22" r={r} fill="none"
        stroke={done ? '#10b981' : '#6366f1'}
        strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={fill}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
        style={{ transition: 'stroke-dashoffset 0.3s' }}
      />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fill={done ? '#10b981' : '#6366f1'} fontWeight="600">
        {pct}%
      </text>
    </ProgressRing>
  );
}

export function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createGoal.mutate(
      { title: newTitle.trim(), description: newDesc.trim() || undefined, due_date: newDate || undefined },
      {
        onSuccess: () => {
          setNewTitle('');
          setNewDesc('');
          setNewDate('');
          setShowCreate(false);
        },
      }
    );
  };

  return (
    <Page>
      <TopBar>
        <PageTitle>Цели</PageTitle>
        <NewBtn onClick={() => setShowCreate(true)}>+ Цель</NewBtn>
      </TopBar>

      {isLoading && (
        <div style={{ color: '#9ca3af', fontSize: 13 }}>Загрузка...</div>
      )}

      {!isLoading && goals.length === 0 && (
        <EmptyState>
          <span style={{ fontSize: 36 }}>🎯</span>
          <span>Нет активных целей</span>
          <NewBtn onClick={() => setShowCreate(true)}>Создать первую цель</NewBtn>
        </EmptyState>
      )}

      {goals.map((goal) => (
        <GoalItem
          key={goal.id}
          goal={goal}
          onDelete={() => {
            if (confirm(`Удалить цель "${goal.title}"?`)) deleteGoal.mutate(goal.id);
          }}
        />
      ))}

      {showCreate && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <Modal>
            <ModalTitle>Новая цель</ModalTitle>
            <Input
              autoFocus
              placeholder="Название цели"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Input
              placeholder="Описание (необязательно)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <ModalActions>
              <CancelBtn onClick={() => setShowCreate(false)}>Отмена</CancelBtn>
              <SaveBtn onClick={handleCreate} disabled={!newTitle.trim() || createGoal.isPending}>
                Создать
              </SaveBtn>
            </ModalActions>
          </Modal>
        </ModalOverlay>
      )}
    </Page>
  );
}

function GoalItem({ goal, onDelete }: { goal: TaskopsGoal; onDelete: () => void }) {
  const updateGoal = useUpdateGoal(goal.id);
  const isDone = goal.status === 'done';

  const handleProgress = (val: number) => {
    updateGoal.mutate({ progress: val });
  };

  const toggleDone = () => {
    updateGoal.mutate({ status: isDone ? 'active' : 'done' });
  };

  return (
    <GoalCard>
      <GoalHeader>
        <ProgressRingIcon pct={goal.progress} done={isDone} />
        <GoalInfo>
          <GoalTitle style={{ textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>
            {goal.title}
          </GoalTitle>
          <GoalMeta>
            <StatusBadge $done={isDone}>{isDone ? 'Выполнено' : 'Активна'}</StatusBadge>
            {goal.due_date && (
              <span>
                до{' '}
                {new Date(goal.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </span>
            )}
            {goal.owner_name && <span>{goal.owner_name}</span>}
          </GoalMeta>
        </GoalInfo>
        <GoalActions>
          <ActionBtn onClick={toggleDone}>{isDone ? 'Возобновить' : 'Выполнено'}</ActionBtn>
          <DeleteBtn onClick={onDelete}>✕</DeleteBtn>
        </GoalActions>
      </GoalHeader>

      {goal.description && (
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>{goal.description}</div>
      )}

      <ProgressBar>
        <ProgressFill $pct={goal.progress} $done={isDone} />
      </ProgressBar>

      {!isDone && (
        <SliderWrap>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>Прогресс</span>
          <Slider
            type="range"
            min={0}
            max={100}
            step={5}
            value={goal.progress}
            onChange={(e) => handleProgress(Number(e.target.value))}
            onMouseUp={(e) => handleProgress(Number((e.target as HTMLInputElement).value))}
          />
          <SliderLabel>{goal.progress}%</SliderLabel>
        </SliderWrap>
      )}
    </GoalCard>
  );
}
