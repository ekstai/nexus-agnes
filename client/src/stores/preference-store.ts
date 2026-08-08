import { create } from 'zustand';
import { logger } from '@lark-apaas/client-toolkit/logger';
import * as preferenceApi from '@client/src/api/preference';
import type { UserPreferenceDto, UpdatePreferenceRequest } from '@shared/api.interface';

interface PreferenceState {
  preference: UserPreferenceDto | null;
  loaded: boolean;
  loadPreference: () => Promise<void>;
  updatePreference: (data: UpdatePreferenceRequest) => Promise<void>;
}

export const usePreferenceStore = create<PreferenceState>((set) => ({
  preference: null,
  loaded: false,
  loadPreference: async () => {
    try {
      const data = await preferenceApi.getPreference();
      set({ preference: data, loaded: true });
    } catch (error: unknown) {
      logger.error('加载用户偏好失败', error);
      set({ loaded: true });
    }
  },
  updatePreference: async (data: UpdatePreferenceRequest) => {
    const updated = await preferenceApi.updatePreference(data);
    set({ preference: updated, loaded: true });
  },
}));
