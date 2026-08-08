import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface SettingsGroupProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
}

const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  icon,
  defaultExpanded = false,
  children,
}) => {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-white/20 bg-card/40 shadow-[0_8px_32px_rgba(0_0_0_0.06)] backdrop-blur-md transition-all duration-200 hover:border-white/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/20"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-base font-medium text-foreground">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      {expanded && (
        <div className="border-t border-border/30 px-5 py-4">{children}</div>
      )}
    </div>
  );
};

export default SettingsGroup;
