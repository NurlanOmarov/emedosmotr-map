import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { geoApi } from '@/services/api';
import { useMapViewStore } from '@/features/map/useMapViewStore';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { TasksList } from '@/components/shared/TasksList';


const FormLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  margin-top: 12px;
`;

const FormInput = styled.input`
  width: 100%;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
`;

const ModalContent = styled.div<{ padding?: string }>`
  background: ${({ theme }) => theme.colors.bgCard};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  padding: ${props => props.padding || '20px'};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'ghost', size?: 'xs' | 'sm' | 'md' }>`
  padding: ${props => props.size === 'xs' ? '4px 8px' : '8px 16px'};
  border-radius: 8px;
  font-size: ${props => props.size === 'xs' ? '11px' : '13px'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  
  background: ${props => {
    if (props.variant === 'primary') return '#2563eb';
    if (props.variant === 'secondary') return 'rgba(255,255,255,0.05)';
    return 'transparent';
  }};
  
  color: ${props => {
    if (props.variant === 'ghost') return '#94A3B8';
    return '#fff';
  }};
  
  &:hover {
    background: ${props => {
      if (props.variant === 'primary') return '#1d4ed8';
      if (props.variant === 'secondary') return 'rgba(255,255,255,0.1)';
      return 'rgba(255,255,255,0.05)';
    }};
  }
`;

const Panel = styled(motion.div)`
  width: 400px;
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
    box-shadow: ${({ theme }) => theme.shadows.lg};
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
  padding: 24px 20px 20px;
  background: ${({ theme }) => theme.colors.bgSecondary}88;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const RegionName = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.02em;
  margin-bottom: 4px;
`;

const StatsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
`;

const StatLabel = styled.span`
  font-size: 13px;
  color: #94A3B8;
`;

const StatValue = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #60A5FA;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { 
    background: ${({ theme }) => theme.colors.border}; 
    border-radius: 2px; 
  }
`;

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
`;

const DistrictList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DistrictItem = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.bgCard};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bgHover};
    border-color: ${({ theme }) => theme.colors.primary}44;
  }
`;

const DistrictName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const ArrowIcon = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
`;

function RegionEditModal({ 
  region, 
  onClose, 
  onSave 
}: { 
  region: any, 
  onClose: () => void, 
  onSave: (data: any) => void 
}) {
  const [form, setForm] = useState({
    engineer_name: region.engineer_name || '',
    engineer_phone: region.engineer_phone || '',
  });

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} padding="24px">
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
          Редактировать регион: {region.name}
        </div>

        <FormLabel>ФИО Инженера</FormLabel>
        <FormInput value={form.engineer_name} onChange={e => setForm({...form, engineer_name: e.target.value})} placeholder="Иванов Иван Иванович" />

        <FormLabel>Телефон инженера</FormLabel>
        <FormInput value={form.engineer_phone} onChange={e => setForm({...form, engineer_phone: e.target.value})} placeholder="+7 777 123 4567" />

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <Button variant="ghost" style={{ flex: 1 }} onClick={onClose}>Отмена</Button>
          <Button variant="primary" style={{ flex: 1 }} onClick={() => onSave(form)}>Сохранить</Button>
        </div>
      </ModalContent>
    </ModalOverlay>
  );
}

function SettlementModal({ 
  settlement, 
  regionId, 
  onClose, 
  onSave 
}: { 
  settlement: any, 
  regionId: number, 
  onClose: () => void, 
  onSave: (data: any) => void 
}) {
  const {
    isPickingLocation,
    setPickingLocation,
    pickedCoords,
    setPickedCoords
  } = useMapViewStore();

  const [form, setForm] = useState(settlement || {
    name: '',
    latitude: 43.2389,
    longitude: 76.8897,
    region_id: regionId
  });

  useEffect(() => {
    if (pickedCoords) {
      setForm((prev: any) => ({
        ...prev,
        latitude: Number(pickedCoords[0].toFixed(6)),
        longitude: Number(pickedCoords[1].toFixed(6))
      }));
      setPickedCoords(null);
    }
  }, [pickedCoords, setPickedCoords]);

  return (
    <ModalOverlay 
      initial={{ opacity: 0 }}
      animate={{ opacity: isPickingLocation ? 0 : 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        pointerEvents: isPickingLocation ? 'none' : 'auto',
        visibility: isPickingLocation ? 'hidden' : 'visible'
      }}
      onClick={onClose}
    >
      <ModalContent onClick={e => e.stopPropagation()} padding="24px">
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
          {settlement ? 'Редактировать район' : 'Добавить новый район'}
        </div>

        <FormLabel>Название района</FormLabel>
        <FormInput value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Напр: Талгарский район" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <FormLabel>Широта (Lat)</FormLabel>
            <FormInput type="number" step="any" value={form.latitude} onChange={e => setForm({...form, latitude: parseFloat(e.target.value)})} />
          </div>
          <div>
            <FormLabel>Долгота (Lon)</FormLabel>
            <FormInput type="number" step="any" value={form.longitude} onChange={e => setForm({...form, longitude: parseFloat(e.target.value)})} />
          </div>
          <Button 
            variant="secondary" 
            type="button"
            onClick={() => setPickingLocation(true)}
            style={{ height: '37px', padding: '0 12px', fontSize: 18 }}
            title="Указать на карте"
          >
            📍
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {settlement && (
            <Button 
              variant="secondary" 
              onClick={() => {
                if (window.confirm('Вы уверены, что хотите удалить этот район?')) {
                  onSave({...form, _delete: true});
                }
              }}
              style={{ color: '#ef4444' }}
            >
              Удалить
            </Button>
          )}
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button variant="primary" onClick={() => onSave(form)}>Сохранить</Button>
        </div>
      </ModalContent>
    </ModalOverlay>
  );
}

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 16px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { 
    background: ${({ theme }) => theme.colors.bgHover}; 
    color: ${({ theme }) => theme.colors.textPrimary}; 
  }
`;


