import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Settings,
  Puzzle,
  User,
  X,
  Sparkles,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { createConversation } from '@client/src/api/chat';
import { useConversationStore } from '@client/src/stores/conversation-store';
import { usePreferenceStore } from '@client/src/stores/preference-store';
import ConversationList from '@client/src/components/chat/ConversationList';
import { Image } from '@client/src/components/ui/image';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const bottomNavItems = [
  { path: '/settings', label: '设置', icon: Settings },
  { path: '/plugins', label: '插件市场', icon: Puzzle },
  { path: '/profile', label: '个人中心', icon: User },
];

const Sidebar: React.FC<SidebarProps> = ({ open = true, onClose }) => {
  const navigate = useNavigate();
  const { setCurrentConversation, setMessages, setConversations, conversations } =
    useConversationStore();
  const { preference } = usePreferenceStore();

  const handleNewChat = async (): Promise<void> => {
    try {
      const conv = await createConversation({ title: '新对话' });
      setCurrentConversation(conv.id);
      setMessages([]);
      // 插入到列表头部
      setConversations([conv, ...conversations]);
      navigate('/');
      onClose?.();
    } catch (error) {
      logger.error('新建对话失败', error);
    }
  };

  const handleNavClick = (path: string): void => {
    navigate(path);
    onClose?.();
  };

  const handleProfileClick = (): void => {
    navigate('/profile');
    onClose?.();
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {open && onClose && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 侧边栏主体 */}
      <aside
        className={[
          'fixed md:static inset-y-0 left-0 z-50',
          'w-[85vw] md:w-[280px]',
          'flex flex-col',
          'bg-card/70 backdrop-blur-xl border-r border-border/30',
          'shadow-[0_8px_32px_rgba(0_0_0_0.08)]',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* 顶部用户信息卡 */}
        <div className="flex-shrink-0 px-4 pt-5 pb-4">
          <button
            type="button"
            onClick={handleProfileClick}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-card/50 backdrop-blur-md border border-border/40 hover:bg-card/80 hover:border-border/60 transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-primary/40 to-primary/15 backdrop-blur-md border border-border/40 flex items-center justify-center shadow-sm overflow-hidden">
              {preference?.avatarUrl ? (
                <Image
                  src={preference.avatarUrl}
                  alt="用户"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-semibold text-foreground truncate">
                {preference?.nickname || '用户'}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                点击查看个人中心
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-primary/60 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* 新建对话按钮 */}
        <div className="flex-shrink-0 px-4 pb-4">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-primary/80 hover:brightness-105 active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>新建对话</span>
          </button>
        </div>

        {/* 对话历史列表 */}
        <ConversationList onSelect={onClose} />

        {/* 底部导航 */}
        <div className="flex-shrink-0 px-3 py-3 border-t border-border/30 bg-card/40 backdrop-blur-md">
          <div className="grid grid-cols-3 gap-1">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-card/80 transition-all duration-200"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 移动端关闭按钮 */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/80 transition-all"
            aria-label="关闭侧边栏"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </aside>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default Sidebar;
