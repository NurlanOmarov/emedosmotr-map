import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  LuFilter,
  LuPlus,
  LuMapPin,
  LuRuler,
  LuFileText,
  LuX,
  LuMap,
  LuClipboardList,
  LuServer,
} from 'react-icons/lu';
import { locationsApi, geoApi } from '@/services/api';
import { useMapViewStore } from '@/features/map/useMapViewStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useMapWebSocket } from '@/hooks/useMapWebSocket';
import { useThemeStore } from '@/styles/useThemeStore';
import { LocationDetail } from './LocationDetail';
import { RegionDetail } from './RegionDetail';
import { SettlementDetail } from './SettlementDetail';
import { MapFiltersPanel } from './MapFiltersPanel';
import { AddLocationModal } from './AddLocationModal';
import { MapToolsPanel, ActiveTool, RoutePoint } from './MapToolsPanel';
import { TaskModal } from '@/components/shared/TaskModal';
import { tasksApi } from '@/services/api';
import { LOCATION_TYPE_CONFIG, STATUS_COLORS, StatusType } from '@/types';

const STATUS_LABELS: Record<StatusType, string> = {
  ready: 'Готов',
  in_progress: 'В работе',
  critical: 'Критично',
};

declare global {
  interface Window {
    ymaps: any;
  }
}

// ─── Styled Components ────────────────────────────────────────────────────────

const Container = styled.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
`;

const MapContainer = styled.div`
  flex: 1;
  position: relative;
`;

const YMapEl = styled.div<{ $whiteBg: boolean }>`
  width: 100%;
  height: 100%;
  background: ${({ $whiteBg, theme }) =>
    $whiteBg ? (theme.mode === 'dark' ? '#04080F' : '#ffffff') : theme.colors.bgSecondary};

  ${({ theme }) => theme.mode === 'dark' && `
    [class*="ymaps-"][class*="-pane"],
    [class*="ymaps-"][class*="-tiles"],
    [class*="ymaps-"][class*="-map-bg"],
    canvas {
      background: #04080F !important;
    }
  `}
`;

const FiltersBtn = styled(motion.button)`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(16px);
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.md};
  &:hover { background: ${({ theme }) => theme.colors.bgHover}; border-color: ${({ theme }) => theme.colors.borderHover}; }
`;

const AddBtn = styled(motion.button)`
  position: absolute;
  bottom: 24px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  background: rgba(37, 99, 235, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(59,130,246,0.4);
  border-radius: 12px;
  color: #F1F5F9;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(37,99,235,0.4);
  &:hover { background: rgba(37, 99, 235, 0.95); }

  @media (max-width: 640px) {
    bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  }
`;

const StatsBar = styled(motion.div)`
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(16px);
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadows.md};

  @media (max-width: 640px) {
    top: auto;
    bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    padding: 6px 12px;
    gap: 12px;
  }
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94A3B8;
  &:not(:last-child)::after {
    content: '|';
    margin-left: 8px;
    color: rgba(255,255,255,0.1);
  }
`;

const StatNum = styled.span<{ $color?: string }>`
  font-weight: 700;
  font-size: 14px;
  color: ${({ $color, theme }) => $color || theme.colors.textPrimary};
`;

const LayerPanel = styled(motion.div)`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(16px);
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 14px;
  box-shadow: ${({ theme }) => theme.shadows.md};
  min-width: 160px;

  @media (max-width: 768px) {
    display: none; // Hide on mobile, can be accessed via menu if needed or just keep map clean
  }
`;

const LayerTitle = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
`;

const LayerToggle = styled(motion.button)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
  background: ${({ $active, theme }) => $active ? theme.colors.primaryGlow : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.textMuted};
  border: 1px solid ${({ $active, theme }) => $active ? `${theme.colors.primary}33` : 'transparent'};
  &:hover { background: ${({ theme }) => theme.colors.bgHover}; color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const Dot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const BreadcrumbBar = styled(motion.div)`
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(16px);
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 10px;
  box-shadow: ${({ theme }) => theme.shadows.md};
  font-size: 12px;
  white-space: nowrap;

  @media (max-width: 640px) {
    top: 16px;
    width: auto;
    max-width: 90vw;
    overflow-x: auto;
    padding: 8px 16px;
  }
`;

const BreadLink = styled.button`
  background: none;
  border: none;
  color: #60A5FA;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  &:hover { color: #93C5FD; text-decoration: underline; }
`;

const BreadCurrent = styled.span`
  color: #94A3B8;
`;

const BreadSep = styled.span`
  color: #334155;
  margin: 0 2px;
`;

const LevelIndicator = styled(motion.div)<{ $level: string }>`
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  padding: 5px 12px;
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ $level }) =>
    $level === 'settlement' ? '#22C55E' :
    $level === 'region' ? '#60A5FA' :
    '#94A3B8'};
  letter-spacing: 0.04em;
`;

const ContextMenuContainer = styled(motion.div)<{ $x: number; $y: number }>`
  position: fixed;
  top: ${({ $y }) => $y}px;
  left: ${({ $x }) => $x}px;
  z-index: 1000;
  min-width: 180px;
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(24px);
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 14px;
  padding: 6px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const ContextMenuItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bgHover};
  }

  span {
    font-size: 16px;
  }
`;

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_PRIORITY: Record<string, number> = { critical: 0, in_progress: 1, ready: 2 };

function worstStatus(statuses: string[]): string {
  return statuses.reduce(
    (worst, s) => (STATUS_PRIORITY[s] ?? 3) < (STATUS_PRIORITY[worst] ?? 3) ? s : worst,
    'ready'
  );
}

const LAYERS = [
  { id: 'statuses', label: 'Статусы', icon: <LuMapPin size={14} /> },
  { id: 'tasks', label: 'Задачи', icon: <LuClipboardList size={14} /> },
  { id: 'regions', label: 'Регионы', icon: <LuMap size={14} /> },
  { id: 'equipment', label: 'Оборудование', icon: <LuServer size={14} /> },
  { id: 'distance', label: 'Дальность', icon: <LuRuler size={14} /> },
];

const LayerIcon = styled.span`
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  
  img {
    width: 130%;
    height: 130%;
    object-fit: contain;
    mask-image: radial-gradient(circle, black 50%, transparent 90%);
    -webkit-mask-image: radial-gradient(circle, black 50%, transparent 90%);
  }
`;


const LEVEL_LABELS: Record<string, string> = {
  country: 'Казахстан',
  region: 'Область',
  settlement: 'Нас. пункт',
};

const WRITER_ROLES = ['admin', 'superadmin', 'regional_manager', 'engineer'];

const KZ_CENTER: [number, number] = [48.0196, 66.9237];
const KZ_ZOOM = 5;

// Official Yandex Maps 2.1 "Night" Style JSON
const YANDEX_DARK_STYLE = [
  { "tags": { "all": ["water"] }, "stylers": [{ "color": "#0a1122" }] },
  { "tags": { "all": ["landscape"] }, "stylers": [{ "color": "#121212" }] },
  { "tags": { "all": ["road"] }, "stylers": [{ "color": "#1c1c1c" }] },
  { "tags": { "all": ["admin"] }, "stylers": [{ "color": "#333333" }] },
  { "tags": { "all": ["transit"] }, "stylers": [{ "visibility": "simplified" }, { "color": "#2c2e30" }] },
  { "tags": { "all": ["poi"] }, "stylers": [{ "visibility": "off" }] },
  { "elements": ["label.text.fill"], "stylers": [{ "color": "#8d9ba4" }] },
  { "elements": ["label.text.stroke"], "stylers": [{ "visibility": "off" }] }
];

function getBoundsFromGeomJson(geomJson: any): [[number, number], [number, number]] | null {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;

  const processRing = (ring: number[][]) => {
    ring.forEach(([lon, lat]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    });
  };

  try {
    const geom = typeof geomJson === 'string' ? JSON.parse(geomJson) : geomJson;
    if (geom.type === 'Polygon') {
      geom.coordinates.forEach(processRing);
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach((poly: number[][][]) => poly.forEach(processRing));
    }
  } catch {
    return null;
  }

  if (!isFinite(minLat)) return null;
  return [[minLat, minLon], [maxLat, maxLon]];
}

const MEDICAL_TYPES = new Set([
  'district_hospital', 'state_medical', 'private_medical', 'private_clinic', 'medical_center',
]);

function makeSvgUri(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function makeMilitarySvg(color: string): string {
  return makeSvgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="white" stroke="${color}" stroke-width="2"/>
      <polygon points="18,7 20.8,15 29.2,15 22.4,20 25,28 18,23 11,28 13.6,20 6.8,15 15.2,15"
        fill="${color}"/>
    </svg>`
  );
}

function makeMedicalSvg(color: string): string {
  return makeSvgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="white" stroke="${color}" stroke-width="2"/>
      <rect x="15" y="9" width="6" height="18" rx="1" fill="${color}"/>
      <rect x="9" y="15" width="18" height="6" rx="1" fill="${color}"/>
    </svg>`
  );
}

function makeServerSvg(color: string): string {
  return makeSvgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="white" stroke="${color}" stroke-width="2"/>
      <rect x="10" y="10" width="16" height="5" rx="1.5" fill="${color}"/>
      <rect x="10" y="17" width="16" height="5" rx="1.5" fill="${color}"/>
      <circle cx="22" cy="12.5" r="1" fill="white"/>
      <circle cx="22" cy="19.5" r="1" fill="white"/>
      <line x1="14" y1="22" x2="14" y2="26" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="22" y1="22" x2="22" y2="26" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="11" y1="26" x2="25" y2="26" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  );
}

