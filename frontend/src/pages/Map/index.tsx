import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { locationsApi, geoApi } from '@/services/api';
import { useMapViewStore } from '@/features/map/useMapViewStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { LocationDetail } from './LocationDetail';
import { MapFiltersPanel } from './MapFiltersPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { StatusType } from '@/types';

declare global {
  interface Window {
    ymaps: any;
  }
}

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

const YMapEl = styled.div`
  width: 100%;
  height: 100%;
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
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  color: #F1F5F9;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  &:hover { background: rgba(30,41,59,0.95); border-color: rgba(255,255,255,0.14); }
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
  background: rgba(10, 18, 40, 0.9);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
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
  color: ${({ $color }) => $color || '#F1F5F9'};
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
  background: rgba(10, 18, 40, 0.9);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  min-width: 160px;
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
  background: ${({ $active }) => $active ? 'rgba(59,130,246,0.12)' : 'transparent'};
  color: ${({ $active }) => $active ? '#60A5FA' : '#64748B'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(59,130,246,0.2)' : 'transparent'};
  &:hover { background: rgba(255,255,255,0.06); color: #F1F5F9; }
`;

const Dot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const LAYERS = [
  { id: 'statuses', label: 'Статусы', icon: '🔴' },
  { id: 'tasks', label: 'Задачи', icon: '✅' },
  { id: 'regions', label: 'Регионы', icon: '🗺️' },
  { id: 'equipment', label: 'Оборудование', icon: '🏥' },
];

const STATUS_COLORS: Record<string, string> = {
  ready: '#22C55E',
  in_progress: '#F59E0B',
  critical: '#EF4444',
};

function getMarkerColor(status: string): string {
  return STATUS_COLORS[status] || '#6B7280';
}

