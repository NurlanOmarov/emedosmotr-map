import { AnimatePresence, motion } from 'framer-motion';
import styled from 'styled-components';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActiveTool = 'none' | 'ruler' | 'route';

export interface RoutePoint {
  name: string;
  coords: [number, number];
}

interface MapToolsPanelProps {
  activeTool: ActiveTool;
  onSetActiveTool: (tool: ActiveTool) => void;

  // Ruler
  rulerPoints: RoutePoint[];
  rulerDistanceKm: number | null;
  onClearRuler: () => void;

  // Route planner
  routeWaypoints: RoutePoint[];
  routeResult: { distance: string; duration: string } | null;
  isBuilding: boolean;
  onRemoveWaypoint: (index: number) => void;
  onMoveWaypoint: (from: number, to: number) => void;
  onOptimizeRoute: () => void;
  onBuildRoute: () => void;
  onClearRoute: () => void;
  onSendToEngineer?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  return `${km.toFixed(1)} км`;
}

// ─── Styled components ────────────────────────────────────────────────────────

const Wrap = styled.div`
  position: absolute;
  bottom: 24px;
  left: 16px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;

  @media (max-width: 640px) {
    left: 10px;
    right: 10px;
    bottom: 12px;
    align-items: center;
  }
`;

const Toolbar = styled.div`
  display: flex;
  gap: 6px;
  @media (max-width: 640px) {
    width: 100%;
    justify-content: center;
  }
`;

const Icon = styled.span`
  width: 16px;
  height: 16px;
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

const ToolBtn = styled(motion.button)<{ $active: boolean; $color: string }>`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 15px;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active, $color }) => $active ? $color : 'rgba(15,23,42,0.9)'};
  border: 1px solid ${({ $active, $color }) => $active ? $color : 'rgba(255,255,255,0.08)'};
  color: #F1F5F9;
  backdrop-filter: blur(16px);
  box-shadow: ${({ $active, $color }) => $active ? `0 4px 20px ${$color}55` : '0 4px 16px rgba(0,0,0,0.4)'};
  transition: all 150ms ease;
  &:hover {
    background: ${({ $active, $color }) => $active ? $color : 'rgba(30,41,59,0.95)'};
  }
`;

const Panel = styled(motion.div)`
  width: 280px;
  background: rgba(10,18,40,0.93);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  overflow: hidden;

  @media (max-width: 640px) {
    width: calc(100vw - 20px);
    max-width: 340px;
  }
`;

const PanelHeader = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
`;

const PanelTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #CBD5E1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const PanelBody = styled.div`
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StepRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
`;

const StepCircle = styled.div<{ $done: boolean; $color: string }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid ${({ $done, $color }) => $done ? $color : '#334155'};
  background: ${({ $done, $color }) => $done ? $color + '22' : 'transparent'};
  color: ${({ $done, $color }) => $done ? $color : '#475569'};
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
`;

const StepText = styled.div`
  font-size: 12px;
  color: #64748B;
  line-height: 1.4;
  em {
    color: #CBD5E1;
    font-style: normal;
    font-weight: 600;
  }
`;

const ResultBox = styled.div<{ $color: string }>`
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: ${({ $color }) => $color + '15'};
  border: 1px solid ${({ $color }) => $color + '30'};
  border-radius: 10px;
`;

const ResultItem = styled.div`
  flex: 1;
`;

const ResultValue = styled.div<{ $color: string }>`
  font-size: 16px;
  font-weight: 700;
  color: ${({ $color }) => $color};
`;

const ResultLabel = styled.div`
  font-size: 10px;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 2px;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
`;

const SmallBtn = styled.button<{ $variant?: 'primary' | 'danger' | 'default' }>`
  padding: 5px 11px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid;
  transition: all 120ms ease;
  background: ${({ $variant }) =>
    $variant === 'primary' ? 'rgba(139,92,246,0.85)' :
    $variant === 'danger' ? 'rgba(239,68,68,0.12)' :
    'rgba(255,255,255,0.05)'};
  border-color: ${({ $variant }) =>
    $variant === 'primary' ? 'rgba(139,92,246,0.5)' :
    $variant === 'danger' ? 'rgba(239,68,68,0.3)' :
    'rgba(255,255,255,0.1)'};
  color: ${({ $variant }) =>
    $variant === 'primary' ? '#F1F5F9' :
    $variant === 'danger' ? '#EF4444' :
    '#94A3B8'};
  &:hover {
    opacity: 0.85;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(255,255,255,0.06);
  margin: 2px 0;
`;

// Waypoint list

const WaypointList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
`;

const WaypointRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
`;

const WaypointNum = styled.div<{ $color: string }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ $color }) => $color + '22'};
  border: 1px solid ${({ $color }) => $color + '55'};
  color: ${({ $color }) => $color};
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const WaypointName = styled.div`
  flex: 1;
  font-size: 11px;
  color: #CBD5E1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const WaypointActions = styled.div`
  display: flex;
  gap: 2px;
