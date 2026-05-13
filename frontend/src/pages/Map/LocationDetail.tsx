import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import styled from 'styled-components';
import {
  LuStar,
  LuHospital,
  LuMonitor,
  LuCheck,
  LuClock,
  LuPencil,
  LuStethoscope,
  LuMapPin,
  LuClipboardList,
  LuActivity,
  LuTrash2,
  LuX,
  LuMicroscope,
  LuPhone,
  LuServer
} from 'react-icons/lu';
import {
  StatusType,
  RESEARCH_LABELS,
  MANDATORY_RESEARCH_TYPES,
  MedicalResearch,
  Commission,
  STATUS_COLORS,
} from '@/types';
import { locationsApi, researchesApi } from '@/services/api';
import { useMapViewStore } from '@/features/map/useMapViewStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TasksList } from '@/components/shared/TasksList';


// ─── Panel shell ────────────────────────────────────────────────────────────

const Panel = styled(motion.div).withConfig({
  shouldForwardProp: (prop) => !['initial', 'animate', 'exit'].includes(prop),
})`
  width: 420px;
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(24px);
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  box-shadow: ${({ theme }) => theme.shadows.lg};

  @media (max-width: 768px) {
    width: 100%;
    height: 80vh;
    top: auto;
    bottom: 0;
    border-left: none;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 20px 20px 0 0;
  }
`;

const DragHandle = styled.div`
  display: none;
  @media (max-width: 768px) {
    display: block;
    width: 40px;
    height: 4px;
    background: ${({ theme }) => theme.colors.border};
    border-radius: 2px;
    margin: 8px auto;
    flex-shrink: 0;
  }
`;

const PanelHeader = styled.div`
  padding: 20px 20px 0;
  background: ${({ theme }) => theme.colors.bgSecondary + '44'};
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 12px;
`;

const BreadItem = styled.button`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
  cursor: pointer;
  transition: color 150ms;
  background: none;
  border: none;
  &:hover { color: ${({ theme }) => theme.colors.primary}; }
`;

const Sep = styled.span`color: ${({ theme }) => theme.colors.border};`;

const HeaderMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const TypeIcon = styled.span`
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  img {
    width: 140%;
    height: 140%;
    object-fit: contain;
    mask-image: radial-gradient(circle, black 50%, transparent 90%);
    -webkit-mask-image: radial-gradient(circle, black 50%, transparent 90%);
  }
`;

const TypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  padding: 3px 8px;
`;


const LocationName = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.02em;
  margin-bottom: 6px;
  line-height: 1.3;
`;

const AddressRow = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: flex-start;
  gap: 5px;
  padding-bottom: 14px;
`;

// ─── Tab bar ────────────────────────────────────────────────────────────────

const TabBar = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 0 12px;
  background: ${({ theme }) => theme.colors.bgSecondary + '44'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const TabBtn = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 12px 11px;
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.$active ? p.theme.colors.primary : p.theme.colors.textSecondary};
  background: none;
  border: none;
  cursor: pointer;
  transition: color 150ms;
  white-space: nowrap;

  &:hover { color: ${p => p.$active ? p.theme.colors.primary : p.theme.colors.textPrimary}; }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${p => p.$active ? p.theme.colors.primary : 'transparent'};
    transition: background 150ms;
  }
`;

const TabCount = styled.span<{ $active: boolean; $critical?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 700;
  background: ${p => p.$critical ? p.theme.colors.critical + '33' : p.$active ? p.theme.colors.primary + '33' : p.theme.colors.bgSecondary};
  color: ${p => p.$critical ? p.theme.colors.critical : p.$active ? p.theme.colors.primary : p.theme.colors.textSecondary};
`;

// ─── Tab content ────────────────────────────────────────────────────────────

const TabContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
`;

// ─── Shared primitives ──────────────────────────────────────────────────────

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const InfoItem = styled.div`
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 11px 12px;
`;

const InfoLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 3px;
`;

const InfoValue = styled.div<{ $color?: string }>`
  font-size: 14px;
  font-weight: 600;
  color: ${p => p.$color || p.theme.colors.textPrimary};
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
  &:last-child { margin-bottom: 0; }
`;

const FieldLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const FieldValue = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textPrimary};
  line-height: 1.5;
  white-space: pre-wrap;
`;

const FieldEmpty = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-style: italic;
`;

const FieldInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; background: ${({ theme }) => theme.colors.bgHover}; }
  &::placeholder { color: ${({ theme }) => theme.colors.textSecondary}; }
`;

const FieldTextarea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  outline: none;
  resize: vertical;
  min-height: 64px;
  box-sizing: border-box;
  font-family: inherit;
  line-height: 1.5;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}88; background: ${({ theme }) => theme.colors.bgHover}; }
  &::placeholder { color: ${({ theme }) => theme.colors.textMuted}; }
`;

const EditRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

// ─── Footer actions ─────────────────────────────────────────────────────────

const Actions = styled.div`
  padding: 12px 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  gap: 8px;
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const PhotoItem = styled.div`
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1;
  &:hover img { transform: scale(1.05); }
`;

const PhotoThumb = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 200ms ease;
`;

const DeleteBtn = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0,0,0,0.7);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 150ms;
  ${PhotoItem}:hover & { opacity: 1; }
`;

const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.92);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
`;

const LightboxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  cursor: default;
`;