export function MapPage() {
  const { mode, selectedLocationId, activeLayers, toggleLayer, selectLocation, filters } = useMapViewStore();
  const { user } = useAuthStore();
  const mapRef = useRef<any>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const featuresCollectionRef = useRef<any>(null);
  const regionsCollectionRef = useRef<any>(null);
  const regionsLayerActive = activeLayers.includes('regions');

  const { data: regionsData } = useQuery({
    queryKey: ['regions-geo'],
    queryFn: () => geoApi.getRegions(true).then(res => res.data),
    enabled: regionsLayerActive && mapReady,
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

  const features = featuresData?.features ?? [];
  const stats = {
    total: features.length,
    ready: features.filter((f: any) => f.properties.status === 'ready').length,
    inProgress: features.filter((f: any) => f.properties.status === 'in_progress').length,
    critical: features.filter((f: any) => f.properties.status === 'critical').length,
  };

  useEffect(() => {
    const init = () => {
      if (!window.ymaps || mapRef.current) return;

      window.ymaps.ready(() => {
        if (mapRef.current || !mapElRef.current) return;
        
        console.log('[Map] Initializing Yandex Maps instance...');
        mapRef.current = new window.ymaps.Map(mapElRef.current, {
          center: [48.0196, 66.9237],
          zoom: 5,
          controls: ['zoomControl', 'fullscreenControl'],
        });
        
        mapRef.current.container.getElement().style.borderRadius = '0';
        
        featuresCollectionRef.current = new window.ymaps.GeoObjectCollection();
        regionsCollectionRef.current = new window.ymaps.GeoObjectCollection();
        mapRef.current.geoObjects.add(featuresCollectionRef.current);
        mapRef.current.geoObjects.add(regionsCollectionRef.current);
        
        setMapReady(true);
      });
    };

    const scriptId = 'yandex-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement || 
                 document.querySelector('script[src*="api-maps.yandex.ru"]');

    if (window.ymaps) {
      console.log('[Map] ymaps already exists, initializing...');
      init();
    } else if (script) {
      console.log('[Map] Script already exists, waiting for load...');
      script.addEventListener('load', init);
    } else {
      console.log('[Map] Creating new ymaps script tag...');
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${import.meta.env.VITE_YANDEX_MAPS_KEY}&lang=ru_RU`;
      script.async = true;
      script.onload = init;
      document.head.appendChild(script);
    }

    return () => {
      if (script) {
        script.removeEventListener('load', init);
      }
    };
  }, [mode]);

  useEffect(() => {
    if (!mapReady || !featuresCollectionRef.current) return;
    const collection = featuresCollectionRef.current;
    collection.removeAll();

    features.forEach((feat: any) => {
      const [lon, lat] = feat.geometry.coordinates;
      const color = getMarkerColor(feat.properties.status);

      const placemark = new window.ymaps.Placemark(
        [lat, lon],
        {
          hintContent: feat.properties.name,
          balloonContent: `
            <div style="padding:8px;font-family:sans-serif;">
              <strong>${feat.properties.name}</strong><br/>
              <small style="color:${color}">● ${feat.properties.status}</small>
            </div>
          `,
        },
        {
          preset: 'islands#circleIcon',
          iconColor: color,
        }
      );

      placemark.events.add('click', () => {
        selectLocation(feat.properties.id, [
          { label: 'Казахстан' },
          { label: feat.properties.name },
        ]);
      });

      collection.add(placemark);
    });
  }, [features, mapReady, selectLocation]);

  useEffect(() => {
    if (!mapReady || !regionsCollectionRef.current) return;
    const collection = regionsCollectionRef.current;
    collection.removeAll();

    if (regionsLayerActive && regionsData) {
      if (!Array.isArray(regionsData)) {
        console.error('[Map] regionsData is not an array:', regionsData);
        return;
      }

      const swap = (ring: number[][]) => ring.map((p) => [p[1], p[0]]);

      regionsData.forEach((region: any) => {
        if (!region.geometry_json) return;

        try {
          const geom = typeof region.geometry_json === 'string'
            ? JSON.parse(region.geometry_json)
            : region.geometry_json;

          // GeoJSON: Polygon = [ring, ...], MultiPolygon = [polygon, ...].
          // Yandex Polygon expects [ring, ...] with [lat, lon] points.
          const polygons: number[][][][] = [];
          if (geom.type === 'Polygon') {
            polygons.push(geom.coordinates.map(swap));
          } else if (geom.type === 'MultiPolygon') {
            geom.coordinates.forEach((poly: number[][][]) => {
              polygons.push(poly.map(swap));
            });
          }

          polygons.forEach((rings) => {
            const polygon = new window.ymaps.Polygon(rings, {
              hintContent: region.name,
              balloonContent: `<strong>${region.name}</strong>`,
            }, {
              fillColor: '#3B82F6',
              fillOpacity: 0.15,
              strokeColor: '#3B82F6',
              strokeWidth: 1.5,
            });
            collection.add(polygon);
          });
        } catch (e) {
          console.error('Error rendering region', region.name, e);
        }
      });
    }
  }, [regionsData, regionsLayerActive, mapReady]);

  return (
    <Container>
      <MapContainer>
        <YMapEl ref={mapElRef} />

        <FiltersBtn
          onClick={() => setShowFilters((v) => !v)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span>⚙️</span> Фильтры
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

        <StatsBar
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StatItem>
            <span style={{ fontSize: 11 }}>Всего</span>
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

        <LayerPanel
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <LayerTitle>Слои</LayerTitle>
          {LAYERS.map((layer) => (
            <LayerToggle
              key={layer.id}
              $active={activeLayers.includes(layer.id)}
              onClick={() => toggleLayer(layer.id)}
              whileTap={{ scale: 0.97 }}
            >
              <span>{layer.icon}</span>
              {layer.label}
            </LayerToggle>
          ))}
        </LayerPanel>

        <AnimatePresence>
          {showFilters && (
            <MapFiltersPanel onClose={() => setShowFilters(false)} />
          )}
        </AnimatePresence>
      </MapContainer>

      <AnimatePresence>
        {mode === 'detail' && selectedLocationId && (
          <LocationDetail key={selectedLocationId} locationId={selectedLocationId} />
        )}
      </AnimatePresence>
    </Container>
  );
}