`;

const IconBtn = styled.button`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #475569;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 100ms;
  &:hover { background: rgba(255,255,255,0.08); color: #CBD5E1; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const Hint = styled.div`
  font-size: 11px;
  color: #475569;
  text-align: center;
  padding: 4px 0;
`;

const BuildBtn = styled.button<{ $loading: boolean }>`
  width: 100%;
  padding: 9px 14px;
  border-radius: 9px;
  border: 1px solid rgba(139,92,246,0.35);
  background: ${({ $loading }) => $loading ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.75)'};
  color: #F1F5F9;
  font-size: 12px;
  font-weight: 600;
  cursor: ${({ $loading }) => $loading ? 'wait' : 'pointer'};
  transition: all 150ms;
  &:hover:not(:disabled) { background: rgba(139,92,246,0.9); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Subcomponents ────────────────────────────────────────────────────────────

function RulerPanel({
  rulerPoints,
  rulerDistanceKm,
  onClearRuler,
  onClose,
}: {
  rulerPoints: RoutePoint[];
  rulerDistanceKm: number | null;
  onClearRuler: () => void;
  onClose: () => void;
}) {
  const RULER_COLOR = '#F59E0B';

  return (
    <Panel
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.16 }}
    >
      <PanelHeader $color={RULER_COLOR}>
        <PanelTitle style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon style={{ width: 14, height: 14 }}>📏</Icon>
          Линейка
        </PanelTitle>
        <SmallBtn onClick={onClose}>✕</SmallBtn>
      </PanelHeader>
      <PanelBody>
        <StepRow>
          <StepCircle $done={rulerPoints.length >= 1} $color={RULER_COLOR}>
            {rulerPoints.length >= 1 ? '✓' : '1'}
          </StepCircle>
          <StepText>
            {rulerPoints.length >= 1
              ? <><em>Начало:</em> {rulerPoints[0].name}</>
              : 'Кликните на карту или объект — начальная точка'}
          </StepText>
        </StepRow>
        <StepRow>
          <StepCircle $done={rulerPoints.length >= 2} $color={RULER_COLOR}>
            {rulerPoints.length >= 2 ? '✓' : '2'}
          </StepCircle>
          <StepText>
            {rulerPoints.length >= 2
              ? <><em>Конец:</em> {rulerPoints[1].name}</>
              : 'Кликните вторую точку'}
          </StepText>
        </StepRow>

        {rulerDistanceKm !== null && (
          <>
            <Divider />
            <ResultBox $color={RULER_COLOR}>
              <ResultItem>
                <ResultValue $color={RULER_COLOR}>{formatDistance(rulerDistanceKm)}</ResultValue>
                <ResultLabel>По прямой</ResultLabel>
              </ResultItem>
              <ResultItem style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#64748B', lineHeight: 1.4 }}>
                  Реальный путь обычно на 20–40% длиннее
                </span>
              </ResultItem>
            </ResultBox>
          </>
        )}

        {rulerPoints.length > 0 && (
          <ActionRow>
            <SmallBtn $variant="danger" onClick={onClearRuler}>Сбросить</SmallBtn>
          </ActionRow>
        )}
      </PanelBody>
    </Panel>
  );
}

const WAYPOINT_COLORS = [
  '#60A5FA', '#34D399', '#F59E0B', '#F472B6', '#A78BFA',
  '#38BDF8', '#4ADE80', '#FBBF24', '#E879F9', '#C084FC',
];