const LightboxClose = styled.button`
  position: absolute;
  top: 20px;
  right: 24px;
  background: rgba(255,255,255,0.1);
  border: none;
  color: #fff;
  font-size: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: rgba(255,255,255,0.2); }
`;

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  military_office:        { label: 'Военкомат',          icon: <LuStar size={14} /> },
  district_hospital:      { label: 'ЦРБ',               icon: <LuHospital size={14} /> },
  state_medical:          { label: 'Гос. мед. орг.',     icon: <LuHospital size={14} /> },
  private_medical:        { label: 'Частная мед. орг.',  icon: <LuHospital size={14} /> },
  private_clinic:         { label: 'Частная клиника',    icon: <LuHospital size={14} /> },
  medical_center:         { label: 'Медцентр',           icon: <LuHospital size={14} /> },
  relay_server_location:  { label: 'Перевалочный сервер',icon: <LuMonitor size={14} /> },
};




const STATUS_OPTIONS: { value: StatusType; label: string; icon: React.ReactNode }[] = [
  { value: 'ready',       label: 'Готов',    icon: <LuCheck size={14} /> },
  { value: 'in_progress', label: 'В работе', icon: <LuClock size={14} /> },
  { value: 'critical',    label: 'Критично', icon: <LuActivity size={14} /> },
];

// Task constants moved to @/components/shared/TaskComponents


type TabId = 'overview' | 'commission' | 'diagnostics' | 'server' | 'tasks';

const MEDICAL_TYPES = ['district_hospital', 'state_medical', 'private_medical', 'private_clinic', 'medical_center'];

// ─── Tab: Overview ──────────────────────────────────────────────────────────

interface OverviewTabProps {
  location: any;
  canEdit: boolean;
  onStatusChange: (s: StatusType) => void;
  isUpdatingStatus: boolean;
}

