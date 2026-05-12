import { create } from 'zustand';
import type { BreadcrumbItem, MapFilters } from '@/types';

interface MapViewState {
  // Existing
  mode: 'map' | 'detail';
  selectedLocationId: string | null;
  breadcrumb: BreadcrumbItem[];
  savedCenter: [number, number] | null;
  savedZoom: number | null;
  filters: MapFilters;
  activeLayers: string[];

  // New hierarchy state
  mapLevel: 'country' | 'region' | 'settlement';
  selectedRegionId: number | null;
  selectedSettlementId: number | null;
  selectedRegionName: string;
  selectedSettlementName: string;
  showAddModal: boolean;

  mapBackground: 'yandex' | 'white';
  distanceCenter: [number, number] | null;

  // Existing actions
  selectLocation: (id: string, breadcrumb: BreadcrumbItem[]) => void;
  backToMap: () => void;
  saveMapState: (center: [number, number], zoom: number) => void;
  setFilters: (filters: Partial<MapFilters>) => void;
  toggleLayer: (layer: string) => void;
  setMapBackground: (bg: 'yandex' | 'white') => void;
  setDistanceCenter: (coords: [number, number] | null) => void;

  // New actions
  selectRegionLevel: (regionId: number, regionName: string) => void;
  selectSettlementLevel: (settlementId: number, settlementName: string) => void;
  backToCountry: () => void;
  backToRegion: () => void;
  closeAddModal: () => void;
  lastUpdateTrigger: number;
  triggerUpdate: () => void;
  
  // Pick location on map
  isPickingLocation: boolean;
  setPickingLocation: (val: boolean) => void;
  pickedCoords: [number, number] | null;
  setPickedCoords: (coords: [number, number] | null) => void;
}

const defaultFilters: MapFilters = {
  regions: [],
  locationTypes: [],
  statuses: [],
  hasActiveTasks: false,
  assignedToMe: false,
};

export const useMapViewStore = create<MapViewState>((set, get) => ({
  mode: 'map',
  selectedLocationId: null,
  breadcrumb: [],
  savedCenter: null,
  savedZoom: null,
  filters: defaultFilters,
  mapBackground: 'yandex',
  activeLayers: ['statuses', 'regions'],
  distanceCenter: null,

  // New hierarchy state
  mapLevel: 'country',
  selectedRegionId: null,
  selectedSettlementId: null,
  selectedRegionName: '',
  selectedSettlementName: '',
  showAddModal: false,
  lastUpdateTrigger: Date.now(),
  isPickingLocation: false,
  pickedCoords: null,

  // Existing actions
  selectLocation: (id, breadcrumb) =>
    set({ mode: 'detail', selectedLocationId: id, breadcrumb }),

  backToMap: () =>
    set({ mode: 'map', selectedLocationId: null, breadcrumb: [] }),

  saveMapState: (center, zoom) =>
    set({ savedCenter: center, savedZoom: zoom }),

  setFilters: (filters) =>
    set({ filters: { ...get().filters, ...filters } }),

  toggleLayer: (layer) => {
    const current = get().activeLayers;
    set({
      activeLayers: current.includes(layer)
        ? current.filter((l) => l !== layer)
        : [...current, layer],
    });
  },

  setMapBackground: (bg) => set({ mapBackground: bg }),
  setDistanceCenter: (coords) => set({ distanceCenter: coords }),

  // New hierarchy actions
  selectRegionLevel: (regionId, regionName) =>
    set({
      mode: 'map',
      selectedLocationId: null,
      mapLevel: 'region',
      selectedRegionId: regionId,
      selectedRegionName: regionName,
      selectedSettlementId: null,
      selectedSettlementName: '',
    }),

  selectSettlementLevel: (settlementId, settlementName) =>
    set({
      mode: 'map',
      selectedLocationId: null,
      mapLevel: 'settlement',
      selectedSettlementId: settlementId,
      selectedSettlementName: settlementName,
    }),

  backToCountry: () =>
    set({
      mapLevel: 'country',
      selectedRegionId: null,
      selectedRegionName: '',
      selectedSettlementId: null,
      selectedSettlementName: '',
    }),

  backToRegion: () =>
    set({
      mapLevel: 'region',
      selectedSettlementId: null,
      selectedSettlementName: '',
    }),

  openAddModal: () => set({ showAddModal: true }),
  closeAddModal: () => set({ showAddModal: false, isPickingLocation: false, pickedCoords: null }),
  triggerUpdate: () => set({ lastUpdateTrigger: Date.now() }),

  setPickingLocation: (val) => set({ isPickingLocation: val }),
  setPickedCoords: (coords) => set({ pickedCoords: coords }),
}));
