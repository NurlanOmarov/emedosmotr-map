import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { geoApi } from '@/services/api';
import { useMapViewStore } from '@/features/map/useMapViewStore';
import { Button } from '@/components/ui/Button';
import type { StatusType, LocationType } from '@/types';

const Overlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
`;

const Panel = styled(motion.div)`
  position: absolute;
  left: 16px;
  top: 60px;
  width: 280px;
  z-index: 30;
  background: rgba(10, 18, 40, 0.97);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0,0,0,0.6);
`;

const PanelHead = styled.div`
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const PanelTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #F1F5F9;
`;

const Body = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
`;

const Section = styled.div``;

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 8px;
`;

const ChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled(motion.button)<{ $active: boolean; $color?: string }>`
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
  background: ${({ $active, $color }) =>
    $active ? ($color ? `${$color}20` : 'rgba(59,130,246,0.15)') : 'rgba(255,255,255,0.04)'};
  color: ${({ $active, $color }) => ($active ? ($color || '#60A5FA') : '#64748B')};
  border: 1px solid ${({ $active, $color }) =>
    $active ? ($color ? `${$color}40` : 'rgba(59,130,246,0.3)') : 'rgba(255,255,255,0.07)'};
  &:hover { background: rgba(255,255,255,0.08); }
`;

const Footer = styled.div`
  padding: 12px 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  gap: 8px;
`;

const STATUS_OPTIONS: { value: StatusType; label: string; color: string }[] = [
  { value: 'ready', label: '✅ Готов', color: '#22C55E' },
  { value: 'in_progress', label: '🟡 В работе', color: '#F59E0B' },
  { value: 'critical', label: '🔴 Критично', color: '#EF4444' },
];

const TYPE_OPTIONS: { value: LocationType; label: string }[] = [
  { value: 'military_office', label: '🏛️ Военкомат' },
  { value: 'district_hospital', label: '🏥 ЦРБ' },
  { value: 'private_clinic', label: '💊 Частная клиника' },
  { value: 'medical_center', label: '⚕️ Медцентр' },
];

interface Props {
  onClose: () => void;
}

export function MapFiltersPanel({ onClose }: Props) {
  const { filters, setFilters } = useMapViewStore();

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => geoApi.getRegions().then((r) => r.data),
  });

  const toggleStatus = (s: StatusType) =>
    setFilters({
      statuses: filters.statuses.includes(s)
        ? filters.statuses.filter((x) => x !== s)
        : [...filters.statuses, s],
    });

  const toggleType = (t: LocationType) =>
    setFilters({
      locationTypes: filters.locationTypes.includes(t)
        ? filters.locationTypes.filter((x) => x !== t)
        : [...filters.locationTypes, t],
    });

  const resetAll = () =>
    setFilters({ regions: [], statuses: [], locationTypes: [], hasActiveTasks: false });

  return (
    <>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <Panel
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <PanelHead>
          <PanelTitle>Фильтры</PanelTitle>
          <button onClick={onClose} style={{ color: '#64748B', fontSize: 18, cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
        </PanelHead>

        <Body>
          <Section>
            <SectionLabel>Статус</SectionLabel>
            <ChipGroup>
              {STATUS_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  $active={filters.statuses.includes(opt.value)}
                  $color={opt.color}
                  onClick={() => toggleStatus(opt.value)}
                  whileTap={{ scale: 0.95 }}
                >
                  {opt.label}
                </Chip>
              ))}
            </ChipGroup>
          </Section>

          <Section>
            <SectionLabel>Тип объекта</SectionLabel>
            <ChipGroup>
              {TYPE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  $active={filters.locationTypes.includes(opt.value)}
                  onClick={() => toggleType(opt.value)}
                  whileTap={{ scale: 0.95 }}
                >
                  {opt.label}
                </Chip>
              ))}
            </ChipGroup>
          </Section>

          {regions && regions.length > 0 && (
            <Section>
              <SectionLabel>Регион</SectionLabel>
              <ChipGroup>
                {regions.map((r: any) => (
                  <Chip
                    key={r.region_id}
                    $active={filters.regions.includes(r.region_id)}
                    onClick={() =>
                      setFilters({
                        regions: filters.regions.includes(r.region_id)
                          ? filters.regions.filter((x) => x !== r.region_id)
                          : [...filters.regions, r.region_id],
                      })
                    }
                    whileTap={{ scale: 0.95 }}
                  >
                    {r.name}
                  </Chip>
                ))}
              </ChipGroup>
            </Section>
          )}
        </Body>

        <Footer>
          <Button variant="ghost" size="sm" onClick={resetAll} style={{ flex: 1 }}>
            Сбросить
          </Button>
          <Button variant="primary" size="sm" onClick={onClose} style={{ flex: 1 }}>
            Применить
          </Button>
        </Footer>
      </Panel>
    </>
  );
}