function OverviewTab({ location, canEdit, onStatusChange, isUpdatingStatus }: OverviewTabProps) {
  const qc = useQueryClient();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => locationsApi.uploadImage(location.id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location', location.id] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (url: string) => locationsApi.deleteImage(location.id, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location', location.id] });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      e.target.value = '';
    }
  };

  const images = location.meta?.images || [];

  return (
    <>
      <Card padding="14px">
        <SectionTitle>Общие сведения</SectionTitle>
        <InfoGrid>


          {location.type !== 'military_office' && (
            <InfoItem>
              <InfoLabel>Перев. сервер</InfoLabel>
              <InfoValue $color={location.has_relay_server ? 'var(--ready)' : 'var(--critical)'} style={{ fontSize: 13 }}>
                {location.has_relay_server ? '✓ Есть' : '✗ Нет'}
              </InfoValue>
            </InfoItem>
          )}

          <InfoItem>
            <InfoLabel>Активен</InfoLabel>
              <InfoValue $color={location.is_active ? 'var(--ready)' : 'var(--critical)'} style={{ fontSize: 13 }}>
                {location.is_active ? 'Да' : 'Нет'}
              </InfoValue>
          </InfoItem>
        </InfoGrid>
      </Card>

      {location.notes && (
        <Card padding="14px">
          <SectionTitle>
            {location.type === 'military_office' ? 'Примечания по договору' : 'Примечания'}
          </SectionTitle>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{location.notes}</div>
        </Card>
      )}

      {location.status_reason && (
        <Card padding="14px">
          <SectionTitle>Причина статуса</SectionTitle>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{location.status_reason}</div>
        </Card>
      )}

      <Card padding="14px">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionTitle style={{ marginBottom: 0 }}>Фотографии объекта</SectionTitle>
          {canEdit && (
            <>
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--primary)',
                  border: 'none', cursor: 'pointer', padding: '4px 10px',
                  borderRadius: 6, background: 'var(--primary-glow)',
                }}
                whileHover={{ scale: 1.05 }}
              >
                {uploadMutation.isPending ? 'Загрузка...' : '+ Добавить'}
              </motion.button>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*"
                onChange={handleFileChange}
              />
            </>
          )}
        </div>
        
        {images.length === 0 ? (
          <div style={{ 
            padding: '24px 0', 
            textAlign: 'center', 
            color: 'var(--text-muted)', 
            fontSize: 12, 
            background: 'var(--bg-secondary)', 
            borderRadius: 10, 
            border: '1px dashed var(--border)' 
          }}>
            Нет фотографий
          </div>
        ) : (
          <PhotoGrid>
            {images.map((url: string, idx: number) => (
              <PhotoItem key={idx} onClick={() => setSelectedImage(url)}>
                <PhotoThumb src={url} alt={`Photo ${idx}`} />
                {canEdit && (
                  <DeleteBtn onClick={(e) => {
                    e.stopPropagation();
                    if(confirm('Удалить фото?')) deleteMutation.mutate(url);
                  }}><LuTrash2 size={10} /></DeleteBtn>
                )}
              </PhotoItem>
            ))}
          </PhotoGrid>
        )}
      </Card>

      {selectedImage && (
        <LightboxOverlay onClick={() => setSelectedImage(null)}>
          <LightboxClose onClick={() => setSelectedImage(null)}><LuX /></LightboxClose>
          <LightboxImage src={selectedImage} alt="Full view" onClick={e => e.stopPropagation()} />
        </LightboxOverlay>
      )}

      {canEdit && (
        <Card padding="14px">
          <SectionTitle>Изменить статус</SectionTitle>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map((opt) => (
              <motion.button
                key={opt.value}
                onClick={() => onStatusChange(opt.value)}
                disabled={isUpdatingStatus}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: location.status === opt.value ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                  border: `1px solid ${location.status === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                  color: location.status === opt.value ? 'var(--primary)' : 'var(--text-secondary)',
                  opacity: isUpdatingStatus ? 0.6 : 1,
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {opt.icon}
                  {opt.label}
                </span>
              </motion.button>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

// ─── Tab: Commission ─────────────────────────────────────────────────────────

function CommissionTab({ locationId, canEdit }: { locationId: string; canEdit: boolean }) {
  const { triggerUpdate } = useMapViewStore();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['commission', locationId],
    queryFn: () => locationsApi.getCommission(locationId).then(r => r.data as Commission),
    retry: false,
  });

  if (isLoading) return <TabLoading />;

  if (isError || !data) {
    return (
      <>
        <EmptyState icon={<LuMonitor size={32} />} title="Нет данных о комиссии" subtitle="Информация о рабочих местах ещё не добавлена" />
        {canEdit && (
          <div style={{ padding: '0 14px' }}>
             <Button variant="primary" style={{ width: '100%' }} onClick={() => setEditing(true)}>+ Добавить данные</Button>
          </div>
        )}
        {editing && (
          <CommissionModal 
            locationId={locationId}
            onClose={() => setEditing(false)}
            onSave={(formData) => {
              locationsApi.createCommission(locationId, formData).then(() => {
                qc.invalidateQueries({ queryKey: ['commission', locationId] });
                setEditing(false);
              });
            }}
          />
        )}
      </>
    );
  }

  const compPct = data.doctors_count > 0
    ? Math.min(100, Math.round((data.connected_computers_count / data.doctors_count) * 100))
    : 100;
  
  const hasDeficit = data.connected_computers_count < data.doctors_count;
  const compColor = hasDeficit ? '#EF4444' : '#22C55E';

  return (
    <>
      <Card padding="14px">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <SectionTitle style={{ margin: 0 }}>Компьютеры и Врачи</SectionTitle>
          {canEdit && (
            <Button size="xs" variant="ghost" onClick={() => setEditing(true)}><LuPencil size={12} /></Button>
          )}
        </div>
        
        <InfoGrid style={{ marginBottom: 16 }}>
          <InfoItem>
            <InfoLabel>Врачей</InfoLabel>
            <InfoValue>{data.doctors_count}</InfoValue>
          </InfoItem>
          <InfoItem style={hasDeficit ? { borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.05)' } : {}}>
            <InfoLabel>Компьютеров</InfoLabel>
            <InfoValue $color={compColor}>{data.connected_computers_count}</InfoValue>
          </InfoItem>
        </InfoGrid>

        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Обеспеченность</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: compColor }}>
              {data.connected_computers_count} / {data.doctors_count} ({compPct}%)
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${compPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 3, background: compColor }}
            />
          </div>
          {hasDeficit && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#F87171', fontWeight: 500 }}>
              <LuActivity size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Дефицит: {data.doctors_count - data.connected_computers_count} шт.
            </div>
          )}
        </div>
      </Card>

      <Card padding="14px">
        <SectionTitle>Интернет и Сеть</SectionTitle>
        <InfoGrid style={{ marginBottom: 12 }}>
          <InfoItem>
            <InfoLabel>Статус</InfoLabel>
            <InfoValue $color={data.internet_status ? '#22C55E' : '#EF4444'} style={{ fontSize: 13 }}>
              {data.internet_status ? '✓ Подключён' : '✗ Нет'}
            </InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Тип связи</InfoLabel>
            <InfoValue style={{ fontSize: 13 }}>{data.internet_type || '—'}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Локальная сеть</InfoLabel>
            <InfoValue $color={data.has_local_network ? '#22C55E' : '#EF4444'} style={{ fontSize: 13 }}>
              {data.has_local_network ? '✓ Есть' : '✗ Нет (Прямой)'}
            </InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Скорость</InfoLabel>
            <InfoValue style={{ fontSize: 13 }}>
              {data.internet_speed_mbps != null ? `${data.internet_speed_mbps} Мбит/с` : '—'}
            </InfoValue>
          </InfoItem>
        </InfoGrid>
      </Card>

      <Card padding="14px">
        <SectionTitle>Статус и инфо</SectionTitle>
        <StatusBadge status={data.status as StatusType} />
        {data.comment && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.comment}</div>
        )}
        {data.address && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}><LuMapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {data.address}</div>
        )}
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          Обновлено: {new Date(data.last_updated_at).toLocaleDateString('ru-RU')}
        </div>
      </Card>

      {editing && (
        <CommissionModal 
          commission={data}
          locationId={locationId}
          onClose={() => setEditing(false)}
          onSave={(formData) => {
            locationsApi.updateCommission(locationId, formData).then(() => {
              qc.invalidateQueries({ queryKey: ['commission', locationId] });
              qc.invalidateQueries({ queryKey: ['location', locationId] });
              qc.invalidateQueries({ queryKey: ['map-features'] });
              triggerUpdate();
              setEditing(false);
            });
          }}
        />
      )}
    </>
  );
}

// ─── Tab: Diagnostics ────────────────────────────────────────────────────────

const ResearchGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
`;

const ResearchItemCard = styled(Card)`
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.bgHover};
  }
`;

const MiniStatus = styled.div<{ $active: boolean }>`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${props => props.$active ? props.theme.colors.primary + '22' : props.theme.colors.bgSecondary};
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.textSecondary};
  border: 1px solid ${props => props.$active ? props.theme.colors.primary + '44' : props.theme.colors.border};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StepButton = styled.button<{ $active: boolean; $disabled?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 4px;
  background: ${props => props.$active ? props.theme.colors.primary + '22' : props.theme.colors.bgSecondary};
  border: 1px solid ${props => props.$active ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 12px;
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.textSecondary};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.3 : 1};
  transition: all 0.2s;
  
  &:hover {
    background: ${props => !props.$disabled && (props.$active ? props.theme.colors.primary + '33' : props.theme.colors.bgHover)};
  }
`;

const ResearchStatusBadge = styled.div<{ $status: StatusType }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => STATUS_COLORS[props.$status]};
  box-shadow: 0 0 6px ${props => STATUS_COLORS[props.$status]}40;
`;

function DiagnosticsTab({ locationId, canEdit }: { locationId: string; canEdit: boolean }) {
  const { triggerUpdate } = useMapViewStore();
  const qc = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [editingResearch, setEditingResearch] = useState<MedicalResearch | null>(null);

  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['medical-orgs', locationId],
    queryFn: () => locationsApi.getMedicalOrgs(locationId).then(r => r.data as any[]),
  });

  // Automatically select first org if not selected
  if (!selectedOrgId && orgs && orgs.length > 0) {
    setSelectedOrgId(orgs[0].id);
  }

  const { data: researches } = useQuery({
    queryKey: ['researches', selectedOrgId],
    queryFn: () => researchesApi.list(selectedOrgId!).then(r => r.data as MedicalResearch[]),
    enabled: !!selectedOrgId,
  });

  if (orgsLoading) return <TabLoading />;
  if (!orgs || orgs.length === 0) {
    return <EmptyState icon={<LuMicroscope size={32} />} title="Нет мед. организаций" subtitle="Для отслеживания исследований сначала добавьте мед. организацию" />;
  }

  const researchMap = (researches || []).reduce((acc, r) => {
    acc[r.research_type] = r;
    return acc;
  }, {} as Record<string, MedicalResearch>);

  return (
    <>
      {orgs.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {orgs.map(org => (
            <Button 
              key={org.id} 
              variant={selectedOrgId === org.id ? 'primary' : 'ghost'} 
              size="sm"
              onClick={() => setSelectedOrgId(org.id)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {org.name}
            </Button>
          ))}
        </div>
      )}

      <SectionTitle>Обязательные исследования</SectionTitle>
      <ResearchGrid>
        {MANDATORY_RESEARCH_TYPES.map(type => {
          const res = researchMap[type];
          if (res && res.is_available === false) return null;
          
          return (
            <ResearchItemCard key={type} padding="12px" onClick={() => canEdit && res && setEditingResearch(res)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ResearchStatusBadge $status={res?.status || 'critical'} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{RESEARCH_LABELS[type]}</div>
                </div>
                {!res && canEdit && (
                  <Button size="xs" variant="ghost" onClick={(e) => {
                    e.stopPropagation();
                    researchesApi.create(selectedOrgId!, { research_type: type }).then(() => {
                      qc.invalidateQueries({ queryKey: ['researches', selectedOrgId] });
                    });
                  }}>+ Настроить</Button>
                )}
              </div>

              {res ? (
                <>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Специалист</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{res.specialist_name || '—'}</div>
                    </div>
                    <div style={{ width: 80 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Каб.</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{res.room_number || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <MiniStatus $active={res.is_connected} title="Оборудование подключено">
                      {res.is_connected ? '● Сеть' : '○ Сеть'}
                    </MiniStatus>
                    <MiniStatus $active={res.staff_trained} title="Персонал обучен">
                      {res.staff_trained ? '● Персонал' : '○ Персонал'}
                    </MiniStatus>
                    <MiniStatus $active={res.has_data_stream} title="Данные поступают">
                      {res.has_data_stream ? '● Данные' : '○ Данные'}
                    </MiniStatus>
                    {res.phone && (
                       <a 
                         href={`https://wa.me/${res.phone.replace(/\D/g, '')}`} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         onClick={e => e.stopPropagation()}
                         style={{ marginLeft: 'auto', fontSize: 11, color: '#22C55E', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                       >
                         <LuPhone size={11} />
                         <span>WhatsApp</span>
                       </a>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Не настроено</div>
              )}
            </ResearchItemCard>
          );
        })}
      </ResearchGrid>

      <SectionTitle style={{ marginTop: 20 }}>Дополнительно</SectionTitle>
      {/* TODO: Add ability to add custom research types */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px', border: '1px dashed var(--border)', borderRadius: 12 }}>
        Нажмите "+", чтобы добавить специфическое исследование
      </div>

      {editingResearch && (
        <ResearchModal 
          research={editingResearch} 
          onClose={() => setEditingResearch(null)} 
          onSave={(data) => {
            researchesApi.update(editingResearch.id, data).then(() => {
              qc.invalidateQueries({ queryKey: ['researches', selectedOrgId] });
              qc.invalidateQueries({ queryKey: ['location', locationId] });
              
              qc.setQueriesData({ queryKey: ['map-features'] }, (old: any) => {
                if (!old?.data?.features) return old;
                return {
                  ...old,
                  data: {
                    ...old.data,
                    features: old.data.features.map((f: any) =>
                      String(f.properties.id) === String(locationId)
                        ? { ...f, properties: { ...f.properties, status: data.status || f.properties.status } }
                        : f
                    ),
                  },
                };
              });
              
              qc.invalidateQueries({ queryKey: ['map-features'] });
              triggerUpdate();
              setEditingResearch(null);
            });
          }}
        />
      )}
    </>
  );
}

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled(Card)`
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.bgCard};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const FormLabel = styled.label`
  display: block;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  margin-bottom: 6px;
  font-weight: 600;