export function RegionDetail() {
  const { 
    selectedRegionId, 
    selectedRegionName, 
    backToCountry,
    selectSettlementLevel 
  } = useMapViewStore();
  
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [editingSettlement, setEditingSettlement] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingRegion, setIsEditingRegion] = useState(false);
  const [activeTab, setActiveTab] = useState<'districts' | 'tasks'>('districts');


  const { data: settlements, isLoading } = useQuery({
    queryKey: ['settlements', selectedRegionId],
    queryFn: () => geoApi.getSettlements(selectedRegionId!).then(r => r.data),
    enabled: !!selectedRegionId,
  });

  const { data: region } = useQuery({
    queryKey: ['region', selectedRegionId],
    queryFn: () => geoApi.getRegion(selectedRegionId!).then(r => r.data),
    enabled: !!selectedRegionId,
  });

  if (selectedRegionId === null) return null;

  return (
    <Panel
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <DragHandle />
      <CloseButton onClick={backToCountry}>✕</CloseButton>
      
      <PanelHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RegionName>{selectedRegionName}</RegionName>
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={() => setIsEditingRegion(true)}
              style={{ padding: '2px', opacity: 0.5 }}
            >
              ✏️
            </Button>
          )}
        </div>
        <StatsRow>
          <StatLabel>Всего районов:</StatLabel>
          <StatValue>{isLoading ? '...' : settlements?.length || 0}</StatValue>
        </StatsRow>

        {region?.engineer_name && (
          <div style={{ marginTop: 16, padding: '12px', background: 'var(--primary-glow)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Региональный инженер</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{region.engineer_name}</div>
            {region.engineer_phone && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{region.engineer_phone}</div>
                <a 
                  href={`https://wa.me/${region.engineer_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    fontSize: 11, 
                    color: '#22C55E', 
                    textDecoration: 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 4,
                    padding: '4px 8px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: 6
                  }}
                >
                  <span>WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        )}
      </PanelHeader>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px' }}>
        <button 
          onClick={() => setActiveTab('districts')}
          style={{ 
            padding: '12px 16px', 
            fontSize: 13, 
            fontWeight: 600, 
            color: activeTab === 'districts' ? '#3B82F6' : '#94A3B8',
            borderBottom: activeTab === 'districts' ? '2px solid #3B82F6' : 'none',
            background: 'none',
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            cursor: 'pointer'
          }}
        >
          Районы
        </button>
        <button 
          onClick={() => setActiveTab('tasks')}
          style={{ 
            padding: '12px 16px', 
            fontSize: 13, 
            fontWeight: 600, 
            color: activeTab === 'tasks' ? '#3B82F6' : '#94A3B8',
            borderBottom: activeTab === 'tasks' ? '2px solid #3B82F6' : 'none',
            background: 'none',
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            cursor: 'pointer'
          }}
        >
          Общие задачи
        </button>
      </div>

      <Content>
        {activeTab === 'districts' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SectionTitle>Список районов</SectionTitle>
              {isAdmin && (
                <Button variant="primary" size="xs" onClick={() => setIsAdding(true)}>+ Добавить</Button>
              )}
            </div>
            {isLoading ? (
              <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '20px' }}>
                Загрузка списка...
              </div>
            ) : (
              <DistrictList>
                {settlements?.map((s: any) => (
                  <DistrictItem
                    key={s.settlement_id}
                    onClick={() => selectSettlementLevel(s.settlement_id, s.name)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <DistrictName>{s.name}</DistrictName>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSettlement(s);
                          }}
                          style={{ padding: '4px', opacity: 0.6 }}
                        >
                          ✏️
                        </Button>
                      )}
                      <ArrowIcon>→</ArrowIcon>
                    </div>
                  </DistrictItem>
                ))}
                {settlements?.length === 0 && (
                  <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '20px' }}>
                    Районы не найдены
                  </div>
                )}
              </DistrictList>
            )}
          </>
        )}

        {activeTab === 'tasks' && (
          <TasksList regionId={selectedRegionId} />
        )}
      </Content>

      {(isAdding || editingSettlement) && (
        <SettlementModal
          regionId={selectedRegionId}
          settlement={editingSettlement}
          onClose={() => {
            setIsAdding(false);
            setEditingSettlement(null);
          }}
          onSave={(data) => {
            const isDelete = data._delete;
            const promise = isDelete
              ? geoApi.deleteSettlement(editingSettlement.settlement_id)
              : (editingSettlement 
                  ? geoApi.updateSettlement(editingSettlement.settlement_id, data)
                  : geoApi.createSettlement(data));
              
            promise.then(() => {
              qc.invalidateQueries({ queryKey: ['settlements', selectedRegionId] });
              qc.invalidateQueries({ queryKey: ['settlements-all'] });
              setIsAdding(false);
              setEditingSettlement(null);
            });
          }}
        />
      )}

      {isEditingRegion && region && (
        <RegionEditModal
          region={region}
          onClose={() => setIsEditingRegion(false)}
          onSave={(data) => {
            geoApi.updateRegion(selectedRegionId, data).then(() => {
              qc.invalidateQueries({ queryKey: ['region', selectedRegionId] });
              setIsEditingRegion(false);
            });
          }}
        />
      )}
    </Panel>
  );
}
