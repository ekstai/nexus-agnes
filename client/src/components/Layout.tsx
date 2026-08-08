import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '@client/src/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from '@client/src/components/chat/Sidebar';
import { usePreferenceStore } from '@client/src/stores/preference-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const LayoutContent = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const loadPreference = usePreferenceStore((s) => s.loadPreference);
  const background = usePreferenceStore((s) => s.preference?.background);

  useEffect(() => {
    loadPreference();
  }, [loadPreference]);

  const backgroundStyle: CSSProperties | undefined = background
    ? background.startsWith('linear-gradient') ||
      background.startsWith('radial-gradient')
      ? { background }
      : {
          backgroundImage: `url(${background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
    : undefined;

  return (
    <div
      className="relative flex h-screen w-screen overflow-hidden bg-background"
      style={backgroundStyle}
    >
      {/* 自定义背景遮罩，保证前景可读 */}
      {background && <div className="absolute inset-0 bg-background/40 pointer-events-none" />}

      {/* 桌面端常驻侧边栏 */}
      <div className="hidden md:flex relative z-10">
        <Sidebar open />
      </div>

      {/* 移动端抽屉侧边栏 */}
      <div className="md:hidden relative z-10">
        <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Outlet context={{ mobileOpen, setMobileOpen }} />
      </main>
    </div>
  );
};

const Layout = () => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <LayoutContent />
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default Layout;