`;

const FormInput = styled.input`
  width: 100%;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  margin-bottom: 16px;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

const FormSelect = styled.select`
  width: 100%;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  margin-bottom: 16px;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
  option { background: ${({ theme }) => theme.colors.bgCard}; color: ${({ theme }) => theme.colors.textPrimary}; }
`;

function ResearchModal({ research, onClose, onSave }: { research: MedicalResearch, onClose: () => void, onSave: (data: any) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(research);
  const [addingEquipment, setAddingEquipment] = useState(false);
  
  const { data: equipment } = useQuery({
    queryKey: ['org-equipment', research.organization_id],
    queryFn: () => researchesApi.getEquipment(research.organization_id).then(r => r.data as any[]),
  });

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} padding="24px">
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
          {RESEARCH_LABELS[research.research_type] || research.research_type}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FormLabel>Метод ввода</FormLabel>
            <FormSelect value={form.input_method} onChange={e => setForm({...form, input_method: e.target.value as any})}>
              <option value="manual">Вручную</option>
              <option value="auto">Автоматически</option>
            </FormSelect>
          </div>
          <div>
            <FormLabel>Тип интеграции</FormLabel>
            <FormInput value={form.integration_type || ''} onChange={e => setForm({...form, integration_type: e.target.value})} placeholder="Реле / ПАКС / Прямо" />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <FormLabel style={{ margin: 0 }}>Подключённое оборудование</FormLabel>
            <Button 
              size="xs" 
              variant="ghost" 
              onClick={() => setAddingEquipment(true)}
              style={{ padding: '2px 6px', height: 'auto', fontSize: 10 }}
            >
              + Добавить
            </Button>
          </div>
          <FormSelect 
            value={form.equipment_id || ''} 
            onChange={e => setForm({...form, equipment_id: e.target.value || null})}
            style={{ marginBottom: 0 }}
          >
            <option value="">Не выбрано</option>
            {equipment?.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.equipment_type} ({eq.serial_number || 'S/N n/a'})</option>
            ))}
          </FormSelect>
        </div>

        {addingEquipment && (
          <EquipmentModal 
            orgId={research.organization_id} 
            onClose={() => setAddingEquipment(false)} 
            onSave={(data) => {
              researchesApi.createEquipment(research.organization_id, data).then(() => {
                qc.invalidateQueries({ queryKey: ['org-equipment', research.organization_id] });
                setAddingEquipment(false);
              });
            }}
          />
        )}

        <FormLabel>Специалист (ФИО)</FormLabel>
        <FormInput value={form.specialist_name || ''} onChange={e => setForm({...form, specialist_name: e.target.value})} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FormLabel>Кабинет</FormLabel>
            <FormInput value={form.room_number || ''} onChange={e => setForm({...form, room_number: e.target.value})} />
          </div>
          <div>
            <FormLabel>Телефон (WhatsApp)</FormLabel>
            <FormInput value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+7 777 ..." />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {!['lab_oak', 'lab_oam', 'lab_micro'].includes(research.research_type) && (
            <div style={{ marginBottom: 16 }}>
              <FormLabel>Наличие снимка</FormLabel>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button size="xs" variant={form.has_image ? 'primary' : 'ghost'} onClick={() => setForm({...form, has_image: true})}>Есть</Button>
                <Button size="xs" variant={!form.has_image ? 'primary' : 'ghost'} onClick={() => setForm({...form, has_image: false})}>Нет</Button>
              </div>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <FormLabel>Наличие заключения</FormLabel>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button size="xs" variant={form.has_conclusion ? 'primary' : 'ghost'} onClick={() => setForm({...form, has_conclusion: true})}>Есть</Button>
              <Button size="xs" variant={!form.has_conclusion ? 'primary' : 'ghost'} onClick={() => setForm({...form, has_conclusion: false})}>Нет</Button>
            </div>
          </div>
        </div>

        <FormLabel>Этапы подключения</FormLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <StepButton 
            $active={form.is_connected} 
            onClick={() => setForm({...form, is_connected: !form.is_connected})}
          >
            <LuMonitor size={18} />
            <div style={{ fontSize: 10, fontWeight: 600 }}>Подключено</div>
          </StepButton>
          <StepButton 
            $active={form.staff_trained} 
            $disabled={!form.is_connected}
            onClick={() => form.is_connected && setForm({...form, staff_trained: !form.staff_trained})}
          >
            <LuStethoscope size={18} />
            <div style={{ fontSize: 10, fontWeight: 600 }}>Обучены</div>
          </StepButton>
          <StepButton 
            $active={form.has_data_stream} 
            $disabled={!form.is_connected || !form.staff_trained}
            onClick={() => form.is_connected && form.staff_trained && setForm({...form, has_data_stream: !form.has_data_stream})}
          >
            <LuActivity size={18} />
            <div style={{ fontSize: 10, fontWeight: 600 }}>Данные</div>
          </StepButton>
        </div>

        <div style={{ marginBottom: 16 }}>
          <FormLabel>Доступность</FormLabel>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button size="xs" variant={form.is_available ? 'primary' : 'ghost'} onClick={() => setForm({...form, is_available: true})}>Проводится</Button>
            <Button size="xs" variant={!form.is_available ? 'secondary' : 'ghost'} onClick={() => setForm({...form, is_available: false})}>Не проводится</Button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Если исследование не проводится в данной организации, оно будет скрыто из списка.
          </div>
        </div>

        <FormLabel>Заметки / Проблемы</FormLabel>
        <FormInput value={form.problems || ''} onChange={e => setForm({...form, problems: e.target.value})} placeholder="Опишите проблемы если есть..." />

        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <Button variant="ghost" style={{ flex: 1 }} onClick={onClose}>Отмена</Button>
          <Button variant="primary" style={{ flex: 1 }} onClick={() => onSave(form)}>Сохранить</Button>
        </div>
      </ModalContent>
    </ModalOverlay>
  );
}

