// Electron 桌面桥接类型声明
export interface NexusDesktopBridge {
  isDesktop?: boolean;
  minimize: () => Promise<void>;
  maximize: () => Promise<boolean>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (cb: (v: boolean) => void) => () => void;
  pickWorkspaceDir: () => Promise<string | null>;
  createFile: (ctx: {
    fileName?: string;
    content?: string;
    dir?: string;
  }) => Promise<{ success: boolean; path?: string; dir?: string; error?: string }>;
  readTextFile: () => Promise<{
    canceled?: boolean;
    success?: boolean;
    path?: string;
    name?: string;
    size?: number;
    content?: string;
    error?: string;
  }>;
  readPhoto: () => Promise<{
    canceled?: boolean;
    success?: boolean;
    path?: string;
    name?: string;
    size?: number;
    dataUrl?: string;
    error?: string;
  }>;
  openFolder: (
    folderPath?: string,
  ) => Promise<{ success: boolean; path?: string; shellError?: string }>;
  getWorkspaceDir: () => Promise<string>;
}

declare global {
  interface Window {
    nexusDesktop?: NexusDesktopBridge;
  }
}

export {};