import { useState } from 'react';
import styled from 'styled-components';
import { useAuditLog } from '../api';
import { useProjects } from '../api';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const PageHeader = styled.div`
  padding: 14px 20px 10px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`;

const PageTitle = styled.h1`
  font-size: 16px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0;
  flex: 1;
`;

const FilterSelect = styled.select`
  font-size: 12px;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 5px 10px;
  cursor: pointer;
`;

const Table = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 140px 90px 130px 1fr 130px;
  gap: 0;
  padding: 8px 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.theme.colors.textSecondary};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  position: sticky;
  top: 0;
  background: ${(p) => p.theme.colors.bgSecondary};
  z-index: 1;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 140px 90px 130px 1fr 130px;
  gap: 0;
  padding: 10px 20px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  font-size: 13px;
  color: ${(p) => p.theme.colors.textPrimary};
  align-items: center;
  &:hover {
    background: ${(p) => p.theme.colors.bgHover};
  }
`;

const ActionBadge = styled.span<{ $action: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: ${(p) => {
    if (p.$action === 'create') return 'rgba(16,185,129,0.15)';
    if (p.$action === 'update') return 'rgba(99,102,241,0.15)';
    if (p.$action === 'delete') return 'rgba(239,68,68,0.15)';
    return 'rgba(107,114,128,0.15)';
  }};
  color: ${(p) => {
    if (p.$action === 'create') return '#10b981';
    if (p.$action === 'update') return '#6366f1';
    if (p.$action === 'delete') return '#ef4444';
    return '#6b7280';
  }};
`;

const EntityType = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
  background: ${(p) => p.theme.colors.bgHover};
  border-radius: 4px;
  padding: 2px 6px;
`;

const TimeCell = styled.span`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
  white-space: nowrap;
`;

const UserCell = styled.span`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleCell = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${(p) => p.theme.colors.textPrimary};
`;

const Details = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
  display: block;
  margin-top: 2px;
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

const ACTION_LABELS: Record<string, string> = {
  create: 'создание',
  update: 'изменение',
  delete: 'удаление',
  comment: 'комментарий',
  status_change: 'смена статуса',
};

const ENTITY_LABELS: Record<string, string> = {
  task: 'Задача',
  project: 'Проект',
  comment: 'Комментарий',
  cycle: 'Спринт',
  goal: 'Цель',
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AuditLogPage() {
  const { data: projects = [] } = useProjects();
  const [selectedProject, setSelectedProject] = useState<string>('');

  const { data: entries = [], isLoading } = useAuditLog(selectedProject || undefined);

  return (
    <Page>
      <PageHeader>
        <PageTitle>Аудит-лог</PageTitle>
        <FilterSelect
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">Все проекты</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </FilterSelect>
      </PageHeader>

      <Table>
        <TableHeader>
          <span>Пользователь</span>
          <span>Действие</span>
          <span>Тип</span>
          <span>Объект</span>
          <span>Время</span>
        </TableHeader>

        {isLoading && (
          <div style={{ padding: 20, color: '#9ca3af', fontSize: 13 }}>Загрузка...</div>
        )}

        {!isLoading && entries.length === 0 && (
          <EmptyState>
            <span style={{ fontSize: 32 }}>📋</span>
            <span>Событий пока нет</span>
          </EmptyState>
        )}

        {entries.map((entry) => (
          <Row key={entry.id}>
            <UserCell>{entry.user_name ?? '—'}</UserCell>
            <span>
              <ActionBadge $action={entry.action}>
                {ACTION_LABELS[entry.action] ?? entry.action}
              </ActionBadge>
            </span>
            <span>
              <EntityType>
                {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
              </EntityType>
            </span>
            <TitleCell>
              {entry.entity_title ?? '—'}
              {entry.details && <Details>{entry.details}</Details>}
            </TitleCell>
            <TimeCell>{formatTime(entry.created_at)}</TimeCell>
          </Row>
        ))}
      </Table>
    </Page>
  );
}