function EquipmentModal({ onClose, onSave }: { orgId?: string, onClose: () => void, onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    equipment_type: '',
    serial_number: '',
    count: 1
  });

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} padding="24px">
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Добавить оборудование</div>
        <FormLabel>Тип оборудования</FormLabel>
        <FormInput value={form.equipment_type} onChange={e => setForm({...form, equipment_type: e.target.value})} placeholder="Напр: ЭКГ-аппарат, Анализатор" />
        <FormLabel>Серийный номер</FormLabel>
        <FormInput value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} placeholder="S/N 123456" />
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <Button variant="ghost" style={{ flex: 1 }} onClick={onClose}>Отмена</Button>
          <Button variant="primary" style={{ flex: 1 }} onClick={() => onSave(form)}>Добавить</Button>
        </div>
      </ModalContent>
    </ModalOverlay>
  );
}

// ─── Tab: Relay Server ───────────────────────────────────────────────────────

interface RelayData {
  cabinet: string;
  responsible_name: string;
  responsible_contacts: string;
  contract_info: string;
  additional_notes: string;
}

const RELAY_EMPTY: RelayData = {
  cabinet: '',
  responsible_name: '',
  responsible_contacts: '',
  contract_info: '',
  additional_notes: '',
};

const RELAY_FIELDS: { key: keyof RelayData; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: 'cabinet',               label: 'Кабинет / комната',    placeholder: 'Кабинет 214, 2-й этаж' },
  { key: 'responsible_name',      label: 'Ответственный',         placeholder: 'Иванов Иван Иванович' },
  { key: 'responsible_contacts',  label: 'Контакты',             placeholder: '+7 777 123-45-67 / email@example.com', multiline: true },
  { key: 'contract_info',         label: 'Договор хранения',     placeholder: 'Договор № 123 от 01.01.2024', multiline: true },
  { key: 'additional_notes',      label: 'Доп. заметки',         placeholder: 'Дополнительная информация...', multiline: true },
];

