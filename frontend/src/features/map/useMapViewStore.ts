import { create } from 'zustand';
import type { BreadcrumbItem, MapFilters } from '@/types';

interface MapViewState {
  mode: 'map' | 'detail';
  selectedLocationId: string | null;
  breadcrumb: BreadcrumbItem[];
  savedCenter: [number, number] | null;
  savedZoom: number | null;
  filters: MapFilters;
  activeLayers: string[];

  selectLocation: (id: string, breadcrumb: BreadcrumbItem[]) => void;
  backToMap: () => void;
  saveMapState: (center: [number, number], zoom: number) => void;
  setFilters: (filters: Partial<MapFilters>) => void;
  toggleLayer: (layer: string) => void;
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
  activeLayers: ['statuses', 'regions'],

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
}));
