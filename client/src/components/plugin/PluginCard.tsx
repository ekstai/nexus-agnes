import React from 'react';
import {
  Calculator,
  Languages,
  CloudSun,
  Terminal,
  Search,
  Puzzle,
  DollarSign,
  Binary,
  Fingerprint,
  Braces,
  Clock,
  Sigma,
  Monitor,
  Camera,
} from 'lucide-react';
import { Badge } from '@client/src/components/ui/badge';
import { Card, CardContent } from '@client/src/components/ui/card';
import type { PluginDto } from '@shared/api.interface';

interface PluginCardProps {
  plugin: PluginDto;
  onClick: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator,
  Languages,
  CloudSun,
  Terminal,
  Search,
  DollarSign,
  Binary,
  Fingerprint,
  Braces,
  Clock,
  Sigma,
  Monitor,
  Camera,
};

const categoryLabels: Record<string, string> = {
  tool: '工具类',
  search: '搜索类',
  dev: '开发类',
  life: '生活类',
};

const PluginCard: React.FC<PluginCardProps> = ({ plugin, onClick }) => {
  const IconComponent = iconMap[plugin.icon] || Puzzle;

  const getStatusBadge = () => {
    if (!plugin.installed) {
      return <Badge variant="secondary">未安装</Badge>;
    }
    if (plugin.enabled) {
      return <Badge variant="default">已安装</Badge>;
    }
    return <Badge variant="destructive">已禁用</Badge>;
  };

  return (
    <Card
      className="cursor-pointer backdrop-blur-md bg-white/60 border-white/20 shadow-[0_8px_32px_rgba(0_0_0_0.08)] hover:shadow-[0_12px_40px_rgba(0_0_0_0.12)] hover:brightness-105 hover:-translate-y-1 transition-all duration-300"
      onClick={onClick}
      data-ai-section-type="card-list"
    >
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-primary" />
          </div>
          {getStatusBadge()}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base text-foreground leading-tight">
            {plugin.name}
          </h3>
          <span className="text-xs text-muted-foreground">
            {categoryLabels[plugin.category] || plugin.category} · v{plugin.version}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {plugin.description}
        </p>
      </CardContent>
    </Card>
  );
};

export default PluginCard;