function RelayServerTab({ locationId, canEdit }: { locationId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<RelayData>(RELAY_EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['relay-detail', locationId],
    queryFn: () => locationsApi.getRelayDetail(locationId).then(r => r.data as RelayData),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: RelayData) => locationsApi.updateRelayDetail(locationId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['relay-detail', locationId] });
      setEditing(false);
    },
  });

  const startEdit = () => {
    setForm({ ...RELAY_EMPTY, ...(data ?? {}) });
    setEditing(true);
  };

  const set = (field: keyof RelayData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  if (isLoading) return <TabLoading />;

  return (
    <Card padding="14px">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <SectionTitle style={{ margin: 0 }}>Сведения о сервере</SectionTitle>
        {canEdit && !editing && (
          <motion.button
            onClick={startEdit}
            style={{
              fontSize: 11, fontWeight: 600, color: 'var(--primary)',
              border: 'none', cursor: 'pointer', padding: '3px 8px',
              borderRadius: 6, background: 'var(--primary-glow)',
            } as any}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            Редактировать
          </motion.button>
        )}
      </div>

      {RELAY_FIELDS.map(({ key, label, placeholder, multiline }) => (
        <FieldGroup key={key}>
          <FieldLabel>{label}</FieldLabel>
          {editing ? (
            multiline ? (
              <FieldTextarea value={form[key]} onChange={set(key)} placeholder={placeholder} rows={2} />
            ) : (
              <FieldInput value={form[key]} onChange={set(key)} placeholder={placeholder} />
            )
          ) : (
            data?.[key]
              ? <FieldValue>{data[key]}</FieldValue>
              : <FieldEmpty>Не указано</FieldEmpty>
          )}
        </FieldGroup>
      ))}

      {editing && (
        <EditRow>
          <motion.button
            onClick={() => setEditing(false)}
            style={{
              flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', background: 'var(--bg-secondary)',
              border: '1px solid var(--border)', color: 'var(--text-secondary)',
            }}
            whileTap={{ scale: 0.97 }}
          >
            Отмена
          </motion.button>
          <motion.button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            style={{
              flex: 2, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', background: 'rgba(37,99,235,0.85)',
              border: '1px solid rgba(59,130,246,0.4)', color: 'var(--text-primary)',
              opacity: saveMutation.isPending ? 0.6 : 1,
            }}
            whileTap={{ scale: 0.97 }}
          >
            {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </motion.button>
        </EditRow>
      )}
    </Card>
  );
}

function TasksTab({ locationId, regionId }: { locationId: string, regionId?: number }) {
  return <TasksList locationId={locationId} regionId={regionId} />;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function CommissionModal({ commission, onClose, onSave }: {
  commission?: Commission,
  locationId?: string,
  onClose: () => void,
  onSave: (data: any) => void
}) {
  const [form, setForm] = useState(commission || {
    address: '',
    doctors_count: 0,
    connected_computers_count: 0,
    internet_status: false,
    internet_type: '',
    internet_speed_mbps: null as number | null,
    has_local_network: true,
    status: 'critical',
    comment: '',
  });

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} padding="24px" style={{ maxWidth: 460 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
          {commission ? 'Редактировать комиссию' : 'Настроить комиссию'}
        </div>

        <FormLabel>Адрес (если отличается)</FormLabel>
        <FormInput 
          value={form.address || ''} 
          onChange={e => setForm({...form, address: e.target.value})} 
          placeholder="Адрес проведения медкомиссии" 
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FormLabel>Кол-во врачей</FormLabel>
            <FormInput 
              type="number"
              value={form.doctors_count} 
              onChange={e => setForm({...form, doctors_count: parseInt(e.target.value) || 0})} 
            />
          </div>
          <div>
            <FormLabel>Подкл. компьютеров</FormLabel>
            <FormInput 
              type="number"
              value={form.connected_computers_count} 
              onChange={e => setForm({...form, connected_computers_count: parseInt(e.target.value) || 0})} 
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FormLabel>Интернет</FormLabel>
            <FormSelect 
              value={form.internet_status ? 'yes' : 'no'} 
              onChange={e => setForm({...form, internet_status: e.target.value === 'yes'})}
            >
              <option value="yes">Подключён</option>
              <option value="no">Нет</option>
            </FormSelect>
          </div>
          <div>
            <FormLabel>Тип связи</FormLabel>
            <FormSelect 
              value={form.internet_type || ''} 
              onChange={e => setForm({...form, internet_type: e.target.value})}
            >
              <option value="">Не указан</option>
              <option value="проводной">Проводной</option>
              <option value="wi-fi">Wi-Fi</option>
              <option value="оптика">Оптика</option>
              <option value="ADSL">ADSL</option>
            </FormSelect>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FormLabel>Скорость (Мбит/с)</FormLabel>
            <FormInput 
              type="number"
              value={form.internet_speed_mbps || ''} 
              onChange={e => setForm({...form, internet_speed_mbps: parseFloat(e.target.value) || null})} 
            />
          </div>
          <div>
            <FormLabel>Локальная сеть</FormLabel>
            <FormSelect 
              value={form.has_local_network ? 'yes' : 'no'} 
              onChange={e => setForm({...form, has_local_network: e.target.value === 'yes'})}
            >
              <option value="yes">Есть</option>
              <option value="no">Нет (только провайдер)</option>
            </FormSelect>
          </div>
        </div>

        <FormLabel>Статус готовности</FormLabel>
        <FormSelect value={form.status} onChange={e => setForm({...form, status: e.target.value as StatusType})}>
          <option value="ready">Готов</option>
          <option value="in_progress">В работе</option>
          <option value="critical">Критично</option>
        </FormSelect>

        <FormLabel>Комментарий / Проблемы</FormLabel>
        <FieldTextarea 
          value={form.comment || ''} 
          onChange={e => setForm({...form, comment: e.target.value})} 
          placeholder="Описание текущего состояния интернета и техники..."
          style={{ marginBottom: 16 }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <Button variant="ghost" style={{ flex: 1 }} onClick={onClose}>Отмена</Button>
          <Button variant="primary" style={{ flex: 1 }} onClick={() => onSave(form)}>Сохранить</Button>
        </div>
      </ModalContent>
    </ModalOverlay>
  );
}

function TabLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
      <motion.div
        style={{ width: 24, height: 24, border: '2px solid rgba(59,130,246,0.3)', borderTopColor: '#3B82F6', borderRadius: '50%' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 8, textAlign: 'center' }}>
      <div style={{ marginBottom: 4, color: 'var(--text-muted)' }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{subtitle}</div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  locationId: string;
}

export function LocationDetail({ locationId }: Props) {
  const { backToMap, breadcrumb, triggerUpdate } = useMapViewStore();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { data: location, isLoading } = useQuery({
    queryKey: ['location', locationId],
    queryFn: () => locationsApi.get(locationId).then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: (status: StatusType) => locationsApi.updateStatus(locationId, status),
    onMutate: (newStatus) => {
      // old is the raw axios response: { data: { features: [...] }, status, ... }
      qc.setQueriesData({ queryKey: ['map-features'] }, (old: any) => {
        if (!old?.data?.features) return old;
        return {
          ...old,
          data: {
            ...old.data,
            features: old.data.features.map((f: any) =>
              String(f.properties.id) === String(locationId)
                ? { ...f, properties: { ...f.properties, status: newStatus } }
                : f
            ),
          },
        };
      });
      triggerUpdate();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location', locationId] });
      qc.invalidateQueries({ queryKey: ['map-features'] });
    },
  });

  const canEdit = !!user?.role && ['admin', 'superadmin', 'regional_manager', 'engineer'].includes(user.role);
  const canDelete = !!user?.role && ['superadmin', 'regional_manager'].includes(user.role);

  const deleteLocation = useMutation({
    mutationFn: () => locationsApi.delete(locationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['map-features'] });
      backToMap();
      triggerUpdate();
    },
  });

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить этот объект с карты? Это действие нельзя будет отменить.')) {
      deleteLocation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Panel
        initial={{ x: window.innerWidth <= 768 ? 0 : 420, y: window.innerWidth <= 768 ? 400 : 0, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        exit={{ x: window.innerWidth <= 768 ? 0 : 420, y: window.innerWidth <= 768 ? 800 : 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <DragHandle />
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
  const isMilitary = location.type === 'military_office';
  const isMedical = MEDICAL_TYPES.includes(location.type);
  const isRelay = location.type === 'relay_server_location';

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number | null }[] = [
    { id: 'overview', label: 'Основное', icon: <LuClipboardList size={14} /> },
    ...(isMilitary ? [{ id: 'commission' as TabId, label: 'Комиссия', icon: <LuMonitor size={14} /> }] : []),
    ...(isMedical   ? [
      { id: 'diagnostics' as TabId, label: 'Исследования', icon: <LuMicroscope size={14} /> }
    ] : []),
    ...(isRelay     ? [{ id: 'server' as TabId, label: 'Сервер', icon: <LuServer size={14} /> }] : []),
    { id: 'tasks', label: 'Задачи', icon: <LuClipboardList size={14} />, count: location.tasks_count },
  ];

  // Reset to overview if current tab not available for this type
  const validTabIds = tabs.map(t => t.id);
  const currentTab = validTabIds.includes(activeTab) ? activeTab : 'overview';

  return (
    <Panel
      initial={{ x: window.innerWidth <= 768 ? 0 : 420, y: window.innerWidth <= 768 ? 400 : 0, opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      exit={{ x: window.innerWidth <= 768 ? 0 : 420, y: window.innerWidth <= 768 ? 800 : 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      drag={window.innerWidth <= 768 ? "y" : false}
      dragConstraints={{ top: 0, bottom: 500 }}
      dragElastic={0.1}
      onDragEnd={(_, info) => {
        if (window.innerWidth <= 768 && info.offset.y > 200) {
          backToMap();
        }
      }}
    >
      <DragHandle />
      {/* ── Header ── */}
      <PanelHeader>
        <Breadcrumb>
          {breadcrumb.map((item, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <Sep>/</Sep>}
              {i === 0
                ? <BreadItem onClick={backToMap}>{item.label}</BreadItem>
                : <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
              }
            </span>
          ))}
        </Breadcrumb>

        <HeaderMeta>
          <TypeBadge>
            <TypeIcon>
              {typeof typeInfo.icon === 'string' && typeInfo.icon.startsWith('/') ? (
                <img src={typeInfo.icon} alt="" />
              ) : (
                typeInfo.icon as React.ReactNode
              )}
            </TypeIcon>
            {typeInfo.label}
          </TypeBadge>
          <StatusBadge status={location.status as StatusType} pulse={location.status === 'critical'} />
        </HeaderMeta>

        <LocationName>{location.name}</LocationName>

        {location.address && (
          <AddressRow>
            <span style={{ flexShrink: 0 }}>📍</span>
            <span>{location.address}</span>
          </AddressRow>
        )}
      </PanelHeader>

      {/* ── Tab bar ── */}
      <TabBar>
        {tabs.map(tab => (
          <TabBtn
            key={tab.id}
            $active={currentTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <TabCount $active={currentTab === tab.id} $critical={tab.count > 0 && location.status === 'critical'}>
                {tab.count}
              </TabCount>
            )}
          </TabBtn>
        ))}
      </TabBar>

      {/* ── Tab content ── */}
      <TabContent>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {currentTab === 'overview' && (
              <OverviewTab
                location={location}
                canEdit={canEdit}
                onStatusChange={(s) => updateStatus.mutate(s)}
                isUpdatingStatus={updateStatus.isPending}
              />
            )}
            {currentTab === 'commission' && <CommissionTab locationId={locationId} canEdit={canEdit} />}
            {currentTab === 'diagnostics' && <DiagnosticsTab locationId={locationId} canEdit={canEdit} />}
            {currentTab === 'server' && <RelayServerTab locationId={locationId} canEdit={canEdit} />}
            {currentTab === 'tasks' && <TasksTab locationId={locationId} regionId={location.region_id} />}
          </motion.div>
        </AnimatePresence>
      </TabContent>

      {/* ── Footer ── */}
      <Actions>
        <Button variant="ghost" size="sm" onClick={backToMap} style={{ flex: 1 }}>
          ← На карту
        </Button>
        {canEdit && (
          <Button variant="secondary" size="sm" style={{ flex: 1 }}>
            ✏️ Редактировать
          </Button>
        )}
        {canDelete && (
          <Button 
            variant="danger" 
            size="sm" 
            onClick={handleDelete}
            loading={deleteLocation.isPending}
            style={{ flex: 0, minWidth: '40px' }}
            title="Удалить объект"
          >
            <LuTrash2 size={16} />
          </Button>
        )}
      </Actions>
    </Panel>
  );
}
