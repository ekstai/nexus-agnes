import { create } from 'zustand';
import type { PluginDto } from '@shared/api.interface';

interface PluginState {
  marketPlugins: PluginDto[];
  installedPlugins: PluginDto[];
  setMarketPlugins: (plugins: PluginDto[]) => void;
  setInstalledPlugins: (plugins: PluginDto[]) => void;
}

export const usePluginStore = create<PluginState>((set) => ({
  marketPlugins: [],
  installedPlugins: [],
  setMarketPlugins: (plugins) => set({ marketPlugins: plugins }),
  setInstalledPlugins: (plugins) => set({ installedPlugins: plugins }),
}));
