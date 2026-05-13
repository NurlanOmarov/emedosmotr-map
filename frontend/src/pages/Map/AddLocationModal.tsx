import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { locationsApi, geoApi } from '@/services/api';
import { useMapViewStore } from '@/features/map/useMapViewStore';
import type { LocationType, StatusType } from '@/types';

// ─── Styled Components ────────────────────────────────────────────────────────

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const Modal = styled(motion.div)`
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  background: ${({ theme }) => theme.colors.bgCard};
  backdrop-filter: blur(32px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 20px 24px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

const ModalTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.01em;
`;

const CloseBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 16px;
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.bgHover}; color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
`;

const StepDot = styled.div<{ $active: boolean; $done: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  transition: all 200ms;
  background: ${({ $active, $done, theme }) =>
    $done ? theme.colors.ready : $active ? theme.colors.primary : theme.colors.bgSecondary};
  color: ${({ $active, $done }) =>
    ($active || $done) ? '#fff' : '#475569'};
  border: 1px solid ${({ $active, $done, theme }) =>
    $done ? theme.colors.ready : $active ? theme.colors.primary : theme.colors.border};
`;

const StepLabel = styled.span<{ $active: boolean }>`
  font-size: 12px;
  color: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.textMuted};
  font-weight: ${({ $active }) => $active ? '600' : '400'};
`;

const StepConnector = styled.div`
  flex: 1;
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 14px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 14px;
  outline: none;
  transition: border-color 150ms;
  box-sizing: border-box;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}88; background: ${({ theme }) => theme.colors.bgHover}; }
  &::placeholder { color: ${({ theme }) => theme.colors.textMuted}; }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 14px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: border-color 150ms;
  box-sizing: border-box;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}88; }
  option { background: ${({ theme }) => theme.colors.bgCard}; color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 10px 14px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  outline: none;
  resize: vertical;
  min-height: 80px;
  transition: border-color 150ms;
  font-family: inherit;
  box-sizing: border-box;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}88; }
  &::placeholder { color: ${({ theme }) => theme.colors.textMuted}; }
`;


const TypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

const TypeCard = styled(motion.button)<{ $active: boolean; $color: string }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 150ms;
  background: ${({ $active, $color }) => $active ? `${$color}18` : 'rgba(255,255,255,0.03)'};
  border: 1px solid ${({ $active, $color }) => $active ? `${$color}50` : 'rgba(255,255,255,0.07)'};
  text-align: left;
`;

const TypeCardLabel = styled.span<{ $active: boolean; $color: string }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active, $color, theme }) => $active ? $color : theme.colors.textSecondary};
`;

const TypeColorDot = styled.div<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const Footer = styled.div`
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  gap: 10px;
  flex-shrink: 0;
`;

const Btn = styled(motion.button)<{ $variant?: 'primary' | 'ghost' }>`
  flex: 1;
  padding: 11px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
  background: ${({ $variant, theme }) =>
    $variant === 'primary' ? theme.colors.primary : theme.colors.bgSecondary};
  border: 1px solid ${({ $variant, theme }) =>
    $variant === 'primary' ? theme.colors.primary : theme.colors.border};
  color: ${({ $variant, theme }) => $variant === 'primary' ? '#fff' : theme.colors.textSecondary};
  &:hover {
    background: ${({ $variant }) =>
      $variant === 'primary' ? 'rgba(37,99,235,1)' : 'rgba(255,255,255,0.08)'};
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorMsg = styled.div`
  padding: 10px 14px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px;
  color: #FCA5A5;
  font-size: 13px;
`;

const SuccessMsg = styled.div`
  padding: 10px 14px;
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.2);
  border-radius: 10px;
  color: #86EFAC;
  font-size: 13px;
