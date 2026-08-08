import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import PluginCard from '@client/src/components/plugin/PluginCard';
import PluginDetailModal from '@client/src/components/plugin/PluginDetailModal';
import * as pluginApi from '@client/src/api/plugin';
import type { PluginDto, PluginCategory } from '@shared/api.interface';

type CategoryFilter = 'all' | PluginCategory;

const categoryTabs: Array<{ key: CategoryFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'tool', label: '工具类' },
  { key: 'search', label: '搜索类' },
  { key: 'dev', label: '开发类' },
  { key: 'life', label: '生活类' },
];

const PluginsPage: React.FC = () => {
  const navigate = useNavigate();
  const [plugins, setPlugins] = useState<PluginDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<PluginDto | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const data = await pluginApi.getMarket();
      setPlugins(data.items);
    } catch (error) {
      logger.error('加载插件市场失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  const filteredPlugins = useMemo(() => {
    return plugins.filter((p: PluginDto) => {
      const matchCategory = activeCategory === 'all' || p.category === activeCategory;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [plugins, activeCategory, searchQuery]);

  const handleCardClick = (plugin: PluginDto) => {
    setSelectedPlugin(plugin);
    setDetailOpen(true);
  };

  const handleUpdated = () => {
    loadPlugins();
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-30 backdrop-blur-lg bg-white/70 border-b border-white/20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground flex-1">
            插件市场
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className="shrink-0"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
        {showSearch && (
          <div className="px-4 pb-3">
            <Input
              placeholder="搜索插件..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              className="bg-white/50"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* 分类标签栏 */}
      <div className="sticky top-[57px] z-20 backdrop-blur-md bg-white/50 border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categoryTabs.map((tab: { key: CategoryFilter; label: string }) => (
              <button
                key={tab.key}
                onClick={() => setActiveCategory(tab.key)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCategory === tab.key
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-white/60 text-foreground/70 hover:bg-white/80 border border-white/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 插件卡片网格 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">加载中...</span>
          </div>
        ) : filteredPlugins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Search className="w-10 h-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              没有找到匹配的插件
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlugins.map((plugin: PluginDto) => (
              <PluginCard
                key={plugin.pluginKey}
                plugin={plugin}
                onClick={() => handleCardClick(plugin)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      <PluginDetailModal
        open={detailOpen}
        plugin={selectedPlugin}
        onClose={() => setDetailOpen(false)}
        onUpdated={handleUpdated}
      />
    </div>
  );
};

export default PluginsPage;
