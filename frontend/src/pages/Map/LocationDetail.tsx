import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { locationsApi } from '@/services/api';
import { useMapViewStore } from '@/features/map/useMapViewStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { StatusType } from '@/types';

const Panel = styled(motion.div)`
  width: 420px;
  background: rgba(10, 18, 40, 0.95);
  backdrop-filter: blur(24px);
  border-left: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;

  @media (max-width: 768px) {
    position: absolute;
    inset: 0;
    width: 100%;
    z-index: 50;
  }
`;

const PanelHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(15, 23, 42, 0.5);
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #475569;
  margin-bottom: 12px;
`;

const BreadItem = styled.button`
  color: #475569;
  font-size: 12px;
  cursor: pointer;
  transition: color 150ms;
  background: none;
  border: none;
  &:hover { color: #94A3B8; }
`;

const Sep = styled.span`
  color: #2D3748;
`;

const LocationName = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #F1F5F9;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
`;

const TypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #64748B;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px;
  padding: 3px 8px;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const InfoItem = styled.div`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 12px;
`;

const InfoLabel = styled.div`
  font-size: 11px;
  color: #475569;
  margin-bottom: 4px;
`;

const InfoValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #F1F5F9;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Actions = styled.div`
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  gap: 8px;
`;

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  military_office: { label: 'Военкомат', icon: '🏛️' },
  district_hospital: { label: 'ЦРБ', icon: '🏥' },
  private_clinic: { label: 'Частная клиника', icon: '💊' },
  medical_center: { label: 'Медцентр', icon: '⚕️' },
  relay_server_location: { label: 'Перевалочный сервер', icon: '💻' },
};

const UPLOAD_LABELS: Record<string, string> = {
  auto: '🔄 Автоматически',
  manual: '✋ Вручную',
  mixed: '🔀 Смешанный',
};

const STATUS_OPTIONS: { value: StatusType; label: string }[] = [
  { value: 'ready', label: '✅ Готов' },
  { value: 'in_progress', label: '🟡 В работе' },
  { value: 'critical', label: '🔴 Критично' },
];

interface Props {
  locationId: string;
}

export function LocationDetail({ locationId }: Props) {
  const { backToMap, breadcrumb } = useMapViewStore();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: location, isLoading } = useQuery({
    queryKey: ['location', locationId],
    queryFn: () => locationsApi.get(locationId).then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: (status: StatusType) =>
      locationsApi.updateStatus(locationId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location', locationId] });
      qc.invalidateQueries({ queryKey: ['map-features'] });
    },
  });

  const canEdit = user?.role && ['superadmin', 'regional_manager', 'engineer'].includes(user.role);

  if (isLoading) {
    return (
      <Panel
        initial={{ x: 420, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 420, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <motion.div
            style={{ width: 32, height: 32, border: '3px solid rgba(59,130,246,0.3)', borderTopColor: '#3B82F6', borderRadius: '50%' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </Panel>
    );
  }

  if (!location) return null;

  const typeInfo = TYPE_LABELS[location.type] || { label: location.type, icon: '📍' };

  return (
    <Panel
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
    >
      <PanelHeader>
        <Breadcrumb>
          {breadcrumb.map((item, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <Sep>/</Sep>}
              {i === 0 ? (
                <BreadItem onClick={backToMap}>{item.label}</BreadItem>
              ) : (
                <span style={{ color: '#94A3B8' }}>{item.label}</span>
              )}
            </span>
          ))}
        </Breadcrumb>

        <StatusRow>
          <div>
            <TypeBadge>
              {typeInfo.icon} {typeInfo.label}
            </TypeBadge>
          </div>
          <StatusBadge status={location.status as StatusType} pulse={location.status === 'critical'} />
        </StatusRow>

        <LocationName style={{ marginTop: 10 }}>{location.name}</LocationName>

        {location.address && (
          <div style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📍</span> {location.address}
          </div>
        )}
      </PanelHeader>

      <Content>
        <Card padding="14px">
          <SectionTitle>Информация</SectionTitle>
          <InfoGrid>
            <InfoItem>
              <InfoLabel>Загрузка данных</InfoLabel>
              <InfoValue style={{ fontSize: 12 }}>{UPLOAD_LABELS[location.upload_mode]}</InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>Перев. сервер</InfoLabel>
              <InfoValue style={{ color: location.has_relay_server ? '#22C55E' : '#EF4444', fontSize: 13 }}>
                {location.has_relay_server ? '✅ Есть' : '❌ Нет'}
              </InfoValue>
            </InfoItem>
            {location.tasks_count !== null && (
              <InfoItem>
                <InfoLabel>Задачи</InfoLabel>
                <InfoValue style={{ color: location.tasks_count > 0 ? '#F59E0B' : '#22C55E' }}>
                  {location.tasks_count} открыто
                </InfoValue>
              </InfoItem>
            )}
            <InfoItem>
              <InfoLabel>Регион ID</InfoLabel>
              <InfoValue>{location.region_id}</InfoValue>
            </InfoItem>
          </InfoGrid>
        </Card>

        {location.notes && (
          <Card padding="14px">
            <SectionTitle>Примечания</SectionTitle>
            <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>{location.notes}</div>
          </Card>
        )}

        {location.status_reason && (
          <Card padding="14px">
            <SectionTitle>Причина статуса</SectionTitle>
            <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>{location.status_reason}</div>
          </Card>
        )}

        {canEdit && (
          <Card padding="14px">
            <SectionTitle>Обновить статус</SectionTitle>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.value}
                  onClick={() => updateStatus.mutate(opt.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: location.status === opt.value ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${location.status === opt.value ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: location.status === opt.value ? '#60A5FA' : '#94A3B8',
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={updateStatus.isPending}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </Card>
        )}
      </Content>

      <Actions>
        <Button variant="ghost" size="sm" onClick={backToMap} style={{ flex: 1 }}>
          ← На карту
        </Button>
        {canEdit && (
          <Button variant="secondary" size="sm" style={{ flex: 1 }}>
            ✏️ Редактировать
          </Button>
        )}
      </Actions>
    </Panel>
  );
}