`;

// ─── Type config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: { value: LocationType; label: string; color: string }[] = [
  { value: 'military_office', label: 'Военкомат', color: '#DC2626' },
  { value: 'district_hospital', label: 'ЦРБ', color: '#2563EB' },
  { value: 'state_medical', label: 'Гос. мед.', color: '#0891B2' },
  { value: 'private_medical', label: 'Частная мед.', color: '#7C3AED' },
  { value: 'private_clinic', label: 'Частная клиника', color: '#9333EA' },
  { value: 'medical_center', label: 'Медцентр', color: '#059669' },
  { value: 'relay_server_location', label: 'Сервер', color: '#64748B' },
];

const STATUS_OPTIONS: { value: StatusType; label: string }[] = [
  { value: 'critical', label: 'Критично' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'ready', label: 'Готов' },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function AddLocationModal({ onClose }: Props) {
  const qc = useQueryClient();
  const { 
    selectedRegionId, 
    selectedSettlementId, 
    isPickingLocation, 
    setPickingLocation, 
    pickedCoords, 
    setPickedCoords 
  } = useMapViewStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1 state
  const [regionId, setRegionId] = useState<number | ''>(selectedRegionId ?? '');
  const [settlementId, setSettlementId] = useState<number | ''>(selectedSettlementId ?? '');
  const [locationType, setLocationType] = useState<LocationType>('military_office');

  // Step 2 state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState('');
  const [coordsError, setCoordsError] = useState('');
  const [status, setStatus] = useState<StatusType>('critical');
  const [notes, setNotes] = useState('');

  // Sync picked coords from map
  useEffect(() => {
    if (pickedCoords) {
      const lat = pickedCoords[0].toFixed(6);
      const lon = pickedCoords[1].toFixed(6);
      setCoords(`${lat}, ${lon}`);
      setCoordsError('');
      setPickedCoords(null);
    }
  }, [pickedCoords, setPickedCoords]);

  const parseCoords = (value: string): { lat: number; lon: number } | null => {
    const clean = value.trim().replace(/\s+/g, ' ');
    const match = clean.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
    if (!match) return null;
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return { lat, lon };
  };

  const handleCoordsChange = (value: string) => {
    setCoords(value);
    if (value.trim() === '') {
      setCoordsError('');
      return;
    }
    setCoordsError(parseCoords(value) ? '' : 'Формат: 43.302819, 77.239681');
  };

  // Queries
  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => geoApi.getRegions().then(r => r.data),
  });

  const { data: settlements } = useQuery({
    queryKey: ['settlements', regionId],
    queryFn: () => geoApi.getSettlements(regionId as number).then(r => r.data),
    enabled: regionId !== '',
  });

  // Reset settlement when region changes
  useEffect(() => {
    if (regionId !== selectedRegionId) {
      setSettlementId('');
    }
  }, [regionId, selectedRegionId]);

  // Mutation
  const createMutation = useMutation({
    mutationFn: (data: unknown) => locationsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['map-features'] });
      setSuccessMsg('Объект успешно добавлен!');
      setTimeout(() => {
        onClose();
      }, 1200);
    },
  });

  const canProceedStep1 = regionId !== '' && locationType;

  const handleSubmit = () => {
    const parsed = parseCoords(coords);
    if (!name.trim() || !parsed || regionId === '') return;

    createMutation.mutate({
      region_id: regionId,
      settlement_id: settlementId !== '' ? settlementId : null,
      name: name.trim(),
      type: locationType,
      address: address.trim() || null,
      lat: parsed.lat,
      lon: parsed.lon,
      status,
      notes: notes.trim() || null,
    });
  };

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: isPickingLocation ? 0 : 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        pointerEvents: isPickingLocation ? 'none' : 'auto',
        visibility: isPickingLocation ? 'hidden' : 'visible'
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Modal
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={(e) => { 
          e.preventDefault(); 
          if (step === 1) {
            if (canProceedStep1) setStep(2);
          } else {
            handleSubmit();
          }
        }}>
          <ModalHeader>
            <ModalTitle>Добавить объект</ModalTitle>
            <CloseBtn type="button" onClick={onClose}>x</CloseBtn>
          </ModalHeader>

          <StepIndicator>
            <StepDot $active={step === 1} $done={step > 1}>1</StepDot>
            <StepLabel $active={step === 1}>Место и тип</StepLabel>
            <StepConnector />
            <StepDot $active={step === 2} $done={false}>2</StepDot>
            <StepLabel $active={step === 2}>Детали объекта</StepLabel>
          </StepIndicator>

          <Body>
            {step === 1 && (
              <>
                <FormGroup>
                  <Label>Область *</Label>
                  <Select
                    value={regionId}
                    onChange={e => setRegionId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">Выберите область</option>
                    {Array.isArray(regions) && regions.map((r: any) => (
                      <option key={r.region_id} value={r.region_id}>{r.name}</option>
                    ))}
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>Населённый пункт</Label>
                  <Select
                    value={settlementId}
                    onChange={e => setSettlementId(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={regionId === ''}
                  >
                    <option value="">Выберите нас. пункт (необязательно)</option>
                    {Array.isArray(settlements) && settlements.map((s: any) => (
                      <option key={s.settlement_id} value={s.settlement_id}>{s.name}</option>
                    ))}
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>Тип объекта *</Label>
                  <TypeGrid>
                    {TYPE_CONFIG.map((tc) => (
                      <TypeCard
                        key={tc.value}
                        $active={locationType === tc.value}
                        $color={tc.color}
                        onClick={() => setLocationType(tc.value)}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                      >
                        <TypeColorDot $color={tc.color} />
                        <TypeCardLabel $active={locationType === tc.value} $color={tc.color}>
                          {tc.label}
                        </TypeCardLabel>
                      </TypeCard>
                    ))}
                  </TypeGrid>
                </FormGroup>
              </>
            )}

            {step === 2 && (
              <>
                {createMutation.isError && (
                  <ErrorMsg>
                    Ошибка при создании объекта. Проверьте данные и повторите.
                  </ErrorMsg>
                )}
                {successMsg && <SuccessMsg>{successMsg}</SuccessMsg>}

                <FormGroup>
                  <Label>Название *</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Военкомат г. Алматы"
                    autoFocus
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Адрес</Label>
                  <Input
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="ул. Примерная, 1"
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Координаты *</Label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Input
                      value={coords}
                      onChange={e => handleCoordsChange(e.target.value)}
                      placeholder="43.302819, 77.239681"
                      style={coordsError ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined}
                    />
                    <Btn
                      $variant="ghost"
                      type="button"
                      onClick={() => setPickingLocation(true)}
                      style={{ flex: '0 0 44px', padding: 0, fontSize: 18 }}
                      title="Указать на карте"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
              <Btn $variant="ghost" onClick={() => setStep(1)} type="button">
                Назад
              </Btn>
              <Btn
                $variant="primary"
                onClick={handleSubmit}
                disabled={
                  !name.trim() ||
                  !parseCoords(coords) ||
                  regionId === '' ||
                  createMutation.isPending
                }
                type="button"
                whileTap={{ scale: 0.97 }}
              >
                {createMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Btn>
            </>
          )}
        </Footer>
      </Modal>
    </Overlay>
  );
}
