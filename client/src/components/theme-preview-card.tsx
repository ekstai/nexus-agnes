import { Check } from 'lucide-react';
import { cn } from '@client/src/lib/utils';
import type { ThemeDefinition } from '@client/src/themes';

interface ThemePreviewCardProps {
  theme: ThemeDefinition;
  active: boolean;
  onClick: () => void;
}

const ThemePreviewCard = ({ theme, active, onClick }: ThemePreviewCardProps) => {
  const vars = theme.variables;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex w-[140px] shrink-0 flex-col overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        active ? 'ring-2 ring-primary ring-offset-2' : 'ring-1 ring-border'
      )}
      style={{
        backgroundColor: vars['--background'],
        color: vars['--foreground'],
      }}
    >
      <div className="flex h-[140px] w-full">
        <div
          className="flex w-10 flex-col gap-1.5 p-1.5"
          style={{
            backgroundColor: vars['--sidebar'],
            borderRight: `1px solid ${vars['--sidebar-border']}`,
          }}
        >
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: vars['--sidebar-primary'] }}
          />
          <div
            className="h-2 w-full rounded"
            style={{ backgroundColor: vars['--sidebar-accent'] }}
          />
          <div
            className="h-2 w-3/4 rounded"
            style={{ backgroundColor: vars['--sidebar-accent'] }}
          />
        </div>

        <div className="flex flex-1 flex-col gap-2 p-2">
          <div
            className="h-2 w-1/2 rounded"
            style={{ backgroundColor: vars['--muted-foreground'], opacity: 0.4 }}
          />
          <div
            className="ml-auto h-6 w-2/3 rounded-lg"
            style={{ backgroundColor: vars['--primary'] }}
          />
          <div
            className="h-6 w-3/4 rounded-lg"
            style={{ backgroundColor: vars['--card'], border: `1px solid ${vars['--border']}` }}
          />
          <div
            className="ml-auto h-5 w-1/2 rounded-lg"
            style={{ backgroundColor: vars['--primary'] }}
          />
        </div>
      </div>

      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          backgroundColor: vars['--card'],
          borderTop: `1px solid ${vars['--border']}`,
        }}
      >
        <span className="text-xs font-medium" style={{ color: vars['--card-foreground'] }}>
          {theme.name}
        </span>
        {active && (
          <div
            className="flex size-4 items-center justify-center rounded-full"
            style={{ backgroundColor: vars['--primary'] }}
          >
            <Check className="size-3" style={{ color: vars['--primary-foreground'] }} />
          </div>
        )}
      </div>
    </button>
  );
};

export default ThemePreviewCard;
