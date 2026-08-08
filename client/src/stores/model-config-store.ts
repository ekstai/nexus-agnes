import { create } from 'zustand';
import type { ModelConfigDto } from '@shared/api.interface';

interface ModelConfigState {
  configs: ModelConfigDto[];
  currentConfigId: string | null;
  setConfigs: (configs: ModelConfigDto[]) => void;
  setCurrentConfigId: (id: string | null) => void;
}

export const useModelConfigStore = create<ModelConfigState>((set) => ({
  configs: [],
  currentConfigId: null,
  setConfigs: (configs) => set({ configs }),
  setCurrentConfigId: (id) => set({ currentConfigId: id }),
}));
