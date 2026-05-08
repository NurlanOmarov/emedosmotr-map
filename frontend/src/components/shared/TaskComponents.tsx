import styled from 'styled-components';

export const TASK_PRIORITY_COLOR: Record<string, string> = {
  low:      '#475569',
  normal:   '#60A5FA',
  high:     '#F59E0B',
  critical: '#EF4444',
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  new:         'Новая',
  assigned:    'Назначена',
  in_progress: 'В работе',
  waiting:     'Ожидание',
  done:        'Выполнена',
  cancelled:   'Отменена',
};

export const TaskCard = styled.div`
  background: ${({ theme }) => theme.colors.bgSecondary}44;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 12px;
`;

export const TaskTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 6px;
  line-height: 1.4;
`;

export const TaskMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

export const TaskBadge = styled.span<{ $color: string }>`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  background: ${p => p.$color}1A;
  color: ${p => p.$color};
  border: 1px solid ${p => p.$color}33;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

