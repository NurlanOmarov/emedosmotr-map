import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  LuX,
  LuKey,
  LuChevronRight,
  LuMapPin
} from 'react-icons/lu';
import { locationsApi, districtAccountsApi } from '@/services/api';
import { useMapViewStore } from '@/features/map/useMapViewStore';
import { STATUS_COLORS, LOCATION_TYPE_CONFIG } from '@/types';
import { useState } from 'react';
import { TasksList } from '@/components/shared/TasksList';
import { useAuthStore } from '@/features/auth/useAuthStore';

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

const SettlementName = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.02em;
  margin-bottom: 4px;
`;

const RegionName = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StatsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatValue = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const StatLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  margin-bottom: 4px;
`;

const LocationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LocationItem = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.bgCard};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bgHover};
    border-color: ${({ theme }) => theme.colors.primary}44;
    transform: translateX(4px);
  }
`;

const StatusDot = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$color};
  box-shadow: 0 0 8px ${props => props.$color}44;
  flex-shrink: 0;
`;

const LocationInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const LocationName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LocationMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

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
  z-index: 10;
  &:hover { 
    background: ${({ theme }) => theme.colors.bgHover}; 
    color: ${({ theme }) => theme.colors.textPrimary}; 
  }
`;

const TabBar = styled.div`
  display: flex;
  padding: 0 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.textSecondary};
  border-bottom: 2px solid ${props => props.$active ? props.theme.colors.primary : 'transparent'};
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const EmptyState = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
  text-align: center;
  padding: 40px 20px;
`;

const LoadingState = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
  text-align: center;
  padding: 20px;
`;

export function SettlementDetail() {
  const { 
    selectedSettlementId, 
    selectedSettlementName,
    selectedRegionName,
    backToRegion,
    selectLocation
  } = useMapViewStore();

  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canViewAccounts = user?.role && ['admin', 'superadmin', 'director', 'regional_manager'].includes(user.role);

  const [activeTab, setActiveTab] = useState<'locations' | 'tasks' | 'accounts'>('locations');

  const { data: locationsResponse, isLoading } = useQuery({
    queryKey: ['locations', 'settlement', selectedSettlementId],
    queryFn: () => locationsApi.list({ settlement_id: selectedSettlementId }).then(r => r.data),
    enabled: !!selectedSettlementId,
  });

  const { data: accountsData } = useQuery({
    queryKey: ['district-accounts', selectedSettlementId],
    queryFn: () => districtAccountsApi.list(selectedSettlementId!).then(r => r.data),
    enabled: !!selectedSettlementId && activeTab === 'accounts',
  });

  if (selectedSettlementId === null) return null;

  const locations = locationsResponse?.items || [];

  return (
    <Panel
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <DragHandle />
      <CloseButton onClick={backToRegion}><LuX size={16} /></CloseButton>
      
      <PanelHeader>
        <SettlementName>{selectedSettlementName}</SettlementName>
        <RegionName>
          <span style={{ opacity: 0.5 }}>Область:</span> {selectedRegionName}
        </RegionName>
        
        <StatsRow>
          <StatItem>
            <StatValue>{isLoading ? '...' : locations.length}</StatValue>
            <StatLabel>Объектов</StatLabel>
          </StatItem>
        </StatsRow>
      </PanelHeader>

      <TabBar>
        <Tab
          $active={activeTab === 'locations'}
          onClick={() => setActiveTab('locations')}
        >
          Объекты
        </Tab>
        <Tab
          $active={activeTab === 'tasks'}
          onClick={() => setActiveTab('tasks')}
        >
          Задачи
        </Tab>
        {canViewAccounts && (
          <Tab
            $active={activeTab === 'accounts'}
            onClick={() => setActiveTab('accounts')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LuKey size={14} />
              <span>Учётки</span>
            </div>
          </Tab>
        )}
      </TabBar>

      <Content>
        {activeTab === 'locations' && (
          <>
            <SectionTitle>Объекты в населенном пункте</SectionTitle>
            {isLoading ? (
              <LoadingState>
                Загрузка списка...
              </LoadingState>
            ) : (
              <LocationList>
                {locations.map((loc: any) => {
                  const statusColor = STATUS_COLORS[loc.status] || '#6B7280';
                  const typeLabel = LOCATION_TYPE_CONFIG[loc.type]?.label || loc.type;
                  
                  return (
                    <LocationItem
                      key={loc.id}
                      onClick={() => selectLocation(loc.id, [])}
                      whileTap={{ scale: 0.98 }}
                    >
                      <StatusDot $color={statusColor} />
                      <LocationInfo>
                        <LocationName>{loc.name}</LocationName>
                        <LocationMeta>{typeLabel}</LocationMeta>
                      </LocationInfo>
                      <LuChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </LocationItem>
                  );
                })}
                {locations.length === 0 && (
                  <EmptyState>
                    <div style={{ marginBottom: 12, color: 'var(--text-muted)' }}><LuMapPin size={32} /></div>
                    В этом населенном пункте пока нет объектов
                  </EmptyState>
                )}
              </LocationList>
            )}
          </>
        )}

        {activeTab === 'tasks' && (
          <TasksList settlementId={selectedSettlementId} />
        )}

        {activeTab === 'accounts' && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 12px' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Учётных записей: {accountsData?.length ?? '...'}
              </span>
              <button
                onClick={() => navigate(`/district-accounts?settlement_id=${selectedSettlementId}`)}
                style={{
                  background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: 8, padding: '6px 14px', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Открыть полный список <LuChevronRight size={14} />
              </button>
            </div>
            {accountsData && accountsData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {accountsData.slice(0, 10).map((acc: any) => (
                  <div
                    key={acc.id}
                    style={{
                      padding: '10px 16px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{acc.full_name}</div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>{acc.role || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                        {acc.login}
                      </div>
                    </div>
                  </div>
                ))}
                {accountsData.length > 10 && (
                  <div style={{ padding: '8px 16px', fontSize: 12, opacity: 0.5, textAlign: 'center' }}>
                    +{accountsData.length - 10} ещё...
                  </div>
                )}
              </div>
            ) : accountsData ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.4, fontSize: 13 }}>
                Учётных записей нет.<br />Загрузите Excel-файл на странице Учётки.
              </div>
            ) : null}
          </div>
        )}
      </Content>
    </Panel>
  );
}