function RoutePlannerPanel({
  routeWaypoints,
  routeResult,
  isBuilding,
  onRemoveWaypoint,
  onMoveWaypoint,
  onOptimizeRoute,
  onBuildRoute,
  onClearRoute,
  onSendToEngineer,
  onClose,
}: {
  routeWaypoints: RoutePoint[];
  routeResult: { distance: string; duration: string } | null;
  isBuilding: boolean;
  onRemoveWaypoint: (i: number) => void;
  onMoveWaypoint: (from: number, to: number) => void;
  onOptimizeRoute: () => void;
  onBuildRoute: () => void;
  onClearRoute: () => void;
  onSendToEngineer?: () => void;
  onClose: () => void;
}) {
  const ROUTE_COLOR = '#8B5CF6';

  return (
    <Panel
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.16 }}
    >
      <PanelHeader $color={ROUTE_COLOR}>
        <PanelTitle style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon style={{ width: 14, height: 14 }}>
            <img src="/icons/map.png" alt="" />
          </Icon>
          Планировщик маршрута
        </PanelTitle>
        <SmallBtn onClick={onClose}>✕</SmallBtn>
      </PanelHeader>
      <PanelBody>
        {routeWaypoints.length === 0 ? (
          <Hint>
            Кликайте на населённые пункты или объекты на карте, чтобы добавить точки маршрута
          </Hint>
        ) : (
          <WaypointList>
            {routeWaypoints.map((wp, i) => (
              <WaypointRow key={i}>
                <WaypointNum $color={WAYPOINT_COLORS[i % WAYPOINT_COLORS.length]}>
                  {i + 1}
                </WaypointNum>
                <WaypointName title={wp.name}>{wp.name}</WaypointName>
                <WaypointActions>
                  <IconBtn
                    title="Вверх"
                    disabled={i === 0}
                    onClick={() => onMoveWaypoint(i, i - 1)}
                  >
                    ↑
                  </IconBtn>
                  <IconBtn
                    title="Вниз"
                    disabled={i === routeWaypoints.length - 1}
                    onClick={() => onMoveWaypoint(i, i + 1)}
                  >
                    ↓
                  </IconBtn>
                  <IconBtn
                    title="Удалить"
                    onClick={() => onRemoveWaypoint(i)}
                    style={{ color: '#EF4444' }}
                  >
                    ✕
                  </IconBtn>
                </WaypointActions>
              </WaypointRow>
            ))}
          </WaypointList>
        )}

        {routeWaypoints.length >= 2 && (
          <ActionRow>
            <SmallBtn
              title="Оптимизировать порядок посещения (алгоритм ближайшего соседа)"
              onClick={onOptimizeRoute}
            >
              ⚡ Оптимизировать
            </SmallBtn>
          </ActionRow>
        )}

        {routeWaypoints.length >= 2 && (
          <BuildBtn
            $loading={isBuilding}
            disabled={isBuilding}
            onClick={onBuildRoute}
          >
            {isBuilding ? 'Строю маршрут...' : '→ Построить маршрут'}
          </BuildBtn>
        )}

        {routeResult && (
          <>
            <Divider />
            <ResultBox $color={ROUTE_COLOR}>
              <ResultItem>
                <ResultValue $color={ROUTE_COLOR}>{routeResult.distance}</ResultValue>
                <ResultLabel>По дороге</ResultLabel>
              </ResultItem>
              <ResultItem>
                <ResultValue $color={ROUTE_COLOR}>{routeResult.duration}</ResultValue>
                <ResultLabel>В пути (авто)</ResultLabel>
              </ResultItem>
            </ResultBox>
            {onSendToEngineer && (
              <BuildBtn
                $loading={false}
                onClick={onSendToEngineer}
                style={{ background: 'rgba(34,197,94,0.75)', borderColor: 'rgba(34,197,94,0.35)', marginTop: 8 }}
              >
                👷 Отправить инженеру
              </BuildBtn>
            )}
          </>
        )}

        {(routeWaypoints.length > 0 || routeResult) && (
          <ActionRow>
            <SmallBtn $variant="danger" onClick={onClearRoute}>Очистить всё</SmallBtn>
          </ActionRow>
        )}
      </PanelBody>
    </Panel>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function MapToolsPanel({
  activeTool,
  onSetActiveTool,
  rulerPoints,
  rulerDistanceKm,
  onClearRuler,
  routeWaypoints,
  routeResult,
  isBuilding,
  onRemoveWaypoint,
  onMoveWaypoint,
  onOptimizeRoute,
  onBuildRoute,
  onClearRoute,
  onSendToEngineer,
}: MapToolsPanelProps) {
  const handleRulerToggle = () => {
    onSetActiveTool(activeTool === 'ruler' ? 'none' : 'ruler');
  };

  const handleRouteToggle = () => {
    onSetActiveTool(activeTool === 'route' ? 'none' : 'route');
  };

  return (
    <Wrap>
      <AnimatePresence mode="wait">
        {activeTool === 'ruler' && (
          <RulerPanel
            key="ruler-panel"
            rulerPoints={rulerPoints}
            rulerDistanceKm={rulerDistanceKm}
            onClearRuler={onClearRuler}
            onClose={() => onSetActiveTool('none')}
          />
        )}
        {activeTool === 'route' && (
          <RoutePlannerPanel
            key="route-panel"
            routeWaypoints={routeWaypoints}
            routeResult={routeResult}
            isBuilding={isBuilding}
            onRemoveWaypoint={onRemoveWaypoint}
            onMoveWaypoint={onMoveWaypoint}
            onOptimizeRoute={onOptimizeRoute}
            onBuildRoute={onBuildRoute}
            onClearRoute={onClearRoute}
            onSendToEngineer={onSendToEngineer}
            onClose={() => onSetActiveTool('none')}
          />
        )}
      </AnimatePresence>

      <Toolbar>
        <ToolBtn
          $active={activeTool === 'ruler'}
          $color="rgba(245,158,11,0.85)"
          onClick={handleRulerToggle}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Icon>📏</Icon>
          Линейка
        </ToolBtn>
        <ToolBtn
          $active={activeTool === 'route'}
          $color="rgba(139,92,246,0.85)"
          onClick={handleRouteToggle}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Icon>
            <img src="/icons/map.png" alt="" />
          </Icon>
          Маршрут
        </ToolBtn>
      </Toolbar>
    </Wrap>
  );
}