// ─── Geo helpers ──────────────────────────────────────────────────────────────

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const x = sinDLat * sinDLat + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinDLon * sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function nearestNeighborOrder(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= 2) return points;
  const remaining = [...points.slice(1)];
  const result = [points[0]];
  while (remaining.length > 0) {
    const last = result[result.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = haversineKm(last.coords, p.coords);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    });
    result.push(remaining[nearestIdx]);
    remaining.splice(nearestIdx, 1);
  }
  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MapPage() {
  const {
    mode,
    selectedLocationId,
    activeLayers,
    toggleLayer,
    selectLocation,
    filters,
    mapLevel,
    selectedRegionId,
    selectedRegionName,
    selectedSettlementId,
    selectedSettlementName,
    selectRegionLevel,
    selectSettlementLevel,
    backToCountry,
    backToRegion,
    showAddModal,
    openAddModal,
    closeAddModal,
    mapBackground,
    setMapBackground,
    distanceCenter,
    setDistanceCenter,
    lastUpdateTrigger,
    isPickingLocation,
    contextMenu,
    showContextMenu,
    hideContextMenu,
    setPickedCoords,
  } = useMapViewStore();
  const { user } = useAuthStore();
  const { themeMode } = useThemeStore();
  const [searchParams] = useSearchParams();
  const locationIdParam = searchParams.get('location_id');

  useMapWebSocket();
  const mapRef = useRef<any>(null);

  // Global click listener to hide context menu
  useEffect(() => {
    const handleGlobalClick = () => {
      // If menu is visible, hide it on any click
      if (useMapViewStore.getState().contextMenu.visible) {
        hideContextMenu();
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [hideContextMenu]);

  // ── Refs for Custom Search Provider ───────────────────────────────────────
  const mapLevelRef = useRef<string>(mapLevel);
  useEffect(() => { mapLevelRef.current = mapLevel; }, [mapLevel]);

  const selectedRegionIdRef = useRef<number | null>(selectedRegionId);
  useEffect(() => { selectedRegionIdRef.current = selectedRegionId; }, [selectedRegionId]);

  const handleBackToCountry = () => {
    backToCountry();
    if (mapRef.current) {
      mapRef.current.setCenter(KZ_CENTER, KZ_ZOOM, { duration: 500 });
    }
  };

  const handleBackToRegion = () => {
    backToRegion();
    if (!mapRef.current || !regionsData || selectedRegionId == null) return;
    const region = Array.isArray(regionsData)
      ? regionsData.find((r: any) => r.region_id === selectedRegionId)
      : null;
    if (!region) return;
    const bounds = getBoundsFromGeomJson(region.geometry_json);
    if (bounds) {
      mapRef.current.setBounds(bounds, { checkZoomRange: true, duration: 500, zoomMargin: 40 });
    } else if (region.center_lat && region.center_lon) {
      mapRef.current.setCenter([region.center_lat, region.center_lon], 8, { duration: 500 });
    }
  };

  const mapElRef = useRef<HTMLDivElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Task Modal for "Send to Engineer"
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [prefilledTask, setPrefilledTask] = useState<any>(null);

  // Collections refs
  const featuresCollectionRef = useRef<any>(null);
  const settlementCollectionRef = useRef<any>(null);
  const regionsCollectionRef = useRef<any>(null);
  const labelsCollectionRef = useRef<any>(null);

  const regionsLayerActive = activeLayers.includes('regions');
  const canAdd = user?.role && WRITER_ROLES.includes(user.role);

  // ── Tool state ────────────────────────────────────────────────────────────

  const [activeTool, setActiveTool] = useState<ActiveTool>('none');
  const activeToolRef = useRef<ActiveTool>('none');
  const isPickingLocationRef = useRef(false);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { isPickingLocationRef.current = isPickingLocation; }, [isPickingLocation]);

  const getPlacemarkOptions = useCallback((type: string, color: string, customSize?: number) => {
    const isTool = activeToolRef.current !== 'none';
    const size = customSize || 36;
    const translate = size / 2;
    const iconSize = size; // Scale SVG to fill the container
    
    let iconHtml = '';
    if (type === 'military_office') iconHtml = `<img src="${makeMilitarySvg(color)}" style="width:${iconSize}px; height:${iconSize}px;"/>`;
    else if (MEDICAL_TYPES.has(type)) iconHtml = `<img src="${makeMedicalSvg(color)}" style="width:${iconSize}px; height:${iconSize}px;"/>`;
    else if (type === 'relay_server_location') iconHtml = `<img src="${makeServerSvg(color)}" style="width:${iconSize}px; height:${iconSize}px;"/>`;
    else iconHtml = `<div style="width:${size-12}px; height:${size-12}px; background:${color}; border-radius:50%; border:2px solid white;"></div>`;

    return {
      iconLayout: window.ymaps.templateLayoutFactory.createClass(
        `<div class="ymaps-re-invert" style="position: relative; width: ${size}px; height: ${size}px; transform: translate(-${translate}px, -${translate}px); cursor: pointer; pointer-events: auto; display: flex; align-items: center; justify-content: center;">
          ${iconHtml}
        </div>`
      ),
      iconShape: {
        type: 'Circle',
        coordinates: [0, 0],
        radius: translate
      },
      cursor: isTool ? 'crosshair' : 'pointer',
      hideIconOnBalloonOpen: false,
      zIndex: 100,
      interactive: true,
    };
  }, []);

  // Ruler
  const [rulerPoints, setRulerPoints] = useState<RoutePoint[]>([]);
  const rulerPointsRef = useRef<RoutePoint[]>([]);
  const rulerLineRef = useRef<any>(null);

  // Route planner (multi-stop)
  interface RouteResult {
    distance: string;
    duration: string;
    duration_min?: number;
  }
  const [routeWaypoints, setRouteWaypoints] = useState<RoutePoint[]>([]);
  const routeWaypointsRef = useRef<RoutePoint[]>([]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const routeObjRef = useRef<any>(null);

  // ── Map cursor: crosshair when tool is active ─────────────────────────────

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const isTool = activeTool !== 'none';
    const cursor = (isTool || isPickingLocation) ? 'crosshair' : '';
    
    // Update map container
    const el = mapRef.current.container.getElement() as HTMLElement;
    el.style.cursor = cursor;

    // Set cursor on collections - objects will inherit this unless overridden
    const collections = [regionsCollectionRef, featuresCollectionRef, settlementCollectionRef];
    collections.forEach(ref => {
      if (ref.current) {
        const c = (isTool || isPickingLocation) ? 'crosshair' : 'pointer';
        ref.current.options.set('cursor', c);
        
        // Also force update children to be sure
        ref.current.each((obj: any) => {
          obj.options.set('cursor', c);
        });
      }
    });
  }, [activeTool, mapReady, isPickingLocation]);

  // ── HTML decode helper (for Yandex API responses) ─────────────────────────

  const decodeHtml = (html: string): string => {
    const el = document.createElement('textarea');
    el.innerHTML = html;
    return el.value;
  };

  // ── Ruler: update polyline on map ─────────────────────────────────────────

  const updateRulerLine = useCallback((points: RoutePoint[]) => {
    if (!mapRef.current || !window.ymaps) return;
    if (rulerLineRef.current) {
      mapRef.current.geoObjects.remove(rulerLineRef.current);
      rulerLineRef.current = null;
    }
    if (points.length === 2) {
      const line = new window.ymaps.Polyline(
        [points[0].coords, points[1].coords],
        { hintContent: 'По прямой' },
        { strokeColor: '#F59E0B', strokeWidth: 2, strokeStyle: 'dash', strokeOpacity: 0.85 }
      );
      mapRef.current.geoObjects.add(line);
      rulerLineRef.current = line;
    }
  }, []);

  const clearRuler = useCallback(() => {
    rulerPointsRef.current = [];
    setRulerPoints([]);
    if (rulerLineRef.current && mapRef.current) {
      mapRef.current.geoObjects.remove(rulerLineRef.current);
      rulerLineRef.current = null;
    }
  }, []);

  // ── Route planner ─────────────────────────────────────────────────────────

  const clearRouteObj = useCallback(() => {
    if (routeObjRef.current && mapRef.current) {
      mapRef.current.geoObjects.remove(routeObjRef.current);
      routeObjRef.current = null;
    }
  }, []);

  const clearRoute = useCallback(() => {
    routeWaypointsRef.current = [];
    setRouteWaypoints([]);
    setRouteResult(null);
    clearRouteObj();
  }, [clearRouteObj]);

  const removeWaypoint = useCallback((index: number) => {
    const newWps = routeWaypointsRef.current.filter((_, i) => i !== index);
    routeWaypointsRef.current = newWps;
    setRouteWaypoints([...newWps]);
    setRouteResult(null);
    clearRouteObj();
  }, [clearRouteObj]);

  const moveWaypoint = useCallback((from: number, to: number) => {
    const wps = [...routeWaypointsRef.current];
    const [item] = wps.splice(from, 1);
    wps.splice(to, 0, item);
    routeWaypointsRef.current = wps;
    setRouteWaypoints([...wps]);
    setRouteResult(null);
    clearRouteObj();
  }, [clearRouteObj]);

  const optimizeRoute = useCallback(() => {
    const wps = routeWaypointsRef.current;
    if (wps.length <= 2) return;
    const optimized = nearestNeighborOrder(wps);
    routeWaypointsRef.current = optimized;
    setRouteWaypoints([...optimized]);
    setRouteResult(null);
    clearRouteObj();
  }, [clearRouteObj]);

  const handleSendToEngineer = useCallback(() => {
    if (!routeResult) return;
    
    const waypointsText = routeWaypoints.map((wp, i) => `${i + 1}. ${wp.name}`).join('\n');
    const distText = routeResult.distance;
    const timeText = routeResult.duration;
    
    const description = `Планируемый маршрут:\n${waypointsText}\n\nРасстояние: ${distText}\nПриблизительное время в пути: ${timeText}`;
    
    // Calculate estimated hours (drive time + 30m per stop buffer)
    const driveHours = (routeResult.duration_min || 0) / 60;
    const bufferHours = (routeWaypoints.length * 0.5); // 30 min per point
    const totalHours = Math.ceil((driveHours + bufferHours) * 2) / 2; // Round to nearest 0.5
    
    setPrefilledTask({
      title: `Логистика: ${routeWaypoints[0].name} — ${routeWaypoints[routeWaypoints.length - 1].name}`,
      description,
      type: 'maintenance',
      priority: 'normal',
      estimated_hours: totalHours > 0 ? totalHours : 1.0
    });
    setShowTaskModal(true);
  }, [routeResult, routeWaypoints]);

  const buildRoute = useCallback(() => {
    const wps = routeWaypointsRef.current;
    if (!window.ymaps || !mapRef.current || wps.length < 2) return;
    setIsBuilding(true);
    clearRouteObj();
    setRouteResult(null);

    window.ymaps.route(wps.map(w => w.coords), { routingMode: 'auto' })
      .then((route: any) => {
        routeObjRef.current = route;
        mapRef.current.geoObjects.add(route);
        
        // getTime() returns seconds
        const seconds = route.getTime();
        const minutes = Math.ceil(seconds / 60);

        setRouteResult({
          distance: decodeHtml(route.getHumanLength()),
          duration: decodeHtml(route.getHumanTime()),
          duration_min: minutes
        });
        const bounds = route.getBounds();
        if (bounds) {
          mapRef.current.setBounds(bounds, { checkZoomRange: true, duration: 500, zoomMargin: 60 });
        }
        setIsBuilding(false);
      })
      .catch(() => setIsBuilding(false));
  }, [clearRouteObj]);

  // ── Tool mode switch: clear state when switching tools ────────────────────

  const handleSetActiveTool = useCallback((tool: ActiveTool) => {
    if (tool === 'none' || tool !== activeTool) {
      // Clear ruler when leaving ruler mode
      if (activeTool === 'ruler' || tool !== 'ruler') {
        rulerPointsRef.current = [];
        setRulerPoints([]);
        if (rulerLineRef.current && mapRef.current) {
          mapRef.current.geoObjects.remove(rulerLineRef.current);
          rulerLineRef.current = null;
        }
      }
      // Clear route when leaving route mode
      if (activeTool === 'route' || tool !== 'route') {
        routeWaypointsRef.current = [];
        setRouteWaypoints([]);
        setRouteResult(null);
        clearRouteObj();
      }
    }
    setActiveTool(tool);
  }, [activeTool, clearRouteObj]);

  // ── Map click handler ref — updated on every render for freshness ─────────

  // Shared logic for adding a point in tool mode from any source (map click or marker click)
  const mapClickCallbackRef = useRef<(coords: [number, number], name?: string) => void>(() => {});

  mapClickCallbackRef.current = (coords: [number, number], name?: string) => {
    if (isPickingLocationRef.current) {
      const store = useMapViewStore.getState();
      store.setPickedCoords(coords);
      setTimeout(() => {
        store.setPickingLocation(false);
      }, 150);
      return;
    }

    const tool = activeToolRef.current;
    
    if (tool === 'none') {
      if (activeLayers.includes('distance')) {
        setDistanceCenter(coords);
      }
      return;
    }

    const pointName = name ?? `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`;
    const point: RoutePoint = { name: pointName, coords };

    if (tool === 'ruler') {
      const pts = rulerPointsRef.current;
      if (pts.length >= 2) return;
      const newPts = [...pts, point];
      rulerPointsRef.current = newPts;
      setRulerPoints(newPts);
      updateRulerLine(newPts);
    } else if (tool === 'route') {
      const wps = routeWaypointsRef.current;
      const newWps = [...wps, point];
      routeWaypointsRef.current = newWps;
      setRouteWaypoints([...newWps]);
    }
  };

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: regionsData } = useQuery({
    queryKey: ['regions-geo'],
    queryFn: async () => {
      // Try localStorage cache first for instant display
      const cached = localStorage.getItem('regions-geo-cache');


      // Fetch from API (will use Redis cache + ETag on server)
      try {
        const res = await geoApi.getRegions(undefined, true);
        const data = res.data;
        // Persist to localStorage for next visit
        try {
          localStorage.setItem('regions-geo-cache', JSON.stringify(data));
          localStorage.setItem('regions-geo-cache-time', String(Date.now()));
        } catch { /* quota exceeded — ignore */ }
        return data;
      } catch {
        // Network error — use stale localStorage cache if available
        if (cached) return JSON.parse(cached);
        throw new Error('Failed to load regions');
      }
    },
    // Start fetching IMMEDIATELY, don't wait for map
    enabled: regionsLayerActive,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    // Show localStorage data instantly while queryFn loads fresh data from API.
    // placeholderData (unlike initialData) never blocks the network request,
    // so is_connected changes from the DB always appear after a deploy.
    placeholderData: () => {
      try {
        const cached = localStorage.getItem('regions-geo-cache');
        if (cached) return JSON.parse(cached);
      } catch { /* ignore */ }
      return undefined;
    },
  });

  const { data: featuresData } = useQuery({
    queryKey: ['map-features', filters],
    queryFn: () =>
      locationsApi.getMapFeatures({
        region_id: filters.regions[0],
        status: filters.statuses[0],
      }),
    select: (r) => r.data,
    enabled: mode === 'map',
  });

  const { data: settlementsData } = useQuery({
    queryKey: ['settlements-all'],
    queryFn: () => geoApi.getSettlements().then(r => r.data),
    enabled: mapReady,
  });

  const features = featuresData?.features ?? [];

  useEffect(() => {
    if (locationIdParam && mapReady && features.length > 0) {
      const locId = parseInt(locationIdParam, 10);
      if (!isNaN(locId)) {
        const feat = features.find((f: any) => f.properties.id === locId);
        if (feat && mapRef.current) {
          const [lon, lat] = feat.geometry.coordinates;
          if (feat.properties.settlement_id) {
            selectSettlementLevel(feat.properties.settlement_id, feat.properties.settlement_name);
            mapRef.current.setCenter([lat, lon], 15, { duration: 500 });
          }
          selectLocation(String(locId), [
            { label: 'Казахстан' },
            ...(feat.properties.region_name ? [{ label: feat.properties.region_name }] : []),
            ...(feat.properties.settlement_name ? [{ label: feat.properties.settlement_name }] : []),
            { label: feat.properties.name },
          ]);
        }
      }
    }
  }, [locationIdParam, mapReady, features, selectLocation, selectSettlementLevel]);

  // ── Stats (filtered by current level) ────────────────────────────────────

  const visibleFeatures = (() => {
    let filtered = features;
    if (mapLevel === 'settlement' && selectedSettlementId != null) {
      filtered = features.filter((f: any) => f.properties.settlement_id === selectedSettlementId);
    } else if (mapLevel === 'region' && selectedRegionId != null) {
      filtered = features.filter((f: any) => f.properties.region_id === selectedRegionId);
    }
    if (mapLevel === 'country' || mapLevel === 'region') {
      return filtered.filter((f: any) => f.properties.type === 'military_office');
    }
    return filtered;
  })();

  const stats = {
    total: visibleFeatures.length,
    ready: visibleFeatures.filter((f: any) => f.properties.status === 'ready').length,
    inProgress: visibleFeatures.filter((f: any) => f.properties.status === 'in_progress').length,
    critical: visibleFeatures.filter((f: any) => f.properties.status === 'critical').length,
  };

  // ── Map initialization ────────────────────────────────────────────────────

  const featuresRef = useRef<any[]>(features);
  useEffect(() => { featuresRef.current = features; }, [features]);

  const regionsDataRef = useRef<any>(regionsData);
  useEffect(() => { regionsDataRef.current = regionsData; }, [regionsData]);

  useEffect(() => {
    const init = () => {
      if (!window.ymaps || mapRef.current) return;

      window.ymaps.ready(() => {
        if (mapRef.current || !mapElRef.current) return;

        mapRef.current = new window.ymaps.Map(mapElRef.current, {
          center: [48.0196, 66.9237],
          zoom: 5,
          controls: ['zoomControl', 'fullscreenControl'],
        }, {
          // Set initial customization if theme is dark
          customization: themeMode === 'dark' ? YANDEX_DARK_STYLE : []
        });

        // Add SearchControl with Custom Provider
        const CustomSearchProvider = {
          geocode: function (request: string) {
            const deferred = new window.ymaps.vow.defer();
            const geoObjects = new window.ymaps.GeoObjectCollection();
            
            const lowerReq = request.toLowerCase();
            const feats = featuresRef.current || [];
            
            const localMatches = feats.filter((f: any) => 
                f.properties.name?.toLowerCase().includes(lowerReq) ||
                f.properties.address?.toLowerCase().includes(lowerReq)
            ).slice(0, 5);
            
            localMatches.forEach((f: any) => {
              const lon = f.geometry.coordinates[0];
              const lat = f.geometry.coordinates[1];
              const placemark = new window.ymaps.Placemark(
                [lat, lon],
                {
                  name: f.properties.name,
                  description: (f.properties.address || 'Наш объект') + ' (База)'
                },
                {
                  preset: 'islands#blueDotIcon'
                }
              );
              geoObjects.add(placemark);
            });

            let bounds = [[40.56, 46.49], [55.44, 87.31]]; // KZ bounds
            if (mapLevelRef.current === 'region' || mapLevelRef.current === 'settlement') {
                const r = regionsDataRef.current?.find((x: any) => x.region_id === selectedRegionIdRef.current);
                if (r && r.geometry_json) {
                    const rb = getBoundsFromGeomJson(r.geometry_json);
                    if (rb) bounds = rb;
                }
            }

            window.ymaps.geocode(request, { boundedBy: bounds, strictBounds: true, results: 10 })
              .then(function (res: any) {
                res.geoObjects.each(function (obj: any) {
                  geoObjects.add(obj);
                });
                
                deferred.resolve({
                  geoObjects: geoObjects,
                  metaData: {
                    geocoder: {
                      request: request,
                      found: geoObjects.getLength(),
                      results: geoObjects.getLength(),
                      skip: 0
                    }
                  }
                });
              })
              .catch(function () {
                 // In case yandex fails, still resolve with local matches
                 deferred.resolve({
                    geoObjects: geoObjects,
                    metaData: {
                      geocoder: { request: request, found: geoObjects.getLength(), results: geoObjects.getLength(), skip: 0 }
                    }
                 });
              });

            return deferred.promise();
          }
        };

        const searchControl = new window.ymaps.control.SearchControl({
          options: {
            provider: CustomSearchProvider,
            noPlacemark: false, 
            placeholderContent: 'Поиск (адрес или объект)',
            size: 'large'
          }
        });
        mapRef.current.controls.add(searchControl, { 
          float: 'none', 
          position: { top: 16, left: 130 } 
        });

        mapRef.current.container.getElement().style.borderRadius = '0';

        featuresCollectionRef.current = new window.ymaps.GeoObjectCollection();
        settlementCollectionRef.current = new window.ymaps.GeoObjectCollection();
        regionsCollectionRef.current = new window.ymaps.GeoObjectCollection();
        labelsCollectionRef.current = new window.ymaps.GeoObjectCollection();

        mapRef.current.geoObjects.add(regionsCollectionRef.current);
        mapRef.current.geoObjects.add(labelsCollectionRef.current);
        mapRef.current.geoObjects.add(settlementCollectionRef.current);
        mapRef.current.geoObjects.add(featuresCollectionRef.current);


        // Map-level click: fires when user clicks on empty map area
        mapRef.current.events.add('click', (e: any) => {
          hideContextMenu();
          mapClickCallbackRef.current(e.get('coords'));
        });

        // Context menu handler
        mapRef.current.events.add('contextmenu', (e: any) => {
          e.preventDefault();
          const coords = e.get('coords');
          const pagePixels = e.get('pagePixels');
          showContextMenu(pagePixels[0], pagePixels[1], coords);
        });

        setMapReady(true);
      });
    };

    const scriptId = 'yandex-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement ||
                 document.querySelector('script[src*="api-maps.yandex.ru"]') as HTMLScriptElement;

    if (window.ymaps) {
      init();
    } else if (script) {
      script.addEventListener('load', init);
    } else {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${import.meta.env.VITE_YANDEX_MAPS_KEY}&lang=ru_RU`;
      script.async = true;
      script.onload = init;
      document.head.appendChild(script);
    }

    return () => {
      if (script) script.removeEventListener('load', init);
    };
  }, [mode]);

  // ── Map background toggle ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    
    if (mapBackground === 'white') {
      map.setType(null);
      map.options.set('yandexMapAutoSkip', true);
    } else {
      map.setType('yandex#map');
      map.options.set('yandexMapAutoSkip', false);
    }
  }, [mapBackground, mapReady]);

  // Update map style when theme changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.options.set('customization', themeMode === 'dark' ? YANDEX_DARK_STYLE : []);
  }, [themeMode, mapReady]);

  // ── Settlement cluster markers (country / region level) ───────────────────

  useEffect(() => {
    if (!mapReady || !settlementCollectionRef.current || !settlementsData) return;

    const collection = settlementCollectionRef.current;
    collection.removeAll();

    if (mapLevel === 'settlement') return;

    const groupMap: Record<number, { statuses: string[]; lat: number; lon: number; name: string }> = {};

    features.forEach((feat: any) => {
      const sid = feat.properties.settlement_id;
      if (sid == null) return;
      if (mapLevel === 'region' && selectedRegionId != null) {
        if (feat.properties.region_id !== selectedRegionId) return;
      }
      if (!groupMap[sid]) {
        const settlement = settlementsData.find((s: any) => s.settlement_id === sid);
        if (!settlement || settlement.latitude == null || settlement.longitude == null) return;
        groupMap[sid] = {
          statuses: [],
          lat: settlement.latitude,
          lon: settlement.longitude,
          name: settlement.name,
        };
      }
      groupMap[sid].statuses.push(feat.properties.status);
    });

    Object.entries(groupMap).forEach(([sidStr, group]) => {
      const sid = Number(sidStr);
      const count = group.statuses.length;
      const ws = worstStatus(group.statuses);
      const color = STATUS_COLORS[ws] || '#6B7280';

      const placemark = new window.ymaps.Placemark(
        [group.lat, group.lon],
        {
          hintContent: `${group.name} (${count} объектов)`,
          iconContent: String(count),
        },
        {
          iconLayout: window.ymaps.templateLayoutFactory.createClass(
            `<div class="ymaps-re-invert" style="
              position: relative;
              width: 40px;
              height: 40px;
              background: ${color};
              border: 2px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 800;
              font-size: 14px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              transform: translate(-20px, -20px);
              cursor: pointer;
              pointer-events: auto;
            ">$[properties.iconContent]</div>`
          ),
          iconShape: {
            type: 'Circle',
            coordinates: [0, 0],
            radius: 20
          },
          cursor: activeToolRef.current !== 'none' ? 'crosshair' : 'pointer',
          zIndex: 100,
          interactive: true,
        }
      );

      placemark.events.add('click', (e: any) => {
        if (activeToolRef.current !== 'none' || isPickingLocationRef.current) {
          // In tool mode: add as waypoint/ruler point; stop event from bubbling
          e.stopPropagation();
          mapClickCallbackRef.current([group.lat, group.lon], group.name);
          return;
        }
        selectSettlementLevel(sid, group.name);
        if (mapRef.current) {
          mapRef.current.setCenter([group.lat, group.lon], 13, { duration: 400 });
        }
      });

      collection.add(placemark);

      // Add settlement name label below the cluster
      const settlementLabel = new window.ymaps.Placemark(
        [group.lat, group.lon],
        { iconContent: group.name },
        {
          iconLayout: window.ymaps.templateLayoutFactory.createClass(
            `<div style="
              position: absolute;
              top: 24px;
              left: 50%;
              transform: translateX(-50%);
              color: ${themeMode === 'dark' ? '#94A3B8' : '#475569'};
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              white-space: nowrap;
              pointer-events: none;
              text-shadow: ${themeMode === 'dark' ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 1px rgba(255,255,255,0.8)'};
              padding: 2px 4px;
            ">$[properties.iconContent]</div>`
          ),
          interactive: false,
          zIndex: 1,
        }
      );
      collection.add(settlementLabel);
    });
  }, [features, mapReady, settlementsData, mapLevel, selectedRegionId, selectSettlementLevel, lastUpdateTrigger]);

  // ── Individual location markers (settlement level) ────────────────────────

  useEffect(() => {
    if (!mapReady || !featuresCollectionRef.current) return;

    const collection = featuresCollectionRef.current;
    collection.removeAll();

    if (mapLevel !== 'settlement' || selectedSettlementId == null) return;

    const settlementFeatures = features.filter(
      (f: any) => f.properties.settlement_id === selectedSettlementId
    );

    const statusesLayerActive = activeLayers.includes('statuses');

    settlementFeatures.forEach((feat: any) => {
      const [lon, lat] = feat.geometry.coordinates;
      const typeConfig = LOCATION_TYPE_CONFIG[feat.properties.type];
      
      const statusColor = STATUS_COLORS[feat.properties.status as StatusType];
      const typeColor = typeConfig ? typeConfig.color : '#6B7280';
      const color = statusesLayerActive && statusColor ? statusColor : typeColor;

      const isCRB = 
        feat.properties.type === 'district_hospital' || 
        feat.properties.name?.includes('ЦРБ') || 
        feat.properties.name?.toLowerCase().includes('центральная районная больница');
        
      let finalSize = 36;
      if (MEDICAL_TYPES.has(feat.properties.type) && !isCRB) {
        finalSize = 26;
      }

      const placemark = new window.ymaps.Placemark(
        [lat, lon],
        {
          hintContent: feat.properties.name,
          balloonContent: `
            <div style="
              padding: 12px;
              font-family: 'Inter', -apple-system, sans-serif;
              color: #1E293B;
              min-width: 180px;
            ">
              <div style="font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 4px; line-height: 1.2;">
                ${feat.properties.name}
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                <span style="
                  width: 8px; height: 8px; border-radius: 50%;
                  background: ${STATUS_COLORS[feat.properties.status as StatusType] || '#888'};
                  box-shadow: 0 0 8px ${STATUS_COLORS[feat.properties.status as StatusType] || '#888'}88;
                "></span>
                <span style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.02em;">
                  ${typeConfig?.label || feat.properties.type}
                </span>
              </div>
              <div style="font-size: 12px; color: #475569; line-height: 1.4;">
                Статус: <strong style="color: ${STATUS_COLORS[feat.properties.status as StatusType]}">
                  ${STATUS_LABELS[feat.properties.status as StatusType] || feat.properties.status}
                </strong>
              </div>
            </div>
          `,
        },
        getPlacemarkOptions(feat.properties.type, color, finalSize)
      );

      placemark.events.add('click', (e: any) => {
        if (activeToolRef.current !== 'none' || isPickingLocationRef.current) {
          e.stopPropagation();
          mapClickCallbackRef.current([lat, lon], feat.properties.name);
          return;
        }
        selectLocation(feat.properties.id, [
          { label: 'Казахстан' },
          ...(selectedRegionName ? [{ label: selectedRegionName }] : []),
          { label: selectedSettlementName },
          { label: feat.properties.name },
        ]);
      });

      collection.add(placemark);

      // Add object name label below the icon
      const label = new window.ymaps.Placemark(
        [lat, lon],
        { iconContent: feat.properties.name },
        {
          iconLayout: window.ymaps.templateLayoutFactory.createClass(
            `<div style="
              position: absolute;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: ${themeMode === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)'};
              padding: 2px 6px;
              border-radius: 4px;
              border: 1px solid ${themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
              color: ${themeMode === 'dark' ? '#F1F5F9' : '#1E293B'};
              font-size: 10px;
              font-weight: 600;
              white-space: nowrap;
              pointer-events: none;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              backdrop-filter: blur(4px);
              z-index: -1;
            ">$[properties.iconContent]</div>`
          ),
          interactive: false,
        }
      );
      collection.add(label);
    });
  }, [features, mapReady, mapLevel, selectedSettlementId, selectedRegionName, selectedSettlementName, selectLocation, activeLayers, lastUpdateTrigger]);

  // ── Region polygons ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapReady || !regionsCollectionRef.current) return;

    // Clear immediately so stale polygons disappear synchronously
    regionsCollectionRef.current.removeAll();
    labelsCollectionRef.current?.removeAll();

    if (!regionsLayerActive || !regionsData) return;
    if (!Array.isArray(regionsData)) return;

    // Defer heavy polygon rendering until browser is idle (tiles already painted by then)
    const scheduleRender = (fn: () => void) => {
      if ('requestIdleCallback' in window) {
        const id = (window as any).requestIdleCallback(fn, { timeout: 500 });
        return () => (window as any).cancelIdleCallback(id);
      }
      const id = setTimeout(fn, 0);
      return () => clearTimeout(id);
    };

    return scheduleRender(() => {
    const collection = regionsCollectionRef.current;
    if (!collection) return;

    // Drop points closer than ~1km — invisible at country zoom, cuts render time 10x
    const simplifyRing = (ring: number[][], tol = 0.01): number[][] => {
      if (ring.length <= 4) return ring;
      const out: number[][] = [ring[0]];
      for (let i = 1; i < ring.length - 1; i++) {
        const prev = out[out.length - 1];
        if (Math.abs(ring[i][0] - prev[0]) >= tol || Math.abs(ring[i][1] - prev[1]) >= tol) {
          out.push(ring[i]);
        }
      }
      out.push(ring[ring.length - 1]);
      return out;
    };

    const swap = (ring: number[][]) => simplifyRing(ring).map((p) => [p[1], p[0]]);

    regionsData.forEach((region: any) => {
      if (!region.geometry_json) return;
      try {
        const geom = typeof region.geometry_json === 'string'
          ? JSON.parse(region.geometry_json)
          : region.geometry_json;

        const polygonRings: number[][][][] = [];
        if (geom.type === 'Polygon') {
          polygonRings.push(geom.coordinates.map(swap));
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach((poly: number[][][]) => polygonRings.push(poly.map(swap)));
        }

        const regionPolygons: any[] = [];

        const traceRegionBorder = (geomJson: any) => {
          if (!mapElRef.current || !mapRef.current) return;
          const mapEl = mapElRef.current;
          const rect = mapEl.getBoundingClientRect();

          const canvas = document.createElement('canvas');
          canvas.width = rect.width;
          canvas.height = rect.height;
          Object.assign(canvas.style, {
            position: 'absolute', top: '0', left: '0',
            pointerEvents: 'none', zIndex: '6',
          });
          mapEl.appendChild(canvas);
          const ctx = canvas.getContext('2d')!;

          const g = typeof geomJson === 'string' ? JSON.parse(geomJson) : geomJson;
          const projection = mapRef.current.options.get('projection');
          const zoom = mapRef.current.getZoom();

          const toCanvasPx = ([lon, lat]: number[]): [number, number] => {
            const gPx = projection.toGlobalPixels([lat, lon], zoom);
            const pPx = mapRef.current.converter.globalToPage(gPx);
            return [pPx[0] - rect.left, pPx[1] - rect.top];
          };

          const rings: number[][][] =
            g.type === 'Polygon'
              ? [g.coordinates[0]]
              : g.type === 'MultiPolygon'
                ? g.coordinates.map((p: number[][][]) => p[0])
                : [];

          type Seg = { x1: number; y1: number; x2: number; y2: number; len: number };
          const paths = rings.map(ring => {
            const pts = ring.map(toCanvasPx);
            const segs: Seg[] = [];
            let total = 0;
            for (let i = 0; i < pts.length - 1; i++) {
              const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
              const len = Math.hypot(x2 - x1, y2 - y1);
              segs.push({ x1, y1, x2, y2, len });
              total += len;
            }
            return { segs, total };
          });

          const DURATION = 850;
          const start = performance.now();

          const tick = (now: number) => {
            const p = Math.min((now - start) / DURATION, 1);
            const eased = p < 1 ? 1 - Math.pow(1 - p, 2.5) : 1;
            const alpha = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#BFDBFE';
            ctx.shadowColor = '#60A5FA';
            ctx.shadowBlur = 18;

            paths.forEach(({ segs, total }) => {
              let rem = eased * total;
              ctx.beginPath();
              let started = false;
              for (const s of segs) {
                if (rem <= 0) break;
                if (!started) { ctx.moveTo(s.x1, s.y1); started = true; }
                if (rem >= s.len) {
                  ctx.lineTo(s.x2, s.y2);
                  rem -= s.len;
                } else {
                  const r = rem / s.len;
                  ctx.lineTo(s.x1 + (s.x2 - s.x1) * r, s.y1 + (s.y2 - s.y1) * r);
                  rem = 0;
                }
              }
              ctx.stroke();
            });

            ctx.restore();
            if (p < 1) requestAnimationFrame(tick);
            else canvas.remove();
          };

          requestAnimationFrame(tick);
        };

        const handleRegionClick = () => {
          selectRegionLevel(region.region_id, region.name);

          setTimeout(() => traceRegionBorder(region.geometry_json), 550);

          let combinedBounds: [[number, number], [number, number]] | null = null;
          regionPolygons.forEach((p) => {
            const b = p.geometry.getBounds();
            if (!b) return;
            if (!combinedBounds) {
              combinedBounds = b;
            } else {
              combinedBounds = [
                [Math.min(combinedBounds[0][0], b[0][0]), Math.min(combinedBounds[0][1], b[0][1])],
                [Math.max(combinedBounds[1][0], b[1][0]), Math.max(combinedBounds[1][1], b[1][1])],
              ];
            }
          });

          if (combinedBounds && mapRef.current) {
            mapRef.current.setBounds(combinedBounds, {
              checkZoomRange: true,
              duration: 500,
              zoomMargin: 40,
            });
          }
        };

        const regionColor = region.is_connected ? '#22C55E' : '#3B82F6';

        polygonRings.forEach((rings) => {
          const polygon = new window.ymaps.Polygon(rings, {
            hintContent: region.is_connected
              ? `${region.name} — подключён к eMedosmotr`
              : `${region.name} — не подключён`,
          }, {
            fillColor: regionColor,
            fillOpacity: 0.08,
            strokeColor: regionColor,
            strokeWidth: 2.0,
            cursor: activeToolRef.current !== 'none' ? 'crosshair' : 'pointer',
          });

          polygon.events.add('mouseenter', () => {
            polygon.options.set({ fillOpacity: 0.2, strokeWidth: 3.0 });
          });
          polygon.events.add('mouseleave', () => {
            polygon.options.set({ fillOpacity: 0.08, strokeWidth: 2.0 });
          });
          polygon.events.add('click', (e: any) => {
            if (activeToolRef.current !== 'none' || isPickingLocationRef.current) {
              e.stopPropagation();
              mapClickCallbackRef.current(e.get('coords'));
              return;
            }
            e.stopPropagation();
            handleRegionClick();
          });

          regionPolygons.push(polygon);
          collection.add(polygon);
        });

        // Add region name label
        if (region.center_lat && region.center_lon) {
          const displayName = region.name.replace(/ ОБЛАСТЬ$/i, '').replace(/-/g, '-<br/>');
          const label = new window.ymaps.Placemark(
            [region.center_lat, region.center_lon],
            { iconContent: displayName },
            {
              iconLayout: window.ymaps.templateLayoutFactory.createClass(
                themeMode === 'dark'
                  ? `<div style="
                      position: absolute;
                      transform: translate(-50%, -50%);
                      width: max-content;
                      color: #F1F5F9;
                      font-size: 9px;
                      font-weight: 800;
                      font-family: 'Inter', -apple-system, sans-serif;
                      text-transform: uppercase;
                      letter-spacing: 0.1em;
                      line-height: 1.4;
                      text-align: center;
                      white-space: nowrap;
                      pointer-events: none;
                      user-select: none;
                      text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1);
                    ">$[properties.iconContent]</div>`
                  : `<div style="
                      position: absolute;
                      transform: translate(-50%, -50%);
                      width: max-content;
                      color: #334155;
                      font-size: 9px;
                      font-weight: 700;
                      font-family: 'Inter', -apple-system, sans-serif;
                      text-transform: uppercase;
                      letter-spacing: 0.1em;
                      line-height: 1.4;
                      text-align: center;
                      white-space: nowrap;
                      pointer-events: none;
                      user-select: none;
                      padding: 2px 6px;
                      background: rgba(255,255,255,0.7);
                      border-radius: 3px;
                      text-shadow: none;
                      backdrop-filter: blur(4px);
                    ">$[properties.iconContent]</div>`
              ),
              iconShape: { type: 'Rectangle', coordinates: [[0, 0], [0, 0]] },
              interactive: false,
              zIndex: 1,
            }
          );
          if (labelsCollectionRef.current) {
            labelsCollectionRef.current.add(label);
          } else {
            collection.add(label);
          }
        }
      } catch (err) {
        console.error('Error rendering region', region.name, err);
      }
    });
    }); // end scheduleRender

  }, [regionsData, regionsLayerActive, mapReady, selectRegionLevel]);

  // ── Fly to region when selectedRegionId changes ───────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || selectedRegionId == null || !regionsData) return;
    const region = Array.isArray(regionsData)
      ? regionsData.find((r: any) => r.region_id === selectedRegionId)
      : null;
    if (region?.center_lat && region?.center_lon) {
      mapRef.current.setCenter([region.center_lat, region.center_lon], 8, { duration: 500 });
    }
  }, [selectedRegionId, mapLevel, mapReady, regionsData]);

  // ── Fly to settlement when selectedSettlementId changes ──────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || selectedSettlementId == null || !settlementsData) return;
    const settlement = Array.isArray(settlementsData)
      ? settlementsData.find((s: any) => s.settlement_id === selectedSettlementId)
      : null;
    if (settlement?.latitude && settlement?.longitude) {
      mapRef.current.setCenter([settlement.latitude, settlement.longitude], 13, { duration: 500 });
    }
  }, [selectedSettlementId, mapReady, settlementsData]);

  // ── Distance from Base Layer (Circles) ───────────────────────────────────
  const distanceLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.ymaps) return;
    const map = mapRef.current;
    const active = activeLayers.includes('distance');

    if (distanceLayerRef.current) {
      map.geoObjects.remove(distanceLayerRef.current);
      distanceLayerRef.current = null;
    }

    if (active) {
      const collection = new window.ymaps.GeoObjectCollection();
      const center = distanceCenter || KZ_CENTER;
      
      // Draggable center point
      const centerMarker = new window.ymaps.Placemark(center, {
        hintContent: 'Центр замера (перетащите, чтобы изменить)',
        balloonContent: 'Центр замера дальности',
        iconContent: '<div style="color:white;display:flex;align-items:center;justify-content:center;height:100%"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.8 2.8 0 1 1-4 4l-12-12a2.8 2.8 0 1 1 4-4l12 12Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg></div>'
      }, {
        preset: 'islands#blackCircleIcon',
        draggable: true,
        zIndex: 1000,
        // When dragging, we don't update store immediately to avoid too many re-renders,
        // we update on dragend
      });

      centerMarker.events.add('dragend', () => {
        const newCoords = centerMarker.geometry.getCoordinates();
        setDistanceCenter(newCoords);
      });

      collection.add(centerMarker);

      // concentric circles to show distance zones from center
      const zones = [
        { radius: 50000, color: '#22C55E', label: '50 км' },
        { radius: 150000, color: '#F59E0B', label: '150 км' },
        { radius: 300000, color: '#EF4444', label: '300 км' },
      ];

      zones.slice().reverse().forEach(zone => {
        const circle = new window.ymaps.Circle([center, zone.radius], {
          hintContent: `Зона ${zone.label}`,
        }, {
          fillColor: zone.color,
          fillOpacity: 0.05,
          strokeColor: zone.color,
          strokeOpacity: 0.2,
          strokeWidth: 1,
          interactive: false
        });
        collection.add(circle);

        // Visible label on the edge of the circle
        const R_EARTH = 6378137;
        const dLat = (zone.radius / R_EARTH) * (180 / Math.PI);
        const labelPos: [number, number] = [center[0] + dLat, center[1]];

        const label = new window.ymaps.Placemark(labelPos, {
          iconContent: zone.label
        }, {
          iconLayout: window.ymaps.templateLayoutFactory.createClass(
            `<div style="
              background: white;
              padding: 2px 6px;
              border-radius: 4px;
              border: 1px solid ${zone.color}44;
              color: ${zone.color};
              font-size: 10px;
              font-weight: 800;
              white-space: nowrap;
              transform: translate(-50%, -50%);
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              pointer-events: none;
            ">$[properties.iconContent]</div>`
          ),
          interactive: false,
          zIndex: 900
        });
        collection.add(label);
      });

      map.geoObjects.add(collection);
      distanceLayerRef.current = collection;
    }
  }, [activeLayers, mapReady, distanceCenter, setDistanceCenter]);

  // ── Reset view when returning to country level ───────────────────────────
  useEffect(() => {
    if (mapReady && mapRef.current && mapLevel === 'country') {
      mapRef.current.setCenter(KZ_CENTER, KZ_ZOOM, { duration: 500 });
    }
  }, [mapLevel, mapReady]);

  // ── Ruler distance ────────────────────────────────────────────────────────
  const rulerDistanceKm = rulerPoints.length === 2
    ? haversineKm(rulerPoints[0].coords, rulerPoints[1].coords)
    : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Container>
      <MapContainer>
        <YMapEl ref={mapElRef} $whiteBg={mapBackground === 'white'} />

        {/* Filters button */}
        <FiltersBtn
          onClick={() => setShowFilters((v) => !v)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <LuFilter size={14} /> Фильтры
          {(filters.statuses.length > 0 || filters.regions.length > 0) && (
            <span style={{
              background: '#3B82F6',
              color: 'white',
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 9999,
              fontWeight: 700,
            }}>
              {filters.statuses.length + filters.regions.length}
            </span>
          )}
        </FiltersBtn>

        {/* Stats bar */}
        <StatsBar
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StatItem>
            <span className="hide-mobile" style={{ fontSize: 11 }}>Всего</span>
            <StatNum>{stats.total}</StatNum>
          </StatItem>
          <StatItem>
            <Dot $color="#22C55E" />
            <StatNum $color="#22C55E">{stats.ready}</StatNum>
          </StatItem>
          <StatItem>
            <Dot $color="#F59E0B" />
            <StatNum $color="#F59E0B">{stats.inProgress}</StatNum>
          </StatItem>
          <StatItem>
            <Dot $color="#EF4444" />
            <StatNum $color="#EF4444">{stats.critical}</StatNum>
          </StatItem>
        </StatsBar>

        {/* Breadcrumb bar */}
        <AnimatePresence>
          {mapLevel !== 'country' && (
            <BreadcrumbBar
              key="breadcrumb"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <BreadLink onClick={handleBackToCountry}>Казахстан</BreadLink>
              {mapLevel === 'region' && (
                <>
                  <BreadSep>/</BreadSep>
                  <BreadCurrent>{selectedRegionName}</BreadCurrent>
                </>
              )}
              {mapLevel === 'settlement' && (
                <>
                  <BreadSep>/</BreadSep>
                  <BreadLink onClick={handleBackToRegion}>{selectedRegionName || 'Область'}</BreadLink>
                  <BreadSep>/</BreadSep>
                  <BreadCurrent>{selectedSettlementName}</BreadCurrent>
                </>
              )}
            </BreadcrumbBar>
          )}
        </AnimatePresence>

        {/* Layer toggle panel */}
        <LayerPanel
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <LayerTitle>Слои данных</LayerTitle>
          {LAYERS.map((layer) => (
            <LayerToggle
              key={layer.id}
              $active={activeLayers.includes(layer.id)}
              onClick={() => toggleLayer(layer.id)}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
            >
              <LayerIcon>
                {typeof layer.icon === 'string' && layer.icon.startsWith('/') ? (
                  <img src={layer.icon} alt={layer.label} />
                ) : (
                  layer.icon
                )}
              </LayerIcon>
              {layer.label}
            </LayerToggle>
          ))}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
          <LayerTitle>Фон карты</LayerTitle>
          <LayerToggle
            $active={mapBackground === 'yandex'}
            onClick={() => setMapBackground('yandex')}
            whileHover={{ x: 3 }}
          >
            <LayerIcon><LuMap size={14} /></LayerIcon> Стандарт
          </LayerToggle>
          <LayerToggle
            $active={mapBackground === 'white'}
            onClick={() => setMapBackground('white')}
            whileHover={{ x: 3 }}
          >
            <LayerIcon><LuFileText size={14} /></LayerIcon> Схематичный
          </LayerToggle>
        </LayerPanel>

        {/* Level indicator */}
        <LevelIndicator
          key={mapLevel}
          $level={mapLevel}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          УРОВЕНЬ: {LEVEL_LABELS[mapLevel] || mapLevel}
        </LevelIndicator>

        {/* Add button */}
        {canAdd && (
          <AddBtn
            onClick={openAddModal}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <LuPlus size={16} /> Добавить объект
          </AddBtn>
        )}

        {/* Map tools: Линейка + Планировщик маршрута */}
        <MapToolsPanel
          activeTool={activeTool}
          onSetActiveTool={handleSetActiveTool}
          rulerPoints={rulerPoints}
          rulerDistanceKm={rulerDistanceKm}
          onClearRuler={clearRuler}
          routeWaypoints={routeWaypoints}
          routeResult={routeResult}
          isBuilding={isBuilding}
          onRemoveWaypoint={removeWaypoint}
          onMoveWaypoint={moveWaypoint}
          onOptimizeRoute={optimizeRoute}
          onBuildRoute={buildRoute}
          onClearRoute={clearRoute}
          onSendToEngineer={handleSendToEngineer}
        />

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <MapFiltersPanel onClose={() => setShowFilters(false)} />
          )}
        </AnimatePresence>

        {/* Add modal */}
        <AnimatePresence>
          {showAddModal && (
            <AddLocationModal onClose={closeAddModal} />
          )}
        </AnimatePresence>

        {/* Task modal for route sending */}
        <AnimatePresence>
          {showTaskModal && (
            <TaskModal
              task={prefilledTask}
              onClose={() => {
                setShowTaskModal(false);
                setPrefilledTask(null);
              }}
              onSave={async (data) => {
                await tasksApi.create(data);
                setShowTaskModal(false);
                setPrefilledTask(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* Context Menu */}
        <AnimatePresence>
          {contextMenu.visible && (
            <ContextMenuContainer
              $x={contextMenu.x}
              $y={contextMenu.y}
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {canAdd && (
                <ContextMenuItem
                  onClick={() => {
                    if (contextMenu.coords) {
                      setPickedCoords(contextMenu.coords);
                      openAddModal();
                    }
                    hideContextMenu();
                  }}
                >
                  <LuPlus size={16} /> Добавить объект здесь
                </ContextMenuItem>
              )}
              <ContextMenuItem
                onClick={() => {
                  if (contextMenu.coords) {
                    setDistanceCenter(contextMenu.coords);
                    if (!activeLayers.includes('distance')) {
                      toggleLayer('distance');
                    }
                  }
                  hideContextMenu();
                }}
              >
                <LuRuler size={16} /> Установить центр замера
              </ContextMenuItem>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 6px' }} />
              <ContextMenuItem onClick={hideContextMenu}>
                <LuX size={16} /> Отмена
              </ContextMenuItem>
            </ContextMenuContainer>
          )}
        </AnimatePresence>

        {/* Sidebar Detail */}
        <AnimatePresence>
          {selectedLocationId ? (
            <LocationDetail key={selectedLocationId} locationId={selectedLocationId} />
          ) : (mapLevel === 'settlement' && selectedSettlementId !== null) ? (
            <SettlementDetail key={selectedSettlementId} />
          ) : (mapLevel === 'region' && selectedRegionId !== null) ? (
            <RegionDetail key={selectedRegionId} />
          ) : null}
        </AnimatePresence>
      </MapContainer>
    </Container>
  );
}
