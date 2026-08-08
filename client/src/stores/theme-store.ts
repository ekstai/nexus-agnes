import { create } from 'zustand';
import type { ThemeType, FontSize, BubbleStyle } from '@shared/api.interface';

interface ThemeState {
  theme: ThemeType;
  fontSize: FontSize;
  bubbleStyle: BubbleStyle;
  setTheme: (theme: ThemeType) => void;
  setFontSize: (size: FontSize) => void;
  setBubbleStyle: (style: BubbleStyle) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'liquid-glass',
  fontSize: 'medium',
  bubbleStyle: 'rounded',
  setTheme: (theme: ThemeType) => set({ theme }),
  setFontSize: (size: FontSize) => set({ fontSize: size }),
  setBubbleStyle: (style: BubbleStyle) => set({ bubbleStyle: style }),
}));
