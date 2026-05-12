import styled from 'styled-components';
import type { TaskopsTaskStatus, TaskopsTaskPriority } from '../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../types';

const Badge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: ${(p) => p.$color}22;
  color: ${(p) => p.$color};
  white-space: nowrap;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${(p) => p.$color};
    flex-shrink: 0;
  }
`;

export function StatusBadge({ status }: { status: TaskopsTaskStatus }) {
  return (
    <Badge $color={STATUS_COLORS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const PriorityDot = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${(p) => p.$color};
  font-weight: 500;
`;

export function PriorityBadge({ priority }: { priority: TaskopsTaskPriority }) {
  return (
    <PriorityDot $color={PRIORITY_COLORS[priority]}>
      {PRIORITY_LABELS[priority]}
    </PriorityDot>
  );
}
